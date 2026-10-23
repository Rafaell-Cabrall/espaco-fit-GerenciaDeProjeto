// Avaliações físicas do aluno, mais recente primeiro. O instrutor passa o aluno; o aluno passa o
// próprio id (a API exige studentId nos dois casos).
import { measurementSchema } from '@espacofit/shared'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/api/client'
import { useAuth } from '@/auth'

export const measurementsKey = (userId: string | undefined, studentId: string) => [
  'measurements',
  userId,
  studentId,
]

export function useMeasurements(studentId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: measurementsKey(user?.id, studentId),
    queryFn: () =>
      api(`/measurements?${new URLSearchParams({ studentId })}`, z.array(measurementSchema)),
    enabled: !!user && !!studentId,
  })
}
