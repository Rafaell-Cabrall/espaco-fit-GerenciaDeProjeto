// RU01: biblioteca de exercícios; mídia por URL assinada (MinIO)
import type { Exercise } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.ts'
import { mediaUrl } from '../../lib/storage.ts'
import { auth, requireRole } from '../../middlewares/auth.ts'

export const toExercise = ({ id, name, muscleGroup, description, mediaKey }: Exercise) => ({
  id,
  name,
  muscleGroup,
  description,
  mediaUrl: mediaUrl(mediaKey),
})

export const exercisesRouter = Router()

exercisesRouter.use(auth)

exercisesRouter.get('/', requireRole('INSTRUTOR', 'ADMIN'), async (_req, res) => {
  const rows = await prisma.exercise.findMany({
    orderBy: [{ muscleGroup: 'asc' }, { name: 'asc' }],
  })
  res.json(rows.map(toExercise))
})
