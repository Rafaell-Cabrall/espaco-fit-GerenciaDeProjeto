import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from '@espacofit/shared'
import { Router } from 'express'
import { validate } from '../../lib/http.ts'
import { auth } from '../../middlewares/auth.ts'
import * as service from './service.ts'

export const authRouter = Router()

authRouter.post('/register', validate(registerSchema), async (req, res) => {
  res.status(201).json(await service.register(req.body))
})

authRouter.post('/login', validate(loginSchema), async (req, res) => {
  res.json(await service.login(req.body))
})

authRouter.post('/refresh', validate(refreshSchema), async (req, res) => {
  res.json(await service.refresh(req.body.refreshToken))
})

authRouter.get('/me', auth, async (req, res) => {
  res.json(await service.me(req.user.id))
})

authRouter.post('/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
  await service.forgotPassword(req.body.email)
  res.status(204).end()
})

authRouter.post('/reset-password', validate(resetPasswordSchema), async (req, res) => {
  await service.resetPassword(req.body.email, req.body.code, req.body.password)
  res.status(204).end()
})
