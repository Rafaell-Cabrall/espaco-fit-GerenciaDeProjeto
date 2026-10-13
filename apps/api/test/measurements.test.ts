// Integração: exige Postgres e Redis (docker compose up -d) e migrações aplicadas.
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { lastMonthBaseline, type Measurement, type Role } from '@espacofit/shared'
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
  const email = `medidas-${role.toLowerCase()}-${emails.length}-${run}@example.com`
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

describe('avaliação física', () => {
  let aluno: Awaited<ReturnType<typeof user>>
  let instrutor: Awaited<ReturnType<typeof user>>
  let outroInstrutor: Awaited<ReturnType<typeof user>>
  let admin: Awaited<ReturnType<typeof user>>

  before(async () => {
    server = app.listen(0)
    const addr = server.address()
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
    aluno = await user('ALUNO')
    instrutor = await user('INSTRUTOR')
    outroInstrutor = await user('INSTRUTOR')
    admin = await user('ADMIN')
    await prisma.link.create({ data: { studentId: aluno.id, instructorId: instrutor.id } })
  })

  after(async () => {
    await prisma.link.deleteMany({ where: { student: { email: { in: emails } } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } }) // medidas caem em cascata
    await prisma.$disconnect()
    await queue.close()
    await redis.quit()
    server.close()
  })

  const list = (token: string) => call('GET', `/measurements?studentId=${aluno.id}`, token)

  it('instrutor registra; altura em branco herda a anterior no IMC', async () => {
    const res = await call('POST', '/measurements', instrutor.token, {
      studentId: aluno.id,
      measuredOn: '2026-07-10',
      weightKg: 77.4,
      heightCm: 168,
      bodyFatPct: 19.1,
      waistCm: 74,
    })
    assert.equal(res.status, 201)
    const created: Measurement = await res.json()
    assert.equal(created.bmi, 27.4)
    assert.equal(created.waistCm, 74)
    assert.equal(created.chestCm, null)

    const agosto = await call('POST', '/measurements', instrutor.token, {
      studentId: aluno.id,
      measuredOn: '2026-08-10',
      weightKg: 76.5,
      leanMassKg: 62.6,
      waistCm: 72,
    })
    assert.equal((await agosto.json()).bmi, 27.1)
  })

  it('lista mais recente primeiro para o aluno e o instrutor; base do mês passado', async () => {
    await call('POST', '/measurements', instrutor.token, {
      studentId: aluno.id,
      measuredOn: '2026-08-25',
      weightKg: 76,
    })
    const items: Measurement[] = await (await list(aluno.token)).json()
    assert.deepEqual(
      items.map((m) => m.measuredOn),
      ['2026-08-25', '2026-08-10', '2026-07-10'],
    )
    assert.equal(items[0]?.bmi, 26.9)
    assert.equal(items[1]?.leanMassKg, 62.6)
    assert.equal(lastMonthBaseline(items)?.measuredOn, '2026-07-10')
    assert.equal(lastMonthBaseline(items.slice(0, 2)), null)
    assert.equal(lastMonthBaseline([]), null)
    assert.equal((await list(instrutor.token)).status, 200)
  })

  it('sem vínculo, aluno e admin não registram; admin não lê (RN09)', async () => {
    const body = { studentId: aluno.id, measuredOn: '2026-09-01', weightKg: 75 }
    assert.equal((await call('POST', '/measurements', outroInstrutor.token, body)).status, 403)
    assert.equal((await call('POST', '/measurements', aluno.token, body)).status, 403)
    assert.equal((await list(outroInstrutor.token)).status, 403)
    assert.equal((await list(admin.token)).status, 403)
    const semPeso = { studentId: aluno.id, measuredOn: '2026-09-01' }
    assert.equal((await call('POST', '/measurements', instrutor.token, semPeso)).status, 400)
  })
})
