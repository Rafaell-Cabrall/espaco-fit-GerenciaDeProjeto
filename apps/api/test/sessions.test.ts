// Integração: exige Postgres e Redis (docker compose up -d) e migrações aplicadas.
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Role } from '@espacofit/shared'
import { app } from '../src/app.ts'
import { signAccess } from '../src/lib/jwt.ts'
import { prisma } from '../src/lib/prisma.ts'
import { queue } from '../src/lib/queue.ts'
import { redis } from '../src/lib/redis.ts'

const run = Date.now()
const emails: string[] = []

let base: string
let server: ReturnType<typeof app.listen>

async function user(role: Role) {
  const email = `treino-${role.toLowerCase()}-${emails.length}-${run}@example.com`
  emails.push(email)
  const u = await prisma.user.create({ data: { name: 'Teste', email, passwordHash: 'x', role } })
  return { id: u.id, token: signAccess(u.id, role, 0) }
}

const call = (method: string, path: string, token: string, body?: unknown) =>
  fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

// Ficha com uma divisão e um exercício de 3 séries
async function plan(
  studentId: string,
  instructorId: string,
  exerciseId: string,
  status: 'ACTIVE' | 'DRAFT',
) {
  const p = await prisma.workoutPlan.create({
    data: {
      studentId,
      instructorId,
      status,
      name: 'Ficha',
      startsOn: new Date('2026-09-01'),
      endsOn: new Date('2026-12-01'),
      divisions: {
        create: {
          label: 'A',
          title: 'Peito',
          order: 0,
          exercises: { create: { exerciseId, order: 0, sets: 3, reps: '10' } },
        },
      },
    },
    include: { divisions: { include: { exercises: true } } },
  })
  const division = p.divisions[0]
  assert.ok(division?.exercises[0])
  return { divisionId: division.id, itemId: division.exercises[0].id }
}

describe('treino', () => {
  let aluno: Awaited<ReturnType<typeof user>>
  let outroAluno: Awaited<ReturnType<typeof user>>
  let instrutor: Awaited<ReturnType<typeof user>>
  let exerciseId: string
  let active: Awaited<ReturnType<typeof plan>>
  let draft: Awaited<ReturnType<typeof plan>>

  before(async () => {
    server = app.listen(0)
    const addr = server.address()
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
    aluno = await user('ALUNO')
    outroAluno = await user('ALUNO')
    instrutor = await user('INSTRUTOR')
    exerciseId = (
      await prisma.exercise.create({ data: { name: `Supino ${run}`, muscleGroup: 'Teste' } })
    ).id
    active = await plan(aluno.id, instrutor.id, exerciseId, 'ACTIVE')
    draft = await plan(aluno.id, instrutor.id, exerciseId, 'DRAFT')
  })

  after(async () => {
    const students = { where: { student: { email: { in: emails } } } }
    await prisma.workoutSession.deleteMany(students)
    await prisma.workoutPlan.deleteMany(students)
    await prisma.exercise.delete({ where: { id: exerciseId } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    await prisma.$disconnect()
    await queue.close()
    await redis.quit()
    server.close()
  })

  it('só inicia divisão da ficha ativa do próprio aluno', async () => {
    assert.equal(
      (await call('POST', '/sessions', aluno.token, { divisionId: draft.divisionId })).status,
      404,
    )
    assert.equal(
      (await call('POST', '/sessions', outroAluno.token, { divisionId: active.divisionId })).status,
      404,
    )
    assert.equal(
      (await call('POST', '/sessions', instrutor.token, { divisionId: active.divisionId })).status,
      403,
    )
  })

  it('id gerado no app torna o início idempotente', async () => {
    const body = { id: `offline-${run}`, divisionId: active.divisionId }
    const first = await call('POST', '/sessions', aluno.token, body)
    assert.equal(first.status, 201)
    const again = await (await call('POST', '/sessions', aluno.token, body)).json()
    assert.equal(again.id, body.id)
    assert.equal(await prisma.workoutSession.count({ where: { id: body.id } }), 1)
    assert.equal((await call('POST', '/sessions', outroAluno.token, body)).status, 409)
  })

  it('finalizar sem série responde 422 e sair descarta (RN03)', async () => {
    const s = await (
      await call('POST', '/sessions', aluno.token, { divisionId: active.divisionId })
    ).json()
    assert.equal((await call('POST', `/sessions/${s.id}/finish`, aluno.token, {})).status, 422)
    assert.equal((await call('DELETE', `/sessions/${s.id}`, outroAluno.token)).status, 403)
    assert.equal((await call('DELETE', `/sessions/${s.id}`, aluno.token)).status, 204)
    assert.equal((await call('DELETE', `/sessions/${s.id}`, aluno.token)).status, 204)
  })

  it('registra, corrige e desmarca série sem duplicar (RN02)', async () => {
    const s = await (
      await call('POST', '/sessions', aluno.token, { divisionId: active.divisionId })
    ).json()
    const set = { divisionExerciseId: active.itemId, setNumber: 1, loadKg: 40 }
    const path = `/sessions/${s.id}/sets`
    assert.equal((await call('PUT', path, outroAluno.token, set)).status, 403)
    assert.equal((await call('PUT', path, aluno.token, { ...set, setNumber: 4 })).status, 400)
    assert.equal(
      (await call('PUT', path, aluno.token, { ...set, divisionExerciseId: draft.itemId })).status,
      400,
    )

    const twice = await Promise.all([1, 2].map(() => call('PUT', path, aluno.token, set)))
    assert.deepEqual(
      twice.map((r) => r.status),
      [200, 200],
    )
    const fixed = await (await call('PUT', path, aluno.token, { ...set, loadKg: 42.5 })).json()
    assert.equal(fixed.loadKg, 42.5)
    assert.equal(await prisma.setLog.count({ where: { sessionId: s.id } }), 1)

    await call('PUT', path, aluno.token, { ...set, setNumber: 2 })
    const del = await call('DELETE', `${path}/${active.itemId}/2`, aluno.token)
    assert.equal(del.status, 204)

    const notes = { [active.itemId]: 'Senti o ombro' }
    const done = await (
      await call('POST', `/sessions/${s.id}/finish`, aluno.token, { notes })
    ).json()
    assert.ok(done.finishedAt)
    assert.deepEqual(done.notes, notes)
    assert.equal(done.sets.length, 1)

    const again = await call('POST', `/sessions/${s.id}/finish`, aluno.token, {})
    assert.equal((await again.json()).finishedAt, done.finishedAt)
    assert.equal((await call('PUT', path, aluno.token, set)).status, 409)
    assert.equal((await call('DELETE', `/sessions/${s.id}`, aluno.token)).status, 409)

    // Histórico só lista finalizados e só do próprio aluno
    const history = await (await call('GET', '/sessions', aluno.token)).json()
    assert.deepEqual(
      history.map((h: { id: string }) => h.id),
      [s.id],
    )
    assert.deepEqual(await (await call('GET', '/sessions', outroAluno.token)).json(), [])
  })
})
