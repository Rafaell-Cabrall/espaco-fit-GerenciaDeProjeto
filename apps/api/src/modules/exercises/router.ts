// RU01: biblioteca de exercícios; mídia por URL assinada (MinIO)
import { randomUUID } from 'node:crypto'
import {
  createExerciseSchema,
  type Exercise as ExerciseResponse,
  type MediaType,
} from '@espacofit/shared'
import type { Exercise } from '@prisma/client'
import { Router } from 'express'
import { validate } from '../../lib/http.ts'
import { prisma } from '../../lib/prisma.ts'
import { mediaUrl, presign } from '../../lib/storage.ts'
import { auth, requireRole } from '../../middlewares/auth.ts'

const EXT = { 'image/gif': 'gif', 'video/mp4': 'mp4' } as const satisfies Record<MediaType, string>

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

exercisesRouter.use(auth, requireRole('INSTRUTOR', 'ADMIN'))

exercisesRouter.get('/', async (_req, res) => {
  const rows = await prisma.exercise.findMany({
    orderBy: [{ muscleGroup: 'asc' }, { name: 'asc' }],
  })
  res.json(rows.map(toExercise))
})

// Id gerado aqui para a chave da mídia sair no mesmo insert. O app envia o arquivo direto ao MinIO;
// até lá a mediaUrl aponta para um objeto que ainda não existe e o app mostra o fallback.
// ponytail: URL PUT assinada não limita tamanho; trocar por POST policy se aparecer upload abusivo.
exercisesRouter.post('/', validate(createExerciseSchema), async (req, res) => {
  const { name, muscleGroup, description, mediaType } = req.body
  const id = randomUUID()
  const mediaKey = mediaType && `exercises/${id}.${EXT[mediaType as MediaType]}`
  const row = await prisma.exercise.create({
    data: { id, name, muscleGroup, description, mediaKey, createdById: req.user.id },
  })
  res.status(201).json({
    exercise: toExercise(row),
    uploadUrl: mediaKey && presign('PUT', mediaKey, 15 * 60),
  })
})
