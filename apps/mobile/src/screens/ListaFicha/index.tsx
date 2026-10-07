import { View, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Text } from '@/components/Text'
import { Status } from '@/components/Status'
import { tokens } from '@/design-system/tokens'
import { styles } from './style'

export function ListaFichaScreen() {
  const router = useRouter()
  const { studentId } = useLocalSearchParams()

  const plansQuery = useQuery({
    queryKey: ['plans', studentId],
    queryFn: () => api(`/plans?studentId=${studentId}`, {} as any),
    enabled: !!studentId,
  })

  const plans = plansQuery.data || []
  const activePlan = plans.find((p: any) => p.status === 'ACTIVE')
  const historyPlans = plans.filter((p: any) => p.status !== 'ACTIVE')

  if (plansQuery.isPending) return <Status />
  if (plansQuery.isError) return <Status message={plansQuery.error.message} action="Tentar de novo" onAction={plansQuery.refetch} />

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Fichas do Aluno</Text>
        <Pressable 
          style={styles.createButton}
          onPress={() => router.push({ pathname: '/(instrutor)/nova-ficha', params: { studentId } })}
        >
          <Text style={styles.createButtonText}>+ Criar Ficha</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Ficha Ativa</Text>
        {activePlan ? (
          <View style={styles.activeCard}>
            <View style={styles.activeHeader}>
              <View>
                <Text style={styles.planName}>{activePlan.name}</Text>
                <Text style={styles.planLabels}>Divisões: {activePlan.labels?.join(' - ') || 'N/A'}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>ATIVA</Text>
              </View>
            </View>
            <Pressable 
              style={styles.btnOutline}
              onPress={() => router.push(`/(instrutor)/ficha/${activePlan.id}`)}
            >
              <Text style={styles.btnOutlineText}>Visualizar Treino Completo</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={{ color: tokens.colors.textMuted }}>Nenhuma ficha ativa no momento.</Text>
        )}

        <Text style={styles.sectionTitle}>Histórico e Rascunhos</Text>
        {historyPlans.length > 0 ? (
          historyPlans.map((plan: any) => (
            <Pressable 
              key={plan.id} 
              style={styles.historyCard}
              onPress={() => router.push({ pathname: '/(instrutor)/editar-ficha', params: { planId: plan.id } })}
            >
              <Ionicons name="document-text-outline" size={24} color={tokens.colors.textSecondary} />
              <View style={styles.historyInfo}>
                <Text style={styles.historyName}>{plan.name}</Text>
                <Text style={styles.historyDates}>{plan.startsOn} até {plan.endsOn}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{plan.status}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={tokens.colors.border} />
            </Pressable>
          ))
        ) : (
          <Text style={{ color: tokens.colors.textMuted }}>Nenhum histórico disponível.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}