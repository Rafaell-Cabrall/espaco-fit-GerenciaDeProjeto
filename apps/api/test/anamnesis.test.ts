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

// Usuário direto no banco com token assinado: o teste não depende do fluxo de login
async function user(role: Role) {
  const email = `anamnese-${role.toLowerCase()}-${emails.length}-${run}@example.com`
  emails.push(email)
  const u = await prisma.user.create({ data: { name: 'Teste', email, passwordHash: 'x', role } })
  return { id: u.id, token: signAccess(u.id, role, 0) }
}

const call = (method: string, studentId: string, token: string, body?: unknown) =>
  fetch(`${base}/anamnesis/${studentId}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const answers = {
  injuries: '',
  fitnessLevel: 'Iniciante',
  goal: 'Hipertrofia',
  weeklyFrequency: '3 dias',
  conditions: 'Asma',
  consent: true,
}

describe('anamnese', () => {
  let aluno: Awaited<ReturnType<typeof user>>
  let outroAluno: Awaited<ReturnType<typeof user>>
  let instrutor: Awaited<ReturnType<typeof user>>
  let semVinculo: Awaited<ReturnType<typeof user>>
  let admin: Awaited<ReturnType<typeof user>>

  before(async () => {
    server = app.listen(0)
    const addr = server.address()
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
    aluno = await user('ALUNO')
    outroAluno = await user('ALUNO')
    instrutor = await user('INSTRUTOR')
    semVinculo = await user('INSTRUTOR')
    admin = await user('ADMIN')
    await prisma.link.create({ data: { studentId: aluno.id, instructorId: instrutor.id } })
  })

  after(async () => {
    await prisma.link.deleteMany({ where: { student: { email: { in: emails } } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    await prisma.$disconnect()
    await queue.close()
    await redis.quit()
    server.close()
  })

  it('devolve null antes do primeiro acesso', async () => {
    const res = await call('GET', aluno.id, aluno.token)
    assert.equal(res.status, 200)
    assert.equal(await res.json(), null)
  })

  it('exige o consentimento', async () => {
    const res = await call('PUT', aluno.id, aluno.token, { ...answers, consent: false })
    assert.equal(res.status, 400)
  })

  it('aluno responde e atualiza a própria anamnese', async () => {
    const first = await call('PUT', aluno.id, aluno.token, answers)
    assert.equal(first.status, 200)
    const body = await first.json()
    assert.equal(body.conditions, 'Asma')
    assert.equal(body.outdated, false)
    assert.ok(body.consentAt)
    assert.equal('consent' in body, false)

    const second = await call('PUT', aluno.id, aluno.token, { ...answers, goal: 'Emagrecimento' })
    assert.equal((await second.json()).goal, 'Emagrecimento')
  })

  it('instrutor com vínculo lê; sem vínculo, outro aluno e admin não', async () => {
    assert.equal((await call('GET', aluno.id, instrutor.token)).status, 200)
    assert.equal((await call('GET', aluno.id, semVinculo.token)).status, 403)
    assert.equal((await call('GET', aluno.id, outroAluno.token)).status, 403)
    assert.equal((await call('GET', aluno.id, admin.token)).status, 403)
  })

  it('só o próprio aluno escreve', async () => {
    assert.equal((await call('PUT', aluno.id, instrutor.token, answers)).status, 403)
    assert.equal((await call('PUT', aluno.id, admin.token, answers)).status, 403)
    assert.equal((await call('PUT', aluno.id, outroAluno.token, answers)).status, 403)
  })

  it('sinaliza vencida após 60 dias (RN04)', async () => {
    const old = new Date(Date.now() - 61 * 24 * 60 * 60 * 1000)
    await prisma.anamnesis.update({ where: { studentId: aluno.id }, data: { updatedAt: old } })
    assert.equal((await (await call('GET', aluno.id, aluno.token)).json()).outdated, true)
  })
})
