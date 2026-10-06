// index.tsx
import { useState, useMemo } from 'react'
import { View, ScrollView, Pressable, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { useAuth } from '@/auth'
import { useFrequency } from '@/hooks/useFrequency'
import { Status } from '@/components/Status'
import { styles } from './styles'

type TabOption = 'Resumo' | 'Anamnese' | 'Frequência'

function useResumo() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['resumo', user?.id],
    queryFn: () => api(`/student/${user?.id}/resumo`, {} as any),
    enabled: !!user,
  })
}

function useAnamnesisData() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['anamnesis', user?.id],
    queryFn: () => api(`/anamnesis/${user?.id}`, {} as any),
    enabled: !!user,
  })
}

function ResumoTab() {
  const medidas = {
    peso: { atual: 78.5, diff: -1.2 },
    imc: { atual: 24.3, diff: -0.4 },
    gordura: { atual: 16.8, diff: -0.9 },
    musculo: { atual: 38.2, diff: 1.1 },
  }

  return (
    <View style={styles.contentContainer}>
      <View>
        <Text style={styles.sectionTitle}>MEDIDAS CORPORAIS</Text>
        <View style={styles.medidasGrid}>
          <View style={styles.medidaCard}>
            <Text style={styles.medidaLabel}>Peso</Text>
            <View style={styles.medidaValueRow}>
              <Text style={styles.medidaValue}>{medidas.peso.atual}</Text>
              <Text style={styles.medidaUnit}>kg</Text>
            </View>
            <Text style={styles.medidaDiffNegative}>{medidas.peso.diff} desde o mês passado</Text>
          </View>
          <View style={styles.medidaCard}>
            <Text style={styles.medidaLabel}>IMC</Text>
            <View style={styles.medidaValueRow}>
              <Text style={styles.medidaValue}>{medidas.imc.atual}</Text>
            </View>
            <Text style={styles.medidaDiffNegative}>{medidas.imc.diff} desde o mês passado</Text>
          </View>
          <View style={styles.medidaCard}>
            <Text style={styles.medidaLabel}>Gordura</Text>
            <View style={styles.medidaValueRow}>
              <Text style={styles.medidaValue}>{medidas.gordura.atual}</Text>
              <Text style={styles.medidaUnit}>%</Text>
            </View>
            <Text style={styles.medidaDiffNegative}>{medidas.gordura.diff} desde o mês passado</Text>
          </View>
          <View style={styles.medidaCard}>
            <Text style={styles.medidaLabel}>Músculo</Text>
            <View style={styles.medidaValueRow}>
              <Text style={styles.medidaValue}>{medidas.musculo.atual}</Text>
              <Text style={styles.medidaUnit}>kg</Text>
            </View>
            <Text style={styles.medidaDiffPositive}>+{medidas.musculo.diff} desde o mês passado</Text>
          </View>
        </View>
      </View>

      <View>
        <Text style={styles.sectionTitle}>METAS DO MÊS</Text>
        <View style={styles.metasCard}>
          <View style={styles.metaItem}>
            <View style={styles.metaHeader}>
              <Text style={styles.metaTitle}>Treinos realizados</Text>
              <Text style={styles.metaValue}>22 / 20 treinos</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '100%' }]} />
            </View>
          </View>
          <View style={styles.metaItem}>
            <View style={styles.metaHeader}>
              <Text style={styles.metaTitle}>Frequência semanal</Text>
              <Text style={styles.metaValue}>4.2 / 5 dias/sem</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '84%' }]} />
            </View>
          </View>
          <View style={styles.metaItem}>
            <View style={styles.metaHeader}>
              <Text style={styles.metaTitle}>Peso-alvo</Text>
              <Text style={styles.metaValue}>78.5 / 76 kg</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '40%' }]} />
            </View>
          </View>
        </View>
      </View>

      <Pressable style={styles.btnOutline}>
        <Text style={styles.btnOutlineText}>Agendar nova avaliação</Text>
      </Pressable>
    </View>
  )
}

function AnamneseTab() {
  const { data, isPending } = useAnamnesisData()
  
  if (isPending) return <Status />
  
  const infos = [
    { label: 'Lesões ou restrições', value: data?.injuries || 'Sem restrições' },
    { label: 'Nível de condicionamento', value: data?.weightTrainingExperience || 'Intermediário' },
    { label: 'Objetivo principal', value: data?.goal || 'Hipertrofia' },
    { label: 'Frequência semanal', value: data?.daysPerWeek ? `${data.daysPerWeek} dias` : '4-5 dias' },
    { label: 'Doenças preexistentes', value: data?.conditions || 'Nenhuma' },
  ]

  const dataAtualizacao = data?.updatedAt 
    ? new Date(data.updatedAt).toLocaleDateString('pt-BR') 
    : '20/08/2026'

  return (
    <View style={styles.contentContainer}>
      <View style={styles.anamnesisBanner}>
        <Ionicons name="time-outline" size={16} color="#D4AF37" />
        <Text style={styles.anamnesisBannerText}>
          Anamnese atualizada em {dataAtualizacao} · Dentro do prazo
        </Text>
      </View>

      <View style={styles.anamnesisCard}>
        {infos.map((item, index) => (
          <View key={index} style={styles.anamnesisRow}>
            <Text style={styles.anamnesisLabel}>{item.label}</Text>
            <Text style={styles.anamnesisVal}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
function FrequenciaTab() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const monthIndex = currentDate.getMonth()
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`

  const { data, isPending, isError, error, refetch } = useFrequency(monthKey)

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, monthIndex, 1).getDay()
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const blanks = Array.from({ length: firstDay }, () => null)
    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      dateString: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    }))
    return [...blanks, ...days]
  }, [year, monthIndex])

  const MONTH_NAMES = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ]

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, monthIndex - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, monthIndex + 1, 1))
  }

  if (isPending) return <Status />
  if (isError) return <Status message={error.message} action="Tentar de novo" onAction={refetch} />

  return (
    <View style={styles.contentContainer}>
      <View style={styles.statsCard}>
        <View style={styles.statColumn}>
          <Text style={styles.statValue}>{data.currentStreak ?? 0}</Text>
          <Text style={styles.statLabel}>sequência atual</Text>
        </View>
        <View style={[styles.statColumn, styles.statBorder]}>
          <Text style={styles.statValue}>{data.monthCount ?? 0}</Text>
          <Text style={styles.statLabel}>treinos este mês</Text>
        </View>
        <View style={styles.statColumn}>
          <Text style={styles.statValue}>{data.bestStreak ?? 0}</Text>
          <Text style={styles.statLabel}>melhor sequência</Text>
        </View>
      </View>

      <View style={styles.calendarSection}>
        {/* Cabeçalho do mês com setas */}
        <View style={styles.monthHeaderRow}>
          <Pressable onPress={handlePrevMonth} hitSlop={15}>
            <Ionicons name="chevron-back" size={20} color={tokens.colors.textMuted} />
          </Pressable>
          <Text style={styles.monthTitle}>{MONTH_NAMES[monthIndex]} {year}</Text>
          <Pressable onPress={handleNextMonth} hitSlop={15}>
            <Ionicons name="chevron-forward" size={20} color={tokens.colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.weekDaysRow}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dia, idx) => (
            <Text key={idx} style={styles.weekDayText}>{dia}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {calendarDays.map((item, index) => {
            if (!item) return <View key={`blank-${index}`} style={styles.dayCell} />
            const hasTrained = data.days?.includes(item.dateString)
            return (
              <View key={item.dateString} style={styles.dayCell}>
                <View style={[styles.dayBox, hasTrained ? styles.dayTrained : styles.dayMissed]}>
                  <Text style={[styles.dayText, hasTrained && styles.dayTextTrained]}>{item.day}</Text>
                </View>
              </View>
            )
          })}
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.dayTrained]} />
            <Text style={styles.legendText}>Treinou</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.dayMissed]} />
            <Text style={styles.legendText}>Não treinou</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default function EvolucaoScreen() {
  const [activeTab, setActiveTab] = useState<TabOption>('Resumo')

  const tabs: TabOption[] = ['Resumo', 'Anamnese', 'Frequência']

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Evolução</Text>
        <Text style={styles.subtitle}>Acompanhe sua jornada</Text>
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView>
        {activeTab === 'Resumo' && <ResumoTab />}
        {activeTab === 'Anamnese' && <AnamneseTab />}
        {activeTab === 'Frequência' && <FrequenciaTab />}
      </ScrollView>
    </SafeAreaView>
  )
}