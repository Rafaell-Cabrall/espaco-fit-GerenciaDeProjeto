// Integração: exige Postgres e Redis (docker compose up -d) e migrações aplicadas.
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Announcement, Role } from '@espacofit/shared'
import { app } from '../src/app.ts'
import { signAccess } from '../src/lib/jwt.ts'
import { prisma } from '../src/lib/prisma.ts'
import { queue } from '../src/lib/queue.ts'
import { redis } from '../src/lib/redis.ts'
import { dayInSaoPaulo } from '../src/modules/sessions/frequency.ts'

const run = Date.now()
const emails: string[] = []
const hoje = dayInSaoPaulo(new Date())

let base: string
let server: ReturnType<typeof app.listen>

async function user(role: Role) {
  const email = `feed-${role.toLowerCase()}-${emails.length}-${run}@example.com`
  emails.push(email)
  const u = await prisma.user.create({ data: { name: 'Teste', email, passwordHash: 'x', role } })
  return { id: u.id, token: signAccess(u.id, role, 0) }
}

const call = (method: string, path: string, token: string, body?: unknown) =>
  fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

describe('feed', () => {
  let admin: Awaited<ReturnType<typeof user>>
  let aluno: Awaited<ReturnType<typeof user>>
  const ids: string[] = []

  before(async () => {
    server = app.listen(0)
    const addr = server.address()
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
    admin = await user('ADMIN')
    aluno = await user('ALUNO')
  })

  after(async () => {
    await prisma.announcement.deleteMany({ where: { id: { in: ids } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    await prisma.$disconnect()
    await queue.close()
    await redis.quit()
    server.close()
  })

  // Só os avisos deste teste: o banco local pode ter outros
  const feed = async (token: string) =>
    ((await (await call('GET', '/feed', token)).json()) as Announcement[]).filter((a) =>
      ids.includes(a.id),
    )

  it('admin publica; todos leem só os vigentes, mais recente primeiro', async () => {
    for (const expiresOn of [hoje, null]) {
      const res = await call('POST', '/feed', admin.token, {
        title: `Promoção ${run}`,
        body: 'Indique um amigo e ganhe 1 mês grátis!',
        expiresOn,
      })
      assert.equal(res.status, 201)
      ids.push((await res.json()).id)
    }
    const vencido = await prisma.announcement.create({
      data: { title: 'Velho', body: 'x', expiresOn: new Date('2020-01-01') },
    })
    ids.push(vencido.id)
    assert.deepEqual(
      (await feed(aluno.token)).map((a) => a.expiresOn),
      [null, hoje],
    )
  })

  it('só admin escreve; validade no passado é recusada', async () => {
    const body = { title: 'Aviso', body: 'Texto do aviso' }
    assert.equal((await call('POST', '/feed', aluno.token, body)).status, 403)
    const passado = { ...body, expiresOn: '2020-01-01' }
    assert.equal((await call('POST', '/feed', admin.token, passado)).status, 422)
  })

  it('admin apaga', async () => {
    assert.equal((await call('DELETE', `/feed/${ids[0]}`, aluno.token)).status, 403)
    assert.equal((await call('DELETE', `/feed/${ids[0]}`, admin.token)).status, 204)
    assert.equal((await feed(aluno.token)).length, 1)
  })
})
