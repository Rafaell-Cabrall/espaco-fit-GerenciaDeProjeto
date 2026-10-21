import type { Feedback } from '@espacofit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFeedbacks, markFeedbackRead } from '@/api/feedbacks'
import { useAuth } from '@/auth'

export function useFeedbacks() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['instructor-home', user?.id, 'feedbacks'],
    queryFn: getFeedbacks,
    enabled: user?.role === 'INSTRUTOR',
  })
}

export function useReadFeedback() {
  const { user } = useAuth()
  const cache = useQueryClient()
  const queryKey = ['instructor-home', user?.id, 'feedbacks']
  return useMutation({
    mutationFn: markFeedbackRead,
    onSuccess: (_data, sessionId) => {
      // A leitura pertence ao treino, inclusive quando há comentários de vários exercícios.
      cache.setQueryData<Feedback[]>(queryKey, (items) =>
        items?.map((item) => (item.sessionId === sessionId ? { ...item, read: true } : item)),
      )
      void cache.invalidateQueries({ queryKey })
    },
  })
}
