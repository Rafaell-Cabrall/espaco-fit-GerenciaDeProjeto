// Integração: exige Postgres e Redis (docker compose up -d) e migrações aplicadas.
// O teste de URL assinada roda só com o MinIO no ar; o CI não sobe MinIO.
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Plan, Role } from '@espacofit/shared'
import { app } from '../src/app.ts'
import { env } from '../src/lib/env.ts'
import { signAccess } from '../src/lib/jwt.ts'
import { prisma } from '../src/lib/prisma.ts'
import { queue } from '../src/lib/queue.ts'
import { redis } from '../src/lib/redis.ts'
import { presign } from '../src/lib/storage.ts'

const run = Date.now()
const emails: string[] = []
const minio = await fetch(`${env.S3_ENDPOINT}/minio/health/live`).then(
  (r) => r.ok,
  () => false,
)

let base: string
let server: ReturnType<typeof app.listen>

async function user(role: Role) {
  const email = `ficha-${role.toLowerCase()}-${emails.length}-${run}@example.com`
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

describe('fichas', () => {
  let aluno: Awaited<ReturnType<typeof user>>
  let semAnamnese: Awaited<ReturnType<typeof user>>
  let instrutor: Awaited<ReturnType<typeof user>>
  let outroInstrutor: Awaited<ReturnType<typeof user>>
  let admin: Awaited<ReturnType<typeof user>>
  let exerciseIds: string[]
  let divisions: unknown[]
  let draft: Plan

  before(async () => {
    server = app.listen(0)
    const addr = server.address()
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
    aluno = await user('ALUNO')
    semAnamnese = await user('ALUNO')
    instrutor = await user('INSTRUTOR')
    outroInstrutor = await user('INSTRUTOR')
    admin = await user('ADMIN')
    for (const s of [aluno, semAnamnese]) {
      await prisma.link.create({ data: { studentId: s.id, instructorId: instrutor.id } })
    }
    await prisma.anamnesis.create({
      data: { studentId: aluno.id, answers: {}, consentAt: new Date() },
    })
    const created = await Promise.all(
      ['Supino', 'Remada', 'Agachamento'].map((name) =>
        prisma.exercise.create({ data: { name: `${name} ${run}`, muscleGroup: 'Teste' } }),
      ),
    )
    exerciseIds = created.map((e) => e.id)
    divisions = exerciseIds.map((exerciseId, i) => ({
      label: 'ABC'[i],
      title: `Divisão ${i}`,
      exercises: [{ exerciseId, sets: 3, reps: '8-10', restSeconds: 60, targetLoadKg: 20 }],
    }))
  })

  after(async () => {
    const students = { where: { student: { email: { in: emails } } } }
    await prisma.workoutSession.deleteMany(students)
    await prisma.workoutPlan.deleteMany(students)
    await prisma.planTemplate.deleteMany({ where: { instructor: { email: { in: emails } } } })
    await prisma.link.deleteMany(students)
    await prisma.exercise.deleteMany({ where: { id: { in: exerciseIds } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    await prisma.$disconnect()
    await queue.close()
    await redis.quit()
    server.close()
  })

  it('bloqueia criar sem anamnese (RN05) e sem vínculo', async () => {
    const semAnam = await call('POST', '/plans', instrutor.token, {
      studentId: semAnamnese.id,
      divisions,
    })
    assert.equal(semAnam.status, 409)
    const body = { studentId: aluno.id, divisions }
    assert.equal((await call('POST', '/plans', outroInstrutor.token, body)).status, 403)
    assert.equal((await call('POST', '/plans', admin.token, body)).status, 403)
  })

  it('recusa exercício fora da biblioteca', async () => {
    const res = await call('POST', '/plans', instrutor.token, {
      studentId: aluno.id,
      divisions: [
        { label: 'A', title: 'X', exercises: [{ exerciseId: 'nao-existe', sets: 3, reps: '12' }] },
      ],
    })
    assert.equal(res.status, 400)
  })

  it('cria rascunho que o aluno ainda não vê', async () => {
    const res = await call('POST', '/plans', instrutor.token, { studentId: aluno.id, divisions })
    assert.equal(res.status, 201)
    draft = await res.json()
    assert.equal(draft.status, 'DRAFT')
    assert.equal(draft.divisions.length, 3)
    // 3 × (40 + 60) s = 5 min
    assert.equal(draft.divisions[0]?.estimatedMinutes, 5)
    assert.equal(draft.divisions[0]?.exercises[0]?.targetLoadKg, 20)
    assert.equal(draft.todayDivisionId, draft.divisions[0]?.id)
    assert.equal(await (await call('GET', `/plans/student/${aluno.id}`, aluno.token)).json(), null)
  })

  it('só o autor edita o rascunho; admin lê', async () => {
    const two = { divisions: divisions.slice(0, 2) }
    assert.equal((await call('PUT', `/plans/${draft.id}`, outroInstrutor.token, two)).status, 403)
    assert.equal((await call('PUT', `/plans/${draft.id}`, admin.token, two)).status, 403)
    const res = await call('PUT', `/plans/${draft.id}`, instrutor.token, two)
    assert.equal(res.status, 200)
    draft = await res.json()
    assert.equal(draft.divisions.length, 2)
    assert.equal((await call('GET', `/plans/${draft.id}`, admin.token)).status, 200)
    assert.equal((await call('GET', `/plans/${draft.id}`, aluno.token)).status, 403)
  })

  it('publicar ativa a nova e expira a anterior', async () => {
    const published: Plan = await (
      await call('POST', `/plans/${draft.id}/publish`, instrutor.token)
    ).json()
    assert.equal(published.status, 'ACTIVE')
    assert.ok(published.publishedAt)

    const next: Plan = await (
      await call('POST', '/plans', instrutor.token, { studentId: aluno.id, divisions })
    ).json()
    await call('POST', `/plans/${next.id}/publish`, instrutor.token)
    assert.equal(
      (await call('PUT', `/plans/${next.id}`, instrutor.token, { divisions })).status,
      409,
    )

    const old: Plan = await (await call('GET', `/plans/${draft.id}`, instrutor.token)).json()
    assert.equal(old.status, 'EXPIRED')
    const current: Plan = await (
      await call('GET', `/plans/student/${aluno.id}`, aluno.token)
    ).json()
    assert.equal(current.id, next.id)
    draft = current
  })

  it('treino do dia segue A→B→C e traz a última carga (RN08, RN02)', async () => {
    const [a, b, c] = draft.divisions
    assert.ok(a && b && c)
    const session = await prisma.workoutSession.create({
      data: { studentId: aluno.id, divisionId: b.id, finishedAt: new Date() },
    })
    await prisma.setLog.create({
      data: {
        sessionId: session.id,
        divisionExerciseId: b.exercises[0]?.id ?? '',
        setNumber: 1,
        loadKg: 32.5,
      },
    })
    const afterB: Plan = await (await call('GET', `/plans/student/${aluno.id}`, aluno.token)).json()
    assert.equal(afterB.todayDivisionId, c.id)
    assert.equal(afterB.divisions[1]?.exercises[0]?.lastLoadKg, 32.5)
    assert.equal(afterB.divisions[0]?.exercises[0]?.lastLoadKg, null)

    await prisma.workoutSession.create({
      data: { studentId: aluno.id, divisionId: c.id, finishedAt: new Date(Date.now() + 1000) },
    })
    const afterC: Plan = await (await call('GET', `/plans/student/${aluno.id}`, aluno.token)).json()
    assert.equal(afterC.todayDivisionId, a.id)
  })

  it('instrutor sem vínculo não lê a ficha do aluno', async () => {
    const res = await call('GET', `/plans/student/${aluno.id}`, outroInstrutor.token)
    assert.equal(res.status, 403)
  })

  it('modelos são do próprio instrutor', async () => {
    const created = await call('POST', '/plans/templates', instrutor.token, {
      name: `Hipertrofia ${run}`,
      divisions,
    })
    assert.equal(created.status, 201)
    const mine = await (await call('GET', '/plans/templates', instrutor.token)).json()
    assert.equal(mine.length, 1)
    assert.equal(mine[0].divisions[0].exercises[0].restSeconds, 60)
    assert.deepEqual(await (await call('GET', '/plans/templates', outroInstrutor.token)).json(), [])
  })

  it('biblioteca lista exercícios para instrutor, não para aluno', async () => {
    const res = await call('GET', '/exercises', instrutor.token)
    assert.equal(res.status, 200)
    assert.ok((await res.json()).some((e: { id: string }) => e.id === exerciseIds[0]))
    assert.equal((await call('GET', '/exercises', aluno.token)).status, 403)
  })

  it('URL assinada envia e lê no MinIO; assinatura adulterada é recusada', {
    skip: !minio && 'MinIO fora do ar',
  }, async () => {
    const key = `test/${run}.txt`
    const put = await fetch(presign('PUT', key), { method: 'PUT', body: 'ok' })
    assert.equal(put.status, 200)
    assert.equal(await (await fetch(presign('GET', key))).text(), 'ok')
    const bad = presign('GET', key).replace(/X-Amz-Signature=\w/, 'X-Amz-Signature=0')
    assert.equal((await fetch(bad)).status, 403)
  })
})
