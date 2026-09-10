import { randomInt } from 'node:crypto'
import type { LoginInput, RegisterInput, Role } from '@espacofit/shared'
import { HttpError } from '../../lib/http.ts'
import { signAccess, signRefresh, verifyToken } from '../../lib/jwt.ts'
import { hashPassword, verifyPassword } from '../../lib/password.ts'
import { prisma } from '../../lib/prisma.ts'

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
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: publicUser })
  if (!user) throw new HttpError(401, 'Sessão expirada')
  return { user, ...tokens(user) }
}

export async function me(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: publicUser })
  if (!user) throw new HttpError(404, 'Usuário não encontrado')
  return user
}

// Gera código de 6 dígitos válido por 10 min. Envio do e-mail vai para a fila (worker).
export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return // resposta idêntica para não revelar se o e-mail existe
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await prisma.user.update({
    where: { id: user.id },
    data: { resetCode: code, resetCodeExpiresAt: new Date(Date.now() + 10 * 60_000) },
  })
  // ponytail: log no console até o worker de e-mail existir (sprint 3)
  console.log(`[reset-code] ${email}: ${code}`)
}

export async function resetPassword(email: string, code: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  const valid =
    user?.resetCode === code && user.resetCodeExpiresAt && user.resetCodeExpiresAt > new Date()
  if (!valid) throw new HttpError(400, 'Código inválido ou expirado')
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), resetCode: null, resetCodeExpiresAt: null },
  })
}
