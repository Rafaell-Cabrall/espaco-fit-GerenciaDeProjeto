import type { Feedback } from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getFeedbackPlanId } from '@/api/feedbacks'
import { InstructorTabBar } from '@/components/InstructorTabBar'
import { Text } from '@/components/Text'
import { tokens } from '@/design-system/tokens'
import { useFeedbacks, useReadFeedback } from '@/hooks/useFeedbacks'
import { FeedbackCard } from './components/FeedbackCard'
import { styles } from './styles'

export function FeedbacksRecentesScreen() {
  const router = useRouter()
  const feedbacks = useFeedbacks()
  const read = useReadFeedback()
  const opening = useRef(false)
  const [openingSession, setOpeningSession] = useState<string | null>(null)
  const { refetch } = feedbacks
  useFocusEffect(
    useCallback(() => {
      void refetch()
    }, [refetch]),
  )
  const unread = feedbacks.data?.filter((item) => !item.read).length ?? 0
  const subtitle = feedbacks.data
    ? `${unread} ${unread === 1 ? 'comentário não lido' : 'comentários não lidos'}`
    : feedbacks.isError
      ? 'Comentários indisponíveis'
      : 'Carregando comentários…'

  const open = async (feedback: Feedback, adjust = false) => {
    if (opening.current) return
    opening.current = true
    setOpeningSession(feedback.sessionId)
    let stage = 'read'
    try {
      if (!feedback.read) await read.mutateAsync(feedback.sessionId)
      if (adjust) {
        stage = 'plan'
        const planId = await getFeedbackPlanId(feedback)
        router.push({
          pathname: '/(instrutor)/ficha',
          params: { studentId: feedback.student.id, planId },
        })
      }
    } catch (cause) {
      Alert.alert(
        stage === 'read' ? 'Não foi possível marcar como lido' : 'Não foi possível abrir a ficha',
        stage === 'read'
          ? 'Tente novamente. O comentário continua disponível.'
          : cause instanceof Error
            ? cause.message
            : 'Tente novamente.',
      )
    } finally {
      opening.current = false
      setOpeningSession(null)
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar para Home"
            style={styles.back}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/(instrutor)/(tabs)')
            }
          >
            <Ionicons name="chevron-back" size={22} color={tokens.colors.textPrimary} />
          </Pressable>
          <View style={styles.heading}>
            <Text variant="title" accessibilityRole="header">
              Feedbacks Recentes
            </Text>
            <Text variant="caption" style={styles.subtitle} accessibilityLiveRegion="polite">
              {subtitle}
            </Text>
          </View>
        </View>
      </View>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={feedbacks.data ?? []}
        keyExtractor={(item) => `${item.sessionId}:${item.divisionExerciseId}`}
        refreshControl={
          <RefreshControl
            refreshing={feedbacks.isRefetching}
            onRefresh={() => void refetch()}
            tintColor={tokens.colors.primary}
          />
        }
        ListHeaderComponent={
          feedbacks.isError && feedbacks.data ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void refetch()}
              style={styles.retry}
            >
              <Text variant="caption" style={styles.error}>
                Não foi possível atualizar. Toque para tentar novamente.
              </Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.status}>
            {feedbacks.isPending ? (
              <ActivityIndicator
                accessibilityLabel="Carregando feedbacks"
                color={tokens.colors.primary}
              />
            ) : (
              <>
                <Ionicons
                  name="chatbubbles-outline"
                  size={36}
                  color={tokens.colors.textSecondary}
                />
                <Text style={styles.statusText}>
                  {feedbacks.isError
                    ? 'Não foi possível carregar os feedbacks.'
                    : 'Nenhum feedback por enquanto. Os comentários dos treinos dos seus alunos aparecerão aqui.'}
                </Text>
                {feedbacks.isError && (
                  <Pressable
                    accessibilityRole="button"
                    style={styles.retry}
                    onPress={() => void refetch()}
                  >
                    <Text style={styles.actionText}>Tentar novamente</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <FeedbackCard
            feedback={item}
            disabled={openingSession !== null}
            busy={openingSession === item.sessionId}
            onRead={() => void open(item)}
            onAdjust={() => void open(item, true)}
          />
        )}
      />
      <InstructorTabBar />
    </SafeAreaView>
  )
}
