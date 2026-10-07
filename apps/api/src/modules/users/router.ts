// Cadastro por convite: admin cria qualquer perfil; instrutor cria aluno com anamnese e vínculo
import { randomBytes } from 'node:crypto'
import { createUserSchema, Role } from '@espacofit/shared'
import { Router } from 'express'
import { HttpError, validate } from '../../lib/http.ts'
import { hashPassword } from '../../lib/password.ts'
import { prisma } from '../../lib/prisma.ts'
import { auth, requireRole } from '../../middlewares/auth.ts'
import { ensureAvailableCpf } from './cpf.ts'
import { sendInvite } from '../auth/service.ts'

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

// ?role=INSTRUTOR alimenta a escolha do instrutor ao vincular
usersRouter.get('/', requireRole('ADMIN'), async (req, res) => {
  const role = Role.optional().parse(req.query.role)
  res.json(await prisma.user.findMany({ where: { role }, select, orderBy: { name: 'asc' } }))
})
