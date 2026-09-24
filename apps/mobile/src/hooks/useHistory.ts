// Treinos finalizados do aluno logado, mais recente primeiro. A execução invalida ao finalizar.
import { sessionSchema } from '@espacofit/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { useAuth } from '@/auth'

export function useHistory() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['history', user?.id],
    queryFn: () => api('/sessions', sessionSchema.array()),
    enabled: !!user,
  })
}
