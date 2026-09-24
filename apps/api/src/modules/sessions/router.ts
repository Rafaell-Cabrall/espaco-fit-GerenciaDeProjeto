// RU02/RN02/RN03: iniciar, registrar série, finalizar ou descartar o treino. Só o aluno dono.
import { finishSessionSchema, setLogInputSchema, startSessionSchema } from '@espacofit/shared'
import type { Prisma } from '@prisma/client'
import { type Request, Router } from 'express'
import { HttpError, validate } from '../../lib/http.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, requireRole } from '../../middlewares/auth.ts'

const include = { setLogs: { orderBy: { doneAt: 'asc' } } } satisfies Prisma.WorkoutSessionInclude

type SessionRow = Prisma.WorkoutSessionGetPayload<{ include: typeof include }>
type SetLogRow = SessionRow['setLogs'][number]

const toSet = ({ divisionExerciseId, setNumber, loadKg, doneAt }: SetLogRow) => ({
  divisionExerciseId,
  setNumber,
  loadKg: loadKg === null ? null : Number(loadKg),
  doneAt,
})

const toSession = (s: SessionRow) => ({
  id: s.id,
  divisionId: s.divisionId,
  startedAt: s.startedAt,
  finishedAt: s.finishedAt,
  notes: s.exerciseNotes ?? {},
  sets: s.setLogs.map(toSet),
})

async function findOwn(req: Request) {
  const session = await prisma.workoutSession.findUnique({
    where: { id: req.params.id as string },
    include,
  })
  if (!session) throw new HttpError(404, 'Treino não encontrado')
  if (session.studentId !== req.user.id) throw new HttpError(403, 'Sem permissão')
  return session
}

// Séries só mudam com o treino aberto; a fila offline envia as séries antes do finish
async function findOpen(req: Request) {
  const session = await findOwn(req)
  if (session.finishedAt) throw new HttpError(409, 'Treino já finalizado')
  return session
}

export const sessionsRouter = Router()

sessionsRouter.use(auth, requireRole('ALUNO'))

// Histórico: treinos finalizados do aluno, do mais recente ao mais antigo ("Histórico · 24 treinos")
// ponytail: sem paginação; paginar quando o histórico passar de algumas centenas por aluno
sessionsRouter.get('/', async (req, res) => {
  const rows = await prisma.workoutSession.findMany({
    where: { studentId: req.user.id, finishedAt: { not: null } },
    orderBy: { finishedAt: 'desc' },
    include,
  })
  res.json(rows.map(toSession))
})

sessionsRouter.post('/', validate(startSessionSchema), async (req, res) => {
  const { id, divisionId } = req.body
  if (id) {
    const existing = await prisma.workoutSession.findUnique({ where: { id }, include })
    if (existing?.studentId === req.user.id) return res.status(201).json(toSession(existing))
    if (existing) throw new HttpError(409, 'Identificador de treino já usado')
  }
  const division = await prisma.workoutDivision.findFirst({
    where: { id: divisionId, plan: { studentId: req.user.id, status: 'ACTIVE' } },
  })
  if (!division) throw new HttpError(404, 'Divisão não encontrada na sua ficha atual')
  const session = await prisma.workoutSession.create({
    data: { id, studentId: req.user.id, divisionId },
    include,
  })
  res.status(201).json(toSession(session))
})

// RN02: só o aluno registra carga. Repetir a mesma série corrige a carga.
sessionsRouter.put('/:id/sets', validate(setLogInputSchema), async (req, res) => {
  const session = await findOpen(req)
  const { divisionExerciseId, setNumber, loadKg } = req.body
  const item = await prisma.divisionExercise.findFirst({
    where: { id: divisionExerciseId, divisionId: session.divisionId },
  })
  if (!item) throw new HttpError(400, 'Exercício não pertence a este treino')
  if (setNumber > item.sets) throw new HttpError(400, `Este exercício tem ${item.sets} séries`)
  const row = await prisma.setLog.upsert({
    where: {
      sessionId_divisionExerciseId_setNumber: {
        sessionId: session.id,
        divisionExerciseId,
        setNumber,
      },
    },
    create: { sessionId: session.id, divisionExerciseId, setNumber, loadKg },
    update: { loadKg },
  })
  res.json(toSet(row))
})

sessionsRouter.delete('/:id/sets/:divisionExerciseId/:setNumber', async (req, res) => {
  const session = await findOpen(req)
  await prisma.setLog.deleteMany({
    where: {
      sessionId: session.id,
      divisionExerciseId: req.params.divisionExerciseId as string,
      setNumber: Number(req.params.setNumber),
    },
  })
  res.status(204).end()
})

// RN03: dia só conta com ao menos uma série. Finalizar de novo devolve o mesmo treino (fila offline).
sessionsRouter.post('/:id/finish', validate(finishSessionSchema), async (req, res) => {
  const session = await findOwn(req)
  if (session.finishedAt) return res.json(toSession(session))
  if (session.setLogs.length === 0) {
    throw new HttpError(
      422,
      'Nenhuma série concluída. Conclua ao menos uma série ou saia do treino.',
    )
  }
  const finished = await prisma.workoutSession.update({
    where: { id: session.id },
    data: { finishedAt: new Date(), exerciseNotes: req.body.notes },
    include,
  })
  res.json(toSession(finished))
})

// "Sair do treino": descarta o treino aberto. Já descartado responde 204 (reenvio da fila).
sessionsRouter.delete('/:id', async (req, res) => {
  const session = await prisma.workoutSession.findUnique({ where: { id: req.params.id as string } })
  if (session && session.studentId !== req.user.id) throw new HttpError(403, 'Sem permissão')
  if (session?.finishedAt) throw new HttpError(409, 'Treino finalizado não pode ser descartado')
  if (session) await prisma.workoutSession.delete({ where: { id: session.id } })
  res.status(204).end()
})
