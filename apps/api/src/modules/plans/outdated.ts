// RN04: job diário que avisa o instrutor quando a ficha ativa ou a anamnese de um aluno passa de 60 dias
import { prisma } from '../../lib/prisma.ts'
import { notify } from '../../lib/push.ts'

const DAY_MS = 86_400_000

// Só o que venceu nas últimas 24 h: cada vencimento gera um aviso, sem guardar estado.
// ponytail: se o worker ficar um dia fora, os vencimentos daquele dia não são avisados; o selo
// `outdated` da ficha e da anamnese continua aparecendo no app.
export async function notifyOutdated(now = new Date()) {
  const updatedAt = {
    gt: new Date(now.getTime() - 61 * DAY_MS),
    lte: new Date(now.getTime() - 60 * DAY_MS),
  }
  const [plans, anamneses] = await Promise.all([
    prisma.workoutPlan.findMany({
      where: { status: 'ACTIVE', updatedAt },
      select: { studentId: true },
    }),
    prisma.anamnesis.findMany({ where: { updatedAt }, select: { studentId: true } }),
  ])
  const studentIds = [...new Set([...plans, ...anamneses].map((r) => r.studentId))]
  if (!studentIds.length) return
  const links = await prisma.link.findMany({
    where: { studentId: { in: studentIds }, status: 'ACTIVE' },
    select: { instructorId: true, student: { select: { name: true } } },
  })
  const names = new Map<string, string[]>()
  for (const l of links)
    names.set(l.instructorId, [...(names.get(l.instructorId) ?? []), l.student.name])
  for (const [instructorId, students] of names) {
    await notify(
      [instructorId],
      'Ficha ou anamnese vencida',
      `Mais de 60 dias sem atualização: ${students.join(', ')}.`,
    )
  }
}
