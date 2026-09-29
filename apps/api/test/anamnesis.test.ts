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

// path = ":studentId" ou ":studentId/consent" etc.
const call = (method: string, path: string, token: string, body?: unknown) =>
  fetch(`${base}/anamnesis/${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const answers = {
  birthDate: '1998-03-15',
  goal: 'Hipertrofia',
  conditions: 'Asma',
  daysPerWeek: 4,
  minutesPerSession: 60,
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

  it('devolve null antes do cadastro', async () => {
    const res = await call('GET', aluno.id, aluno.token)
    assert.equal(res.status, 200)
    assert.equal(await res.json(), null)
  })

  it('instrutor com vínculo escreve; aluno, admin e sem vínculo não', async () => {
    assert.equal((await call('PUT', aluno.id, aluno.token, answers)).status, 403)
    assert.equal((await call('PUT', aluno.id, admin.token, answers)).status, 403)
    assert.equal((await call('PUT', aluno.id, semVinculo.token, answers)).status, 403)
    const res = await call('PUT', aluno.id, instrutor.token, answers)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.conditions, 'Asma')
    assert.equal(body.cpf, '')
    assert.equal(body.daysPerWeek, 4)
    assert.equal(body.consentAt, null)
    assert.equal(body.instructorNotes, '')
    assert.equal(body.outdated, false)
  })

  it('recusa CPF e data inválidos', async () => {
    const cpf = await call('PUT', aluno.id, instrutor.token, { ...answers, cpf: '123' })
    assert.equal(cpf.status, 400)
    const date = await call('PUT', aluno.id, instrutor.token, {
      ...answers,
      birthDate: '15/03/1998',
    })
    assert.equal(date.status, 400)
  })

  it('só o próprio aluno consente (RN09)', async () => {
    const path = `${aluno.id}/consent`
    assert.equal((await call('POST', path, instrutor.token)).status, 403)
    assert.equal((await call('POST', path, outroAluno.token)).status, 403)
    const res = await call('POST', path, aluno.token)
    assert.equal(res.status, 200)
    assert.ok((await res.json()).consentAt)
    // outro aluno ainda não tem anamnese cadastrada
    assert.equal((await call('POST', `${outroAluno.id}/consent`, outroAluno.token)).status, 404)
  })

  it('observações do personal não mudam a data da anamnese', async () => {
    const before = await (await call('GET', aluno.id, instrutor.token)).json()
    const notes = { notes: 'Dor no joelho hoje' }
    const res = await call('PUT', `${aluno.id}/notes`, instrutor.token, notes)
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.instructorNotes, 'Dor no joelho hoje')
    assert.equal(body.updatedAt, before.updatedAt)
    assert.equal((await call('PUT', `${aluno.id}/notes`, aluno.token, notes)).status, 403)
  })

  it('instrutor com vínculo lê; sem vínculo, outro aluno e admin não', async () => {
    assert.equal((await call('GET', aluno.id, instrutor.token)).status, 200)
    assert.equal((await call('GET', aluno.id, semVinculo.token)).status, 403)
    assert.equal((await call('GET', aluno.id, outroAluno.token)).status, 403)
    assert.equal((await call('GET', aluno.id, admin.token)).status, 403)
  })

  it('sinaliza vencida após 60 dias (RN04)', async () => {
    const old = new Date(Date.now() - 61 * 24 * 60 * 60 * 1000)
    await prisma.anamnesis.update({ where: { studentId: aluno.id }, data: { updatedAt: old } })
    assert.equal((await (await call('GET', aluno.id, aluno.token)).json()).outdated, true)
  })
})
