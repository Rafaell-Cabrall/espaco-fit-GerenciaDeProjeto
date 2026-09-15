// Integração: exige Postgres e Redis (docker compose up -d) e migrações aplicadas.
import assert from 'node:assert/strict'
import { createHash, randomInt } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import { app } from '../src/app.ts'
import { prisma } from '../src/lib/prisma.ts'
import { queue } from '../src/lib/queue.ts'
import { redis } from '../src/lib/redis.ts'

const run = Date.now()
const email = `teste-${run}@espacofit.com`
// example.com é reservado: se um worker local com SMTP pegar o job, não chega a ninguém real
const resetEmail = `reset-${run}@example.com`
const sessionEmail = `sessao-${run}@example.com`
const lockEmail = `bloqueio-${run}@example.com`
const ghostEmail = `ninguem-${run}@example.com`
const testEmails = [email, resetEmail, sessionEmail, lockEmail, ghostEmail]

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
const me = (token: string) =>
  fetch(`${base}/auth/me`, { headers: { authorization: `Bearer ${token}` } })
const register = (e: string) =>
  post('/auth/register', { name: 'Teste', email: e, password: 'Senha123', acceptedTerms: true })
const login = (e: string, password = 'Senha123') => post('/auth/login', { email: e, password })
const clearLimits = (e: string) =>
  redis.del(`rl:login:${e}`, `rl:forgot-cooldown:${e}`, `rl:forgot-hour:${e}`)

before(async () => {
  server = app.listen(0)
  const addr = server.address()
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
})

after(async () => {
  await prisma.user.deleteMany({ where: { email: { in: testEmails } } })
  for (const e of testEmails) await clearLimits(e)
  for (const job of await queue.getJobs(['waiting', 'delayed'])) {
    if ('to' in job.data && testEmails.includes(job.data.to)) await job.remove()
  }
  await prisma.$disconnect()
  await queue.close()
  await redis.quit()
  server.close()
})

describe('auth', () => {
  it('registra, faz login e lê /me', async () => {
    const reg = await register(email)
    assert.equal(reg.status, 201)
    const { user, accessToken } = await reg.json()
    assert.equal(user.role, 'ALUNO')

    assert.equal((await login(email)).status, 200)

    const res = await me(accessToken)
    assert.equal(res.status, 200)
    assert.equal((await res.json()).email, email)
  })

  it('rejeita senha fraca e login inválido', async () => {
    const weak = await post('/auth/register', {
      name: 'X',
      email: `w${email}`,
      password: 'fraca',
      acceptedTerms: true,
    })
    assert.equal(weak.status, 400)
    assert.equal((await login(email, 'errada')).status, 401)
  })

  it('bloqueia rota autenticada sem token', async () => {
    const res = await fetch(`${base}/auth/me`)
    assert.equal(res.status, 401)
  })
})

describe('sessões', () => {
  let tokens: { accessToken: string; refreshToken: string }

  before(async () => {
    await register(sessionEmail)
    tokens = await (await login(sessionEmail)).json()
  })

  it('renova com o refresh token e recusa o access token no lugar dele', async () => {
    const res = await post('/auth/refresh', { refreshToken: tokens.refreshToken })
    assert.equal(res.status, 200)
    tokens = await res.json()
    assert.equal((await me(tokens.accessToken)).status, 200)
    assert.equal((await post('/auth/refresh', { refreshToken: tokens.accessToken })).status, 401)
  })

  it('logout derruba access e refresh na hora', async () => {
    assert.equal((await post('/auth/logout', {}, tokens.accessToken)).status, 204)
    assert.equal((await me(tokens.accessToken)).status, 401)
    assert.equal((await post('/auth/refresh', { refreshToken: tokens.refreshToken })).status, 401)
  })

  it('conta desativada perde a sessão e recebe 403 só com a senha certa', async () => {
    const { accessToken } = await (await login(sessionEmail)).json()
    await prisma.user.update({ where: { email: sessionEmail }, data: { active: false } })

    assert.equal((await me(accessToken)).status, 401)
    assert.equal((await login(sessionEmail)).status, 403)
    assert.equal((await login(sessionEmail, 'Errada123')).status, 401)
  })
})

describe('limite de login', () => {
  before(() => register(lockEmail))

  it('trava após 10 erros, mesmo com a senha certa', async () => {
    for (let i = 0; i < 10; i++) assert.equal((await login(lockEmail, 'Errada123')).status, 401)
    assert.equal((await login(lockEmail)).status, 429)
  })
})

describe('recuperação de senha', () => {
  const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
  const verify = (code: string) => post('/auth/verify-reset-code', { email: resetEmail, code })
  const wrong = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, '0')
  // O banco guarda só o hash e o código real vai no e-mail: o teste troca por um código conhecido
  const sendCode = async () => {
    await clearLimits(resetEmail)
    assert.equal((await post('/auth/forgot-password', { email: resetEmail })).status, 204)
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    await prisma.user.update({ where: { email: resetEmail }, data: { resetCode: sha256(code) } })
    return code
  }

  before(() => register(resetEmail))

  it('guarda só o hash do código', async () => {
    await clearLimits(resetEmail)
    assert.equal((await post('/auth/forgot-password', { email: resetEmail })).status, 204)
    const { resetCode } = await prisma.user.findUniqueOrThrow({ where: { email: resetEmail } })
    assert.match(resetCode ?? '', /^[0-9a-f]{64}$/)
  })

  it('verifica, redefine, derruba sessões antigas e não aceita o código de novo', async () => {
    const old = await (await login(resetEmail)).json()
    const code = await sendCode()

    assert.equal((await verify(wrong(code))).status, 400)
    assert.equal((await verify(code)).status, 204)

    const reset = await post('/auth/reset-password', {
      email: resetEmail,
      code,
      password: 'NovaSenha1',
    })
    assert.equal(reset.status, 204)
    assert.equal((await login(resetEmail, 'NovaSenha1')).status, 200)
    assert.equal((await post('/auth/refresh', { refreshToken: old.refreshToken })).status, 401)
    assert.equal((await verify(code)).status, 400)
  })

  it('invalida o código após 5 conferências, mesmo em paralelo', async () => {
    const code = await sendCode()
    await Promise.all(Array.from({ length: 5 }, () => verify(wrong(code))))
    assert.equal((await verify(code)).status, 400)

    const fresh = await sendCode() // "Reenviar código" libera novas tentativas
    assert.equal((await verify(fresh)).status, 204)
  })

  it('responde igual para e-mail inexistente', async () => {
    const res = await post('/auth/verify-reset-code', { email: ghostEmail, code: '123456' })
    assert.equal(res.status, 400)
  })

  it('exige 60 s entre envios, exista ou não a conta', async () => {
    for (const e of [resetEmail, ghostEmail]) {
      await clearLimits(e)
      assert.equal((await post('/auth/forgot-password', { email: e })).status, 204)
      assert.equal((await post('/auth/forgot-password', { email: e })).status, 429)
    }
  })
})
