// RU07: vínculo aluno-instrutor (um ACTIVE por aluno), troca de instrutor
import { createLinkSchema } from '@espacofit/shared'
import type { Prisma } from '@prisma/client'
import { Router } from 'express'
import { HttpError, validate } from '../../lib/http.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, requireRole } from '../../middlewares/auth.ts'

const ref = { select: { id: true, name: true } }
const select = {
  id: true,
  status: true,
  startedAt: true,
  endedAt: true,
  student: ref,
  instructor: ref,
} satisfies Prisma.LinkSelect

export const linksRouter = Router()

linksRouter.use(auth)

// Encerra o vínculo ativo anterior. Repetir com o mesmo instrutor devolve o vínculo atual.
linksRouter.post('/', requireRole('ADMIN'), validate(createLinkSchema), async (req, res) => {
  const { studentId, instructorId } = req.body
  const instructor = await prisma.user.findFirst({
    where: { id: instructorId, role: 'INSTRUTOR', active: true },
  })
  if (!instructor) throw new HttpError(404, 'Instrutor não encontrado ou com cadastro inativo.')
  const link = await prisma.$transaction(async (tx) => {
    // Trava a linha do aluno: dois POST simultâneos não deixam dois vínculos ACTIVE
    const [student] = await tx.$queryRaw<{ role: string }[]>`
      SELECT role FROM "User" WHERE id = ${studentId} FOR UPDATE`
    if (student?.role !== 'ALUNO') throw new HttpError(404, 'Aluno não encontrado')
    const current = await tx.link.findFirst({ where: { studentId, status: 'ACTIVE' }, select })
    if (current?.instructor.id === instructorId) return current
    if (current) {
      await tx.link.update({
        where: { id: current.id },
        data: { status: 'ENDED', endedAt: new Date() },
      })
    }
    return tx.link.create({ data: { studentId, instructorId }, select })
  })
  res.status(201).json(link)
})

// Admin vê todos os vínculos ativos; instrutor vê só os seus alunos. Objetivo e nascimento vêm da
// anamnese e só vão para o instrutor (RN09).
linksRouter.get('/', requireRole('ADMIN', 'INSTRUTOR'), async (req, res) => {
  const isInstructor = req.user.role === 'INSTRUTOR'
  const rows = await prisma.link.findMany({
    where: { status: 'ACTIVE', instructorId: isInstructor ? req.user.id : undefined },
    select: {
      ...select,
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          anamnesis: { select: { answers: true } },
          sessions: {
            where: { finishedAt: { not: null } },
            orderBy: { finishedAt: 'desc' },
            take: 1,
            select: { finishedAt: true },
          },
        },
      },
    },
    orderBy: { student: { name: 'asc' } },
  })
  res.json(
    rows.map(({ student: { anamnesis, sessions, ...student }, ...link }) => {
      const answers = (isInstructor ? anamnesis?.answers : null) as {
        goal?: string
        birthDate?: string
      } | null
      return {
        ...link,
        student: {
          ...student,
          goal: answers?.goal ?? null,
          birthDate: answers?.birthDate ?? null,
          lastWorkoutAt: sessions[0]?.finishedAt ?? null,
        },
      }
    }),
  )
})
