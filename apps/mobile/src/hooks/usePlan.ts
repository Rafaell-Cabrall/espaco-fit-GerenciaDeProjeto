// Ficha ACTIVE do aluno logado (RN01). null = o instrutor ainda não publicou nenhuma.
// Home, Meus Treinos e Execução leem a mesma chave: uma busca serve as três telas.
import { planSchema } from '@espacofit/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { useAuth } from '@/auth'

export function usePlan() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['plan', user?.id],
    queryFn: () => api(`/plans/student/${user?.id}`, planSchema.nullable()),
    enabled: !!user,
  })
}
