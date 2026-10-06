// Frequência do aluno logado: sequência atual/melhor, treinos no mês, total e dias do calendário.
// Sem month = mês atual (Home). A aba Evolução > Frequência passa "AAAA-MM" ao trocar de mês.
// A execução invalida ao finalizar.
import { frequencySchema } from '@espacofit/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { useAuth } from '@/auth'

export function useFrequency(month?: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['frequency', user?.id, month],
    queryFn: () => api(`/sessions/frequency${month ? `?month=${month}` : ''}`, frequencySchema),
    enabled: !!user,
  })
}
