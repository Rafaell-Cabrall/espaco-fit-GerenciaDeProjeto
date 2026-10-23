import { type Feedback, feedbackSchema, sessionSchema } from '@espacofit/shared'
import { z } from 'zod'
import { api } from './client'

export const getFeedbacks = () => api('/feedbacks', z.array(feedbackSchema))
export const markFeedbackRead = (sessionId: string) =>
  api(`/feedbacks/${encodeURIComponent(sessionId)}/read`, z.undefined(), { method: 'POST' })

// O feedback identifica a sessão; ela guarda a ficha original, inclusive quando já encerrada.
export async function getFeedbackPlanId(feedback: Pick<Feedback, 'student' | 'sessionId'>) {
  const sessions = await api(
    `/sessions?${new URLSearchParams({ studentId: feedback.student.id })}`,
    z.array(sessionSchema),
  )
  const session = sessions.find((item) => item.id === feedback.sessionId)
  if (!session)
    throw new Error(
      'O treino deste comentário não foi encontrado. Atualize os feedbacks e tente novamente.',
    )
  return session.division.planId
}
