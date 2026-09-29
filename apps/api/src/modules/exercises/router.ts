// RU01: biblioteca de exercícios; mídia por URL assinada (MinIO)
import type { Exercise as ExerciseResponse } from '@espacofit/shared'
import type { Exercise } from '@prisma/client'
import { Router } from 'express'
import { prisma } from '../../lib/prisma.ts'
import { mediaUrl } from '../../lib/storage.ts'
import { auth, requireRole } from '../../middlewares/auth.ts'

export const toExercise = ({
  id,
  name,
  muscleGroup,
  description,
  mediaKey,
}: Exercise): ExerciseResponse => ({
  id,
  name,
  muscleGroup,
  description,
  mediaUrl: mediaUrl(mediaKey),
  mediaType: mediaKey ? (mediaKey.endsWith('.mp4') ? 'video/mp4' : 'image/gif') : null,
})

export const exercisesRouter = Router()

exercisesRouter.use(auth)

exercisesRouter.get('/', requireRole('INSTRUTOR', 'ADMIN'), async (_req, res) => {
  const rows = await prisma.exercise.findMany({
    orderBy: [{ muscleGroup: 'asc' }, { name: 'asc' }],
  })
  res.json(rows.map(toExercise))
})
