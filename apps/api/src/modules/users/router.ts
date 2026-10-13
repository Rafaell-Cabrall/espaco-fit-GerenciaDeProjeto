// Cadastro por convite: admin cria qualquer perfil; instrutor cria aluno com anamnese e vínculo
import { randomBytes } from 'node:crypto'
import { createUserSchema, Role, updateUserStatusSchema } from '@espacofit/shared'
import { Router } from 'express'
import { z } from 'zod'
import { HttpError, validate } from '../../lib/http.ts'
import { hashPassword } from '../../lib/password.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, requireRole } from '../../middlewares/auth.ts'
import { sendInvite } from '../auth/service.ts'
import { ensureAvailableCpf } from './cpf.ts'

const select = { id: true, name: true, email: true, role: true } as const

export const usersRouter = Router()

usersRouter.use(auth)

usersRouter.post(
  '/',
  requireRole('ADMIN', 'INSTRUTOR'),
  validate(createUserSchema),
  async (req, res) => {
    const { name, email, role, anamnesis } = req.body
    const byInstructor = req.user.role === 'INSTRUTOR'
    if (byInstructor && role !== 'ALUNO') throw new HttpError(403, 'Instrutor cadastra só alunos')
    if (byInstructor && !anamnesis) throw new HttpError(400, 'Preencha a anamnese do aluno')
    if (anamnesis && role !== 'ALUNO') throw new HttpError(400, 'Anamnese é só para aluno')
    if (byInstructor && !anamnesis?.cpf) throw new HttpError(400, 'Informe o CPF do aluno')
    if (await prisma.user.findUnique({ where: { email } })) {
      throw new HttpError(409, 'E-mail já cadastrado')
    }
    const passwordHash = await hashPassword(randomBytes(32).toString('hex'))
    const user = await prisma.$transaction(async (tx) => {
      await ensureAvailableCpf(tx, anamnesis?.cpf ?? '')
      return tx.user.create({
        data: {
          name,
          email,
          role,
          // Senha que ninguém conhece: o acesso só abre pelo código do convite
          passwordHash,
          anamnesis: anamnesis && { create: { answers: anamnesis } },
          asStudent: byInstructor ? { create: { instructorId: req.user.id } } : undefined,
        },
        select,
      })
    })
    await sendInvite(user)
    res.status(201).json(user)
  },
)

const adminSelect = { ...select, active: true } as const
const listQuery = z.object({
  role: Role.optional(),
  active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

// ?role=INSTRUTOR&active=true alimenta a escolha do instrutor ao vincular (RU07)
usersRouter.get('/', requireRole('ADMIN'), async (req, res) => {
  const where = listQuery.parse(req.query)
  res.json(await prisma.user.findMany({ where, select: adminSelect, orderBy: { name: 'asc' } }))
})

// Ativar/desativar. Desativado não entra e perde as sessões abertas (o auth confere `active`).
usersRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  validate(updateUserStatusSchema),
  async (req, res) => {
    const id = req.params.id as string
    if (id === req.user.id) throw new HttpError(422, 'Você não pode desativar a própria conta')
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new HttpError(404, 'Usuário não encontrado')
    res.json(
      await prisma.user.update({
        where: { id },
        data: { active: req.body.active },
        select: adminSelect,
      }),
    )
  },
)
