// RU01: biblioteca de exercícios + URL assinada de upload (MinIO)
import { Router } from 'express'
import { auth } from '../../middlewares/auth.ts'

export const exercisesRouter = Router()

exercisesRouter.use(auth)

// TODO(sprint): implementar. Roles esperados: INSTRUTOR,ADMIN
exercisesRouter.get('/', (_req, res) =>
  res.status(501).json({ error: 'Módulo exercises ainda não implementado' }),
)
