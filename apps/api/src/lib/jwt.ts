import type { Role } from '@espacofit/shared'
import jwt from 'jsonwebtoken'
import { env } from './env.ts'

// ver = User.tokenVersion na emissão; o middleware recusa se o banco tiver outro valor
export type TokenPayload = { sub: string; role: Role; ver: number; kind: 'access' | 'refresh' }

function sign(
  sub: string,
  role: Role,
  ver: number,
  kind: TokenPayload['kind'],
  expiresIn: jwt.SignOptions['expiresIn'],
) {
  return jwt.sign({ role, ver, kind } satisfies Partial<TokenPayload>, env.JWT_SECRET, {
    subject: sub,
    expiresIn,
  })
}

export const signAccess = (sub: string, role: Role, ver: number) =>
  sign(sub, role, ver, 'access', '15m')
export const signRefresh = (sub: string, role: Role, ver: number) =>
  sign(sub, role, ver, 'refresh', '30d')

export function verifyToken(token: string, kind: TokenPayload['kind']): TokenPayload | null {
  try {
    const p = jwt.verify(token, env.JWT_SECRET) as TokenPayload
    return p.kind === kind ? p : null
  } catch {
    return null
  }
}
