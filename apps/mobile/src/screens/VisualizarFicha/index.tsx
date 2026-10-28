import { planSchema } from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api } from '@/api/client'
import { InstructorTabBar } from '@/components/InstructorTabBar'
import { Text } from '@/components/Text'
import { periodProgress } from './progress'
import { styles } from './styles'

const weekdays = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]
const date = (iso: string) => iso.split('-').reverse().join('/')
const statuses = { ACTIVE: 'Ativa', DRAFT: 'Rascunho', EXPIRED: 'Encerrada' }

export default function VisualizarFichaScreen() {
  const { planId, studentId } = useLocalSearchParams<{ planId?: string; studentId?: string }>()
  const router = useRouter()
  const query = useQuery({
    queryKey: ['plan', planId],
    queryFn: () => api(`/plans/${encodeURIComponent(planId ?? '')}`, planSchema),
    enabled: !!planId,
  })
  const plan = query.data
  const progress = plan ? periodProgress(plan.startsOn, plan.endsOn) : 0

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar às fichas"
          style={styles.back}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/(instrutor)/(tabs)/alunos')
          }
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.caption}>Visualizando</Text>
          <Text accessibilityRole="header" style={styles.title} numberOfLines={1}>
            {plan?.name ?? 'Ficha de treino'}
          </Text>
        </View>

        {plan && studentId && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.badge, plan.status !== 'ACTIVE' && styles.otherBadge]}>
              <Text style={[styles.badgeText, plan.status !== 'ACTIVE' && styles.otherBadgeText]}>
                {statuses[plan.status]}
              </Text>
            </View>
            <Pressable
              style={styles.editButton}
              onPress={() =>
                router.push({
                  pathname: '/(instrutor)/ficha',
                  params: { studentId, planId: plan.id },
                })
              }
            >
              <Ionicons name="create-outline" size={14} color="#FF3B30" />
              <Text style={styles.editText}>Editar</Text>
            </Pressable>
          </View>
        )}
      </View>

      {plan && (
        <View style={styles.period}>
          <View style={styles.periodLabels}>
            <Text style={styles.caption}>
              {date(plan.startsOn)} → {date(plan.endsOn)}
            </Text>
            <Text style={styles.progressText}>{progress}% concluído</Text>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Progresso do período da ficha"
            accessibilityValue={{ min: 0, max: 100, now: progress }}
            style={styles.track}
          >
            <View style={[styles.fill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              if (planId) void query.refetch()
            }}
            tintColor="#FF3B30"
          />
        }
      >
        {!planId ? (
          <Text style={styles.message}>Abra a ficha pela aba Fichas do aluno.</Text>
        ) : query.isPending ? (
          <ActivityIndicator color="#FF3B30" />
        ) : query.isError ? (
          <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
            <Text style={styles.message}>
              Não foi possível carregar a ficha. Toque para tentar novamente.
            </Text>
          </Pressable>
        ) : (
          plan && (
            <>
              {!plan.divisions.length && (
                <Text style={styles.message}>Esta ficha ainda não tem treinos.</Text>
              )}
              {[...plan.divisions]
                .sort((a, b) => a.order - b.order)
                .map((division) => (
                  <View key={division.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.letter}>
                        <Text style={styles.letterText}>{division.label}</Text>
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.divisionTitle}>
                          Treino {division.label}
                          {division.weekday !== null ? ` — ${weekdays[division.weekday]}` : ''}
                        </Text>
                        <Text style={styles.caption}>
                          {division.title} · {division.exercises.length}{' '}
                          {division.exercises.length === 1 ? 'exercício' : 'exercícios'}
                        </Text>
                      </View>
                    </View>
                    {[...division.exercises]
                      .sort((a, b) => a.order - b.order)
                      .map((item) => (
                        <View key={item.id} style={styles.exercise}>
                          <View style={styles.dot} />
                          <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                          <Text style={styles.pill}>
                            {item.sets}×{item.reps}
                          </Text>
                          <Text style={styles.pill}>{item.restSeconds}s</Text>
                        </View>
                      ))}
                  </View>
                ))}
            </>
          )
        )}
      </ScrollView>
      <InstructorTabBar active="Alunos" />
    </SafeAreaView>
  )
}
