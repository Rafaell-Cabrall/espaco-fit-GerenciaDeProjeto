// Integração: exige Postgres e Redis (docker compose up -d) e migrações aplicadas.
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { Role, StudentLink } from '@espacofit/shared'
import { app } from '../src/app.ts'
import { signAccess } from '../src/lib/jwt.ts'
import { prisma } from '../src/lib/prisma.ts'
import { queue } from '../src/lib/queue.ts'
import { redis } from '../src/lib/redis.ts'

const run = Date.now()
const emails: string[] = []

let base: string
let server: ReturnType<typeof app.listen>

async function user(role: Role, active = true) {
  const email = `links-${role.toLowerCase()}-${emails.length}-${run}@example.com`
  emails.push(email)
  const u = await prisma.user.create({
    data: { name: `Teste ${emails.length}`, email, passwordHash: 'x', role, active },
  })
  return { id: u.id, token: signAccess(u.id, role, 0) }
}

const call = (method: string, token: string, body?: unknown) =>
  fetch(`${base}/links`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

describe('links', () => {
  let admin: Awaited<ReturnType<typeof user>>
  let aluno: Awaited<ReturnType<typeof user>>
  let instrutor: Awaited<ReturnType<typeof user>>
  let outroInstrutor: Awaited<ReturnType<typeof user>>

  before(async () => {
    server = app.listen(0)
    const addr = server.address()
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
    admin = await user('ADMIN')
    aluno = await user('ALUNO')
    instrutor = await user('INSTRUTOR')
    outroInstrutor = await user('INSTRUTOR')
  })

  after(async () => {
    await prisma.anamnesis.deleteMany({ where: { student: { email: { in: emails } } } })
    await prisma.link.deleteMany({ where: { student: { email: { in: emails } } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    await prisma.$disconnect()
    await queue.close()
    await redis.quit()
    server.close()
  })

  const active = () => prisma.link.findMany({ where: { studentId: aluno.id, status: 'ACTIVE' } })

  it('admin vincula; repetir com o mesmo instrutor não duplica', async () => {
    const body = { studentId: aluno.id, instructorId: instrutor.id }
    const res = await call('POST', admin.token, body)
    assert.equal(res.status, 201)
    const link = await res.json()
    assert.equal(link.status, 'ACTIVE')
    assert.equal(link.endedAt, null)
    assert.equal(link.student.id, aluno.id)
    assert.equal(link.instructor.id, instrutor.id)

    const again = await (await call('POST', admin.token, body)).json()
    assert.equal(again.id, link.id)
    assert.equal((await active()).length, 1)
  })

  it('trocar de instrutor encerra o vínculo anterior (RU07)', async () => {
    const res = await call('POST', admin.token, {
      studentId: aluno.id,
      instructorId: outroInstrutor.id,
    })
    assert.equal(res.status, 201)
    const links = await prisma.link.findMany({ where: { studentId: aluno.id } })
    assert.equal(links.length, 2)
    const ended = links.find((l) => l.instructorId === instrutor.id)
    assert.equal(ended?.status, 'ENDED')
    assert.ok(ended?.endedAt)
    assert.deepEqual(
      (await active()).map((l) => l.instructorId),
      [outroInstrutor.id],
    )
  })

  it('POST simultâneos deixam um único vínculo ativo', async () => {
    const outro = await user('ALUNO')
    await Promise.all(
      [instrutor, outroInstrutor, instrutor].map((i) =>
        call('POST', admin.token, { studentId: outro.id, instructorId: i.id }),
      ),
    )
    const ativos = await prisma.link.count({ where: { studentId: outro.id, status: 'ACTIVE' } })
    assert.equal(ativos, 1)
  })

  it('recusa instrutor inativo, instrutor que não é instrutor e aluno inexistente', async () => {
    const inativo = await user('INSTRUTOR', false)
    for (const body of [
      { studentId: aluno.id, instructorId: inativo.id },
      { studentId: aluno.id, instructorId: admin.id },
      { studentId: instrutor.id, instructorId: outroInstrutor.id },
      { studentId: 'nao-existe', instructorId: outroInstrutor.id },
    ]) {
      assert.equal((await call('POST', admin.token, body)).status, 404)
    }
  })

  it('instrutor lista só os próprios alunos; admin lista todos', async () => {
    const mine: { student: { id: string } }[] = await (
      await call('GET', outroInstrutor.token)
    ).json()
    assert.ok(mine.some((l) => l.student.id === aluno.id))
    const deOutro: { student: { id: string } }[] = await (await call('GET', instrutor.token)).json()
    assert.ok(!deOutro.some((l) => l.student.id === aluno.id))
    assert.equal((await call('GET', admin.token)).status, 200)
  })

  it('lista traz objetivo e nascimento só para o instrutor (RN09)', async () => {
    await prisma.anamnesis.create({
      data: { studentId: aluno.id, answers: { birthDate: '1998-03-15', goal: 'Tonificação' } },
    })
    type Row = { student: StudentLink['student'] }
    const find = async (token: string) =>
      ((await (await call('GET', token)).json()) as Row[]).find((l) => l.student.id === aluno.id)
    const mine = await find(outroInstrutor.token)
    assert.equal(mine?.student.goal, 'Tonificação')
    assert.equal(mine?.student.birthDate, '1998-03-15')
    assert.equal(mine?.student.lastWorkoutAt, null)
    const asAdmin = await find(admin.token)
    assert.equal(asAdmin?.student.goal, null)
    assert.equal(asAdmin?.student.birthDate, null)
  })

  it('aluno não lista nem vincula', async () => {
    assert.equal((await call('GET', aluno.token)).status, 403)
    const body = { studentId: aluno.id, instructorId: instrutor.id }
    assert.equal((await call('POST', instrutor.token, body)).status, 403)
  })
})
