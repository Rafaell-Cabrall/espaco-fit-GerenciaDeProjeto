// Dados de desenvolvimento. Senha de todos: Senha123
import { readFile } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password.ts'
import { presign } from '../src/lib/storage.ts'

const prisma = new PrismaClient()

// [nome, grupo, GIF em prisma/media/]
const exercises: [string, string, string][] = [
  ['Supino Reto com Barra', 'Peito', 'supino-reto-com-barra'],
  ['Supino Inclinado com Halter', 'Peito', 'supino-inclinado-com-halter'],
  ['Crucifixo no Cross', 'Peito', 'crucifixo-no-cross'],
  ['Tríceps Pulley', 'Tríceps', 'triceps-pulley'],
  ['Tríceps Francês', 'Tríceps', 'triceps-frances'],
  ['Barra Fixa (Pegada Supinada)', 'Costas', 'barra-fixa-pegada-supinada'],
  ['Remada Curvada com Barra', 'Costas', 'remada-curvada-com-barra'],
  ['Remada Unilateral com Haltere', 'Costas', 'remada-unilateral-com-haltere'],
  ['Rosca Direta com Barra', 'Bíceps', 'rosca-direta-com-barra'],
  ['Rosca Martelo', 'Bíceps', 'rosca-martelo'],
  ['Rosca Concentrada', 'Bíceps', 'rosca-concentrada'],
  ['Agachamento Livre', 'Pernas', 'agachamento-livre'],
  ['Leg Press 45°', 'Pernas', 'leg-press-45'],
  ['Cadeira Extensora', 'Pernas', 'cadeira-extensora'],
  ['Mesa Flexora', 'Pernas', 'mesa-flexora'],
  ['Panturrilha em Pé', 'Pernas', 'panturrilha-em-pe'],
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

  // GIFs do free-exercise-db (domínio público, ver prisma/media/FONTE.md). Reenviar é idempotente;
  // mediaKey só é gravado depois do upload, e mídia trocada pelo instrutor não é sobrescrita.
  try {
    for (const [name, , slug] of exercises) {
      const key = `exercises/${slug}.gif`
      const put = await fetch(presign('PUT', key), {
        method: 'PUT',
        headers: { 'content-type': 'image/gif' },
        body: await readFile(new URL(`media/${slug}.gif`, import.meta.url)),
      })
      if (!put.ok) throw new Error(`MinIO respondeu ${put.status}`)
      await prisma.exercise.updateMany({ where: { name, mediaKey: null }, data: { mediaKey: key } })
    }
  } catch (err) {
    console.warn('Exercícios sem GIF (MinIO no ar? docker compose up -d):', err)
  }

  // Anamnese que o instrutor preencheu no cadastro. Maria já consentiu e tem ficha ativa A/B/C
  // (telas de treino); João ainda não consentiu (primeiro acesso). update reescreve o formato antigo.
  const answers = (goal: string, conditions: string) => ({
    birthDate: '1998-03-15',
    phone: '(11) 99123-4567',
    cpf: '',
    profession: 'Designer Gráfica',
    goal,
    goalDetails: '',
    daysPerWeek: 4,
    minutesPerSession: 60,
    activityHistory: 'Musculação há 2 anos, pausou por 3 meses',
    weightTrainingExperience: 'Sim — experiência intermediária',
    conditions,
    effortSymptoms: '',
    injuries: '',
    medications: '',
    familyHeartHistory: '',
    sleep: 'Regular — dorme ~7 h por noite',
    hydration: 'Aproximadamente 2 L por dia',
    smokingAlcohol: 'Não fuma · Bebe socialmente',
  })
  for (const [studentId, data] of [
    [maria.id, { answers: answers('Hipertrofia', ''), consentAt: new Date() }],
    [joao.id, { answers: answers('Emagrecimento', 'Asma'), consentAt: null }],
  ] as const) {
    await prisma.anamnesis.upsert({
      where: { studentId },
      update: data,
      create: { studentId, ...data },
    })
  }
  if (!(await prisma.workoutPlan.findFirst({ where: { studentId: maria.id, status: 'ACTIVE' } }))) {
    const ids = new Map((await prisma.exercise.findMany()).map((e) => [e.name, e.id]))
    // [rótulo, título, dia da semana, exercícios]
    const divisions: [string, string, number, string[]][] = [
      [
        'A',
        'Peito & Tríceps',
        1,
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
        3,
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
        5,
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
        name: 'Hipertrofia — ABC',
        startsOn: new Date(Date.now() - 34 * 86_400_000),
        endsOn: new Date(Date.now() + 57 * 86_400_000),
        publishedAt: new Date(),
        divisions: {
          create: divisions.map(([label, title, weekday, names], order) => ({
            label,
            title,
            weekday,
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
    'seed ok — login: admin@espacofit.com / instrutor@espacofit.com / joao@email.com (falta consentir a anamnese) / maria@email.com (com ficha), senha Senha123',
  )
}

main().finally(() => prisma.$disconnect())
