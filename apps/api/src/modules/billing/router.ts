// RU05/RN06/RN07: assinatura, dias restantes, registro de pagamento, bloqueio progressivo
import { Router } from 'express'
import { auth } from '../../middlewares/auth.ts'

export const billingRouter = Router()

billingRouter.use(auth)

// TODO(sprint): implementar. Roles esperados: ALUNO,ADMIN
billingRouter.get('/', (_req, res) =>
  res.status(501).json({ error: 'Módulo billing ainda não implementado' }),
)
