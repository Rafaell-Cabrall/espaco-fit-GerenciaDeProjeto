// Expo Push por HTTP (sem SDK). A API enfileira o job 'push'; só o worker chama sendPush.
import { prisma } from './prisma.ts'
import { enqueue } from './queue.ts'

export type Push = { to: string[]; title: string; body: string; data?: Record<string, string> }

// ponytail: ignora os tickets de erro (ex.: DeviceNotRegistered); limpar o token se o volume crescer
export async function sendPush({ to, ...message }: Push) {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(to.map((t) => ({ to: t, sound: 'default', ...message }))),
  })
  if (!res.ok) throw new Error(`Expo Push respondeu ${res.status}`)
}

// Enfileira para quem tem aparelho registrado; sem token, não faz nada
export async function notify(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, pushToken: { not: null } },
    select: { pushToken: true },
  })
  const to = users.flatMap((u) => (u.pushToken ? [u.pushToken] : []))
  if (to.length) await enqueue('push', { to, title, body, data })
}
