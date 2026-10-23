import { studentLinkSchema } from '@espacofit/shared'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { type RelativePathString, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  Alert,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { z } from 'zod'
import { api } from '../../api/client'
import { useAuth } from '../../auth'
import { useFeed } from '../../hooks/useFeed'
import { useFeedbacks } from '../../hooks/useFeedbacks'
import { dateKey, useAgenda } from '../Agenda/data'

const workoutBg = require('../../../assets/workout-bg.jpg')

export default function InstructorHomeScreen() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { width } = useWindowDimensions()
  const today = dateKey(new Date())
  const agenda = useAgenda(today, today)
  const dailyEvaluations = agenda.data ?? null
  const feed = useFeed()
  const [notice, setNotice] = useState(0)
  // Card do aviso ocupa a largura útil menos uma fresta para mostrar o próximo
  const noticeWidth = Math.min(width, 600) - 32 - (feed.data && feed.data.length > 1 ? 24 : 0)

  const instructorName = user?.name?.trim() || 'Instrutor'
  const students = useQuery({
    queryKey: ['instructor-home', user?.id, 'students'],
    queryFn: () => api('/links', z.array(studentLinkSchema)),
    enabled: !!user,
  })
  const feedbacks = useFeedbacks()
  const refreshDashboard = useCallback(() => {
    void students.refetch()
    void feedbacks.refetch()
    void agenda.refetch()
    void feed.refetch()
  }, [students.refetch, feedbacks.refetch, agenda.refetch, feed.refetch])
  useFocusEffect(
    useCallback(() => {
      refreshDashboard()
    }, [refreshDashboard]),
  )
  const unreadFeedbacks = feedbacks.data?.filter((feedback) => !feedback.read).length
  const evaluationCount = dailyEvaluations?.length
  const summaryTitle =
    evaluationCount == null
      ? 'Sua agenda de avaliações físicas'
      : evaluationCount === 0
        ? 'Você não tem avaliações físicas marcadas para hoje'
        : `Você tem ${evaluationCount} ${evaluationCount === 1 ? 'avaliação física marcada' : 'avaliações físicas marcadas'} para hoje`
  const summarySubtitle =
    dailyEvaluations == null
      ? agenda.isError
        ? 'Não foi possível carregar a agenda.'
        : 'Carregando agendamentos…'
      : dailyEvaluations.length === 0
        ? 'Confira sua programação na agenda.'
        : dailyEvaluations.map((evaluation) => evaluation.student.name).join(' · ')

  const navigateTo = (path: string) => {
    // Ficha nasce do aluno: Nova Ficha abre a lista, e a aba Fichas do aluno abre o editor
    if (path === '/students' || path === '/workouts/new') {
      router.push('/(instrutor)/(tabs)/alunos' as RelativePathString)
      return
    }
    if (path === '/schedule') {
      router.push('/(instrutor)/agenda' as RelativePathString)
      return
    }
    if (path === '/students/new') {
      router.push('/(instrutor)/students/new' as RelativePathString)
      return
    }
    if (path === '/feedbacks') {
      router.push('/(instrutor)/feedbacks')
      return
    }
    // As demais telas do instrutor ainda não têm rotas no app.
    const labels: Record<string, string> = {
      '/students/new': 'Novo Aluno',
      '/workouts/new': 'Nova Ficha',
      '/schedule': 'Agenda',
      '/payments': 'Pagamento',
      '/students': 'Alunos',
      '/feedbacks': 'Feedbacks',
      '/workouts': 'Biblioteca',
      '/profile': 'Perfil',
    }
    Alert.alert(labels[path] || 'Em breve', 'Esta funcionalidade ainda não está disponível.')
  }

  // Cálculo proporcional para responsividade dinâmica
  const isSmallDevice = width < 375
  const iconBoxSize = isSmallDevice ? 32 : 36

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#0E0E0E" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { maxWidth: 600, width: '100%', alignSelf: 'center' },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={
              students.isRefetching ||
              feedbacks.isRefetching ||
              agenda.isRefetching ||
              feed.isRefetching
            }
            onRefresh={refreshDashboard}
            tintColor="#E60012"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Topo: Saudação + Botão Logout */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeText}>Bem-vindo, instrutor</Text>
            <Text style={styles.nameText} numberOfLines={1} adjustsFontSizeToFit>
              {instructorName}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Sair da conta"
            // A guarda de (instrutor)/_layout leva para o login quando user vira null
            onPress={logout}
            style={styles.logoutButton}
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Grade de Atalhos Rápidos Responsiva */}
        <View style={styles.gridContainer}>
          <TouchableOpacity
            onPress={() => navigateTo('/students/new')}
            style={styles.gridItem}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { width: iconBoxSize, height: iconBoxSize }]}>
              <Ionicons name="person-add" size={18} color="#FFB800" />
            </View>
            <Text style={styles.gridText} numberOfLines={1} adjustsFontSizeToFit>
              Novo Aluno
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigateTo('/workouts/new')}
            style={styles.gridItem}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { width: iconBoxSize, height: iconBoxSize }]}>
              <Ionicons name="document-text" size={18} color="#FFB800" />
            </View>
            <Text style={styles.gridText} numberOfLines={1} adjustsFontSizeToFit>
              Nova Ficha
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigateTo('/schedule')}
            style={styles.gridItem}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { width: iconBoxSize, height: iconBoxSize }]}>
              <Ionicons name="calendar" size={18} color="#FFB800" />
            </View>
            <Text style={styles.gridText} numberOfLines={1} adjustsFontSizeToFit>
              Agenda
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigateTo('/payments')}
            style={styles.gridItem}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { width: iconBoxSize, height: iconBoxSize }]}>
              <MaterialCommunityIcons name="wallet" size={18} color="#FFB800" />
            </View>
            <Text style={styles.gridText} numberOfLines={1} adjustsFontSizeToFit>
              Pagamento
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card de Avaliações Físicas Responsivo */}
        <View style={styles.cardContainer}>
          <ImageBackground
            source={workoutBg}
            style={styles.cardBg}
            resizeMode="cover"
            imageStyle={{ borderRadius: 16 }}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.95)']}
              style={styles.gradientOverlay}
            >
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.summaryTag}>Resumo do Dia</Text>
                <Text style={styles.cardTitle}>{summaryTitle}</Text>
                <Text style={styles.cardSubtitle}>{summarySubtitle}</Text>
              </View>

              <TouchableOpacity
                onPress={() => navigateTo('/schedule')}
                style={styles.primaryButton}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Ver Agenda</Text>
              </TouchableOpacity>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Banner de Aviso Da Academia */}
        {feed.data?.length ? (
          <View style={styles.noticeList}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={noticeWidth + 10}
              decelerationRate="fast"
              contentContainerStyle={{ gap: 10 }}
              onMomentumScrollEnd={(event) =>
                setNotice(Math.round(event.nativeEvent.contentOffset.x / (noticeWidth + 10)))
              }
            >
              {feed.data.map((item) => (
                <View key={item.id} style={[styles.noticeCard, { width: noticeWidth }]}>
                  <Text style={styles.noticeTag}>AVISO DA ACADEMIA</Text>
                  <Text style={styles.noticeTitle}>{item.title}</Text>
                  <Text style={styles.noticeText}>{item.body}</Text>
                </View>
              ))}
            </ScrollView>
            {feed.data.length > 1 && (
              <View style={styles.dots}>
                {feed.data.map((item, index) => (
                  <View key={item.id} style={[styles.dot, index === notice && styles.activeDot]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.noticeCard, styles.noticeList]}>
            <Text style={styles.noticeTag}>AVISO DA ACADEMIA</Text>
            <Text style={styles.noticeText}>
              {feed.isPending
                ? 'Carregando avisos…'
                : feed.isError
                  ? 'Não foi possível carregar os avisos.'
                  : 'Nenhum aviso da academia no momento.'}
            </Text>
          </View>
        )}

        {/* Métricas do Rodapé Responsivas */}
        <View style={styles.metricsRow}>
          <TouchableOpacity
            onPress={() => navigateTo('/students')}
            style={styles.metricCard}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconBox, { backgroundColor: '#142E18' }]}>
              <Ionicons name="people" size={18} color="#22C55E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.metricValue}>
                {students.isPending
                  ? 'Carregando…'
                  : students.isError
                    ? 'Indisponível'
                    : `Total: ${students.data.length}`}
              </Text>
              <Text style={[styles.metricLabel, { color: '#22C55E' }]}>Alunos Ativos</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigateTo('/feedbacks')}
            style={styles.metricCard}
            activeOpacity={0.7}
          >
            <View style={[styles.metricIconBox, { backgroundColor: '#33240D' }]}>
              <Ionicons name="chatbubbles" size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.metricValue}>Feedbacks</Text>
              <Text style={styles.metricLabel}>
                {feedbacks.isPending
                  ? 'Carregando…'
                  : feedbacks.isError
                    ? 'Não foi possível carregar'
                    : `${unreadFeedbacks} ${unreadFeedbacks === 1 ? 'comentário não lido' : 'comentários não lidos'}`}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 4,
  },
  welcomeText: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
    color: '#9CA3AF',
    marginBottom: 2,
  },
  nameText: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  logoutButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  gridItem: {
    width: '23%',
    backgroundColor: '#1E1E1E',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E1E1E',
    alignItems: 'center',
  },
  iconBox: {
    borderRadius: 20,
    backgroundColor: '#303014',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridText: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_500Medium',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cardContainer: {
    minHeight: 194,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1E1E1E',
  },
  cardBg: {
    flex: 1,
  },
  gradientOverlay: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  summaryTag: {
    alignSelf: 'flex-start',
    color: '#FF4545',
    backgroundColor: '#633333',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'SpaceGrotesk_700Bold',
    lineHeight: 24,
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  primaryButton: {
    backgroundColor: '#E60012',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#000000',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  noticeCard: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  noticeList: { marginBottom: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3A3A3A' },
  activeDot: { width: 16, backgroundColor: '#E60012' },
  noticeTag: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#E50914',
    marginBottom: 6,
    letterSpacing: 1,
  },
  noticeTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginBottom: 4,
  },
  noticeText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#141414',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
    minHeight: 114,
  },
  metricIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    color: '#FFFFFF',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
  },
  metricLabel: {
    color: '#9CA3AF',
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 10,
    marginTop: 8,
    lineHeight: 15,
  },
})
