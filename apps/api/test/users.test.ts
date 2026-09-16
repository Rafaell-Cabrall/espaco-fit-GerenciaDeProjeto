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
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    await prisma.$disconnect()
    await queue.close()
    await redis.quit()
    server.close()
  })

  it('admin cria usuário que consegue fazer login', async () => {
    const input = {
      name: 'Ana Nova',
      email: email('nova'),
      password: 'Senha123',
      role: 'INSTRUTOR',
    }
    const res = await call('POST', '', admin.token, input)
    assert.equal(res.status, 201)
    const body = await res.json()
    assert.deepEqual(Object.keys(body).sort(), ['email', 'id', 'name', 'role'])
    assert.equal(body.role, 'INSTRUTOR')

    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: input.email, password: input.password }),
    })
    assert.equal(login.status, 200)

    assert.equal((await call('POST', '', admin.token, input)).status, 409)
  })

  it('valida o body e o filtro de perfil', async () => {
    const fraca = { name: 'Ana', email: email('fraca'), password: 'fraca', role: 'ALUNO' }
    assert.equal((await call('POST', '', admin.token, fraca)).status, 400)
    assert.equal((await call('GET', '?role=CHEFE', admin.token)).status, 400)
  })

  it('lista filtrando por perfil', async () => {
    const res = await call('GET', '?role=INSTRUTOR', admin.token)
    assert.equal(res.status, 200)
    const list: { id: string; role: string }[] = await res.json()
    assert.ok(list.some((u) => u.id === instrutor.id))
    assert.ok(list.every((u) => u.role === 'INSTRUTOR'))
  })

  it('só admin acessa', async () => {
    assert.equal((await call('GET', '', instrutor.token)).status, 403)
    const input = { name: 'Hacker', email: email('x'), password: 'Senha123', role: 'ADMIN' }
    assert.equal((await call('POST', '', instrutor.token, input)).status, 403)
  })
})
