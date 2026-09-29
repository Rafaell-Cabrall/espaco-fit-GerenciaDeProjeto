// Integração: exige Postgres e Redis (docker compose up -d) e migrações aplicadas.
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Feedback, Role } from '@espacofit/shared'
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
  const email = `feedback-${role.toLowerCase()}-${emails.length}-${run}@example.com`
  emails.push(email)
  const u = await prisma.user.create({ data: { name: 'Teste', email, passwordHash: 'x', role } })
  return { id: u.id, token: signAccess(u.id, role, 0) }
}

const call = (method: string, path: string, token: string) =>
  fetch(`${base}${path}`, { method, headers: { authorization: `Bearer ${token}` } })

describe('feedbacks', () => {
  let aluno: Awaited<ReturnType<typeof user>>
  let instrutor: Awaited<ReturnType<typeof user>>
  let semVinculo: Awaited<ReturnType<typeof user>>
  let exerciseId: string
  let sessionId: string

  before(async () => {
    server = app.listen(0)
    const addr = server.address()
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
    aluno = await user('ALUNO')
    instrutor = await user('INSTRUTOR')
    semVinculo = await user('INSTRUTOR')
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
    const division = plan.divisions[0]
    assert.ok(division?.exercises[0])
    const withNote = await prisma.workoutSession.create({
      data: {
        studentId: aluno.id,
        divisionId: division.id,
        finishedAt: new Date(),
        exerciseNotes: { [division.exercises[0].id]: 'Carga leve' },
      },
    })
    sessionId = withNote.id
    // treino sem nota não vira feedback
    await prisma.workoutSession.create({
      data: {
        studentId: aluno.id,
        divisionId: division.id,
        finishedAt: new Date(),
        exerciseNotes: {},
      },
    })
  })

  after(async () => {
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

  const feedbacks = async (token: string): Promise<Feedback[]> =>
    (await call('GET', '/feedbacks', token)).json()

  it('instrutor vê os comentários dos seus alunos, um item por nota', async () => {
    const mine = (await feedbacks(instrutor.token)).filter((f) => f.student.id === aluno.id)
    assert.equal(mine.length, 1)
    assert.equal(mine[0]?.sessionId, sessionId)
    assert.equal(mine[0]?.exercise, `Supino ${run}`)
    assert.equal(mine[0]?.text, 'Carga leve')
    assert.equal(mine[0]?.read, false)
    assert.ok(!(await feedbacks(semVinculo.token)).some((f) => f.student.id === aluno.id))
    assert.equal((await call('GET', '/feedbacks', aluno.token)).status, 403)
  })

  it('marcar como lido exige vínculo e é idempotente', async () => {
    const path = `/feedbacks/${sessionId}/read`
    assert.equal((await call('POST', path, semVinculo.token)).status, 403)
    assert.equal((await call('POST', path, instrutor.token)).status, 204)
    assert.equal((await call('POST', path, instrutor.token)).status, 204)
    assert.equal((await call('POST', '/feedbacks/nao-existe/read', instrutor.token)).status, 404)
    const mine = (await feedbacks(instrutor.token)).find((f) => f.sessionId === sessionId)
    assert.equal(mine?.read, true)
  })
})
