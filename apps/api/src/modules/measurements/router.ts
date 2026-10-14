// Avaliação física: instrutor registra composição corporal e perímetros; aluno lê na Evolução
import { createMeasurementSchema, type Measurement } from '@espacofit/shared'
import type { BodyMeasurement } from '@prisma/client'
import { Router } from 'express'
import { validate } from '../../lib/http.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, requireLink, requireRole } from '../../middlewares/auth.ts'
import { day } from '../plans/router.ts'

const num = (value: { toString(): string } | null) => (value === null ? null : Number(value))

const toMeasurement = (m: BodyMeasurement, heightCm: number | null): Measurement => ({
  id: m.id,
  measuredOn: day(m.measuredOn),
  weightKg: Number(m.weightKg),
  heightCm: m.heightCm,
  bodyFatPct: num(m.bodyFatPct),
  leanMassKg: num(m.leanMassKg),
  muscleKg: num(m.muscleKg),
  chestCm: num(m.chestCm),
  waistCm: num(m.waistCm),
  abdomenCm: num(m.abdomenCm),
  rightArmCm: num(m.rightArmCm),
  leftArmCm: num(m.leftArmCm),
  thighCm: num(m.thighCm),
  calfCm: num(m.calfCm),
  bmi: heightCm && Math.round((Number(m.weightKg) / (heightCm / 100) ** 2) * 10) / 10,
})

export const measurementsRouter = Router()

// Medida corporal é dado de saúde: admin fica de fora, como na anamnese (RN09)
measurementsRouter.use(auth, requireRole('ALUNO', 'INSTRUTOR'))

// Mais recente primeiro. O IMC usa a última altura informada até cada avaliação.
measurementsRouter.get('/', requireLink, async (req, res) => {
  const rows = await prisma.bodyMeasurement.findMany({
    where: { studentId: req.query.studentId as string },
    orderBy: [{ measuredOn: 'asc' }, { createdAt: 'asc' }],
  })
  let height: number | null = null
  const items = rows.map((m) => {
    height = m.heightCm ?? height
    return toMeasurement(m, height)
  })
  res.json(items.reverse())
})

measurementsRouter.post(
  '/',
  requireRole('INSTRUTOR'),
  validate(createMeasurementSchema),
  requireLink,
  async (req, res) => {
    const { measuredOn, ...data } = req.body
    const row = await prisma.bodyMeasurement.create({
      data: { ...data, measuredOn: new Date(measuredOn) },
    })
    // Altura desta avaliação ou a última informada antes dela
    const height = await prisma.bodyMeasurement.findFirst({
      where: {
        studentId: row.studentId,
        heightCm: { not: null },
        measuredOn: { lte: row.measuredOn },
      },
      orderBy: [{ measuredOn: 'desc' }, { createdAt: 'desc' }],
      select: { heightCm: true },
    })
    res.status(201).json(toMeasurement(row, height?.heightCm ?? null))
  },
)
