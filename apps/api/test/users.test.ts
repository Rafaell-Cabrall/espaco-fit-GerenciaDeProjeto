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
const email = (tag: string) => {
  const e = `users-${tag}-${emails.length}-${run}@example.com`
  emails.push(e)
  return e
}

let base: string
let server: ReturnType<typeof app.listen>

async function user(role: Role) {
  const u = await prisma.user.create({
    data: { name: 'Teste', email: email(role.toLowerCase()), passwordHash: 'x', role },
  })
  return { id: u.id, token: signAccess(u.id, role, 0) }
}

const call = (method: string, path: string, token: string, body?: unknown) =>
  fetch(`${base}/users${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

// Convites ficam na fila sem worker no teste; o e-mail é example.com, mas não deixamos lixo no Redis
const inviteJob = async (to: string) =>
  (await queue.getJobs(['waiting', 'delayed'])).find((j) => 'to' in j.data && j.data.to === to)

const anamnesis = {
  birthDate: '1998-03-15',
  goal: 'Hipertrofia',
  conditions: 'Asma',
  cpf: String(run).slice(-11),
}

describe('users', () => {
  let admin: Awaited<ReturnType<typeof user>>
  let instrutor: Awaited<ReturnType<typeof user>>

  before(async () => {
    server = app.listen(0)
    const addr = server.address()
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
    admin = await user('ADMIN')
    instrutor = await user('INSTRUTOR')
  })

  after(async () => {
    const students = { where: { student: { email: { in: emails } } } }
    for (const e of emails) await (await inviteJob(e))?.remove()
    await prisma.link.deleteMany(students)
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    await prisma.$disconnect()
    await queue.close()
    await redis.quit()
    server.close()
  })

  it('admin convida: sem senha, código de 72 h e e-mail na fila', async () => {
    const input = { name: 'Ana Nova', email: email('nova'), role: 'INSTRUTOR' }
    const res = await call('POST', '', admin.token, input)
    assert.equal(res.status, 201)
    const body = await res.json()
    assert.deepEqual(Object.keys(body).sort(), ['email', 'id', 'name', 'role'])
    assert.equal(body.role, 'INSTRUTOR')

    const row = await prisma.user.findUniqueOrThrow({ where: { email: input.email } })
    assert.match(row.resetCode ?? '', /^[0-9a-f]{64}$/)
    const hours = ((row.resetCodeExpiresAt?.getTime() ?? 0) - Date.now()) / 3_600_000
    assert.ok(hours > 71 && hours <= 72)
    assert.match(JSON.stringify((await inviteJob(input.email))?.data), /primeiro acesso/)

    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: input.email, password: 'Senha123' }),
    })
    assert.equal(login.status, 401)

    assert.equal((await call('POST', '', admin.token, input)).status, 409)
  })

  it('instrutor cadastra aluno com anamnese e o vínculo nasce junto', async () => {
    const res = await call('POST', '', instrutor.token, {
      name: 'João Silva',
      email: email('aluno'),
      anamnesis,
    })
    assert.equal(res.status, 201)
    const { id, role } = await res.json()
    assert.equal(role, 'ALUNO')
    const link = await prisma.link.findFirst({ where: { studentId: id, status: 'ACTIVE' } })
    assert.equal(link?.instructorId, instrutor.id)
    const row = await prisma.anamnesis.findUniqueOrThrow({ where: { studentId: id } })
    assert.equal(row.consentAt, null)
    assert.equal((row.answers as { conditions: string }).conditions, 'Asma')
    assert.equal((row.answers as { cpf: string }).cpf, anamnesis.cpf)
  })

  it('bloqueia CPF repetido com outro e-mail em cadastros simultâneos', async () => {
    const cpf = String(run + 1).slice(-11)
    const inputs = ['cpf-a', 'cpf-b'].map((tag) => ({
      name: 'Aluno Duplicado',
      email: email(tag),
      anamnesis: { ...anamnesis, cpf },
    }))
    const responses = await Promise.all(
      inputs.map((input) => call('POST', '', instrutor.token, input)),
    )
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409])
    const rejected = responses.find((response) => response.status === 409)
    assert.ok(rejected)
    assert.equal((await rejected.json()).error, 'Já existe um aluno cadastrado com este CPF.')
    assert.equal(
      await prisma.user.count({ where: { email: { in: inputs.map((input) => input.email) } } }),
      1,
    )
  })

  it('instrutor não cria outro perfil nem aluno sem anamnese', async () => {
    const semAnamnese = { name: 'Sem Anamnese', email: email('s') }
    assert.equal((await call('POST', '', instrutor.token, semAnamnese)).status, 400)
    const outroPerfil = { name: 'Hacker', email: email('x'), role: 'ADMIN', anamnesis }
    assert.equal((await call('POST', '', instrutor.token, outroPerfil)).status, 403)
    const instrutorComAnamnese = { name: 'Ana', email: email('y'), role: 'INSTRUTOR', anamnesis }
    assert.equal((await call('POST', '', admin.token, instrutorComAnamnese)).status, 400)
  })

  it('valida o body e o filtro de perfil', async () => {
    assert.equal((await call('POST', '', admin.token, { name: 'A', email: 'nao' })).status, 400)
    assert.equal((await call('GET', '?role=CHEFE', admin.token)).status, 400)
  })

  it('lista filtrando por perfil; só admin lista', async () => {
    const res = await call('GET', '?role=INSTRUTOR', admin.token)
    assert.equal(res.status, 200)
    const list: { id: string; role: string }[] = await res.json()
    assert.ok(list.some((u) => u.id === instrutor.id))
    assert.ok(list.every((u) => u.role === 'INSTRUTOR'))
    assert.equal((await call('GET', '', instrutor.token)).status, 403)
  })
})
