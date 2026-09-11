// RU07 admin: CRUD de usuários, ativar/desativar, RN10 exclusão
import { Router } from 'express'
import { auth } from '../../middlewares/auth.ts'

export const usersRouter = Router()

usersRouter.use(auth)

// TODO(sprint 1, uso via API; telas na sprint 3): implementar. Roles esperados: ADMIN
usersRouter.get('/', (_req, res) =>
  res.status(501).json({ error: 'Módulo users ainda não implementado' }),
)
