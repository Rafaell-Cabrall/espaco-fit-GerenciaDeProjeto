// scrypt da stdlib: sem bcrypt. Formato salvo: "<salt-hex>:<hash-hex>"
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (p: string, s: string, n: number) => Promise<Buffer>

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = await scryptAsync(password, salt, 64)
  return `${salt}:${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(':')
  if (!salt || !hex) return false
  const hash = await scryptAsync(password, salt, 64)
  return timingSafeEqual(hash, Buffer.from(hex, 'hex'))
}
