// RU06: POST /qr (aluno gera JWT 60s) e POST /validate (admin lê o QR)
import { Router } from 'express'
import { auth } from '../../middlewares/auth.ts'

export const checkinRouter = Router()

checkinRouter.use(auth)

// TODO(sprint 5): implementar. Roles esperados: ALUNO,ADMIN
checkinRouter.get('/', (_req, res) =>
  res.status(501).json({ error: 'Módulo checkin ainda não implementado' }),
)
