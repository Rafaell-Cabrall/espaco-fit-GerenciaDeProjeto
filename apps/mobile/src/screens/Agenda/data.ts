import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

const appointmentsSchema = z.array(z.object({ id: z.string(), date: z.iso.date(), hour: z.number().int().min(5).max(21), studentId: z.string(), studentName: z.string() }))
export type Appointment = z.infer<typeof appointmentsSchema>[number]
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const dayLabel = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')
export const initials = (name: string) => name.trim().split(/\s+/).filter((_, index, parts) => index === 0 || index === parts.length - 1).map((part) => part[0]).join('').toUpperCase()

export function useAgenda(instructorId?: string) {
  const queryClient = useQueryClient()
  const queryKey = ['instructor-agenda', instructorId]
  const storageKey = `instructor-agenda-v1:${instructorId}`
  const query = useQuery({ queryKey, enabled: !!instructorId, queryFn: async () => {
    const stored = await AsyncStorage.getItem(storageKey)
    return stored ? appointmentsSchema.parse(JSON.parse(stored)) : []
  } })
  const save = async (appointments: Appointment[]) => {
    if (!instructorId) throw new Error('Sessão indisponível.')
    await AsyncStorage.setItem(storageKey, JSON.stringify(appointments))
    queryClient.setQueryData(queryKey, appointments)
  }
  return { ...query, save }
}

// Cada horário representa uma avaliação de uma hora, terminando até o fechamento.
export function openingHours(date: Date): number[] {
  const weekday = date.getDay()
  if (weekday === 0) return []
  const start = weekday === 6 ? 14 : 5
  const closing = weekday === 6 ? 18 : 22
  return Array.from({ length: closing - start }, (_, index) => start + index)
}
