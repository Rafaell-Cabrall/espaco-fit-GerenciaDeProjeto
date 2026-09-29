// Integração: exige Postgres e Redis (docker compose up -d) e migrações aplicadas.
// O envio pela URL assinada só roda com o MinIO no ar; o CI não sobe MinIO.
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { CreatedExercise, Role } from '@espacofit/shared'
import { app } from '../src/app.ts'
import { env } from '../src/lib/env.ts'
import { signAccess } from '../src/lib/jwt.ts'
import { prisma } from '../src/lib/prisma.ts'
import { queue } from '../src/lib/queue.ts'
import { redis } from '../src/lib/redis.ts'

const run = Date.now()
const emails: string[] = []
const minio = await fetch(`${env.S3_ENDPOINT}/minio/health/live`).then(
  (r) => r.ok,
  () => false,
)

let base: string
let server: ReturnType<typeof app.listen>

async function user(role: Role) {
  const email = `exercicio-${role.toLowerCase()}-${emails.length}-${run}@example.com`
  emails.push(email)
  const u = await prisma.user.create({ data: { name: 'Teste', email, passwordHash: 'x', role } })
  return { id: u.id, token: signAccess(u.id, role, 0) }
}

const create = (token: string, body: unknown) =>
  fetch(`${base}/exercises`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })

describe('exercícios', () => {
  let instrutor: Awaited<ReturnType<typeof user>>
  let aluno: Awaited<ReturnType<typeof user>>

  before(async () => {
    server = app.listen(0)
    const addr = server.address()
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
    instrutor = await user('INSTRUTOR')
    aluno = await user('ALUNO')
  })

  after(async () => {
    await prisma.exercise.deleteMany({ where: { name: { endsWith: String(run) } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    await prisma.$disconnect()
    await queue.close()
    await redis.quit()
    server.close()
  })

  it('instrutor cadastra com mídia e recebe a URL de envio', async () => {
    const res = await create(instrutor.token, {
      name: `Hip Thrust ${run}`,
      muscleGroup: 'Glúteos',
      mediaType: 'video/mp4',
    })
    assert.equal(res.status, 201)
    const { exercise, uploadUrl }: CreatedExercise = await res.json()
    assert.equal(exercise.muscleGroup, 'Glúteos')
    assert.equal(exercise.mediaType, 'video/mp4')
    assert.match(uploadUrl ?? '', new RegExp(`/exercises/${exercise.id}\\.mp4\\?`))
    const row = await prisma.exercise.findUniqueOrThrow({ where: { id: exercise.id } })
    assert.equal(row.createdById, instrutor.id)
  })

  it('sem mídia não gera URL', async () => {
    const res = await create(instrutor.token, { name: `Prancha ${run}`, muscleGroup: 'Core' })
    const { exercise, uploadUrl }: CreatedExercise = await res.json()
    assert.equal(uploadUrl, null)
    assert.equal(exercise.mediaUrl, null)
    assert.equal(exercise.mediaType, null)
  })

  it('valida o grupo e o perfil', async () => {
    const pescoco = { name: `Pescoço ${run}`, muscleGroup: 'Pescoço' }
    assert.equal((await create(instrutor.token, pescoco)).status, 400)
    const core = { name: `Core ${run}`, muscleGroup: 'Core' }
    assert.equal((await create(aluno.token, core)).status, 403)
  })

  it('o arquivo sobe pela URL no MinIO', { skip: !minio && 'MinIO fora do ar' }, async () => {
    const res = await create(instrutor.token, {
      name: `Gif ${run}`,
      muscleGroup: 'Peito',
      mediaType: 'image/gif',
    })
    const { exercise, uploadUrl }: CreatedExercise = await res.json()
    const put = await fetch(uploadUrl ?? '', {
      method: 'PUT',
      headers: { 'content-type': 'image/gif' },
      body: 'GIF89a',
    })
    assert.equal(put.status, 200)
    assert.equal(await (await fetch(exercise.mediaUrl ?? '')).text(), 'GIF89a')
  })
})
