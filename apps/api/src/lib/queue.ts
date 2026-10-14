// Fila única "jobs"; cada job tem um `name` tratado no worker. Adicione nomes aqui conforme surgirem.
import { Queue } from 'bullmq'
import { env } from './env.ts'
import type { Mail } from './mail.ts'
import type { Push } from './push.ts'

export const connection = { url: env.REDIS_URL }

export type Jobs = {
  ping: { at: string }
  email: Mail
  push: Push
  outdated: Record<string, never> // RN04, agendado no worker
  'billing-reminder': Record<string, never> // RN06, agendado no worker
}

export const queue = new Queue<Jobs[keyof Jobs]>('jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true, // e-mail leva código de recuperação: não fica no Redis depois de enviado
    removeOnFail: 100,
  },
})

export function enqueue<K extends keyof Jobs>(name: K, data: Jobs[K]) {
  return queue.add(name, data)
}
