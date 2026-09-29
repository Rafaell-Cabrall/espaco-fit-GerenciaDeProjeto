import { Worker } from 'bullmq'
import { sendMail } from './lib/mail.ts'
import { sendPush } from './lib/push.ts'
import { connection, type Jobs } from './lib/queue.ts'

const handlers: { [K in keyof Jobs]: (data: Jobs[K]) => Promise<void> } = {
  ping: async (data) => {
    console.log('[worker] ping', data.at)
  },
  email: sendMail,
  push: sendPush,
}

const worker = new Worker(
  'jobs',
  async (job) => {
    const handler = handlers[job.name as keyof Jobs]
    if (!handler) throw new Error(`job desconhecido: ${job.name}`)
    await handler(job.data as never)
  },
  { connection },
)

worker.on('failed', (job, err) => {
  console.error(`[worker] ${job?.name} falhou (tentativa ${job?.attemptsMade}):`, err.message)
})

console.log('worker ouvindo a fila "jobs"')
