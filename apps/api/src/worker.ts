import { Worker } from 'bullmq'
import { connection, type Jobs } from './lib/queue.ts'

const handlers: { [K in keyof Jobs]: (data: Jobs[K]) => Promise<void> } = {
  ping: async (data) => {
    console.log('[worker] ping', data.at)
  },
}

new Worker(
  'jobs',
  async (job) => {
    const handler = handlers[job.name as keyof Jobs]
    if (!handler) throw new Error(`job desconhecido: ${job.name}`)
    await handler(job.data as never)
  },
  { connection },
)

console.log('worker ouvindo a fila "jobs"')
