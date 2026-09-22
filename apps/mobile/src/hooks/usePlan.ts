import { planSchema } from '@espacofit/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'

// Dados simulados de fallback para testar o front sem back-end
const mockPlan = {
  id: 'plan-1',
  todayDivisionId: 'div-b',
  divisions: [
    {
      id: 'div-b',
      label: 'B',
      title: 'Costas & Bíceps',
      estimatedMinutes: 55,
      exercises: [1, 2, 3, 4, 5, 6],
      coverUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1000&auto=format&fit=crop',
    }
  ]
}

export function usePlan(studentId: string) {
  return useQuery({
    queryKey: ['plan', studentId],
    queryFn: async () => {
      try {
        return await api(`/plans/student/${studentId}`, planSchema.nullable())
      } catch {
        // Fallback automático enquanto o back-end não está disponível
        return mockPlan
      }
    },
    enabled: !!studentId,
  })
}