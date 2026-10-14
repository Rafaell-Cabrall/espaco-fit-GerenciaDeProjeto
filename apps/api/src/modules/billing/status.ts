// Status da mensalidade calculado pelo vencimento (RN07). Sem imports de rota: o middleware auth usa.
import type { BillingStatus, BillingSummary } from '@espacofit/shared'
import { dayInSaoPaulo } from '../sessions/frequency.ts'

const DAY_MS = 86_400_000
// "2 meses" de atraso bloqueiam o app (RN07)
const BLOCK_AFTER_DAYS = 60

// Coluna @db.Date volta como meia-noite UTC; hoje é o dia em Brasília
export const daysLeft = (dueDate: Date, now = new Date()) =>
  Math.round((dueDate.getTime() - Date.parse(dayInSaoPaulo(now))) / DAY_MS)

export function billingStatus(dueDate: Date, now = new Date()): BillingStatus {
  const left = daysLeft(dueDate, now)
  if (left >= 0) return 'ACTIVE'
  return left > -BLOCK_AFTER_DAYS ? 'OVERDUE' : 'BLOCKED'
}

type SubscriptionRow = { dueDate: Date; plan: { id: string; name: string; priceCents: number } }

export const summarize = (sub: SubscriptionRow | null | undefined): BillingSummary | null =>
  sub
    ? {
        plan: { id: sub.plan.id, name: sub.plan.name, priceCents: sub.plan.priceCents },
        dueDate: sub.dueDate.toISOString().slice(0, 10),
        daysLeft: daysLeft(sub.dueDate),
        status: billingStatus(sub.dueDate),
      }
    : null
