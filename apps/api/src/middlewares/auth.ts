import type { Role } from '@espacofit/shared'
import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/http.ts'
import { verifyToken } from '../lib/jwt.ts'
import { prisma } from '../lib/prisma.ts'
import { billingStatus } from '../modules/billing/status.ts'

declare global {
  namespace Express {
    interface Request {
      user: { id: string; role: Role }
    }
  }
}

// Consulta o usuário a cada requisição (uma leitura por chave primária, com a mensalidade): desativação, logout,
// troca de senha e mudança de perfil valem na hora, sem esperar o token expirar.
export async function auth(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, '')
  const payload = token && verifyToken(token, 'access')
  if (!payload) throw new HttpError(401, 'Não autenticado')
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      role: true,
      active: true,
      tokenVersion: true,
      subscription: { select: { dueDate: true } },
    },
  })
  if (!user?.active || user.tokenVersion !== payload.ver)
    throw new HttpError(401, 'Sessão expirada')
  // RN07: 2 meses de atraso bloqueiam o app; o aluno ainda entra, sai e vê a mensalidade
  const due = user.role === 'ALUNO' && user.subscription?.dueDate
  if (due && billingStatus(due) === 'BLOCKED' && !['/auth', '/billing'].includes(req.baseUrl)) {
    throw new HttpError(
      402,
      'Acesso bloqueado: mensalidade vencida há mais de 2 meses. Regularize na recepção.',
    )
  }
  req.user = { id: payload.sub, role: user.role }
  next()
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) throw new HttpError(403, 'Sem permissão')
    next()
  }
}

export const hasActiveLink = async (studentId: string, instructorId: string) =>
  !!(await prisma.link.findFirst({ where: { studentId, instructorId, status: 'ACTIVE' } }))

// RN09/RNF04: instrutor só acessa aluno com vínculo ATIVO. Admin passa. Aluno só acessa a si mesmo.
// studentId vem da rota, do body já validado (POST /plans) ou da query (GET /plans?studentId=).
export async function requireLink(req: Request, _res: Response, next: NextFunction) {
  const studentId = req.params.studentId ?? req.body?.studentId ?? req.query.studentId
  // Sem studentId o filtro do Prisma sumiria e qualquer vínculo passaria
  if (typeof studentId !== 'string' || !studentId) throw new HttpError(400, 'Informe o aluno')
  const { id, role } = req.user
  if (role === 'ADMIN' || (role === 'ALUNO' && id === studentId)) return next()
  if (role === 'INSTRUTOR' && (await hasActiveLink(studentId, id))) return next()
  throw new HttpError(403, 'Sem vínculo ativo com este aluno')
}
