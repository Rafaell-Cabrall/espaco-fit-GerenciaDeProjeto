// RU05/RN07: planos, mensalidade do aluno e registro de pagamento manual com confirmação por senha
import {
  createMembershipPlanSchema,
  registerPaymentSchema,
  updateMembershipPlanSchema,
} from '@espacofit/shared'
import type { Prisma } from '@prisma/client'
import { Router } from 'express'
import { HttpError, validate } from '../../lib/http.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, requireLink, requireRole } from '../../middlewares/auth.ts'
import { confirmPassword } from '../auth/service.ts'
import { dayInSaoPaulo } from '../sessions/frequency.ts'
import { summarize } from './status.ts'

const DAY_MS = 86_400_000

async function studentBilling(studentId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { studentId },
    include: { plan: true, payments: { where: { status: 'PAID' }, orderBy: { paidAt: 'desc' } } },
  })
  return {
    summary: summarize(sub),
    payments: (sub?.payments ?? []).map(({ id, amountCents, method, paidAt }) => ({
      id,
      amountCents,
      method,
      paidAt,
    })),
  }
}

// Sem planId e sem mensalidade anterior: vale o plano ativo se for o único
async function onlyActivePlan(tx: Prisma.TransactionClient) {
  const plans = await tx.membershipPlan.findMany({ where: { active: true }, take: 2 })
  return plans.length === 1 ? plans[0] : null
}

export const billingRouter = Router()

// O bloqueio do RN07 não vale aqui: o aluno bloqueado precisa ver a mensalidade
billingRouter.use(auth)

billingRouter.get('/plans', requireRole('ADMIN', 'INSTRUTOR'), async (_req, res) => {
  res.json(await prisma.membershipPlan.findMany({ orderBy: { priceCents: 'asc' } }))
})

billingRouter.post(
  '/plans',
  requireRole('ADMIN'),
  validate(createMembershipPlanSchema),
  async (req, res) => {
    res.status(201).json(await prisma.membershipPlan.create({ data: req.body }))
  },
)

// Mudar o preço vale para os próximos pagamentos; o histórico guarda o valor pago
billingRouter.patch(
  '/plans/:id',
  requireRole('ADMIN'),
  validate(updateMembershipPlanSchema),
  async (req, res) => {
    const id = req.params.id as string
    if (!(await prisma.membershipPlan.findUnique({ where: { id } }))) {
      throw new HttpError(404, 'Plano não encontrado')
    }
    res.json(await prisma.membershipPlan.update({ where: { id }, data: req.body }))
  },
)

billingRouter.get('/students/:studentId', requireLink, async (req, res) => {
  res.json(await studentBilling(req.params.studentId as string))
})

billingRouter.post(
  '/students/:studentId/payments',
  requireRole('ADMIN', 'INSTRUTOR'),
  validate(registerPaymentSchema),
  requireLink,
  async (req, res) => {
    const studentId = req.params.studentId as string
    const { id, planId, method, password } = req.body
    await confirmPassword(req.user.id, password)
    await prisma.$transaction(async (tx) => {
      // Trava o aluno: dois toques simultâneos não estendem o vencimento duas vezes
      const [student] = await tx.$queryRaw<{ role: string }[]>`
        SELECT role FROM "User" WHERE id = ${studentId} FOR UPDATE`
      if (student?.role !== 'ALUNO') throw new HttpError(404, 'Aluno não encontrado')
      if (id) {
        const existing = await tx.payment.findUnique({
          where: { id },
          select: { subscription: { select: { studentId: true } } },
        })
        if (existing?.subscription.studentId === studentId) return
        if (existing) throw new HttpError(409, 'Identificador de pagamento já usado')
      }
      const sub = await tx.subscription.findUnique({
        where: { studentId },
        include: { plan: true },
      })
      const plan = planId
        ? await tx.membershipPlan.findFirst({ where: { id: planId, active: true } })
        : (sub?.plan ?? (await onlyActivePlan(tx)))
      if (!plan) throw new HttpError(400, planId ? 'Plano não encontrado' : 'Escolha o plano')
      // Cada pagamento cobre um período a partir do vencimento atual; o primeiro, a partir de hoje
      const from = sub?.dueDate ?? new Date(dayInSaoPaulo(new Date()))
      const dueDate = new Date(from.getTime() + plan.durationDays * DAY_MS)
      const saved = await tx.subscription.upsert({
        where: { studentId },
        create: { studentId, planId: plan.id, dueDate },
        update: { planId: plan.id, dueDate },
      })
      await tx.payment.create({
        data: {
          id,
          subscriptionId: saved.id,
          amountCents: plan.priceCents,
          method,
          status: 'PAID',
          paidAt: new Date(),
          registeredById: req.user.id,
        },
      })
    })
    res.status(201).json(await studentBilling(studentId))
  },
)
