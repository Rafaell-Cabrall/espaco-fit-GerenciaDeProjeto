// Contratos compartilhados entre API e app. Cada módulo novo adiciona seus schemas aqui.
import { z } from 'zod'

export const Role = z.enum(['ALUNO', 'INSTRUTOR', 'ADMIN'])
export type Role = z.infer<typeof Role>

export const LinkStatus = z.enum(['ACTIVE', 'ENDED'])
export type LinkStatus = z.infer<typeof LinkStatus>

// Regra da tela "Criar nova senha": mínimo 8, uma maiúscula, um número
export const password = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Uma letra maiúscula')
  .regex(/[0-9]/, 'Um número')

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

export const forgotPasswordSchema = z.object({ email: z.email().toLowerCase() })
export const resetPasswordSchema = z.object({
  email: z.email().toLowerCase(),
  code: z.string().length(6),
  password,
})

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
