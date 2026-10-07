import {
  anamnesisAnswersSchema,
  anamnesisSchema,
  Goal,
  planSummarySchema,
  studentLinkSchema,
} from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { z } from 'zod'
import { api } from '@/api/client'
import { useAuth } from '@/auth'
import { InstructorTabBar } from '@/components/InstructorTabBar'
import { initials } from '../Agenda/data'
import { birthDateInfo, maskCpf, maskDate, maskPhone } from '../NovoAluno/form'
import { Historico } from './Historico'

const groups = [
  [
    '1. Dados Pessoais',
    [
      ['birthDate', 'Data de nascimento'],
      ['phone', 'Telefone'],
      ['cpf', 'CPF'],
      ['profession', 'Profissão'],
    ],
  ],
  [
    '2. Objetivos e Expectativas',
    [
      ['goal', 'Objetivo'],
      ['goalDetails', 'Detalhes do objetivo'],
      ['daysPerWeek', 'Dias por semana'],
      ['minutesPerSession', 'Tempo disponível (min)'],
    ],
  ],
  [
    '3. Atividade Física',
    [
      ['activityHistory', 'Histórico'],
      ['weightTrainingExperience', 'Musculação'],
    ],
  ],
  [
    '4. Saúde e Clínico',
    [
      ['conditions', 'Doenças'],
      ['effortSymptoms', 'Dores / tonturas'],
      ['injuries', 'Lesões / cirurgias'],
      ['medications', 'Medicamentos'],
      ['familyHeartHistory', 'Histórico familiar'],
    ],
  ],
  [
    '5. Hábitos de Vida',
    [
      ['sleep', 'Sono'],
      ['hydration', 'Hidratação'],
      ['smokingAlcohol', 'Tabagismo / álcool'],
    ],
  ],
] as const
const displayDate = (value: string) => new Date(value).toLocaleDateString('pt-BR')

export default function ResumoAlunoScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { studentId: param } = useLocalSearchParams<{ studentId: string }>()
  const studentId = (Array.isArray(param) ? param[0] : param) ?? ''
  const { user } = useAuth()
  const cache = useQueryClient()
  const [tab, setTab] = useState('Resumo')
  const [choosingGoal, setChoosingGoal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const links = useQuery({
    queryKey: ['instructor-home', user?.id, 'students'],
    queryFn: () => api('/links', z.array(studentLinkSchema)),
    enabled: !!user,
  })
  const student = links.data?.find((link) => link.student.id === studentId)?.student
  const key = ['instructor-anamnesis', user?.id, studentId]
  const anamnesis = useQuery({
    queryKey: key,
    queryFn: () => api(`/anamnesis/${studentId}`, anamnesisSchema.nullable()),
    enabled: !!student,
  })
  const plans = useQuery({
    queryKey: ['instructor-plans', user?.id, studentId],
    queryFn: () =>
      api(`/plans?studentId=${encodeURIComponent(studentId)}`, z.array(planSummarySchema)),
    enabled: !!student && tab === 'Fichas',
  })

  const a = anamnesis.data
  const age = student?.birthDate
    ? birthDateInfo(student.birthDate.split('-').reverse().join('/'))?.age
    : undefined
  const openEdit = () => {
    const values: Record<string, string> = {}
    for (const [, fields] of groups)
      for (const [field] of fields) values[field] = String(a?.[field] ?? '')
    values.birthDate = a?.birthDate.split('-').reverse().join('/') || ''
    values.cpf = maskCpf(values.cpf || '')
    values.phone = maskPhone(values.phone || '')
    setChoosingGoal(false)
    setDraft(values)
    setError('')
    setEditing(true)
  }
  const save = async () => {
    if (saving) return
    const result = anamnesisAnswersSchema.safeParse({
      ...draft,
      birthDate: birthDateInfo(draft.birthDate || '')?.iso || '',
      cpf: draft.cpf?.replace(/\D/g, ''),
      daysPerWeek: draft.daysPerWeek ? Number(draft.daysPerWeek) : null,
      minutesPerSession: draft.minutesPerSession ? Number(draft.minutesPerSession) : null,
    })
    if (!result.success) {
      setError(result.error.issues.map((issue) => issue.message).join('\n'))
      return
    }
    setSaving(true)
    try {
      const updated = await api(`/anamnesis/${studentId}`, anamnesisSchema, {
        method: 'PUT',
        body: result.data,
      })
      cache.setQueryData(key, updated)
      void cache.invalidateQueries({ queryKey: ['instructor-home', user?.id, 'students'] })
      setEditing(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }
  const row = (label: string, value: unknown) => (
    <View key={label} style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ? String(value) : 'Não informado'}</Text>
    </View>
  )
  const section = (title: string, children: React.ReactNode) => (
    <View key={title} style={styles.section}>
      <Text style={styles.sectionTitle}>▏{title.toUpperCase()}</Text>
      {children}
    </View>
  )
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Voltar aos alunos"
          style={styles.back}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" color="#fff" size={22} />
        </TouchableOpacity>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(student?.name || '')}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.title}>{student?.name || 'Resumo do aluno'}</Text>
            <Text style={styles.muted}>
              {age !== undefined ? `${age} anos · ` : ''}
              {student?.goal || 'Objetivo não informado'}
            </Text>
            <Text style={styles.muted}>Mensalidade sem informação</Text>
          </View>
        </View>
      </View>
      <View style={styles.tabs}>
        {['Resumo', 'Fichas', 'Histórico', 'Mensalidade'].map((label) => (
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === label }}
            key={label}
            style={styles.tab}
            onPress={() => setTab(label)}
          >
            <Text style={[styles.tabText, tab === label && styles.white]}>{label}</Text>
            {tab === label && <View style={styles.indicator} />}
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={anamnesis.isRefetching || links.isRefetching}
            onRefresh={() => {
              void links.refetch()
              void anamnesis.refetch()
              if (tab === 'Fichas') void plans.refetch()
              if (tab === 'Histórico')
                void cache.invalidateQueries({
                  queryKey: ['instructor-sessions', user?.id, studentId],
                })
            }}
            tintColor="#E60012"
          />
        }
      >
        {links.isPending ? (
          <ActivityIndicator color="#E60012" />
        ) : links.isError ? (
          <TouchableOpacity onPress={() => void links.refetch()}>
            <Text style={styles.muted}>
              Não foi possível carregar o aluno. Toque para tentar novamente.
            </Text>
          </TouchableOpacity>
        ) : !student ? (
          <Text style={styles.muted}>Aluno não encontrado entre seus vínculos ativos.</Text>
        ) : tab === 'Resumo' ? (
          anamnesis.isPending ? (
            <ActivityIndicator color="#E60012" />
          ) : anamnesis.isError ? (
            <TouchableOpacity onPress={() => void anamnesis.refetch()}>
              <Text style={styles.muted}>
                Não foi possível carregar a anamnese. Toque para tentar novamente.
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.document}>
                  <Ionicons name="document-text-outline" color="#FF3B30" size={19} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>Anamnese e Objetivos</Text>
                  <Text style={styles.date}>
                    {a ? `Atualizado em ${displayDate(a.updatedAt)}` : 'Ainda não cadastrada'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.edit} onPress={openEdit}>
                  <Ionicons name="pencil" size={12} color="#aaa" />
                  <Text style={styles.date}>Atualizar</Text>
                </TouchableOpacity>
              </View>
              {a ? (
                <>
                  {section(
                    'Objetivos',
                    <>
                      {row('Objetivo', [a.goal, a.goalDetails].filter(Boolean).join(' — '))}
                      {row(
                        'Frequência',
                        [
                          a.daysPerWeek && `${a.daysPerWeek}×/semana`,
                          a.minutesPerSession && `${a.minutesPerSession} min`,
                        ]
                          .filter(Boolean)
                          .join(' · '),
                      )}
                    </>,
                  )}
                  {groups.slice(2).map(([title, fields]) =>
                    section(
                      title.slice(3),
                      fields.map(([key, label]) => row(label, a[key])),
                    ),
                  )}
                  {section('Observações do Personal', row('Observações', a.instructorNotes))}
                </>
              ) : (
                <Text style={styles.empty}>Preencha a anamnese pelo botão Atualizar.</Text>
              )}
            </View>
          )
        ) : tab === 'Mensalidade' ? (
          <Text style={styles.muted}>Os dados de mensalidade ainda não estão disponíveis.</Text>
        ) : tab === 'Fichas' ? (
          plans.isPending ? (
            <ActivityIndicator color="#E60012" />
          ) : plans.isError ? (
            <TouchableOpacity onPress={() => void plans.refetch()}>
              <Text style={styles.muted}>Erro ao carregar fichas. Tentar novamente.</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.save}
                onPress={() =>
                  router.push({ pathname: '/(instrutor)/ficha', params: { studentId } })
                }
              >
                <Text style={styles.cardTitle}>Nova ficha</Text>
              </TouchableOpacity>
              {!plans.data.length && <Text style={styles.muted}>Nenhuma ficha cadastrada.</Text>}
              {plans.data.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  accessibilityRole="button"
                  style={styles.card}
                  onPress={() =>
                    router.push({
                      pathname: '/(instrutor)/ficha',
                      params: { studentId, planId: plan.id },
                    })
                  }
                >
                  {section(
                    plan.name,
                    <>
                      {row(
                        'Status',
                        { ACTIVE: 'Ativa', DRAFT: 'Rascunho', EXPIRED: 'Encerrada' }[plan.status],
                      )}
                      {row(
                        'Período',
                        `${plan.startsOn.split('-').reverse().join('/')} — ${plan.endsOn.split('-').reverse().join('/')}`,
                      )}
                      {row('Divisões', plan.labels.join(' · '))}
                      {row(
                        'Ao tocar',
                        plan.status === 'DRAFT' ? 'Editar rascunho' : 'Nova ficha a partir desta',
                      )}
                    </>,
                  )}
                </TouchableOpacity>
              ))}
            </>
          )
        ) : (
          <Historico key={studentId} studentId={studentId} instructorId={user?.id} />
        )}
      </ScrollView>
      <InstructorTabBar active="Alunos" />
      <Modal
        visible={editing}
        animationType="slide"
        onRequestClose={() => {
          if (!saving) setEditing(false)
        }}
      >
        <SafeAreaView style={[styles.screen, { paddingTop: insets.top }]} edges={['left', 'right']}>
          <View style={styles.editorHeader}>
            <TouchableOpacity
              style={styles.back}
              disabled={saving}
              accessibilityLabel="Voltar ao resumo"
              onPress={() => setEditing(false)}
            >
              <Ionicons name="chevron-back" color="#fff" size={22} />
            </TouchableOpacity>
            <View style={styles.flex}>
              <Text style={styles.date}>Editar</Text>
              <Text style={styles.title}>Anamnese Completa</Text>
            </View>
          </View>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
              {groups.map(([title, fields], index) => {
                const input = (key: string, label: string) => (
                  <View key={key} style={styles.editorField}>
                    <Text style={styles.editorLabel}>{label.toUpperCase()}</Text>
                    {key === 'goal' ? (
                      <>
                        <TouchableOpacity
                          disabled={saving}
                          style={styles.goalSelector}
                          onPress={() => setChoosingGoal((previous) => !previous)}
                        >
                          <Text style={styles.value}>{draft.goal || 'Selecionar objetivo'}</Text>
                          <Ionicons name="chevron-down" color="#888" size={16} />
                        </TouchableOpacity>
                        {choosingGoal && (
                          <View style={styles.goals}>
                            {Goal.options.map((goal) => (
                              <TouchableOpacity
                                disabled={saving}
                                key={goal}
                                style={[styles.goal, draft.goal === goal && styles.selectedGoal]}
                                onPress={() => {
                                  setDraft((previous) => ({ ...previous, goal }))
                                  setChoosingGoal(false)
                                }}
                              >
                                <Text style={styles.value}>{goal}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </>
                    ) : (
                      <TextInput
                        editable={!saving}
                        accessibilityLabel={label}
                        style={styles.input}
                        value={draft[key] || ''}
                        keyboardType={
                          ['birthDate', 'cpf', 'daysPerWeek', 'minutesPerSession'].includes(key)
                            ? 'number-pad'
                            : key === 'phone'
                              ? 'phone-pad'
                              : 'default'
                        }
                        maxLength={
                          key === 'birthDate'
                            ? 10
                            : key === 'cpf'
                              ? 14
                              : key === 'phone'
                                ? 20
                                : key === 'daysPerWeek'
                                  ? 1
                                  : key === 'minutesPerSession'
                                    ? 3
                                    : 500
                        }
                        multiline={index > 1 || key === 'goalDetails'}
                        onChangeText={(value) => {
                          if (key === 'daysPerWeek' && value && !/^[1-7]$/.test(value)) return
                          setDraft((previous) => ({
                            ...previous,
                            [key]:
                              key === 'birthDate'
                                ? maskDate(value)
                                : key === 'cpf'
                                  ? maskCpf(value)
                                  : key === 'phone'
                                    ? maskPhone(value)
                                    : value,
                          }))
                        }}
                      />
                    )}
                  </View>
                )
                return (
                  <View key={title} style={styles.card}>
                    <View style={styles.editorSectionHeader}>
                      <View style={styles.accent} />
                      <Text style={styles.cardTitle}>{title}</Text>
                    </View>
                    <View style={styles.editorFields}>
                      {index === 0 ? (
                        <>
                          <View style={styles.editorRow}>
                            {input('birthDate', 'Data de nascimento')}
                            <View style={styles.editorField}>
                              <Text style={styles.editorLabel}>IDADE</Text>
                              <TextInput
                                accessibilityLabel="Idade calculada"
                                editable={false}
                                style={styles.input}
                                value={String(birthDateInfo(draft.birthDate || '')?.age ?? '')}
                              />
                            </View>
                          </View>
                          {input('phone', 'Telefone')}
                          <View style={styles.editorField}>
                            <Text style={styles.editorLabel}>E-MAIL</Text>
                            <TextInput
                              accessibilityLabel="E-mail da conta, somente leitura"
                              editable={false}
                              style={[styles.input, { color: '#999' }]}
                              value={student?.email || ''}
                            />
                          </View>
                          {input('profession', 'Profissão')}
                          {input('cpf', 'CPF')}
                        </>
                      ) : index === 1 ? (
                        <>
                          {input('goal', 'Principal objetivo')}
                          <View style={styles.editorRow}>
                            {input('daysPerWeek', 'Dias por semana')}
                            {input('minutesPerSession', 'Tempo disponível (min)')}
                          </View>
                          {input('goalDetails', 'Detalhes do objetivo')}
                        </>
                      ) : (
                        fields.map(([key, label]) => input(key, label))
                      )}
                    </View>
                  </View>
                )
              })}
              {!!error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity disabled={saving} style={styles.save} onPress={() => void save()}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.cardTitle}>Salvar Anamnese</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
          <InstructorTabBar
            active="Alunos"
            disabled={saving}
            onNavigate={() => setEditing(false)}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  editorSectionHeader: {
    backgroundColor: '#161616',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#292929',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  accent: { width: 3, height: 18, borderRadius: 2, backgroundColor: '#FF3B30' },
  editorFields: { padding: 14, gap: 14 },
  editorField: { flex: 1, minWidth: 0, gap: 6 },
  editorLabel: { color: '#888', fontSize: 10, fontFamily: 'SpaceGrotesk_500Medium' },
  editorRow: { flexDirection: 'row', gap: 12 },
  goalSelector: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#090909',
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 10,
    padding: 12,
  },
  screen: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  white: { color: '#fff' },
  header: { padding: 18, gap: 16 },
  back: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: '#303030',
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
  title: { color: '#fff', fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
  muted: { color: '#888', fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 5 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#191919' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { color: '#888', fontSize: 11, fontFamily: 'SpaceGrotesk_500Medium' },
  indicator: { position: 'absolute', bottom: 0, width: 24, height: 2, backgroundColor: '#E60012' },
  content: { padding: 18, gap: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  card: {
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#303030',
    overflow: 'hidden',
  },
  cardHeader: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  document: { backgroundColor: '#3A2020', borderRadius: 8, padding: 7 },
  cardTitle: { color: '#fff', fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },
  date: { color: '#888', fontSize: 10, marginTop: 3 },
  edit: {
    backgroundColor: '#303030',
    padding: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: { padding: 14, borderTopWidth: 1, borderTopColor: '#292929', gap: 20 },
  sectionTitle: { color: '#FF3B30', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 10 },
  row: { flexDirection: 'row', gap: 12 },
  label: { color: '#888', fontSize: 11, width: '30%', fontFamily: 'SpaceGrotesk_400Regular' },
  value: {
    flex: 1,
    color: '#ddd',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  empty: { color: '#aaa', padding: 16 },
  editorHeader: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  field: { gap: 8 },
  input: {
    backgroundColor: '#090909',
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 10,
    color: '#fff',
    padding: 12,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  goals: { gap: 6 },
  goal: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#444' },
  selectedGoal: { borderColor: '#E60012' },
  save: { padding: 16, backgroundColor: '#E60012', borderRadius: 12, alignItems: 'center' },
  error: { color: '#FF7777', fontSize: 12 },
})
