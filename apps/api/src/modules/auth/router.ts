import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  pushTokenSchema,
  refreshSchema,
  resetPasswordSchema,
  verifyResetCodeSchema,
} from '@espacofit/shared'
import { Router } from 'express'
import { validate } from '../../lib/http.ts'
import { auth } from '../../middlewares/auth.ts'
import * as service from './service.ts'

export const authRouter = Router()

authRouter.post('/login', validate(loginSchema), async (req, res) => {
  res.json(await service.login(req.body))
})

authRouter.post('/refresh', validate(refreshSchema), async (req, res) => {
  res.json(await service.refresh(req.body.refreshToken))
})

authRouter.get('/me', auth, async (req, res) => {
  res.json(await service.me(req.user.id))
})

// "Sair da conta": invalida os tokens no servidor; o app apaga os tokens locais em seguida
authRouter.post('/logout', auth, async (req, res) => {
  await service.logout(req.user.id)
  res.status(204).end()
})

// Perfil > "Alterar senha"
authRouter.put('/password', auth, validate(changePasswordSchema), async (req, res) => {
  res.json(await service.changePassword(req.user.id, req.body.currentPassword, req.body.password))
})

// Depois da permissão de notificação: o token do Expo deste aparelho
authRouter.put('/push-token', auth, validate(pushTokenSchema), async (req, res) => {
  await service.setPushToken(req.user.id, req.body.token)
  res.status(204).end()
})

authRouter.post('/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
  await service.forgotPassword(req.body.email)
  res.status(204).end()
})

authRouter.post('/verify-reset-code', validate(verifyResetCodeSchema), async (req, res) => {
  await service.verifyResetCode(req.body.email, req.body.code)
  res.status(204).end()
})

authRouter.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  await service.resetPassword(req.body.email, req.body.code, req.body.password)
  res.status(204).end()
})
