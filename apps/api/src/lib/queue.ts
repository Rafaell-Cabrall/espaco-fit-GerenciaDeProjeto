// Fila única "jobs"; cada job tem um `name` tratado no worker. Adicione nomes aqui conforme surgirem.
import { Queue } from 'bullmq'
import { env } from './env.ts'

export const connection = { url: env.REDIS_URL }

export type Jobs = {
  ping: { at: string }
  // 'push': { userId: string; title: string; body: string }   (sprint 2)
  // 'daily-billing': Record<string, never>                     (sprint 3, RN06/RN07)
}

export const queue = new Queue<Jobs[keyof Jobs]>('jobs', { connection })

export function enqueue<K extends keyof Jobs>(name: K, data: Jobs[K]) {
  return queue.add(name, data)
}
