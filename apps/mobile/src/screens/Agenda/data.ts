import { appointmentSchema } from '@espacofit/shared'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/api/client'
import { useAuth } from '@/auth'

export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const dayLabel = (date: Date) =>
  date
    .toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\./g, '')
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

// Cada horário representa uma avaliação de uma hora, terminando até o fechamento.
export function openingHours(date: Date): number[] {
  const weekday = date.getDay()
  if (weekday === 0) return []
  const start = weekday === 6 ? 14 : 5
  const closing = weekday === 6 ? 18 : 22
  return Array.from({ length: closing - start }, (_, index) => start + index)
}
