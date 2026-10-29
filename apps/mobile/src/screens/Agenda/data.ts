import { appointmentSchema } from '@espacofit/shared'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/api/client'
import { useAuth } from '@/auth'

export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
export const weekday = (date: Date) => WEEKDAYS[date.getDay()] ?? ''
// "Qui 17 Set" (o Intl do Hermes não garante o formato em pt-BR)
export const dayLabel = (date: Date) =>
  `${weekday(date)} ${date.getDate()} ${MONTHS[date.getMonth()] ?? ''}`
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter((_, index, parts) => index === 0 || index === parts.length - 1)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

export const agendaKey = ['instructor-agenda']

// Avaliações do instrutor de from a to (AAAA-MM-DD, inclusive)
export function useAgenda(from: string, to: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...agendaKey, user?.id, from, to],
    queryFn: () =>
      api(`/appointments?${new URLSearchParams({ from, to })}`, z.array(appointmentSchema)),
    enabled: user?.role === 'INSTRUTOR',
  })
}

// Grade de avaliações do protótipo de 28/10: dias úteis, de 20 em 20 min. A API aceita qualquer
// "HH:MM", então mudar a grade é só aqui.
export const SLOTS = ['08:00', '08:20', '12:00', '12:20', '12:40', '19:00', '19:20', '19:40']
export const isWorkday = (date: Date) => date.getDay() !== 0 && date.getDay() !== 6
