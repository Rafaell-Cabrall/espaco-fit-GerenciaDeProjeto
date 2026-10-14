// Integração: exige Postgres e Redis (docker compose up -d) e migrações aplicadas.
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Appointment, Role } from '@espacofit/shared'
import { app } from '../src/app.ts'
import { signAccess } from '../src/lib/jwt.ts'
import { prisma } from '../src/lib/prisma.ts'
import { queue } from '../src/lib/queue.ts'
import { redis } from '../src/lib/redis.ts'
import { dayInSaoPaulo } from '../src/modules/sessions/frequency.ts'

const run = Date.now()
const emails: string[] = []
const amanha = dayInSaoPaulo(new Date(Date.now() + 86_400_000))

let base: string
let server: ReturnType<typeof app.listen>

async function user(role: Role) {
  const email = `agenda-${role.toLowerCase()}-${emails.length}-${run}@example.com`
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

describe('agenda de avaliações', () => {
  let aluno: Awaited<ReturnType<typeof user>>
  let outroAluno: Awaited<ReturnType<typeof user>>
  let instrutor: Awaited<ReturnType<typeof user>>
  let created: Appointment

  before(async () => {
    server = app.listen(0)
    const addr = server.address()
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
    aluno = await user('ALUNO')
    outroAluno = await user('ALUNO')
    instrutor = await user('INSTRUTOR')
    for (const s of [aluno, outroAluno]) {
      await prisma.link.create({ data: { studentId: s.id, instructorId: instrutor.id } })
    }
  })

  after(async () => {
    await prisma.appointment.deleteMany({ where: { instructorId: instrutor.id } })
    await prisma.link.deleteMany({ where: { student: { email: { in: emails } } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    await prisma.$disconnect()
    await queue.close()
    await redis.quit()
    server.close()
  })

  const list = (token = instrutor.token) =>
    call('GET', `/appointments?from=${amanha}&to=${amanha}`, token)

  it('agenda num horário livre e lista por dia e hora', async () => {
    const res = await call('POST', '/appointments', instrutor.token, {
      studentId: aluno.id,
      date: amanha,
      hour: 8,
    })
    assert.equal(res.status, 201)
    created = await res.json()
    assert.equal(created.date, amanha)
    assert.equal(created.student.id, aluno.id)
    await call('POST', '/appointments', instrutor.token, {
      studentId: outroAluno.id,
      date: amanha,
      hour: 7,
    })
    const items: Appointment[] = await (await list()).json()
    assert.deepEqual(
      items.map((a) => a.hour),
      [7, 8],
    )
  })

  it('recusa horário ocupado, dia passado, aluno sem vínculo e perfil aluno', async () => {
    const ocupado = { studentId: outroAluno.id, date: amanha, hour: 8 }
    assert.equal((await call('POST', '/appointments', instrutor.token, ocupado)).status, 409)
    const passado = { ...ocupado, date: '2020-01-01' }
    assert.equal((await call('POST', '/appointments', instrutor.token, passado)).status, 422)
    const estranho = await user('ALUNO')
    const semVinculo = { studentId: estranho.id, date: amanha, hour: 9 }
    assert.equal((await call('POST', '/appointments', instrutor.token, semVinculo)).status, 403)
    assert.equal((await list(aluno.token)).status, 403)
    assert.equal((await call('GET', '/appointments', instrutor.token)).status, 400)
  })

  it('cancela; repetir também responde 204', async () => {
    for (let i = 0; i < 2; i++) {
      const res = await call('DELETE', `/appointments/${created.id}`, instrutor.token)
      assert.equal(res.status, 204)
    }
    assert.equal(((await (await list()).json()) as Appointment[]).length, 1)
  })
})
