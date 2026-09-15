import { createHash, randomInt } from 'node:crypto'
import type { LoginInput, RegisterInput, Role } from '@espacofit/shared'
import { HttpError } from '../../lib/http.ts'
import { signAccess, signRefresh, verifyToken } from '../../lib/jwt.ts'
import { hashPassword, verifyPassword } from '../../lib/password.ts'
import { prisma } from '../../lib/prisma.ts'
import { enqueue } from '../../lib/queue.ts'
import { redis } from '../../lib/redis.ts'

type SessionUser = { id: string; name: string; email: string; role: Role; tokenVersion: number }

function session({ id, name, email, role, tokenVersion }: SessionUser) {
  return {
    user: { id, name, email, role },
    accessToken: signAccess(id, role, tokenVersion),
    refreshToken: signRefresh(id, role, tokenVersion),
  }
}

// Contador em janela fixa no Redis. MULTI garante que a chave sempre ganha TTL.
async function hit(key: string, windowSec: number) {
  const res = await redis.multi().incr(key).expire(key, windowSec, 'NX').exec()
  return Number(res?.[0]?.[1])
}

export async function register(input: RegisterInput) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } })
  if (exists) throw new HttpError(409, 'E-mail já cadastrado')
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    },
  })
  return session(user)
}

const LOGIN_MAX_FAILS = 10
const LOGIN_WINDOW_SEC = 15 * 60
const loginFailKey = (email: string) => `rl:login:${email}`
// E-mail inexistente também paga o scrypt: o tempo de resposta não revela quem tem conta
const dummyHash = hashPassword('senha-que-nao-pertence-a-ninguem')

export async function login({ email, password }: LoginInput) {
  if (Number(await redis.get(loginFailKey(email))) >= LOGIN_MAX_FAILS) {
    throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos ou use "Esqueci a senha".')
  }
  const user = await prisma.user.findUnique({ where: { email } })
  const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash))
  if (!user || !valid) {
    await hit(loginFailKey(email), LOGIN_WINDOW_SEC)
    throw new HttpError(401, 'E-mail ou senha inválidos')
  }
  // Só depois da senha certa, para não revelar o status de contas alheias
  if (!user.active) throw new HttpError(403, 'Conta desativada. Procure a recepção da academia.')
  await redis.del(loginFailKey(email))
  return session(user)
}

export async function refresh(refreshToken: string) {
  const payload = verifyToken(refreshToken, 'refresh')
  if (!payload) throw new HttpError(401, 'Sessão expirada')
  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user?.active || user.tokenVersion !== payload.ver)
    throw new HttpError(401, 'Sessão expirada')
  return session(user)
}

// O middleware auth já garantiu usuário ativo com token válido
export async function me(id: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  })
}

// ponytail: derruba as sessões em todos os aparelhos; sessão por aparelho exige tabela de refresh tokens
export async function logout(id: string) {
  await prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } })
}

// O banco guarda só o hash: um vazamento do banco não entrega códigos válidos
const hashCode = (code: string) => createHash('sha256').update(code).digest('hex')
const RESEND_COOLDOWN_SEC = 60 // timer "Reenviar código em 00:59" do Figma
const CODES_PER_HOUR = 5 // protege a caixa do aluno e a cota diária do SMTP

// Gera código de 6 dígitos válido por 10 min. O e-mail sai pelo worker; a resposta não espera o SMTP.
export async function forgotPassword(email: string) {
  // Limites valem para qualquer e-mail, exista ou não: a resposta não revela quem tem conta
  const cooldownKey = `rl:forgot-cooldown:${email}`
  if (!(await redis.set(cooldownKey, 1, 'EX', RESEND_COOLDOWN_SEC, 'NX'))) {
    throw new HttpError(429, `Aguarde ${await redis.ttl(cooldownKey)} s para pedir outro código.`)
  }
  if ((await hit(`rl:forgot-hour:${email}`, 3600)) > CODES_PER_HOUR) {
    throw new HttpError(429, 'Limite de códigos atingido. Tente de novo em 1 hora.')
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetCode: hashCode(code),
      resetCodeExpiresAt: new Date(Date.now() + 10 * 60_000),
      resetCodeAttempts: 0,
    },
  })
  await enqueue('email', {
    to: email,
    subject: 'Seu código de recuperação — Espaço Fit',
    text: `Olá, ${user.name}!\n\nSeu código para redefinir a senha é ${code}. Ele vale por 10 minutos.\n\nSe você não pediu a troca de senha, ignore este e-mail.`,
  })
}

// Verificar + redefinir gastam 2; sobram 3 erros de digitação antes de pedir "Reenviar código".
const MAX_RESET_CHECKS = 5

// Tela "Verifique seu e-mail". Conta a tentativa ANTES de comparar: requisições em paralelo
// recebem contagens distintas, então ninguém testa mais de MAX_RESET_CHECKS códigos.
export async function verifyResetCode(email: string, code: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) throw new HttpError(400, 'Código inválido ou expirado')
  const { resetCode, resetCodeExpiresAt, resetCodeAttempts } = await prisma.user.update({
    where: { id: user.id },
    data: { resetCodeAttempts: { increment: 1 } },
  })
  const valid =
    resetCodeAttempts <= MAX_RESET_CHECKS &&
    resetCode === hashCode(code) &&
    resetCodeExpiresAt !== null &&
    resetCodeExpiresAt > new Date()
  if (!valid) throw new HttpError(400, 'Código inválido ou expirado')
  return user.id
}

// Nova senha encerra todas as sessões abertas e libera o login travado por erros
export async function resetPassword(email: string, code: string, password: string) {
  const id = await verifyResetCode(email, code)
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await hashPassword(password),
      resetCode: null,
      resetCodeExpiresAt: null,
      tokenVersion: { increment: 1 },
    },
  })
  await redis.del(loginFailKey(email))
}
