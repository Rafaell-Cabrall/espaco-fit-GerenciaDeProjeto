// Evolução do aluno: Resumo (metas do mês), Anamnese e Frequência (calendário por mês).
import { anamnesisSchema, lastMonthBaseline } from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api } from '@/api/client'
import { useAuth } from '@/auth'
import { Status } from '@/components/Status'
import { tokens } from '@/design-system/tokens'
import { useFrequency } from '@/hooks/useFrequency'
import { useMeasurements } from '@/hooks/useMeasurements'
import { styles } from './styles'

type TabOption = 'Resumo' | 'Anamnese' | 'Frequência'

const MONTH_NAMES = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
]
const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MEDIDAS = [
  { key: 'weightKg', label: 'Peso', unit: 'kg' },
  { key: 'bmi', label: 'IMC', unit: '' },
  { key: 'bodyFatPct', label: 'Gordura', unit: '%' },
  { key: 'muscleKg', label: 'Músculo', unit: 'kg' },
] as const

const pad = (n: number) => String(n).padStart(2, '0')
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Mesma chave do portão de (aluno)/_layout: a anamnese já vem do cache
function useAnamnesis() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['anamnesis', user?.id],
    queryFn: () => api(`/anamnesis/${user?.id}`, anamnesisSchema.nullable()),
    enabled: !!user,
  })
}

function Meta({ title, value, progress }: { title: string; value: string; progress: number }) {
  return (
    <View style={styles.metaItem}>
      <View style={styles.metaHeader}>
        <Text style={styles.metaTitle}>{title}</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View
          style={[styles.progressBarFill, { width: `${Math.round(Math.min(progress, 1) * 100)}%` }]}
        />
      </View>
    </View>
  )
}

function formatMeasure(value: number, unit: string) {
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return unit ? `${formatted} ${unit}` : formatted
}

function measureChange(current: number | null | undefined, baseline: number | null | undefined) {
  if (current == null || baseline == null) return 'Sem comparação do mês passado'
  const difference = Math.round((current - baseline) * 10) / 10
  if (!difference) return 'Sem variação desde o mês passado'
  const formatted = Math.abs(difference).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return `${difference > 0 ? '+' : '−'}${formatted} desde o mês passado`
}

function ResumoTab() {
  const frequency = useFrequency()
  const anamnesis = useAnamnesis()
  const { user } = useAuth()
  const measurements = useMeasurements(user?.id ?? '')

  if (frequency.isPending || anamnesis.isPending || measurements.isPending) return <Status />
  if (frequency.isError)
    return (
      <Status
        message={frequency.error.message}
        action="Tentar de novo"
        onAction={frequency.refetch}
      />
    )
  if (measurements.isError)
    return (
      <Status
        message={measurements.error.message}
        action="Tentar de novo"
        onAction={measurements.refetch}
      />
    )

  const latest = measurements.data[0]
  const baseline = lastMonthBaseline(measurements.data)
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const done = frequency.data.monthCount
  const daysPerWeek = anamnesis.data?.daysPerWeek ?? null
  const monthTarget = daysPerWeek && Math.round((daysPerWeek * daysInMonth) / 7)
  const weeklyAverage = done / Math.max(today.getDate() / 7, 1)

  return (
    <View style={styles.contentContainer}>
      <View>
        <Text style={styles.sectionTitle}>MEDIDAS CORPORAIS</Text>
        <View style={styles.medidasGrid}>
          {MEDIDAS.map((medida) => {
            const value = latest?.[medida.key]
            const previous = baseline?.[medida.key]
            return (
              <View key={medida.label} style={styles.medidaCard}>
                <Text style={styles.medidaLabel}>{medida.label}</Text>
                <View style={styles.medidaValueRow}>
                  <Text style={styles.medidaValue}>
                    {value == null ? '—' : formatMeasure(value, medida.unit)}
                  </Text>
                </View>
                <Text style={styles.medidaHint}>
                  {latest
                    ? `${measureChange(value, previous)} · Avaliação ${latest.measuredOn.split('-').reverse().join('/')}`
                    : 'Sem avaliação física registrada'}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      <View>
        <Text style={styles.sectionTitle}>METAS DO MÊS</Text>
        <View style={styles.metasCard}>
          <Meta
            title="Treinos realizados"
            value={`${done} / ${monthTarget ?? '—'} treinos`}
            progress={monthTarget ? done / monthTarget : 0}
          />
          <Meta
            title="Frequência semanal"
            value={`${weeklyAverage.toFixed(1)} / ${daysPerWeek ?? '—'} dias/sem`}
            progress={daysPerWeek ? weeklyAverage / daysPerWeek : 0}
          />
        </View>
      </View>
    </View>
  )
}

function AnamneseTab() {
  const { data, isPending, isError, error, refetch } = useAnamnesis()

  if (isPending) return <Status />
  if (isError) return <Status message={error.message} action="Tentar de novo" onAction={refetch} />
  if (!data) return <Status message="Seu instrutor ainda não cadastrou sua anamnese." />

  const infos = [
    { label: 'Lesões ou restrições', value: data.injuries },
    { label: 'Experiência com musculação', value: data.weightTrainingExperience },
    { label: 'Objetivo principal', value: data.goal },
    { label: 'Frequência semanal', value: data.daysPerWeek ? `${data.daysPerWeek} dias` : '' },
    { label: 'Doenças preexistentes', value: data.conditions },
  ]

  return (
    <View style={styles.contentContainer}>
      <View style={styles.anamnesisBanner}>
        <Ionicons name="time-outline" size={16} color="#D4AF37" />
        <Text style={styles.anamnesisBannerText}>
          Anamnese atualizada em {new Date(data.updatedAt).toLocaleDateString('pt-BR')} ·{' '}
          {data.outdated ? 'Peça ao instrutor para atualizar' : 'Dentro do prazo'}
        </Text>
      </View>

      <View style={styles.anamnesisCard}>
        {infos.map((item) => (
          <View key={item.label} style={styles.anamnesisRow}>
            <Text style={styles.anamnesisLabel}>{item.label}</Text>
            <Text style={styles.anamnesisVal}>{item.value || '—'}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function FrequenciaTab() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const year = currentDate.getFullYear()
  const monthIndex = currentDate.getMonth()
  const today = dateKey(new Date())

  const { data, isPending, isError, error, refetch } = useFrequency(
    `${year}-${pad(monthIndex + 1)}`,
  )

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, monthIndex, 1).getDay()
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const blanks = Array.from({ length: firstDay }, (_, i) => ({ key: `blank-${i}`, day: 0 }))
    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      key: `${year}-${pad(monthIndex + 1)}-${pad(i + 1)}`,
      day: i + 1,
    }))
    return [...blanks, ...days]
  }, [year, monthIndex])

  if (isPending) return <Status />
  if (isError) return <Status message={error.message} action="Tentar de novo" onAction={refetch} />

  return (
    <View style={styles.contentContainer}>
      <View style={styles.statsCard}>
        <View style={styles.statColumn}>
          <Text style={styles.statValue}>{data.currentStreak}</Text>
          <Text style={styles.statLabel}>sequência atual</Text>
        </View>
        <View style={[styles.statColumn, styles.statBorder]}>
          <Text style={styles.statValue}>{data.monthCount}</Text>
          <Text style={styles.statLabel}>treinos no mês</Text>
        </View>
        <View style={styles.statColumn}>
          <Text style={styles.statValue}>{data.bestStreak}</Text>
          <Text style={styles.statLabel}>melhor sequência</Text>
        </View>
      </View>

      <View style={styles.calendarSection}>
        <View style={styles.monthHeaderRow}>
          <Pressable
            accessibilityLabel="Mês anterior"
            onPress={() => setCurrentDate(new Date(year, monthIndex - 1, 1))}
            hitSlop={15}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.textMuted} />
          </Pressable>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[monthIndex]} {year}
          </Text>
          <Pressable
            accessibilityLabel="Próximo mês"
            onPress={() => setCurrentDate(new Date(year, monthIndex + 1, 1))}
            hitSlop={15}
          >
            <Ionicons name="chevron-forward" size={20} color={tokens.colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.weekDaysRow}>
          {WEEK_DAYS.map((dia, idx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rótulos fixos e repetidos (S, Q)
            <Text key={idx} style={styles.weekDayText}>
              {dia}
            </Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {calendarDays.map((item) => {
            if (!item.day) return <View key={item.key} style={styles.dayCell} />
            const hasTrained = data.days.includes(item.key)
            // Dia que ainda não chegou não conta como "Não treinou"
            const future = item.key > today
            return (
              <View key={item.key} style={styles.dayCell}>
                <View
                  style={[
                    styles.dayBox,
                    hasTrained ? styles.dayTrained : !future && styles.dayMissed,
                  ]}
                >
                  <Text style={[styles.dayText, hasTrained && styles.dayTextTrained]}>
                    {item.day}
                  </Text>
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

const TABS: TabOption[] = ['Resumo', 'Anamnese', 'Frequência']

export function EvolucaoScreen() {
  const [activeTab, setActiveTab] = useState<TabOption>('Resumo')

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Evolução</Text>
        <Text style={styles.subtitle}>Acompanhe sua jornada</Text>
      </View>

      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            accessibilityState={{ selected: activeTab === tab }}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
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
