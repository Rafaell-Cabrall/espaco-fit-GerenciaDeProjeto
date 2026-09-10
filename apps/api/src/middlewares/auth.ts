import type { Role } from '@espacofit/shared'
import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/http.ts'
import { verifyToken } from '../lib/jwt.ts'
import { prisma } from '../lib/prisma.ts'

declare global {
  namespace Express {
    interface Request {
      user: { id: string; role: Role }
    }
  }
}

export function auth(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, '')
  const payload = token && verifyToken(token, 'access')
  if (!payload) throw new HttpError(401, 'Não autenticado')
  req.user = { id: payload.sub, role: payload.role }
  next()
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) throw new HttpError(403, 'Sem permissão')
    next()
  }
}

// RN09/RNF04: instrutor só acessa aluno com vínculo ATIVO. Admin passa. Aluno só acessa a si mesmo.
export async function requireLink(req: Request, _res: Response, next: NextFunction) {
  const studentId = req.params.studentId as string
  const { id, role } = req.user
  if (role === 'ADMIN' || (role === 'ALUNO' && id === studentId)) return next()
  if (role === 'INSTRUTOR') {
    const link = await prisma.link.findFirst({
      where: { studentId, instructorId: id, status: 'ACTIVE' },
    })
    if (link) return next()
  }
  throw new HttpError(403, 'Sem vínculo ativo com este aluno')
}
