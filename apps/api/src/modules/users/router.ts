import { randomBytes } from 'node:crypto'
import { createUserSchema, Role } from '@espacofit/shared'
import { Router } from 'express'
import { HttpError, validate } from '../../lib/http.ts'
import { hashPassword } from '../../lib/password.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, requireRole } from '../../middlewares/auth.ts'
import { sendInvite } from '../auth/service.ts'
import { dayInSaoPaulo } from '../sessions/frequency.ts'

const select = { id: true, name: true, email: true, role: true } as const

export const usersRouter = Router()

usersRouter.use(auth)

usersRouter.post(
  '/',
  requireRole('ADMIN', 'INSTRUTOR'),
  validate(createUserSchema),
  async (req, res) => {
    const { name, email, role, anamnesis } = req.body
    const byInstructor = req.user.role === 'INSTRUTOR'
    if (byInstructor && role !== 'ALUNO') throw new HttpError(403, 'Instrutor cadastra só alunos')
    if (byInstructor && !anamnesis) throw new HttpError(400, 'Preencha a anamnese do aluno')
    if (anamnesis && role !== 'ALUNO') throw new HttpError(400, 'Anamnese é só para aluno')
    if (await prisma.user.findUnique({ where: { email } })) {
      throw new HttpError(409, 'E-mail já cadastrado')
    }
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        passwordHash: await hashPassword(randomBytes(32).toString('hex')),
        anamnesis: anamnesis && { create: { answers: anamnesis } },
        asStudent: byInstructor ? { create: { instructorId: req.user.id } } : undefined,
      },
      select,
    })
    await sendInvite(user)
    res.status(201).json(user)
  },
)

usersRouter.get('/', requireRole('ADMIN'), async (req, res) => {
  const role = Role.optional().parse(req.query.role)
  res.json(await prisma.user.findMany({ where: { role }, select, orderBy: { name: 'asc' } }))
})

usersRouter.get('/:id/resumo', requireRole('ALUNO'), async (req, res) => {
  const studentId = req.params.id

  if (req.user.role === 'ALUNO' && req.user.id !== studentId) {
    throw new HttpError(403, 'Sem permissão')
  }

  const measurements = await prisma.bodyMeasurement.findMany({
    where: { studentId },
    orderBy: { measuredAt: 'desc' },
    take: 2,
  })

  const atual = measurements[0]
  const anterior = measurements[1]

  const calcDiff = (atualVal?: any, antVal?: any) => {
    if (atualVal == null || antVal == null) return 0
    return Number((Number(atualVal) - Number(antVal)).toFixed(1))
  }

  const calcImc = (weightKg?: any, heightCm?: any) => {
    if (!weightKg || !heightCm) return 0
    const m = Number(heightCm) / 100
    return Number((Number(weightKg) / (m * m)).toFixed(1))
  }

  const imcAtual = calcImc(atual?.weightKg, atual?.heightCm)
  const imcAnterior = calcImc(anterior?.weightKg, anterior?.heightCm)

  const today = dayInSaoPaulo(new Date())
  const currentMonth = today.slice(0, 7)
  
  const treinosEsteMes = await prisma.workoutSession.count({
    where: {
      studentId,
      finishedAt: { not: null },
      startedAt: {
        gte: new Date(`${currentMonth}-01T00:00:00.000Z`),
        lt: new Date(`${currentMonth}-31T23:59:59.999Z`),
      }
    }
  })

  const anamnese = await prisma.anamnesis.findUnique({
    where: { studentId },
    select: { answers: true }
  })
  
  const answers = anamnese?.answers as Record<string, any> || {}
  const targetDaysPerWeek = answers.daysPerWeek || 5
  const pesoAlvo = answers.targetWeight || 76.0

  res.json({
    medidas: {
      peso: {
        atual: atual?.weightKg ? Number(atual.weightKg) : 0,
        diff: calcDiff(atual?.weightKg, anterior?.weightKg)
      },
      imc: {
        atual: imcAtual,
        diff: Number((imcAtual - imcAnterior).toFixed(1))
      },
      gordura: {
        atual: atual?.bodyFatPct ? Number(atual.bodyFatPct) : 0,
        diff: calcDiff(atual?.bodyFatPct, anterior?.bodyFatPct)
      },
      musculo: {
        atual: atual?.muscleKg ? Number(atual.muscleKg) : 0,
        diff: calcDiff(atual?.muscleKg, anterior?.muscleKg)
      }
    },
    metas: {
      treinos: {
        realizados: treinosEsteMes,
        alvo: targetDaysPerWeek * 4
      },
      frequenciaSemanal: {
        atual: Number((treinosEsteMes / 4).toFixed(1)),
        alvo: targetDaysPerWeek
      },
      peso: {
        atual: atual?.weightKg ? Number(atual.weightKg) : 0,
        alvo: pesoAlvo
      }
    }
  })
})