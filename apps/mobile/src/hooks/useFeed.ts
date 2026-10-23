// Avisos vigentes da academia, mais recente primeiro (card "Aviso da Academia" das Homes).
import { announcementSchema } from '@espacofit/shared'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/api/client'
import { useAuth } from '@/auth'

export function useFeed() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['feed', user?.id],
    queryFn: () => api('/feed', z.array(announcementSchema)),
    enabled: !!user,
  })
}
