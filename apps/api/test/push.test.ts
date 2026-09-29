// Integração: exige Postgres e Redis (docker compose up -d) e migrações aplicadas.
// Sem worker no teste: confere o job 'push' na fila, não o envio ao Expo.
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
const token = `ExponentPushToken[teste-${run}]`

let base: string
let server: ReturnType<typeof app.listen>

async function user(role: Role) {
  const email = `push-${role.toLowerCase()}-${emails.length}-${run}@example.com`
  emails.push(email)
  const u = await prisma.user.create({
    data: { name: 'Ana Aluna', email, passwordHash: 'x', role },
  })
  return { id: u.id, token: signAccess(u.id, role, 0) }
}

const call = (method: string, path: string, auth: string, body?: unknown) =>
  fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${auth}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const pushJobs = async () =>
  (await queue.getJobs(['waiting', 'delayed'])).filter(
    (j) =>
      j.name === 'push' && 'to' in j.data && Array.isArray(j.data.to) && j.data.to.includes(token),
  )

describe('push', () => {
  let aluno: Awaited<ReturnType<typeof user>>
  let instrutor: Awaited<ReturnType<typeof user>>
  let exerciseId: string
  let divisionId: string
  let itemId: string

  before(async () => {
    server = app.listen(0)
    const addr = server.address()
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
    aluno = await user('ALUNO')
    instrutor = await user('INSTRUTOR')
    await prisma.link.create({ data: { studentId: aluno.id, instructorId: instrutor.id } })
    exerciseId = (
      await prisma.exercise.create({ data: { name: `Supino ${run}`, muscleGroup: 'Peito' } })
    ).id
    const plan = await prisma.workoutPlan.create({
      data: {
        studentId: aluno.id,
        instructorId: instrutor.id,
        status: 'ACTIVE',
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
    divisionId = plan.divisions[0]?.id ?? ''
    itemId = plan.divisions[0]?.exercises[0]?.id ?? ''
  })

  after(async () => {
    for (const job of await pushJobs()) await job.remove()
    const students = { where: { student: { email: { in: emails } } } }
    await prisma.workoutSession.deleteMany(students)
    await prisma.link.deleteMany(students)
    await prisma.workoutPlan.deleteMany(students)
    await prisma.exercise.delete({ where: { id: exerciseId } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    await prisma.$disconnect()
    await queue.close()
    await redis.quit()
    server.close()
  })

  it('registra o token do aparelho', async () => {
    assert.equal(
      (await call('PUT', '/auth/push-token', instrutor.token, { token: 'x' })).status,
      400,
    )
    assert.equal((await call('PUT', '/auth/push-token', instrutor.token, { token })).status, 204)
    const row = await prisma.user.findUniqueOrThrow({ where: { id: instrutor.id } })
    assert.equal(row.pushToken, token)
  })

  it('finalizar treino avisa o instrutor', async () => {
    const s = await (await call('POST', '/sessions', aluno.token, { divisionId })).json()
    const set = { divisionExerciseId: itemId, setNumber: 1 }
    assert.equal((await call('PUT', `/sessions/${s.id}/sets`, aluno.token, set)).status, 200)
    assert.equal((await call('POST', `/sessions/${s.id}/finish`, aluno.token, {})).status, 200)
    const [job] = await pushJobs()
    assert.match(JSON.stringify(job?.data), /Ana Aluna concluiu o Treino A — Peito/)
    await job?.remove()
  })

  it('mesmo aparelho em outra conta tira o token da anterior; logout apaga', async () => {
    const outro = await user('INSTRUTOR')
    assert.equal((await call('PUT', '/auth/push-token', outro.token, { token })).status, 204)
    const antes = await prisma.user.findUniqueOrThrow({ where: { id: instrutor.id } })
    assert.equal(antes.pushToken, null)
    assert.equal((await call('POST', '/auth/logout', outro.token)).status, 204)
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: outro.id } })).pushToken, null)
  })

  it('publicar com notify avisa o aluno', async () => {
    await call('PUT', '/auth/push-token', aluno.token, { token })
    const draft = await prisma.workoutPlan.create({
      data: {
        studentId: aluno.id,
        instructorId: instrutor.id,
        name: 'Hipertrofia Nova',
        startsOn: new Date('2026-10-01'),
        endsOn: new Date('2026-12-01'),
      },
    })
    const res = await call('POST', `/plans/${draft.id}/publish`, instrutor.token, { notify: true })
    assert.equal(res.status, 200)
    const [job] = await pushJobs()
    assert.match(JSON.stringify(job?.data), /Hipertrofia Nova/)
    await job?.remove()
  })
})
