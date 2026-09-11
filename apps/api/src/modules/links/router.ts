// RU07: vínculo aluno-instrutor (um ACTIVE por aluno), troca de instrutor
import { Router } from 'express'
import { auth } from '../../middlewares/auth.ts'

export const linksRouter = Router()

linksRouter.use(auth)

// TODO(sprint 1, uso via API; telas na sprint 3): implementar. Roles esperados: ADMIN
linksRouter.get('/', (_req, res) =>
  res.status(501).json({ error: 'Módulo links ainda não implementado' }),
)
