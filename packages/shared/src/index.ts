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
// Carga em kg; null = peso corporal / sem carga
const loadKg = z.number().min(0).max(1000).nullable()

// ---------- auth ----------

// Regra da tela "Criar nova senha": mínimo 8, uma maiúscula, um número
export const password = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Uma letra maiúscula')
  .regex(/[0-9]/, 'Um número')

const resetCode = z.string().regex(/^\d{6}$/, 'Código de 6 dígitos')

export const registerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email().toLowerCase(),
  password,
  acceptedTerms: z.literal(true, { error: 'Aceite os termos para continuar' }),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof loginSchema>

export const refreshSchema = z.object({ refreshToken: z.string().min(1) })

// "Enviar Código" e "Reenviar código" usam a mesma rota
export const forgotPasswordSchema = z.object({ email: z.email().toLowerCase() })
// Tela "Verifique seu e-mail": confere o código antes de abrir "Criar nova senha"
export const verifyResetCodeSchema = z.object({ email: z.email().toLowerCase(), code: resetCode })
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>
export const resetPasswordSchema = verifyResetCodeSchema.extend({ password })

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

// ---------- users e links (admin via API nesta sprint; telas na Sprint 3) ----------

export const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email().toLowerCase(),
  password,
  role: Role,
})
export type CreateUserInput = z.input<typeof createUserSchema>

// Criar vínculo encerra o vínculo ativo anterior do aluno: só um ACTIVE por aluno
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

// ---------- anamnesis (formulário do primeiro acesso; tela Evolução > Anamnese) ----------

// Valores são o texto exibido no protótipo: o app mostra direto, sem tabela de rótulos
export const FitnessLevel = z.enum(['Iniciante', 'Intermediário', 'Avançado'])
export type FitnessLevel = z.infer<typeof FitnessLevel>
export const Goal = z.enum(['Hipertrofia', 'Emagrecimento', 'Condicionamento', 'Saúde e bem-estar'])
export type Goal = z.infer<typeof Goal>
export const WeeklyFrequency = z.enum(['1 - 2 dias', '3 dias', '4 - 5 dias', '6 - 7 dias'])
export type WeeklyFrequency = z.infer<typeof WeeklyFrequency>

const anamnesisAnswers = z.object({
  injuries: z.string().trim().max(500).default(''), // "Lesões ou restrições"; vazio = "Sem restrições"
  fitnessLevel: FitnessLevel, // "Nível de condicionamento"
  goal: Goal, // "Objetivo principal"
  weeklyFrequency: WeeklyFrequency, // "Frequência semanal"
  conditions: z.string().trim().max(500).default(''), // "Doenças preexistentes"; vazio = "Nenhuma"
})

// PUT /anamnesis/:studentId, só o próprio aluno. consent = aceite do uso de dado de saúde (LGPD)
export const anamnesisInputSchema = anamnesisAnswers.extend({
  consent: z.literal(true, { error: 'Autorize o uso dos seus dados de saúde para continuar' }),
})
export type AnamnesisInput = z.input<typeof anamnesisInputSchema>

// GET /anamnesis/:studentId devolve Anamnesis ou null (null = abrir o formulário do primeiro acesso)
export const anamnesisSchema = anamnesisAnswers.extend({
  consentAt: isoDate,
  updatedAt: isoDate, // "Anamnese atualizada em 20/08/2026"
  outdated: z.boolean(), // mais de 60 dias sem atualizar; false = "Dentro do prazo"
})
export type Anamnesis = z.infer<typeof anamnesisSchema>

// ---------- exercises ----------

export const exerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  muscleGroup: z.string(),
  description: z.string().nullable(), // texto da demonstração na tela de execução
  mediaUrl: z.url().nullable(), // GIF/vídeo por URL assinada temporária; não guardar a URL
})
export type Exercise = z.infer<typeof exerciseSchema>

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
export const divisionInputSchema = z.object({
  label: z.string().trim().min(1).max(3), // "A"
  title: z.string().trim().min(1).max(60), // "Costas & Bíceps"
  exercises: z.array(planExerciseInputSchema).min(1),
})
export type DivisionInput = z.input<typeof divisionInputSchema>
const divisions = z.array(divisionInputSchema).min(1).max(7)

// POST /plans cria rascunho; PUT /plans/:id substitui as divisões
export const createPlanSchema = z.object({ studentId: z.string().min(1), divisions })
export type CreatePlanInput = z.input<typeof createPlanSchema>
export const updatePlanSchema = z.object({ divisions })
export type UpdatePlanInput = z.input<typeof updatePlanSchema>

// POST /plans/templates salva modelo; para usar, o app copia `divisions` para o POST /plans
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
  order: z.int(),
  estimatedMinutes: z.int(), // "~55 min estimado"
  exercises: z.array(planExerciseSchema), // "6 exercícios" = exercises.length
})
export type Division = z.infer<typeof divisionSchema>

// GET /plans/student/:studentId devolve a ficha ACTIVE ou null. Home e Meus Treinos usam só esta chamada.
export const planSchema = z.object({
  id: z.string(),
  status: PlanStatus,
  publishedAt: isoDate.nullable(),
  updatedAt: isoDate, // "Ficha atual — atualizada há 5 dias"
  outdated: z.boolean(), // mais de 60 dias sem atualização
  instructor: userRef,
  todayDivisionId: z.string(), // "Treino do dia" e selo "Hoje": próxima divisão após o último treino
  divisions: z.array(divisionSchema),
})
export type Plan = z.infer<typeof planSchema>

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

// POST /sessions/:id/finish responde 422 sem nenhuma série ("Marque ao menos 1 série...")
export const finishSessionSchema = z.object({
  // "Nota do exercício", chave = divisionExerciseId
  notes: z.record(z.string(), z.string().trim().max(500)).default({}),
})
export type FinishSessionInput = z.input<typeof finishSessionSchema>

export const sessionSchema = z.object({
  id: z.string(),
  divisionId: z.string(),
  startedAt: isoDate,
  finishedAt: isoDate.nullable(),
  notes: z.record(z.string(), z.string()),
  sets: z.array(setLogSchema), // "0/6 exercícios concluídos · 0 séries" sai daqui
})
export type Session = z.infer<typeof sessionSchema>
