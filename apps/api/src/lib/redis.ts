// Conexão Redis da API para contadores de limite (a fila BullMQ mantém a própria).
import { Redis } from 'ioredis'
import { env } from './env.ts'

export const redis = new Redis(env.REDIS_URL)
