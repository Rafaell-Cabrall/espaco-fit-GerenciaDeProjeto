// RU01/RN04/RN05/RN08: fichas, divisões, modelos; criar exige anamnese
import {
  createPlanSchema,
  createTemplateSchema,
  type Plan,
  publishPlanSchema,
  updatePlanSchema,
} from '@espacofit/shared'
import type { Prisma } from '@prisma/client'
import { type Request, Router } from 'express'
import type { z } from 'zod'
import { HttpError, validate } from '../../lib/http.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, hasActiveLink, requireLink, requireRole } from '../../middlewares/auth.ts'
import { isOutdated } from '../anamnesis/router.ts'
import { toExercise } from '../exercises/router.ts'

type PlanFields = z.infer<typeof updatePlanSchema>
type Divisions = PlanFields['divisions']

// Coluna @db.Date volta como meia-noite UTC: o dia é o prefixo ISO
export const day = (date: Date) => date.toISOString().slice(0, 10)

const planData = ({ name, startsOn, endsOn }: PlanFields) => ({
  name,
  startsOn: new Date(startsOn),
  endsOn: new Date(endsOn),
})

// Tempo por série sem contar o descanso, para o "~55 min estimado"
const SET_SECONDS = 40

const include = {
  instructor: { select: { id: true, name: true } },
  divisions: {
    orderBy: { order: 'asc' },
    include: { exercises: { orderBy: { order: 'asc' }, include: { exercise: true } } },
  },
} satisfies Prisma.WorkoutPlanInclude

type PlanRow = Prisma.WorkoutPlanGetPayload<{ include: typeof include }>

const decimal = (value: Prisma.Decimal | null) => (value === null ? null : Number(value))

const divisionsData = (divisions: Divisions) => ({
  create: divisions.map((d, order) => ({
    label: d.label,
    title: d.title,
    order,
    weekday: d.weekday,
    exercises: {
      create: d.exercises.map((e, i) => ({
        exerciseId: e.exerciseId,
        order: i,
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds,
        targetLoad: e.targetLoadKg,
      })),
    },
  })),
})

async function assertExercises(divisions: Divisions) {
  const ids = [...new Set(divisions.flatMap((d) => d.exercises.map((e) => e.exerciseId)))]
  const found = await prisma.exercise.count({ where: { id: { in: ids } } })
  if (found !== ids.length) throw new HttpError(400, 'Exercício não encontrado na biblioteca')
}

async function present(plan: PlanRow): Promise<Plan> {
  const exerciseIds = [
    ...new Set(plan.divisions.flatMap((d) => d.exercises.map((e) => e.exerciseId))),
  ]
  const [last, loads] = await Promise.all([
    // RN08: treino do dia = divisão seguinte à do último treino finalizado nesta ficha
    prisma.workoutSession.findFirst({
      where: {
        studentId: plan.studentId,
        divisionId: { in: plan.divisions.map((d) => d.id) },
        finishedAt: { not: null },
      },
      orderBy: { finishedAt: 'desc' },
      select: { divisionId: true },
    }),
    // Última carga registrada por exercício, em qualquer ficha do aluno
    prisma.$queryRaw<{ exerciseId: string; loadKg: Prisma.Decimal }[]>`
      SELECT DISTINCT ON (de."exerciseId") de."exerciseId", s."loadKg"
      FROM "SetLog" s
      JOIN "DivisionExercise" de ON de.id = s."divisionExerciseId"
      JOIN "WorkoutSession" w ON w.id = s."sessionId"
      WHERE w."studentId" = ${plan.studentId} AND s."loadKg" IS NOT NULL
        AND de."exerciseId" = ANY(${exerciseIds})
      ORDER BY de."exerciseId", s."doneAt" DESC`,
  ])
  const lastLoad = new Map(loads.map((l) => [l.exerciseId, Number(l.loadKg)]))
  const lastIndex = plan.divisions.findIndex((d) => d.id === last?.divisionId)

  return {
    id: plan.id,
    name: plan.name,
    status: plan.status,
    startsOn: day(plan.startsOn),
    endsOn: day(plan.endsOn),
    publishedAt: plan.publishedAt?.toISOString() ?? null,
    updatedAt: plan.updatedAt.toISOString(),
    outdated: isOutdated(plan.updatedAt),
    instructor: plan.instructor,
    // divisões nunca vazias (schema exige ao menos uma)
    todayDivisionId: plan.divisions[(lastIndex + 1) % plan.divisions.length]?.id ?? '',
    divisions: plan.divisions.map((d) => ({
      id: d.id,
      label: d.label,
      title: d.title,
      weekday: d.weekday,
      order: d.order,
      estimatedMinutes: Math.ceil(
        d.exercises.reduce((sum, e) => sum + e.sets * (SET_SECONDS + e.restSeconds), 0) / 60,
      ),
      exercises: d.exercises.map((e) => ({
        id: e.id,
        order: e.order,
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds,
        targetLoadKg: decimal(e.targetLoad),
        lastLoadKg: lastLoad.get(e.exerciseId) ?? null,
        exercise: toExercise(e.exercise),
      })),
    })),
  }
}

// Leitura: instrutor autor ou admin. Escrita: só o autor, e ainda com vínculo ativo (RU07).
async function findPlan(req: Request, write: boolean) {
  const plan = await prisma.workoutPlan.findUnique({
    where: { id: req.params.id as string },
    include,
  })
  if (!plan) throw new HttpError(404, 'Ficha não encontrada')
  const { id, role } = req.user
  if (role === 'ADMIN' && !write) return plan
  if (role === 'INSTRUTOR' && plan.instructorId === id) {
    if (!write || (await hasActiveLink(plan.studentId, id))) return plan
  }
  throw new HttpError(403, 'Sem permissão')
}

export const plansRouter = Router()

plansRouter.use(auth)

plansRouter.get('/student/:studentId', requireLink, async (req, res) => {
  const plan = await prisma.workoutPlan.findFirst({
    where: { studentId: req.params.studentId as string, status: 'ACTIVE' },
    include,
  })
  res.json(plan && (await present(plan)))
})

// Aba Fichas do perfil do aluno. Rascunho é trabalho do instrutor: o aluno não vê.
plansRouter.get('/', requireLink, async (req, res) => {
  const rows = await prisma.workoutPlan.findMany({
    where: {
      studentId: req.query.studentId as string,
      status: req.user.role === 'ALUNO' ? { not: 'DRAFT' } : undefined,
    },
    orderBy: { createdAt: 'desc' },
    include: { divisions: { orderBy: { order: 'asc' }, select: { label: true } } },
  })
  res.json(
    rows.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      startsOn: day(p.startsOn),
      endsOn: day(p.endsOn),
      labels: p.divisions.map((d) => d.label),
    })),
  )
})

// Rotas de modelo antes de /:id
plansRouter.get('/templates', requireRole('INSTRUTOR'), async (req, res) => {
  const rows = await prisma.planTemplate.findMany({
    where: { instructorId: req.user.id },
    orderBy: { name: 'asc' },
  })
  res.json(rows.map(({ id, name, structure }) => ({ id, name, divisions: structure })))
})

plansRouter.post(
  '/templates',
  requireRole('INSTRUTOR'),
  validate(createTemplateSchema),
  async (req, res) => {
    const { name, divisions } = req.body
    await assertExercises(divisions)
    const row = await prisma.planTemplate.create({
      data: { instructorId: req.user.id, name, structure: divisions },
    })
    res.status(201).json({ id: row.id, name, divisions })
  },
)

async function findTemplate(req: Request) {
  const row = await prisma.planTemplate.findFirst({
    where: { id: req.params.id as string, instructorId: req.user.id },
  })
  if (!row) throw new HttpError(404, 'Modelo não encontrado')
  return row
}

plansRouter.put(
  '/templates/:id',
  requireRole('INSTRUTOR'),
  validate(createTemplateSchema),
  async (req, res) => {
    const { id } = await findTemplate(req)
    const { name, divisions } = req.body
    await assertExercises(divisions)
    await prisma.planTemplate.update({ where: { id }, data: { name, structure: divisions } })
    res.json({ id, name, divisions })
  },
)

plansRouter.delete('/templates/:id', requireRole('INSTRUTOR'), async (req, res) => {
  const { id } = await findTemplate(req)
  await prisma.planTemplate.delete({ where: { id } })
  res.status(204).end()
})

plansRouter.get('/:id', async (req, res) => {
  res.json(await present(await findPlan(req, false)))
})

plansRouter.post(
  '/',
  requireRole('INSTRUTOR'),
  validate(createPlanSchema),
  requireLink,
  async (req, res) => {
    const { studentId, ...fields } = req.body
    if (!(await prisma.anamnesis.findUnique({ where: { studentId } }))) {
      throw new HttpError(409, 'Criação bloqueada. O aluno ainda não tem anamnese.')
    }
    await assertExercises(fields.divisions)
    const plan = await prisma.workoutPlan.create({
      data: {
        studentId,
        instructorId: req.user.id,
        ...planData(fields),
        divisions: divisionsData(fields.divisions),
      },
      include,
    })
    res.status(201).json(await present(plan))
  },
)

// Só rascunho: a ficha ativa tem sessões e cargas presas às divisões. Para alterar a ativa,
// o app cria outra ficha com as divisões copiadas e publica (a anterior expira).
plansRouter.put('/:id', validate(updatePlanSchema), async (req, res) => {
  const current = await findPlan(req, true)
  if (current.status !== 'DRAFT') {
    throw new HttpError(409, 'Só rascunhos podem ser editados. Crie uma nova ficha a partir desta.')
  }
  await assertExercises(req.body.divisions)
  const plan = await prisma.workoutPlan.update({
    where: { id: current.id },
    data: {
      ...planData(req.body),
      divisions: { deleteMany: {}, ...divisionsData(req.body.divisions) },
    },
    include,
  })
  res.json(await present(plan))
})

plansRouter.post('/:id/publish', validate(publishPlanSchema), async (req, res) => {
  const current = await findPlan(req, true)
  if (current.status === 'EXPIRED')
    throw new HttpError(409, 'Ficha expirada não pode ser publicada')
  if (current.status === 'ACTIVE') return res.json(await present(current))
  // ponytail: sem índice único parcial, duas publicações simultâneas do mesmo aluno deixariam duas
  // ACTIVE; com um instrutor por aluno não acontece. Criar o índice por SQL se surgir edição concorrente.
  const [, plan] = await prisma.$transaction([
    prisma.workoutPlan.updateMany({
      where: { studentId: current.studentId, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    }),
    prisma.workoutPlan.update({
      where: { id: current.id },
      data: { status: 'ACTIVE', publishedAt: new Date() },
      include,
    }),
  ])
  res.json(await present(plan))
})
