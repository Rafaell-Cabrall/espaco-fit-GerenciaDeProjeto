import type { Role } from '@espacofit/shared'
import jwt from 'jsonwebtoken'
import { env } from './env.ts'

export type TokenPayload = { sub: string; role: Role; kind: 'access' | 'refresh' }

export function signAccess(sub: string, role: Role) {
  return jwt.sign({ role, kind: 'access' } satisfies Partial<TokenPayload>, env.JWT_SECRET, {
    subject: sub,
    expiresIn: '15m',
  })
}

export function signRefresh(sub: string, role: Role) {
  return jwt.sign({ role, kind: 'refresh' } satisfies Partial<TokenPayload>, env.JWT_SECRET, {
    subject: sub,
    expiresIn: '30d',
  })
}

export function verifyToken(token: string, kind: TokenPayload['kind']): TokenPayload | null {
  try {
    const p = jwt.verify(token, env.JWT_SECRET) as TokenPayload
    return p.kind === kind ? p : null
  } catch {
    return null
  }
}
