import cors from 'cors'
import express from 'express'
import { errorHandler } from './lib/http.ts'
import { requestHost } from './lib/storage.ts'
import { anamnesisRouter } from './modules/anamnesis/router.ts'
import { authRouter } from './modules/auth/router.ts'
import { billingRouter } from './modules/billing/router.ts'
import { checkinRouter } from './modules/checkin/router.ts'
import { exercisesRouter } from './modules/exercises/router.ts'
import { feedRouter } from './modules/feed/router.ts'
import { feedbacksRouter } from './modules/feedbacks/router.ts'
import { linksRouter } from './modules/links/router.ts'
import { plansRouter } from './modules/plans/router.ts'
import { sessionsRouter } from './modules/sessions/router.ts'
import { usersRouter } from './modules/users/router.ts'

export const app = express()

app.use(cors())
app.use(express.json())
app.use((req, _res, next) => requestHost.run(req.hostname, next))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/auth', authRouter)
app.use('/users', usersRouter)
app.use('/links', linksRouter)
app.use('/anamnesis', anamnesisRouter)
app.use('/exercises', exercisesRouter)
app.use('/plans', plansRouter)
app.use('/sessions', sessionsRouter)
app.use('/feedbacks', feedbacksRouter)
app.use('/feed', feedRouter)
app.use('/billing', billingRouter)
app.use('/checkin', checkinRouter)

app.use(errorHandler)
