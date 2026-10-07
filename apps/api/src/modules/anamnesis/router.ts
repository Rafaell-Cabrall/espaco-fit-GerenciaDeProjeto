// RN05/RN09: anamnese preenchida pelo instrutor; o aluno lê e consente
import { anamnesisAnswersSchema, anamnesisNotesSchema } from '@espacofit/shared'
import type { Anamnesis } from '@prisma/client'
import { type Request, Router } from 'express'
import { HttpError, validate } from '../../lib/http.ts'
import { ensureAvailableCpf } from '../users/cpf.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, requireLink, requireRole } from '../../middlewares/auth.ts'

// RN04: anamnese e ficha vencem após 60 dias sem atualização
export const isOutdated = (updatedAt: Date) =>
  Date.now() - updatedAt.getTime() > 60 * 24 * 60 * 60 * 1000

const toResponse = ({ answers, consentAt, instructorNotes, updatedAt }: Anamnesis) => ({
  ...(answers as object),
  consentAt,
  instructorNotes,
  updatedAt,
  outdated: isOutdated(updatedAt),
})

async function findExisting(req: Request) {
  const row = await prisma.anamnesis.findUnique({
    where: { studentId: req.params.studentId as string },
  })
  if (!row) throw new HttpError(404, 'Anamnese ainda não cadastrada. Procure seu instrutor.')
  return row
}

export const anamnesisRouter = Router()

anamnesisRouter.use(auth)

// requireRole antes do requireLink: admin passa no vínculo, mas não lê dado de saúde (RN09)
anamnesisRouter.get(
  '/:studentId',
  requireRole('ALUNO', 'INSTRUTOR'),
  requireLink,
  async (req, res) => {
    const row = await prisma.anamnesis.findUnique({
      where: { studentId: req.params.studentId as string },
    })
    res.json(row && toResponse(row))
  },
)

// "Salvar Anamnese": o instrutor preenche e corrige. Não mexe no consentimento.
anamnesisRouter.put(
  '/:studentId',
  requireRole('INSTRUTOR'),
  requireLink,
  validate(anamnesisAnswersSchema),
  async (req, res) => {
    const studentId = req.params.studentId as string
    const row = await prisma.$transaction(async (tx) => {
      await ensureAvailableCpf(tx, req.body.cpf, studentId)
      return tx.anamnesis.upsert({
        where: { studentId },
        create: { studentId, answers: req.body },
        update: { answers: req.body },
      })
    })
    res.json(toResponse(row))
  },
)

// Consentimento e observações mantêm updatedAt: a data mostrada e o RN04 são das respostas
anamnesisRouter.post('/:studentId/consent', requireRole('ALUNO'), requireLink, async (req, res) => {
  const { id, updatedAt } = await findExisting(req)
  const row = await prisma.anamnesis.update({
    where: { id },
    data: { consentAt: new Date(), updatedAt },
  })
  res.json(toResponse(row))
})

anamnesisRouter.put(
  '/:studentId/notes',
  requireRole('INSTRUTOR'),
  requireLink,
  validate(anamnesisNotesSchema),
  async (req, res) => {
    const { id, updatedAt } = await findExisting(req)
    const row = await prisma.anamnesis.update({
      where: { id },
      data: { instructorNotes: req.body.notes, updatedAt },
    })
    res.json(toResponse(row))
  },
)
