// Agenda de avaliações físicas do instrutor: um aluno por horário (dia e hora em Brasília)
import { appointmentsQuerySchema, createAppointmentSchema } from '@espacofit/shared'
import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { HttpError, validate } from '../../lib/http.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, requireLink, requireRole } from '../../middlewares/auth.ts'
import { day } from '../plans/router.ts'
import { dayInSaoPaulo } from '../sessions/frequency.ts'

const select = {
  id: true,
  date: true,
  time: true,
  student: { select: { id: true, name: true } },
} satisfies Prisma.AppointmentSelect

const toAppointment = ({
  date,
  ...a
}: Prisma.AppointmentGetPayload<{ select: typeof select }>) => ({
  ...a,
  date: day(date),
})

export const appointmentsRouter = Router()

appointmentsRouter.use(auth, requireRole('INSTRUTOR'))

appointmentsRouter.get('/', async (req, res) => {
  const { from, to } = appointmentsQuerySchema.parse(req.query)
  const rows = await prisma.appointment.findMany({
    where: { instructorId: req.user.id, date: { gte: new Date(from), lte: new Date(to) } },
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
    select,
  })
  res.json(rows.map(toAppointment))
})

appointmentsRouter.post('/', validate(createAppointmentSchema), requireLink, async (req, res) => {
  const { studentId, date, time } = req.body
  if (date < dayInSaoPaulo(new Date()))
    throw new HttpError(422, 'Escolha uma data a partir de hoje')
  try {
    const row = await prisma.appointment.create({
      data: { instructorId: req.user.id, studentId, date: new Date(date), time },
      select,
    })
    res.status(201).json(toAppointment(row))
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new HttpError(409, 'Horário já ocupado')
    }
    throw err
  }
})

// Cancelar. Já cancelado também responde 204.
appointmentsRouter.delete('/:id', async (req, res) => {
  await prisma.appointment.deleteMany({
    where: { id: req.params.id as string, instructorId: req.user.id },
  })
  res.status(204).end()
})
