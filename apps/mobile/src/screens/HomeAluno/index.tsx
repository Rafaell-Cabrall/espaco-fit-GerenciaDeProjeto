import { useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'

// ATENÇÃO: Atualiza este caminho para apontar para o ficheiro real que acabaste de encontrar!
// (Usa o Ctrl + Espaço no VS Code para ele fazer o Auto Import do caminho correto)
import { useAuth } from '@/providers/AuthProvider' 

import { usePlan } from '@/hooks/usePlan'
import { useDashboard } from '@/hooks/useDashboard'
import { BottomBar } from '@/components/BottomBar'
import { MeusTreinosScreen } from '@/screens/MeusTreinos'
import { styles } from './styles'

export function HomeScreen() {
  const router = useRouter()
  
  // Agora este user vem diretamente da API (do /auth/me) com os dados reais!
  const { user, logout } = useAuth()
  const realUserId = user?.id ?? ''
  
  const { data: plan, isLoading: planLoading, isError: planError, refetch: refetchPlan } = usePlan(realUserId)
  const { data: dashboard, isLoading: dashLoading, isError: dashError, refetch: refetchDash } = useDashboard(realUserId)

  const [currentTab, setCurrentTab] = useState<'home' | 'treinos' | 'evolucao' | 'perfil'>('home')

  // Se o user ainda for undefined (o AuthProvider ainda está a carregar do backend)
  if (user === undefined || planLoading || dashLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    )
  }

  if (planError || dashError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ color: '#A1A1AA', marginBottom: 16, textAlign: 'center' }}>Não foi possível carregar os dados.</Text>
        <Pressable 
          onPress={() => {
            refetchPlan()
            refetchDash()
          }}
          style={{ backgroundColor: '#EF4444', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}
        >
          <Text style={{ color: '#FAFAFA', fontWeight: 'bold' }}>Tentar de novo</Text>
        </Pressable>
      </View>
    )
  }

  const todayDivision = plan?.divisions?.find((d) => d.id === plan?.todayDivisionId)
  const todayDivisionCover = todayDivision && 'coverUrl' in todayDivision ? todayDivision.coverUrl : undefined
  
  const streak = dashboard?.streak
  const announcement = dashboard?.announcement
  const contract = dashboard?.contract
  const history = dashboard?.history

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      {currentTab === 'treinos' ? (
        <MeusTreinosScreen />
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: 80 }]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Bom treino,</Text>
              {/* O nome real da base de dados aparece aqui! */}
              <Text style={styles.userName}>{user?.name}</Text>
            </View>
            <Pressable onPress={logout} style={styles.logoutButton}>
              <Text style={{ color: '#FAFAFA', fontSize: 16 }}>↪</Text>
            </Pressable>
          </View>

          {streak && (
            <View style={styles.streakCard}>
              <View>
                <Text style={styles.streakLabel}>Sequência atual</Text>
                <Text style={styles.streakValue}>{streak.current} dias consecutivos</Text>
              </View>
              <View style={styles.streakDots}>
                <View style={[styles.dot, styles.dotActive]} />
                <View style={[styles.dot, styles.dotActive]} />
                <View style={[styles.dot, styles.dotActive]} />
                <View style={[styles.dot]} />
                <View style={[styles.dot]} />
              </View>
            </View>
          )}

          {todayDivision ? (
            <View style={styles.workoutCard}>
              {todayDivisionCover && (
                <Image 
                  source={{ uri: todayDivisionCover }}
                  style={styles.workoutCover}
                  contentFit="cover"
                />
              )}
              
              <View style={styles.workoutContent}>
                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Hoje</Text>
                  </View>
                  <Text style={styles.workoutLabel}>Treino do dia</Text>
                </View>

                <Text style={styles.workoutTitle}>
                  Treino {todayDivision.label} — {todayDivision.title}
                </Text>

                <Text style={styles.workoutStats}>
                  {todayDivision.exercises.length} exercícios · ~{todayDivision.estimatedMinutes} min estimado
                </Text>

                <Pressable 
                  style={styles.actionButton}
                  onPress={() => {
                    router.push({
                      pathname: '/(aluno)/treinos',
                      params: { divisionId: todayDivision.id }
                    })
                  }}
                >
                  <Text style={styles.actionButtonText}>Iniciar Treino</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={[styles.workoutCard, { padding: 20, alignItems: 'center' }]}>
              <Text style={{ color: '#A1A1AA' }}>Nenhum treino programado para hoje.</Text>
            </View>
          )}

          {announcement && (
            <View style={styles.announcementCard}>
              <Text style={styles.announcementLabel}>AVISO DA ACADEMIA</Text>
              <Text style={styles.announcementTitle}>{announcement.title}</Text>
              <Text style={styles.announcementDesc}>{announcement.description}</Text>
            </View>
          )}

          <View style={styles.row}>
            {contract && (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Contrato Ativo</Text>
                <Text style={styles.infoSubtitle}>Renovar em {contract.daysLeft} dias</Text>
              </View>
            )}

            {history && (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Histórico</Text>
                <Text style={styles.infoSubtitle}>{history.totalWorkouts} divisões</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <BottomBar currentTab={currentTab} onTabChange={setCurrentTab} />
    </View>
  )
}

export const HomeAlunoScreen = HomeScreen