// RN05/RN09: anamnese do aluno com consentimento LGPD; GET/PUT /:studentId (requireLink)
import { Router } from 'express'
import { auth } from '../../middlewares/auth.ts'

export const anamnesisRouter = Router()

anamnesisRouter.use(auth)

// TODO(sprint): implementar. Roles esperados: ALUNO,INSTRUTOR,ADMIN
anamnesisRouter.get('/', (_req, res) =>
  res.status(501).json({ error: 'Módulo anamnesis ainda não implementado' }),
)
