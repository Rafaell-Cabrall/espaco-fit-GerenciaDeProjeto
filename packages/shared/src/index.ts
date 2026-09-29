// Contratos compartilhados entre API e app. Cada módulo novo adiciona seus schemas aqui.
// Rotas, perfis e telas de cada schema: docs/api/README.md
// Convenção: request = z.input (o que o app envia), response = z.infer (o que a API devolve).
import { z } from 'zod'

export const Role = z.enum(['ALUNO', 'INSTRUTOR', 'ADMIN'])
export type Role = z.infer<typeof Role>

export const LinkStatus = z.enum(['ACTIVE', 'ENDED'])
export type LinkStatus = z.infer<typeof LinkStatus>

// Datas trafegam como ISO 8601 UTC (Express serializa Date assim)
const isoDate = z.iso.datetime()
// Dia do calendário, sem hora nem fuso: "2026-08-28" (nascimento, período da ficha, frequência)
const day = z.iso.date('Data no formato AAAA-MM-DD')
// Carga em kg; null = peso corporal / sem carga
const loadKg = z.number().min(0).max(1000).nullable()

// ---------- auth ----------

// Regras da tela "Criar nova senha", na ordem do checklist. O app mostra cada uma com ✓.
export const passwordRules = [
  ['Mínimo 8 caracteres', /^[\s\S]{8,}$/],
  ['Uma letra maiúscula', /[A-Z]/],
  ['Um número', /[0-9]/],
] as const
export const password = passwordRules.reduce((s, [msg, re]) => s.regex(re, msg), z.string())

const email = z.email('E-mail inválido').toLowerCase()
const resetCode = z.string().regex(/^\d{6}$/, 'Código de 6 dígitos')

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof loginSchema>

export const refreshSchema = z.object({ refreshToken: z.string().min(1) })

// "Enviar Código" e "Reenviar código" usam a mesma rota (também no primeiro acesso)
export const forgotPasswordSchema = z.object({ email })
// "Verifique seu e-mail": confere o código antes de abrir "Criar nova senha". No primeiro acesso,
// o código é o do e-mail de convite (vale 72 h).
export const verifyResetCodeSchema = z.object({ email, code: resetCode })
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>
export const resetPasswordSchema = verifyResetCodeSchema.extend({ password })

// PUT /auth/push-token: token do Expo Push deste aparelho. O logout apaga.
export const pushTokenSchema = z.object({
  token: z.string().regex(/^Expo(nent)?PushToken\[.+\]$/, 'Token de push inválido'),
})
export type PushTokenInput = z.infer<typeof pushTokenSchema>

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: Role,
})
export type User = z.infer<typeof userSchema>

export const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
})
export type AuthResponse = z.infer<typeof authResponseSchema>

const userRef = userSchema.pick({ id: true, name: true })

// ---------- anamnesis (instrutor preenche no cadastro; aluno consente no primeiro acesso) ----------

// Valores são o texto exibido: o app mostra direto. Também é o rótulo em "Meus Alunos".
export const Goal = z.enum(
  [
    'Hipertrofia',
    'Emagrecimento',
    'Tonificação',
    'Condicionamento',
    'Performance',
    'Saúde e bem-estar',
  ],
  { error: 'Escolha o objetivo principal' },
)
export type Goal = z.infer<typeof Goal>

// Texto livre opcional; vazio = não informado (o app mostra "—")
const answer = z.string().trim().max(500, 'Use no máximo 500 caracteres').default('')

// "Cadastrar Aluno" e "Anamnese Completa", nas 5 seções do Figma do instrutor
export const anamnesisAnswersSchema = z.object({
  // 1. Dados pessoais
  birthDate: day, // "Data de Nascimento"; a idade ("28 anos") o app calcula
  phone: z.string().trim().max(20, 'Telefone inválido').default(''), // "(11) 99123-4567"
  cpf: z
    .string()
    .regex(/^(\d{11})?$/, 'CPF com 11 números, sem pontos')
    .default(''),
  profession: answer,
  // 2. Objetivos e expectativas
  goal: Goal, // "Principal Objetivo"
  goalDetails: answer, // "Hipertrofia e definição muscular"
  daysPerWeek: z.int().min(1).max(7).nullable().default(null), // "Dias por semana"
  minutesPerSession: z.int().min(10).max(240).nullable().default(null), // "Tempo disponível"
  // 3. Histórico de atividade física
  activityHistory: answer, // "Pratica ou praticou atividade física?"
  weightTrainingExperience: answer, // "Experiência com musculação"
  // 4. Histórico de saúde e clínico
  conditions: answer, // "Doenças diagnosticadas"
  effortSymptoms: answer, // "Dores, tonturas ou falta de ar durante esforço"
  injuries: answer, // "Lesões atuais ou cirurgias recentes"
  medications: answer, // "Medicamentos em uso contínuo"
  familyHeartHistory: answer, // "Histórico familiar de doenças cardíacas graves antes dos 50 anos"
  // 5. Hábitos de vida
  sleep: answer, // "Qualidade do sono (horas por noite, qualidade)"
  hydration: answer, // "Hidratação diária estimada"
  smokingAlcohol: answer, // "Tabagismo / Consumo de álcool"
})
export type AnamnesisAnswers = z.input<typeof anamnesisAnswersSchema>

// PUT /anamnesis/:studentId/notes — "Observações do Personal"
export const anamnesisNotesSchema = z.object({
  notes: z.string().trim().max(1000, 'Use no máximo 1000 caracteres'),
})
export type AnamnesisNotesInput = z.input<typeof anamnesisNotesSchema>

// GET /anamnesis/:studentId devolve Anamnesis ou null (null = instrutor ainda não cadastrou)
export const anamnesisSchema = anamnesisAnswersSchema.extend({
  consentAt: isoDate.nullable(), // null = aluno ainda não autorizou (portão do primeiro acesso, RN09)
  instructorNotes: z.string(),
  updatedAt: isoDate, // "Atualizado em 28 Ago 2026"
  outdated: z.boolean(), // mais de 60 dias sem atualizar; false = "Dentro do prazo"
})
export type Anamnesis = z.infer<typeof anamnesisSchema>

// ---------- users e links ----------

// POST /users, sem senha: o convidado recebe um código de 6 dígitos por e-mail (vale 72 h) e cria a
// senha em "Primeiro acesso". Admin cria qualquer perfil. Instrutor cria só ALUNO, com a anamnese
// completa, e o vínculo com ele nasce junto ("Novo Aluno" → "Cadastrar Aluno").
export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo'),
  email,
  role: Role.default('ALUNO'),
  anamnesis: anamnesisAnswersSchema.optional(),
})
export type CreateUserInput = z.input<typeof createUserSchema>

// Criar vínculo encerra o vínculo ativo anterior do aluno: só um ACTIVE por aluno (RU07).
// Instrutor inativo responde 404 "Instrutor não encontrado ou com cadastro inativo."
export const createLinkSchema = z.object({
  studentId: z.string().min(1),
  instructorId: z.string().min(1),
})
export type CreateLinkInput = z.input<typeof createLinkSchema>

export const linkSchema = z.object({
  id: z.string(),
  status: LinkStatus,
  startedAt: isoDate,
  endedAt: isoDate.nullable(),
  student: userRef,
  instructor: userRef,
})
export type Link = z.infer<typeof linkSchema>

// GET /links: "Meus Alunos", "Buscar aluno" e "Alunos Ativos". goal e birthDate vêm da anamnese
// e chegam null para o admin (RN09) ou para aluno sem anamnese.
export const studentLinkSchema = linkSchema.extend({
  student: userRef.extend({
    goal: Goal.nullable(), // "Hipertrofia"
    birthDate: day.nullable(), // "28 anos"
    lastWorkoutAt: isoDate.nullable(), // "3 dias atrás"; null = nunca treinou
  }),
})
export type StudentLink = z.infer<typeof studentLinkSchema>

// ---------- exercises ----------

// Chips do editor de ficha e categorias da biblioteca
export const MuscleGroup = z.enum(
  ['Peito', 'Costas', 'Bíceps', 'Tríceps', 'Ombros', 'Pernas', 'Glúteos', 'Core', 'Cardio'],
  { error: 'Escolha o grupo muscular' },
)
export type MuscleGroup = z.infer<typeof MuscleGroup>
export const MediaType = z.enum(['image/gif', 'video/mp4'])
export type MediaType = z.infer<typeof MediaType>

export const exerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  muscleGroup: z.string(),
  description: z.string().nullable(), // texto da demonstração na tela de execução
  mediaUrl: z.url().nullable(), // GIF/vídeo por URL assinada temporária; não guardar a URL
  mediaType: MediaType.nullable(), // GIF vira <Image>, MP4 vira player
})
export type Exercise = z.infer<typeof exerciseSchema>

// POST /exercises. Com mediaType, a resposta traz uploadUrl: o app envia o arquivo com
// PUT uploadUrl (header Content-Type = mediaType) em até 15 min.
export const createExerciseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  muscleGroup: MuscleGroup,
  description: z.string().trim().max(1000).nullable().default(null),
  mediaType: MediaType.nullable().default(null),
})
export type CreateExerciseInput = z.input<typeof createExerciseSchema>
export const createdExerciseSchema = z.object({
  exercise: exerciseSchema,
  uploadUrl: z.url().nullable(),
})
export type CreatedExercise = z.infer<typeof createdExerciseSchema>

// ---------- plans (fichas) ----------

export const PlanStatus = z.enum(['DRAFT', 'ACTIVE', 'EXPIRED'])
export type PlanStatus = z.infer<typeof PlanStatus>

// Montagem pelo instrutor. A ordem de divisões e exercícios é a ordem do array.
export const planExerciseInputSchema = z.object({
  exerciseId: z.string().min(1),
  sets: z.int().min(1).max(20),
  reps: z.string().regex(/^\d{1,3}(-\d{1,3})?$/, 'Use "12" ou "8-10"'),
  restSeconds: z.int().min(0).max(600).default(60),
  targetLoadKg: loadKg.default(null), // carga-alvo sugerida; quem registra a carga é o aluno
})
// Dia da semana é só rótulo ("Treino B — Quarta-feira"): o treino do dia segue a rotação (RN08).
// 0 = domingo … 6 = sábado, igual a Date.getDay().
const weekday = z.int().min(0).max(6).nullable()
export const divisionInputSchema = z.object({
  label: z.string().trim().min(1).max(3), // "A"
  title: z.string().trim().min(1).max(60), // "Costas & Bíceps"
  weekday: weekday.default(null),
  exercises: z.array(planExerciseInputSchema).min(1),
})
export type DivisionInput = z.input<typeof divisionInputSchema>
const divisions = z.array(divisionInputSchema).min(1).max(7)

// "Hipertrofia — ABC", 28/08/2026 → 28/11/2026
const planFields = {
  name: z.string().trim().min(2, 'Dê um nome à ficha').max(60),
  startsOn: day,
  endsOn: day,
  divisions,
}
const period = (p: { startsOn: string; endsOn: string }) => p.endsOn > p.startsOn
const periodError = { message: 'O fim da ficha precisa ser depois do início', path: ['endsOn'] }

// POST /plans cria rascunho; 409 "Criação bloqueada. O aluno ainda não tem anamnese." (RN05).
// PUT /plans/:id substitui nome, período e divisões. POST /plans/:id/publish ativa e expira a anterior.
export const createPlanSchema = z
  .object({ studentId: z.string().min(1), ...planFields })
  .refine(period, periodError)
export type CreatePlanInput = z.input<typeof createPlanSchema>
export const updatePlanSchema = z.object(planFields).refine(period, periodError)
export type UpdatePlanInput = z.input<typeof updatePlanSchema>
// "Notificar aluno": push avisando que a ficha nova está disponível
export const publishPlanSchema = z
  .object({ notify: z.boolean().default(false) })
  .default({ notify: false })
export type PublishPlanInput = z.input<typeof publishPlanSchema>

// POST /plans/templates salva modelo; PUT/DELETE /plans/templates/:id edita e apaga.
// Para usar, o app copia `divisions` para o POST /plans ("Importar da Biblioteca").
export const createTemplateSchema = z.object({ name: z.string().trim().min(2).max(60), divisions })
export type CreateTemplateInput = z.input<typeof createTemplateSchema>
export const templateSchema = createTemplateSchema.extend({ id: z.string() })
export type Template = z.infer<typeof templateSchema>

export const planExerciseSchema = z.object({
  id: z.string(), // id do item na ficha; é o divisionExerciseId usado ao registrar série
  order: z.int(),
  sets: z.int(), // "4 séries"
  reps: z.string(), // "8-10 reps"
  restSeconds: z.int(), // "90 s desc." e cronômetro de descanso
  targetLoadKg: loadKg,
  lastLoadKg: loadKg, // última carga que o aluno registrou neste exercício, em qualquer ficha
  exercise: exerciseSchema,
})
export type PlanExercise = z.infer<typeof planExerciseSchema>

export const divisionSchema = z.object({
  id: z.string(),
  label: z.string(), // aba "Treino A"
  title: z.string(), // "Treino A — Peito & Tríceps" = `Treino ${label} — ${title}`
  weekday, // "Treino A — Segunda-feira"; null = sem dia fixo
  order: z.int(),
  estimatedMinutes: z.int(), // "~55 min estimado"
  exercises: z.array(planExerciseSchema), // "6 exercícios" = exercises.length
})
export type Division = z.infer<typeof divisionSchema>

// GET /plans/student/:studentId devolve a ficha ACTIVE ou null. Home e Meus Treinos usam só esta chamada.
export const planSchema = z.object({
  id: z.string(),
  name: z.string(), // "Hipertrofia — ABC"
  status: PlanStatus,
  startsOn: day, // "28/08/2026 → 28/11/2026"; "34 de 91 dias" e "38%" o app calcula
  endsOn: day,
  publishedAt: isoDate.nullable(),
  updatedAt: isoDate, // "Ficha atual — atualizada há 5 dias"
  outdated: z.boolean(), // mais de 60 dias sem atualização
  instructor: userRef,
  todayDivisionId: z.string(), // "Treino do dia" e selo "Hoje": próxima divisão após o último treino
  divisions: z.array(divisionSchema),
})
export type Plan = z.infer<typeof planSchema>

// GET /plans?studentId= — aba Fichas do perfil do aluno: "Ficha Atual" (ACTIVE) e
// "Fichas Arquivadas" (EXPIRED). Rascunhos só aparecem para o instrutor. Mais recente primeiro.
export const planSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: PlanStatus,
  startsOn: day,
  endsOn: day, // "Jun – Ago 2026"
  labels: z.array(z.string()), // "A B C"
})
export type PlanSummary = z.infer<typeof planSummarySchema>

// ---------- sessions (execução do treino) ----------

// POST /sessions: "Iniciar" de qualquer aba; o aluno pode trocar a divisão sugerida
export const startSessionSchema = z.object({
  id: z.string().min(8).max(64).optional(), // gerado no app para o modo offline; repetir devolve a mesma sessão
  divisionId: z.string().min(1),
})
export type StartSessionInput = z.input<typeof startSessionSchema>

// PUT /sessions/:id/sets conclui a série ou corrige a carga. Idempotente por item + série.
// DELETE /sessions/:id/sets/:divisionExerciseId/:setNumber desmarca.
export const setLogInputSchema = z.object({
  divisionExerciseId: z.string().min(1),
  setNumber: z.int().min(1).max(20), // "Série 1"
  loadKg: loadKg.default(null), // "Carga (kg)"
})
export type SetLogInput = z.input<typeof setLogInputSchema>

export const setLogSchema = z.object({
  divisionExerciseId: z.string(),
  setNumber: z.int(),
  loadKg,
  doneAt: isoDate,
})
export type SetLog = z.infer<typeof setLogSchema>

// POST /sessions/:id/finish responde 422 sem nenhuma série (RN03). Nesse caso o app mostra o pop-up
// "Nenhum exercício concluído..." e, em "Sair do treino", chama DELETE /sessions/:id para descartar.
export const finishSessionSchema = z.object({
  // "Nota do exercício", chave = divisionExerciseId. É o feedback que o instrutor lê.
  notes: z.record(z.string(), z.string().trim().max(500)).default({}),
})
export type FinishSessionInput = z.input<typeof finishSessionSchema>

// GET /sessions: o aluno vê os próprios treinos; instrutor (vínculo) e admin passam ?studentId=.
// Filtros da aba Histórico: "Referente à Ficha" (planId) e "Período" (from/to, dias em Brasília).
export const sessionsQuerySchema = z.object({
  studentId: z.string().min(1).optional(),
  planId: z.string().min(1).optional(),
  from: day.optional(),
  to: day.optional(),
})
export type SessionsQuery = z.input<typeof sessionsQuerySchema>

export const sessionNoteSchema = z.object({
  divisionExerciseId: z.string(),
  exercise: z.string(), // "Puxada Frontal"
  text: z.string(), // "Senti o ombro repuxar um pouco."
})
export type SessionNote = z.infer<typeof sessionNoteSchema>

export const sessionSchema = z.object({
  id: z.string(),
  divisionId: z.string(),
  division: z.object({
    label: z.string(), // "Treino B (Costas e Bíceps)"
    title: z.string(),
    planId: z.string(),
  }),
  startedAt: isoDate,
  finishedAt: isoDate.nullable(),
  notes: z.array(sessionNoteSchema), // comentários por exercício, na ordem da ficha
  sets: z.array(setLogSchema), // "0/6 exercícios concluídos · 0 séries" sai daqui
})
export type Session = z.infer<typeof sessionSchema>

// GET /sessions/frequency?month=2026-09 (aluno). Sem month = mês atual em Brasília.
// Um dia conta com ao menos um treino finalizado, e todo treino finalizado tem série (RN03).
export const frequencySchema = z.object({
  currentStreak: z.int(), // "Sequência atual · 3 dias consecutivos"; segue viva se treinou ontem
  bestStreak: z.int(), // "22 melhor sequência"
  monthCount: z.int(), // "7 treinos este mês"
  totalCount: z.int(), // "Histórico · 24 treinos"
  days: z.array(day), // dias com treino no mês pedido: calendário Treinou / Não treinou
})
export type Frequency = z.infer<typeof frequencySchema>

// ---------- feedbacks (instrutor) ----------

// GET /feedbacks — "Feedbacks Recentes": um item por comentário dos seus alunos, mais recente
// primeiro (últimos 50 treinos com nota). "N comentários não lidos" = itens com read false.
// POST /feedbacks/:sessionId/read marca como lidos todos os comentários daquele treino.
export const feedbackSchema = z.object({
  sessionId: z.string(),
  student: userRef,
  divisionExerciseId: z.string(),
  exercise: z.string(), // "Supino Inclinado com Halteres"
  text: z.string(),
  finishedAt: isoDate, // "Hoje · 18:42"
  read: z.boolean(),
})
export type Feedback = z.infer<typeof feedbackSchema>
