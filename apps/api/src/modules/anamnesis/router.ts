// RN05/RN09: anamnese do aluno com consentimento LGPD; GET/PUT /:studentId
import { anamnesisInputSchema } from '@espacofit/shared'
import type { Anamnesis } from '@prisma/client'
import { Router } from 'express'
import { validate } from '../../lib/http.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, requireLink, requireRole } from '../../middlewares/auth.ts'

// RN04: anamnese e ficha vencem após 60 dias sem atualização
export const isOutdated = (updatedAt: Date) =>
  Date.now() - updatedAt.getTime() > 60 * 24 * 60 * 60 * 1000

const toResponse = ({ answers, consentAt, updatedAt }: Anamnesis) => ({
  ...(answers as object),
  consentAt,
  updatedAt,
  outdated: isOutdated(updatedAt),
})

export const anamnesisRouter = Router()

anamnesisRouter.use(auth)

// requireRole antes do requireLink: admin passa no vínculo, mas não lê dado de saúde (RN09)
anamnesisRouter.get(
  '/:studentId',
  requireRole('ALUNO', 'INSTRUTOR'),
  requireLink,
  async (req, res) => {
    const studentId = req.params.studentId as string
    const row = await prisma.anamnesis.findUnique({ where: { studentId } })
    res.json(row && toResponse(row))
  },
)

// Só o próprio aluno responde; cada envio renova o consentimento
anamnesisRouter.put(
  '/:studentId',
  requireRole('ALUNO'),
  requireLink,
  validate(anamnesisInputSchema),
  async (req, res) => {
    const { consent: _, ...answers } = req.body
    const studentId = req.params.studentId as string
    const data = { answers, consentAt: new Date() }
    const row = await prisma.anamnesis.upsert({
      where: { studentId },
      create: { studentId, ...data },
      update: data,
    })
    res.json(toResponse(row))
  },
)
