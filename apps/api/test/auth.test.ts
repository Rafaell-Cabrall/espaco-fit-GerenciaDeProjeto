// Integração: exige Postgres (docker compose up -d) e migrações aplicadas.
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { app } from '../src/app.ts'
import { prisma } from '../src/lib/prisma.ts'
import { queue } from '../src/lib/queue.ts'

const email = `teste-${Date.now()}@espacofit.com`
// example.com é reservado: se um worker local com SMTP pegar o job, não chega a ninguém real
const resetEmail = `reset-${Date.now()}@example.com`
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
  await prisma.user.deleteMany({ where: { email: { in: [email, resetEmail] } } })
  for (const job of await queue.getJobs(['waiting', 'delayed'])) {
    if ('to' in job.data && job.data.to === resetEmail) await job.remove()
  }
  await queue.close()
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

describe('recuperação de senha', () => {
  const sendCode = async () => {
    assert.equal((await post('/auth/forgot-password', { email: resetEmail })).status, 204)
    const user = await prisma.user.findUniqueOrThrow({ where: { email: resetEmail } })
    return user.resetCode as string
  }
  const wrong = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, '0')

  before(async () => {
    await post('/auth/register', {
      name: 'Reset',
      email: resetEmail,
      password: 'Senha123',
      acceptedTerms: true,
    })
  })

  it('verifica o código, redefine a senha e não aceita o código de novo', async () => {
    const code = await sendCode()
    const verify = (c: string) => post('/auth/verify-reset-code', { email: resetEmail, code: c })

    assert.equal((await verify(wrong(code))).status, 400)
    assert.equal((await verify(code)).status, 204)

    const reset = await post('/auth/reset-password', {
      email: resetEmail,
      code,
      password: 'NovaSenha1',
    })
    assert.equal(reset.status, 204)
    assert.equal(
      (await post('/auth/login', { email: resetEmail, password: 'NovaSenha1' })).status,
      200,
    )
    assert.equal((await verify(code)).status, 400)
  })

  it('invalida o código após 5 conferências, mesmo em paralelo', async () => {
    const code = await sendCode()
    const verify = (c: string) => post('/auth/verify-reset-code', { email: resetEmail, code: c })

    await Promise.all(Array.from({ length: 5 }, () => verify(wrong(code))))
    assert.equal((await verify(code)).status, 400)

    const fresh = await sendCode() // "Reenviar código" libera novas tentativas
    assert.equal((await verify(fresh)).status, 204)
  })

  it('responde igual para e-mail inexistente', async () => {
    const res = await post('/auth/verify-reset-code', {
      email: 'ninguem@espacofit.com',
      code: '123456',
    })
    assert.equal(res.status, 400)
  })
})
