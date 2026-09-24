// Home do aluno (Sprint 1): saudação, treino do dia (RN08) e histórico. Sequência, avisos e
// contrato do Figma chegam com as APIs das Sprints 2 a 4.
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
import { useHistory } from '@/hooks/useHistory'
import { usePlan } from '@/hooks/usePlan'
import { styles } from './styles'

export function HomeAlunoScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const plan = usePlan()
  const history = useHistory()
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
  const treinos = history.data?.length
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
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

        {today ? (
          <Card style={styles.workout}>
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
          </Card>
        ) : (
          <Card>
            <Text variant="label">
              Sua ficha ainda não foi publicada. Assim que o instrutor montar seus treinos, o treino
              do dia aparece aqui.
            </Text>
          </Card>
        )}

        <View style={styles.row}>
          <Card style={styles.tile}>
            <View style={styles.tileIcon}>
              <Ionicons name="reader" size={18} color={tokens.colors.accent} />
            </View>
            <Text style={styles.tileTitle}>Histórico</Text>
            <Text variant="label">
              {treinos === undefined ? '—' : treinos === 1 ? '1 treino' : `${treinos} treinos`}
            </Text>
          </Card>
        </View>
      </ScrollView>
      <SairModal visible={sair} onClose={() => setSair(false)} />
    </SafeAreaView>
  )
}
