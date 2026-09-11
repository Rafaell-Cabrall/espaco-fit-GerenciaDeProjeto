// RU01/RN04/RN05: fichas, divisões, modelos; publicar exige anamnese
import { Router } from 'express'
import { auth } from '../../middlewares/auth.ts'

export const plansRouter = Router()

plansRouter.use(auth)

// TODO(sprint 1): implementar. Roles esperados: ALUNO,INSTRUTOR,ADMIN
plansRouter.get('/', (_req, res) =>
  res.status(501).json({ error: 'Módulo plans ainda não implementado' }),
)
