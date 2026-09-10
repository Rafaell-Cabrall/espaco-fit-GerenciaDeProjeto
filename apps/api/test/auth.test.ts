// Integração: exige Postgres (docker compose up -d) e migrações aplicadas.
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { app } from '../src/app.ts'
import { prisma } from '../src/lib/prisma.ts'

const email = `teste-${Date.now()}@espacofit.com`
let base: string
let server: ReturnType<typeof app.listen>

const post = (path: string, body: unknown, token?: string) =>
  fetch(base + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  })

before(async () => {
  server = app.listen(0)
  const addr = server.address()
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
})

after(async () => {
  await prisma.user.deleteMany({ where: { email } })
  await prisma.$disconnect()
  server.close()
})

describe('auth', () => {
  it('registra, faz login e lê /me', async () => {
    const reg = await post('/auth/register', {
      name: 'Teste',
      email,
      password: 'Senha123',
      acceptedTerms: true,
    })
    assert.equal(reg.status, 201)
    const { user, accessToken } = await reg.json()
    assert.equal(user.role, 'ALUNO')

    const login = await post('/auth/login', { email, password: 'Senha123' })
    assert.equal(login.status, 200)

    const me = await fetch(`${base}/auth/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    assert.equal(me.status, 200)
    assert.equal((await me.json()).email, email)
  })

  it('rejeita senha fraca e login inválido', async () => {
    const weak = await post('/auth/register', {
      name: 'X',
      email: `w${email}`,
      password: 'fraca',
      acceptedTerms: true,
    })
    assert.equal(weak.status, 400)

    const bad = await post('/auth/login', { email, password: 'errada' })
    assert.equal(bad.status, 401)
  })

  it('bloqueia rota autenticada sem token', async () => {
    const res = await fetch(`${base}/auth/me`)
    assert.equal(res.status, 401)
  })
})
