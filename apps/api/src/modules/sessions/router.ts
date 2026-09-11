// RU02/RU03/RN02/RN03/RN08: iniciar/finalizar sessão, set logs, treino do dia, calendário, streak
import { Router } from 'express'
import { auth } from '../../middlewares/auth.ts'

export const sessionsRouter = Router()

sessionsRouter.use(auth)

// TODO(sprint 1): implementar. Roles esperados: ALUNO,INSTRUTOR,ADMIN
sessionsRouter.get('/', (_req, res) =>
  res.status(501).json({ error: 'Módulo sessions ainda não implementado' }),
)
