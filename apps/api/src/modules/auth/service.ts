import { randomInt } from 'node:crypto'
import type { LoginInput, RegisterInput, Role } from '@espacofit/shared'
import { HttpError } from '../../lib/http.ts'
import { signAccess, signRefresh, verifyToken } from '../../lib/jwt.ts'
import { hashPassword, verifyPassword } from '../../lib/password.ts'
import { prisma } from '../../lib/prisma.ts'
import { enqueue } from '../../lib/queue.ts'

const publicUser = { id: true, name: true, email: true, role: true } as const

function tokens(user: { id: string; role: Role }) {
  return {
    accessToken: signAccess(user.id, user.role),
    refreshToken: signRefresh(user.id, user.role),
  }
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
    select: publicUser,
  })
  return { user, ...tokens(user) }
}

export async function login({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user?.active || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, 'E-mail ou senha inválidos')
  }
  const { id, name, role } = user
  return { user: { id, name, email, role }, ...tokens(user) }
}

export async function refresh(refreshToken: string) {
  const payload = verifyToken(refreshToken, 'refresh')
  if (!payload) throw new HttpError(401, 'Sessão expirada')
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { ...publicUser, active: true },
  })
  if (!user?.active) throw new HttpError(401, 'Sessão expirada')
  const { active: _, ...pub } = user
  return { user: pub, ...tokens(pub) }
}

export async function me(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { ...publicUser, active: true },
  })
  if (!user?.active) throw new HttpError(401, 'Sessão expirada')
  const { active: _, ...pub } = user
  return pub
}

// Gera código de 6 dígitos válido por 10 min. O e-mail sai pelo worker; a resposta não espera o SMTP.
export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return // resposta idêntica para não revelar se o e-mail existe
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetCode: code,
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
    resetCode === code &&
    resetCodeExpiresAt !== null &&
    resetCodeExpiresAt > new Date()
  if (!valid) throw new HttpError(400, 'Código inválido ou expirado')
  return user.id
}

export async function resetPassword(email: string, code: string, password: string) {
  const id = await verifyResetCode(email, code)
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), resetCode: null, resetCodeExpiresAt: null },
  })
}
