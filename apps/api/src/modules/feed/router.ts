// RU04: avisos da academia (leitura por todos os perfis, escrita ADMIN)
import { createAnnouncementSchema } from '@espacofit/shared'
import type { Announcement } from '@prisma/client'
import { Router } from 'express'
import { HttpError, validate } from '../../lib/http.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, requireRole } from '../../middlewares/auth.ts'
import { day } from '../plans/router.ts'
import { dayInSaoPaulo } from '../sessions/frequency.ts'

const toAnnouncement = ({ expiresOn, ...a }: Announcement) => ({
  ...a,
  expiresOn: expiresOn && day(expiresOn),
})

export const feedRouter = Router()

feedRouter.use(auth)

// Só os vigentes: o aviso some no dia seguinte ao expiresOn (dia em Brasília)
feedRouter.get('/', async (_req, res) => {
  const today = new Date(dayInSaoPaulo(new Date()))
  const rows = await prisma.announcement.findMany({
    where: { OR: [{ expiresOn: null }, { expiresOn: { gte: today } }] },
    orderBy: { publishedAt: 'desc' },
  })
  res.json(rows.map(toAnnouncement))
})

feedRouter.post('/', requireRole('ADMIN'), validate(createAnnouncementSchema), async (req, res) => {
  const { expiresOn, ...data } = req.body
  if (expiresOn && expiresOn < dayInSaoPaulo(new Date())) {
    throw new HttpError(422, 'A validade precisa ser hoje ou depois')
  }
  const row = await prisma.announcement.create({
    data: { ...data, expiresOn: expiresOn && new Date(expiresOn) },
  })
  res.status(201).json(toAnnouncement(row))
})

feedRouter.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  await prisma.announcement.deleteMany({ where: { id: req.params.id as string } })
  res.status(204).end()
})
