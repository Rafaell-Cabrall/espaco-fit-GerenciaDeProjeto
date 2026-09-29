// RU03: comentários por exercício que o aluno deixa ao finalizar; o instrutor lê e marca como lido
import { Router } from 'express'
import { HttpError } from '../../lib/http.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, hasActiveLink, requireRole } from '../../middlewares/auth.ts'
import { noteExercises, toNotes } from '../sessions/router.ts'

export const feedbacksRouter = Router()

feedbacksRouter.use(auth, requireRole('INSTRUTOR'))

// ponytail: busca os 200 treinos recentes dos alunos e filtra os com nota no JS (filtro de JSON
// vazio no Prisma é frágil); cobre os ~50 com nota que a tela mostra. Paginar se a academia crescer.
feedbacksRouter.get('/', async (req, res) => {
  const rows = await prisma.workoutSession.findMany({
    where: {
      finishedAt: { not: null },
      student: { asStudent: { some: { instructorId: req.user.id, status: 'ACTIVE' } } },
    },
    orderBy: { finishedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      finishedAt: true,
      notesReadAt: true,
      exerciseNotes: true,
      student: { select: { id: true, name: true } },
      division: noteExercises,
    },
  })
  res.json(
    rows
      .map((s) => ({ s, notes: toNotes(s) }))
      .filter(({ notes }) => notes.length)
      .slice(0, 50)
      .flatMap(({ s, notes }) =>
        notes.map((n) => ({
          sessionId: s.id,
          student: s.student,
          ...n,
          finishedAt: s.finishedAt,
          read: s.notesReadAt !== null,
        })),
      ),
  )
})

// "Abrir" o feedback marca como lidos todos os comentários daquele treino. Repetir não muda a data.
feedbacksRouter.post('/:sessionId/read', async (req, res) => {
  const session = await prisma.workoutSession.findUnique({
    where: { id: req.params.sessionId as string },
    select: { id: true, studentId: true, notesReadAt: true },
  })
  if (!session) throw new HttpError(404, 'Treino não encontrado')
  if (!(await hasActiveLink(session.studentId, req.user.id))) {
    throw new HttpError(403, 'Sem vínculo ativo com este aluno')
  }
  if (!session.notesReadAt) {
    await prisma.workoutSession.update({
      where: { id: session.id },
      data: { notesReadAt: new Date() },
    })
  }
  res.status(204).end()
})
