import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { SairModal } from '@/components/SairModal'
import { Status } from '@/components/Status'
import { Text } from '@/components/Text'
import { tokens } from '@/design-system/tokens'
import { useFrequency } from '@/hooks/useFrequency'
import { usePlan } from '@/hooks/usePlan'
import { styles } from './styles'

export function HomeAlunoScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const plan = usePlan()
  const frequency = useFrequency()
  const [sair, setSair] = useState(false)

  if (plan.isPending) return <Status />
  if (plan.isError)
    return (
      <Status
        message={plan.error.message}
        action="Tentar de novo"
        onAction={() => plan.refetch()}
        loading={plan.isFetching}
      />
    )

  const today = plan.data?.divisions.find((d) => d.id === plan.data?.todayDivisionId)
  const treinos = frequency.data?.totalCount
  const streak = frequency.data?.currentStreak ?? 0

  // Gera array de 7 posições para as bolinhas do streak
  const streakDots = Array.from({ length: 7 }).map((_, i) => i < Math.min(streak, 7))

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="label">Bom treino,</Text>
            <Text variant="title">{user?.name}</Text>
          </View>
          <Pressable
            onPress={() => setSair(true)}
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
            hitSlop={8}
            style={styles.logout}
          >
            <Ionicons name="log-out-outline" size={20} color={tokens.colors.textPrimary} />
          </Pressable>
        </View>

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakInfo}>
            <View style={styles.streakIcon}>
              <Ionicons name="flame" size={20} color={tokens.colors.primary} />
            </View>
            <View>
              <Text variant="label">Sequência atual</Text>
              <Text style={styles.tileTitle}>
                {streak === 0 ? 'Nenhuma' : `${streak} ${streak === 1 ? 'dia consecutivo' : 'dias consecutivos'}`}
              </Text>
            </View>
          </View>
          
          <View style={styles.streakDotsRow}>
            {streakDots.map((isActive, idx) => (
              <View 
                key={idx} 
                style={[styles.streakDot, isActive && styles.streakDotActive]} 
              />
            ))}
          </View>
        </View>

        {/* Workout Card */}
        {today ? (
          <View style={styles.workout}>
            <Image
              source={require('../../../assets/bg-academia.jpg')}
              style={styles.cover}
              contentFit="cover"
            />
            <View style={styles.workoutBody}>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Hoje</Text>
                </View>
                <Text variant="label">Treino do dia</Text>
              </View>
              
              <Text variant="title">
                Treino {today.label} — {today.title}
              </Text>
              <Text variant="label">
                {today.exercises.length} exercícios · ~{today.estimatedMinutes} min estimado
              </Text>
              
              <View style={styles.action}>
                <Button
                  title="Iniciar Treino"
                  onPress={() =>
                    router.push({
                      pathname: '/(aluno)/treino/[divisionId]',
                      params: { divisionId: today.id },
                    })
                  }
                />
              </View>
            </View>
          </View>
        ) : (
          <Card>
            <Text variant="label">
              Sua ficha ainda não foi publicada. Assim que o instrutor montar seus treinos, o treino do dia aparece aqui.
            </Text>
          </Card>
        )}

        {/* Aviso da Academia (Placeholder Sprint 3/4) */}
        <View style={styles.avisoCard}>
          <Text style={styles.avisoHeader}>Aviso da Academia</Text>
          <Text style={styles.avisoTitle}>🎉 Promoção de Setembro</Text>
          <Text style={styles.avisoText}>
            Indique um amigo e ganhe 1 mês grátis! Válido até 30/09.
          </Text>
          <View style={styles.carouselDots}>
            <View style={styles.carouselDotActive} />
            <View style={styles.carouselDot} />
            <View style={styles.carouselDot} />
          </View>
        </View>

        {/* Bottom Tiles: Contrato e Histórico */}
        <View style={styles.tilesGrid}>
          {/* Tile Contrato (Placeholder Sprint 3/4) */}
          <View style={styles.tile}>
            <View style={styles.tileIconContrato}>
              <Ionicons name="wallet" size={16} color="#4ADE80" />
            </View>
            <View>
              <Text style={styles.tileTitle}>Contrato Ativo</Text>
              <Text style={styles.tileSubtitleContrato}>Renovar em 18 dias</Text>
            </View>
          </View>

          {/* Tile Histórico (API já plugada) */}
          <View style={styles.tile}>
            <View style={styles.tileIconHistorico}>
              <Ionicons name="reader" size={16} color={tokens.colors.accent || '#D4AF37'} />
            </View>
            <View>
              <Text style={styles.tileTitle}>Histórico</Text>
              <Text variant="label">
                {treinos === undefined ? '—' : treinos === 1 ? '1 treino' : `${treinos} treinos`}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
      <SairModal visible={sair} onClose={() => setSair(false)} />
    </SafeAreaView>
  )
}