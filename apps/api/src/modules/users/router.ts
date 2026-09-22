// RU07 admin: criar e listar usuários (via API nesta sprint; ativar/desativar e telas na Sprint 3)
import { createUserSchema, Role } from '@espacofit/shared'
import { Router } from 'express'
import { HttpError, validate } from '../../lib/http.ts'
import { hashPassword } from '../../lib/password.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, requireRole } from '../../middlewares/auth.ts'

const select = { id: true, name: true, email: true, role: true } as const

export const usersRouter = Router()

usersRouter.use(auth, requireRole('ADMIN'))

usersRouter.post('/', validate(createUserSchema), async (req, res) => {
  const { name, email, password, role } = req.body
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new HttpError(409, 'E-mail já cadastrado')
  }
  const user = await prisma.user.create({
    data: { name, email, role, passwordHash: await hashPassword(password) },
    select,
  })
  res.status(201).json(user)
})

// ?role=INSTRUTOR alimenta a escolha do instrutor ao vincular
usersRouter.get('/', async (req, res) => {
  const role = Role.optional().parse(req.query.role)
  res.json(await prisma.user.findMany({ where: { role }, select, orderBy: { name: 'asc' } }))
})
