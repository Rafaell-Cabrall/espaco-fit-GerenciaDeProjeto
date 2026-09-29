// RU02/RN02/RN03: iniciar, registrar série, finalizar ou descartar o treino. Só o aluno dono.
import {
  finishSessionSchema,
  sessionsQuerySchema,
  setLogInputSchema,
  startSessionSchema,
} from '@espacofit/shared'
import type { Prisma } from '@prisma/client'
import { type Request, Router } from 'express'
import { z } from 'zod'
import { HttpError, validate } from '../../lib/http.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, hasActiveLink, requireRole } from '../../middlewares/auth.ts'
import { dayInSaoPaulo, streaks } from './frequency.ts'

// Itens da divisão com o nome do exercício: as notas saem com nome no Histórico e nos Feedbacks
export const noteExercises = {
  select: {
    exercises: {
      orderBy: { order: 'asc' },
      select: { id: true, exercise: { select: { name: true } } },
    },
  },
} satisfies Prisma.WorkoutDivisionDefaultArgs

const include = {
  setLogs: { orderBy: { doneAt: 'asc' } },
  division: { select: { label: true, title: true, planId: true, ...noteExercises.select } },
} satisfies Prisma.WorkoutSessionInclude

type SessionRow = Prisma.WorkoutSessionGetPayload<{ include: typeof include }>
type SetLogRow = SessionRow['setLogs'][number]

const toSet = ({ divisionExerciseId, setNumber, loadKg, doneAt }: SetLogRow) => ({
  divisionExerciseId,
  setNumber,
  loadKg: loadKg === null ? null : Number(loadKg),
  doneAt,
})

type NotesRow = {
  exerciseNotes: Prisma.JsonValue
  division: Prisma.WorkoutDivisionGetPayload<typeof noteExercises>
}

// Notas na ordem da ficha; item removido da divisão não tem como aparecer
export const toNotes = ({ exerciseNotes, division }: NotesRow) => {
  const notes = (exerciseNotes ?? {}) as Record<string, string>
  return division.exercises.flatMap((e) =>
    notes[e.id] ? [{ divisionExerciseId: e.id, exercise: e.exercise.name, text: notes[e.id] }] : [],
  )
}

const toSession = (s: SessionRow) => ({
  id: s.id,
  divisionId: s.divisionId,
  division: { label: s.division.label, title: s.division.title, planId: s.division.planId },
  startedAt: s.startedAt,
  finishedAt: s.finishedAt,
  notes: toNotes(s),
  sets: s.setLogs.map(toSet),
})

// Dia em Brasília (UTC−3 fixo desde 2019) → instante UTC do início ou do fim do dia
const saoPaulo = (day: string, end = false) =>
  new Date(`${day}T${end ? '23:59:59.999' : '00:00:00'}-03:00`)

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

sessionsRouter.use(auth)

// Histórico, do mais recente ao mais antigo ("Histórico · 24 treinos" e a aba Histórico do
// instrutor). O aluno vê os próprios; instrutor com vínculo e admin passam ?studentId=.
// ponytail: sem paginação; paginar quando o histórico passar de algumas centenas por aluno
sessionsRouter.get('/', async (req, res) => {
  const q = sessionsQuerySchema.parse(req.query)
  const { id, role } = req.user
  const studentId = role === 'ALUNO' ? id : q.studentId
  if (!studentId) throw new HttpError(400, 'Informe o aluno')
  if (role === 'INSTRUTOR' && !(await hasActiveLink(studentId, id))) {
    throw new HttpError(403, 'Sem vínculo ativo com este aluno')
  }
  const rows = await prisma.workoutSession.findMany({
    where: {
      studentId,
      finishedAt: {
        not: null,
        gte: q.from ? saoPaulo(q.from) : undefined,
        lte: q.to ? saoPaulo(q.to, true) : undefined,
      },
      division: q.planId ? { planId: q.planId } : undefined,
    },
    orderBy: { finishedAt: 'desc' },
    include,
  })
  res.json(rows.map(toSession))
})

// Sequência, treinos do mês e calendário. Mês sem treino devolve contagens zeradas.
// ponytail: carrega todos os treinos finalizados do aluno (centenas no máximo) e calcula no JS
sessionsRouter.get('/frequency', requireRole('ALUNO'), async (req, res) => {
  const today = dayInSaoPaulo(new Date())
  const month = z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Mês no formato AAAA-MM')
    .default(today.slice(0, 7))
    .parse(req.query.month)
  const rows = await prisma.workoutSession.findMany({
    where: { studentId: req.user.id, finishedAt: { not: null } },
    orderBy: { finishedAt: 'asc' },
    select: { finishedAt: true },
  })
  const all = rows.flatMap((r) => (r.finishedAt ? [dayInSaoPaulo(r.finishedAt)] : []))
  const inMonth = all.filter((d) => d.startsWith(month))
  res.json({
    ...streaks([...new Set(all)], today),
    monthCount: inMonth.length,
    totalCount: all.length,
    days: [...new Set(inMonth)],
  })
})

sessionsRouter.post('/', requireRole('ALUNO'), validate(startSessionSchema), async (req, res) => {
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
sessionsRouter.put(
  '/:id/sets',
  requireRole('ALUNO'),
  validate(setLogInputSchema),
  async (req, res) => {
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
  },
)

sessionsRouter.delete(
  '/:id/sets/:divisionExerciseId/:setNumber',
  requireRole('ALUNO'),
  async (req, res) => {
    const session = await findOpen(req)
    await prisma.setLog.deleteMany({
      where: {
        sessionId: session.id,
        divisionExerciseId: req.params.divisionExerciseId as string,
        setNumber: Number(req.params.setNumber),
      },
    })
    res.status(204).end()
  },
)

// RN03: dia só conta com ao menos uma série. Finalizar de novo devolve o mesmo treino (fila offline).
sessionsRouter.post(
  '/:id/finish',
  requireRole('ALUNO'),
  validate(finishSessionSchema),
  async (req, res) => {
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
  },
)

// "Sair do treino": descarta o treino aberto. Já descartado responde 204 (reenvio da fila).
sessionsRouter.delete('/:id', requireRole('ALUNO'), async (req, res) => {
  const session = await prisma.workoutSession.findUnique({ where: { id: req.params.id as string } })
  if (session && session.studentId !== req.user.id) throw new HttpError(403, 'Sem permissão')
  if (session?.finishedAt) throw new HttpError(409, 'Treino finalizado não pode ser descartado')
  if (session) await prisma.workoutSession.delete({ where: { id: session.id } })
  res.status(204).end()
})
