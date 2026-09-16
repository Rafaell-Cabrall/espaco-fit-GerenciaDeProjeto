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

  // Maria já tem anamnese e ficha ativa A/B/C (telas de treino); João começa do zero (primeiro acesso)
  await prisma.anamnesis.upsert({
    where: { studentId: maria.id },
    update: {},
    create: {
      studentId: maria.id,
      consentAt: new Date(),
      answers: {
        injuries: '',
        fitnessLevel: 'Intermediário',
        goal: 'Hipertrofia',
        weeklyFrequency: '3 dias',
        conditions: '',
      },
    },
  })
  if (!(await prisma.workoutPlan.findFirst({ where: { studentId: maria.id, status: 'ACTIVE' } }))) {
    const ids = new Map((await prisma.exercise.findMany()).map((e) => [e.name, e.id]))
    const divisions: [string, string, string[]][] = [
      [
        'A',
        'Peito & Tríceps',
        [
          'Supino Reto com Barra',
          'Supino Inclinado com Halter',
          'Crucifixo no Cross',
          'Tríceps Pulley',
          'Tríceps Francês',
        ],
      ],
      [
        'B',
        'Costas & Bíceps',
        [
          'Barra Fixa (Pegada Supinada)',
          'Remada Curvada com Barra',
          'Remada Unilateral com Haltere',
          'Rosca Direta com Barra',
          'Rosca Martelo',
        ],
      ],
      [
        'C',
        'Pernas',
        [
          'Agachamento Livre',
          'Leg Press 45°',
          'Cadeira Extensora',
          'Mesa Flexora',
          'Panturrilha em Pé',
        ],
      ],
    ]
    await prisma.workoutPlan.create({
      data: {
        studentId: maria.id,
        instructorId: instrutor.id,
        status: 'ACTIVE',
        publishedAt: new Date(),
        divisions: {
          create: divisions.map(([label, title, names], order) => ({
            label,
            title,
            order,
            exercises: {
              create: names.map((name, i) => ({
                exerciseId: ids.get(name) ?? '',
                order: i,
                sets: i === 0 ? 4 : 3,
                reps: i === 0 ? '8-10' : '10-12',
                restSeconds: i === 0 ? 90 : 60,
                targetLoad: name.startsWith('Barra Fixa') ? null : 10 + i * 5,
              })),
            },
          })),
        },
      },
    })
  }

  if ((await prisma.membershipPlan.count()) === 0) {
    await prisma.membershipPlan.create({ data: { name: 'Plano Mensal', priceCents: 8990 } })
  }

  console.log(
    'seed ok — login: admin@espacofit.com / instrutor@espacofit.com / joao@email.com / maria@email.com (com ficha), senha Senha123',
  )
}

main().finally(() => prisma.$disconnect())
