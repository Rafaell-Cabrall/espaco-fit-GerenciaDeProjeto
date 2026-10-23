import { planSummarySchema, sessionSchema } from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { z } from 'zod'
import { api } from '@/api/client'
import { maskDate } from '../NovoAluno/form'
import { DetalhesTreino } from './DetalhesTreino'

const isoDay = (value: string) => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null
  const iso = value.split('/').reverse().join('-')
  return z.iso.date().safeParse(iso).success ? iso : null
}
const brDay = (iso: string) => iso.split('-').reverse().join('/')
const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
function timestamp(value: string) {
  const date = new Date(value),
    now = new Date(),
    yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const label =
    localDay(date) === localDay(now)
      ? 'Hoje'
      : localDay(date) === localDay(yesterday)
        ? 'Ontem'
        : date
            .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
            .replace(/\./g, '')
  return `${label}, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export function Historico({
  studentId,
  instructorId,
}: {
  studentId: string
  instructorId?: string
}) {
  const [planId, setPlanId] = useState<string | null>(null)
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const plans = useQuery({
    queryKey: ['instructor-plans', instructorId, studentId],
    queryFn: () =>
      api(`/plans?studentId=${encodeURIComponent(studentId)}`, z.array(planSummarySchema)),
  })
  const params = new URLSearchParams({ studentId })
  if (planId) params.set('planId', planId)
  if (period) {
    params.set('from', period.from)
    params.set('to', period.to)
  }
  const sessions = useQuery({
    queryKey: ['instructor-sessions', instructorId, studentId, planId, period],
    queryFn: () => api(`/sessions?${params.toString()}`, z.array(sessionSchema)),
  })
  const selectedPlan = plans.data?.find((plan) => plan.id === planId)
  const apply = () => {
    const first = isoDay(from),
      last = isoDay(to)
    if (!first || !last) {
      setError('Informe datas válidas no formato DD/MM/AAAA.')
      return
    }
    if (first > last) {
      setError('A data inicial deve ser anterior ou igual à final.')
      return
    }
    setPeriod({ from: first, to: last })
    setExpanded(null)
    setFilterOpen(false)
  }
  return (
    <View style={styles.content}>
      <View style={styles.toolbar}>
        <View style={styles.flex}>
          <Text style={styles.overline}>REFERENTE À</Text>
          <Text style={styles.reference}>{selectedPlan?.name || 'Todas as fichas'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.filter, period && styles.filterActive]}
          onPress={() => {
            setFrom(period ? brDay(period.from) : '')
            setTo(period ? brDay(period.to) : '')
            setError('')
            setFilterOpen(true)
          }}
        >
          <Ionicons name="calendar-outline" size={14} color={period ? '#FF3B30' : '#999'} />
          <Text style={[styles.small, period && styles.red]}>
            {period ? 'Período selecionado' : 'Filtrar por data'}
          </Text>
        </TouchableOpacity>
      </View>
      {plans.data && plans.data.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.planOptions}
        >
          {[{ id: null, name: 'Todas' }, ...plans.data].map((plan) => (
            <TouchableOpacity
              accessibilityState={{ selected: planId === plan.id }}
              key={plan.id || 'all'}
              style={[styles.planChip, planId === plan.id && styles.filterActive]}
              onPress={() => {
                setPlanId(plan.id)
                setExpanded(null)
              }}
            >
              <Text style={styles.small}>{plan.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {plans.isError && (
        <TouchableOpacity onPress={() => void plans.refetch()}>
          <Text style={styles.small}>
            Não foi possível carregar o filtro de fichas. Tentar novamente.
          </Text>
        </TouchableOpacity>
      )}
      {period && (
        <View style={styles.period}>
          <Ionicons name="calendar-outline" color="#FF3B30" size={16} />
          <Text style={[styles.small, styles.flex]}>
            {brDay(period.from)} até {brDay(period.to)}
          </Text>
          <TouchableOpacity
            accessibilityLabel="Limpar período"
            onPress={() => {
              setPeriod(null)
              setExpanded(null)
            }}
          >
            <Text style={styles.red}>Limpar</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={styles.overline}>LINHA DO TEMPO</Text>
      {sessions.isPending ? (
        <ActivityIndicator color="#E60012" />
      ) : sessions.isError ? (
        <TouchableOpacity onPress={() => void sessions.refetch()}>
          <Text style={styles.small}>
            Não foi possível carregar o histórico. Toque para tentar novamente.
          </Text>
        </TouchableOpacity>
      ) : !sessions.data?.length ? (
        <Text style={styles.small}>
          {period || planId
            ? 'Nenhum treino encontrado para estes filtros.'
            : 'Nenhum treino concluído.'}
        </Text>
      ) : (
        sessions.data.map((session) => {
          const open = expanded === session.id
          const tags = session.division.title
            .replace(/^.*?\(/, '')
            .replace(/\)$/, '')
            .split(/\s+(?:e|E)\s+|\s*[+&]\s*/)
            .filter(Boolean)
          return (
            <View key={session.id} style={styles.card}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={styles.sessionHeader}
                onPress={() => setExpanded(open ? null : session.id)}
              >
                <View style={[styles.dot, open && styles.activeDot]} />
                <View style={styles.flex}>
                  <Text style={styles.date}>
                    {timestamp(session.finishedAt || session.startedAt)}
                  </Text>
                  <Text style={styles.title}>
                    Treino {session.division.label} ({session.division.title})
                  </Text>
                  <View style={styles.tags}>
                    {tags.map((tag) => (
                      <Text key={tag} style={styles.tag}>
                        {tag}
                      </Text>
                    ))}
                  </View>
                </View>
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  color={open ? '#FF3B30' : '#888'}
                  size={17}
                />
              </TouchableOpacity>
              {open && <DetalhesTreino session={session} studentId={studentId} />}
            </View>
          )
        })
      )}
      <Modal
        transparent
        visible={filterOpen}
        animationType="fade"
        onRequestClose={() => setFilterOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modal}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalContent}
            >
              <View style={styles.toolbar}>
                <Text style={styles.title}>Filtrar por período</Text>
                <TouchableOpacity
                  accessibilityLabel="Fechar filtro"
                  onPress={() => setFilterOpen(false)}
                >
                  <Ionicons name="close" color="#fff" size={24} />
                </TouchableOpacity>
              </View>
              <Text style={styles.small}>Data inicial</Text>
              <TextInput
                accessibilityLabel="Data inicial"
                keyboardType="number-pad"
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#666"
                maxLength={10}
                style={styles.input}
                value={from}
                onChangeText={(value) => setFrom(maskDate(value))}
              />
              <Text style={styles.small}>Data final</Text>
              <TextInput
                accessibilityLabel="Data final"
                keyboardType="number-pad"
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#666"
                maxLength={10}
                style={styles.input}
                value={to}
                onChangeText={(value) => setTo(maskDate(value))}
              />
              {!!error && (
                <Text accessibilityRole="alert" style={styles.red}>
                  {error}
                </Text>
              )}
              <TouchableOpacity style={styles.apply} onPress={apply}>
                <Text style={styles.title}>Aplicar filtro</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
const styles = StyleSheet.create({
  activeDot: { backgroundColor: '#FF3B30' },
  content: { gap: 10 },
  flex: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  overline: { color: '#777', fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold' },
  reference: { color: '#ddd', fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium', marginTop: 4 },
  filter: {
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#303030',
  },
  filterActive: { backgroundColor: '#301713', borderColor: '#68231D' },
  red: { color: '#FF3B30', fontSize: 11 },
  small: { color: '#999', fontSize: 11, lineHeight: 17, fontFamily: 'SpaceGrotesk_400Regular' },
  planOptions: { gap: 6 },
  planChip: { padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#303030' },
  period: {
    padding: 12,
    backgroundColor: '#1C1C1E',
    borderColor: '#68231D',
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderColor: '#303030',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 10,
    minHeight: 88,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444',
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  date: { color: '#888', fontSize: 10 },
  title: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    marginTop: 5,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  tag: {
    backgroundColor: '#44211E',
    color: '#FF5548',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 9,
  },
  details: { borderTopWidth: 1, borderTopColor: '#303030', padding: 15, gap: 8 },
  overlay: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    overflow: 'hidden',
  },
  modalContent: { padding: 20, gap: 12 },
  input: {
    color: '#fff',
    backgroundColor: '#090909',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  apply: { backgroundColor: '#E60012', padding: 12, alignItems: 'center', borderRadius: 10 },
})
