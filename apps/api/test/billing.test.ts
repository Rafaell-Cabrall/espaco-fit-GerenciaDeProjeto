// Integração: exige Postgres e Redis (docker compose up -d) e migrações aplicadas.
// Sem worker no teste: confere os jobs de push e e-mail na fila, não o envio.
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { MembershipPlan, Role, StudentBilling, StudentLink } from '@espacofit/shared'
import { app } from '../src/app.ts'
import { signAccess } from '../src/lib/jwt.ts'
import { hashPassword } from '../src/lib/password.ts'
import { prisma } from '../src/lib/prisma.ts'
import { queue } from '../src/lib/queue.ts'
import { redis } from '../src/lib/redis.ts'
import { remindDueSoon } from '../src/modules/billing/reminder.ts'
import { dayInSaoPaulo } from '../src/modules/sessions/frequency.ts'

const run = Date.now()
const emails: string[] = []
const pushToken = `ExponentPushToken[billing-${run}]`
const DAY_MS = 86_400_000
const PASSWORD = 'Senha123'
const inDays = (n: number) => new Date(Date.parse(dayInSaoPaulo(new Date())) + n * DAY_MS)

let base: string
let server: ReturnType<typeof app.listen>
let passwordHash: string

async function user(role: Role) {
  const email = `billing-${role.toLowerCase()}-${emails.length}-${run}@example.com`
  emails.push(email)
  const u = await prisma.user.create({ data: { name: 'Ana Aluna', email, passwordHash, role } })
  return { id: u.id, email, token: signAccess(u.id, role, 0) }
}

const call = (method: string, path: string, token: string, body?: unknown) =>
  fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const jobsFor = async (needle: string) =>
  (await queue.getJobs(['waiting', 'delayed'])).filter((j) =>
    JSON.stringify(j.data).includes(needle),
  )

describe('mensalidade', () => {
  let admin: Awaited<ReturnType<typeof user>>
  let instrutor: Awaited<ReturnType<typeof user>>
  let outroInstrutor: Awaited<ReturnType<typeof user>>
  let aluno: Awaited<ReturnType<typeof user>>
  let plan: MembershipPlan
  const planIds: string[] = []

  before(async () => {
    passwordHash = await hashPassword(PASSWORD)
    server = app.listen(0)
    const addr = server.address()
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
    admin = await user('ADMIN')
    instrutor = await user('INSTRUTOR')
    outroInstrutor = await user('INSTRUTOR')
    aluno = await user('ALUNO')
    await prisma.link.create({ data: { studentId: aluno.id, instructorId: instrutor.id } })
  })

  after(async () => {
    for (const job of await jobsFor(`${run}`)) await job.remove()
    const students = { where: { subscription: { student: { email: { in: emails } } } } }
    await prisma.payment.deleteMany(students)
    await prisma.subscription.deleteMany({ where: { student: { email: { in: emails } } } })
    await prisma.membershipPlan.deleteMany({ where: { id: { in: planIds } } })
    await prisma.link.deleteMany({ where: { student: { email: { in: emails } } } })
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
    await prisma.$disconnect()
    await queue.close()
    await redis.quit()
    server.close()
  })

  const billing = async (token = aluno.token): Promise<StudentBilling> =>
    (await call('GET', `/billing/students/${aluno.id}`, token)).json()
  const pay = (body: object, token = instrutor.token) =>
    call('POST', `/billing/students/${aluno.id}/payments`, token, body)

  it('admin cria e altera plano; instrutor lista; aluno não', async () => {
    const res = await call('POST', '/billing/plans', admin.token, {
      name: `Mensal ${run}`,
      priceCents: 8990,
    })
    assert.equal(res.status, 201)
    plan = await res.json()
    planIds.push(plan.id)
    assert.equal(plan.durationDays, 30)
    // Segundo plano ativo: sem planId, o primeiro pagamento precisa escolher
    const anual = await (
      await call('POST', '/billing/plans', admin.token, { name: `Anual ${run}`, priceCents: 90000 })
    ).json()
    planIds.push(anual.id)
    const patched = await call('PATCH', `/billing/plans/${anual.id}`, admin.token, {
      active: false,
    })
    assert.equal((await patched.json()).active, false)
    const list: MembershipPlan[] = await (
      await call('GET', '/billing/plans', instrutor.token)
    ).json()
    assert.ok(list.some((p) => p.id === plan.id))
    assert.equal((await call('GET', '/billing/plans', aluno.token)).status, 403)
    assert.equal((await call('POST', '/billing/plans', instrutor.token, {})).status, 403)
  })

  it('sem mensalidade: resumo null e Meus Alunos sem selo', async () => {
    assert.deepEqual(await billing(), { summary: null, payments: [] })
  })

  it('pagamento exige a senha de quem registra e vínculo', async () => {
    const body = { planId: plan.id, method: 'PIX' }
    assert.equal((await pay({ ...body, password: 'errada' })).status, 422)
    assert.equal((await pay({ ...body, password: PASSWORD }, outroInstrutor.token)).status, 403)
    assert.equal((await pay({ ...body, password: PASSWORD }, aluno.token)).status, 403)
    assert.equal((await pay({ method: 'CHEQUE', password: PASSWORD })).status, 400)
  })

  it('primeiro pagamento vale 30 dias a partir de hoje; repetir o id não duplica', async () => {
    const body = { id: `pg-${run}`, planId: plan.id, method: 'PIX', password: PASSWORD }
    const res = await pay(body)
    assert.equal(res.status, 201)
    const first: StudentBilling = await res.json()
    assert.equal(first.summary?.status, 'ACTIVE')
    assert.equal(first.summary?.daysLeft, 30)
    assert.equal(first.summary?.plan.priceCents, 8990)
    assert.equal(first.payments[0]?.amountCents, 8990)
    const again: StudentBilling = await (await pay(body)).json()
    assert.equal(again.payments.length, 1)
    assert.equal(again.summary?.daysLeft, 30)
  })

  it('o próximo pagamento soma a partir do vencimento, com o plano atual', async () => {
    const res = await pay({ method: 'DINHEIRO', password: PASSWORD }, admin.token)
    const paid: StudentBilling = await res.json()
    assert.equal(paid.summary?.daysLeft, 60)
    assert.deepEqual(
      paid.payments.map((p) => p.method),
      ['DINHEIRO', 'PIX'],
    )
    const links: StudentLink[] = await (await call('GET', '/links', instrutor.token)).json()
    const mine = links.find((l) => l.student.id === aluno.id)
    assert.equal(mine?.student.billing?.status, 'ACTIVE')
  })

  it('vencida há 60 dias bloqueia o app do aluno, mas não /auth nem /billing (RN07)', async () => {
    await prisma.subscription.update({
      where: { studentId: aluno.id },
      data: { dueDate: inDays(-60) },
    })
    assert.equal((await billing()).summary?.status, 'BLOCKED')
    const plans = await call('GET', `/plans/student/${aluno.id}`, aluno.token)
    assert.equal(plans.status, 402)
    assert.equal((await call('GET', '/auth/me', aluno.token)).status, 200)
    // O instrutor continua acessando o aluno
    assert.equal((await call('GET', `/plans/student/${aluno.id}`, instrutor.token)).status, 200)
    // Um pagamento cobre 30 dias: continua vencida, mas o app libera
    const paid: StudentBilling = await (await pay({ method: 'CARTAO', password: PASSWORD })).json()
    assert.equal(paid.summary?.status, 'OVERDUE')
    assert.equal(paid.summary?.daysLeft, -30)
    assert.equal((await call('GET', `/plans/student/${aluno.id}`, aluno.token)).status, 200)
  })

  it('lembra por push e e-mail 3 dias antes do vencimento (RN06)', async () => {
    await prisma.user.update({ where: { id: aluno.id }, data: { pushToken } })
    await prisma.subscription.update({
      where: { studentId: aluno.id },
      data: { dueDate: inDays(3) },
    })
    await remindDueSoon()
    assert.equal((await jobsFor(pushToken)).length, 1)
    const [mail] = await jobsFor(aluno.email)
    assert.equal(mail?.name, 'email')
    assert.match(JSON.stringify(mail?.data), /R\$\s89,90/)
    for (const job of [...(await jobsFor(pushToken)), ...(await jobsFor(aluno.email))]) {
      await job.remove()
    }
  })

  it('alterar senha confere a atual, devolve tokens novos e derruba os antigos', async () => {
    const path = '/auth/password'
    const novo = { currentPassword: 'errada', password: 'Nova1234' }
    assert.equal((await call('PUT', path, outroInstrutor.token, novo)).status, 422)
    const fraca = { currentPassword: PASSWORD, password: 'fraca' }
    assert.equal((await call('PUT', path, outroInstrutor.token, fraca)).status, 400)
    const res = await call('PUT', path, outroInstrutor.token, {
      ...novo,
      currentPassword: PASSWORD,
    })
    assert.equal(res.status, 200)
    const { accessToken } = await res.json()
    assert.equal((await call('GET', '/auth/me', outroInstrutor.token)).status, 401)
    assert.equal((await call('GET', '/auth/me', accessToken)).status, 200)
    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: outroInstrutor.email, password: 'Nova1234' }),
    })
    assert.equal(login.status, 200)
  })
})
