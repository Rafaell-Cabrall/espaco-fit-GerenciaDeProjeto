// Dados de desenvolvimento. Senha de todos: Senha123
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password.ts'

const prisma = new PrismaClient()

const exercises: [string, string][] = [
  ['Supino Reto com Barra', 'Peito'],
  ['Supino Inclinado com Halter', 'Peito'],
  ['Crucifixo no Cross', 'Peito'],
  ['Tríceps Pulley', 'Tríceps'],
  ['Tríceps Francês', 'Tríceps'],
  ['Barra Fixa (Pegada Supinada)', 'Costas'],
  ['Remada Curvada com Barra', 'Costas'],
  ['Remada Unilateral com Haltere', 'Costas'],
  ['Rosca Direta com Barra', 'Bíceps'],
  ['Rosca Martelo', 'Bíceps'],
  ['Rosca Concentrada', 'Bíceps'],
  ['Agachamento Livre', 'Pernas'],
  ['Leg Press 45°', 'Pernas'],
  ['Cadeira Extensora', 'Pernas'],
  ['Mesa Flexora', 'Pernas'],
  ['Panturrilha em Pé', 'Pernas'],
]

async function main() {
  const passwordHash = await hashPassword('Senha123')
  const user = (name: string, email: string, role: 'ALUNO' | 'INSTRUTOR' | 'ADMIN') =>
    prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, role, passwordHash },
    })

  const admin = await user('Recepção', 'admin@espacofit.com', 'ADMIN')
  const instrutor = await user('Carlos Instrutor', 'instrutor@espacofit.com', 'INSTRUTOR')
  const joao = await user('João Silva', 'joao@email.com', 'ALUNO')
  const maria = await user('Maria Souza', 'maria@email.com', 'ALUNO')

  for (const studentId of [joao.id, maria.id]) {
    const has = await prisma.link.findFirst({ where: { studentId, status: 'ACTIVE' } })
    if (!has) await prisma.link.create({ data: { studentId, instructorId: instrutor.id } })
  }

  if ((await prisma.exercise.count()) === 0) {
    await prisma.exercise.createMany({
      data: exercises.map(([name, muscleGroup]) => ({ name, muscleGroup, createdById: admin.id })),
    })
  }

  if ((await prisma.membershipPlan.count()) === 0) {
    await prisma.membershipPlan.create({ data: { name: 'Plano Mensal', priceCents: 8990 } })
  }

  console.log(
    'seed ok — login: admin@espacofit.com / instrutor@espacofit.com / joao@email.com, senha Senha123',
  )
}

main().finally(() => prisma.$disconnect())
