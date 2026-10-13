// RN06: job diário que avisa por push e e-mail quem tem mensalidade vencendo em 3 dias
import { prisma } from '../../lib/prisma.ts'
import { notify } from '../../lib/push.ts'
import { enqueue } from '../../lib/queue.ts'
import { dayInSaoPaulo } from '../sessions/frequency.ts'

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Vencimento exatamente daqui a 3 dias: cada mensalidade recebe um aviso por período
export async function remindDueSoon(now = new Date()) {
  const dueDate = new Date(Date.parse(dayInSaoPaulo(now)) + 3 * 86_400_000)
  const subs = await prisma.subscription.findMany({
    where: { dueDate, student: { active: true } },
    select: {
      studentId: true,
      plan: { select: { priceCents: true } },
      student: { select: { name: true, email: true } },
    },
  })
  const when = dueDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  for (const { studentId, plan, student } of subs) {
    const body = `Sua mensalidade de ${brl(plan.priceCents)} vence em ${when}.`
    await notify([studentId], 'Mensalidade vence em 3 dias', body)
    await enqueue('email', {
      to: student.email,
      subject: 'Sua mensalidade vence em 3 dias — Espaço Fit',
      text: `Olá, ${student.name}!\n\n${body} Pague na recepção por Pix, cartão ou dinheiro.\n\nEspaço Fit`,
    })
  }
}
