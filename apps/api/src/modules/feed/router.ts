// RU04: avisos da academia (leitura pública autenticada, escrita ADMIN)
import { Router } from 'express'
import { auth } from '../../middlewares/auth.ts'

export const feedRouter = Router()

feedRouter.use(auth)

// TODO(sprint): implementar. Roles esperados: ALUNO,INSTRUTOR,ADMIN
feedRouter.get('/', (_req, res) =>
  res.status(501).json({ error: 'Módulo feed ainda não implementado' }),
)
