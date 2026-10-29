// Agenda de avaliações físicas (protótipo de 28/10): escolhe o dia, o aluno e um horário livre da
// grade; abaixo, as avaliações do dia. Tocar numa avaliação oferece o cancelamento.
import { type Appointment, appointmentSchema, studentLinkSchema } from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { z } from 'zod'
import { api } from '@/api/client'
import { useAuth } from '@/auth'
import { InstructorTabBar } from '@/components/InstructorTabBar'
import {
  agendaKey,
  dateKey,
  dayLabel,
  initials,
  isWorkday,
  SLOTS,
  useAgenda,
  weekday,
} from './data'

export default function AgendaScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const cache = useQueryClient()
  const students = useQuery({
    queryKey: ['instructor-home', user?.id, 'students'],
    queryFn: () => api('/links', z.array(studentLinkSchema)),
    enabled: !!user,
  })
  // Próximos 30 dias úteis
  const [days] = useState(() =>
    Array.from({ length: 42 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() + index)
      return date
    })
      .filter(isWorkday)
      .slice(0, 30),
  )
  const first = days[0] ?? new Date()
  const agenda = useAgenda(dateKey(first), dateKey(days[days.length - 1] ?? first))
  const [selectedDate, setSelectedDate] = useState(() => dateKey(first))
  const selectedDay = days.find((day) => dateKey(day) === selectedDate) ?? first
  const [search, setSearch] = useState('')
  const [picking, setPicking] = useState(false)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const entries = agenda.data ?? []
  const daily = entries.filter((entry) => entry.date === selectedDate)
  const taken = new Set(daily.map((entry) => entry.time))
  const student = students.data?.find((link) => link.student.id === studentId)?.student
  const filteredStudents =
    students.data?.filter((link) =>
      link.student.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')),
    ) ?? []

  const isPast = (time: string) => {
    const [hour = 0, minute = 0] = time.split(':').map(Number)
    const date = new Date(selectedDay)
    date.setHours(hour, minute, 0, 0)
    return date <= new Date()
  }

  const selectDay = (key: string) => {
    setSelectedDate(key)
    setSlot(null)
    setError('')
  }

  const selectStudent = (id: string, name: string) => {
    setStudentId(id)
    setSearch(name)
    setPicking(false)
    setError('')
  }

  const schedule = async () => {
    if (saving || !student || !slot) return
    setSaving(true)
    try {
      // Horário já ocupado volta 409 com a mensagem da API
      await api('/appointments', appointmentSchema, {
        method: 'POST',
        body: { studentId: student.id, date: selectedDate, time: slot },
      })
      setSlot(null)
      setStudentId(null)
      setSearch('')
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível agendar. Tente de novo.')
    } finally {
      void cache.invalidateQueries({ queryKey: agendaKey })
      setSaving(false)
    }
  }

  // Avaliação aberta no modal de cancelamento
  const [cancelling, setCancelling] = useState<Appointment | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const openCancel = (entry: Appointment) => {
    setCancelling(entry)
    setCancelError('')
  }
  const closeCancel = () => {
    if (!cancelBusy) setCancelling(null)
  }
  const confirmCancel = async () => {
    if (!cancelling || cancelBusy) return
    setCancelBusy(true)
    try {
      await api(`/appointments/${encodeURIComponent(cancelling.id)}`, z.undefined(), {
        method: 'DELETE',
      })
      setCancelling(null)
    } catch (cause) {
      setCancelError(cause instanceof Error ? cause.message : 'Tente de novo.')
    } finally {
      void cache.invalidateQueries({ queryKey: agendaKey })
      setCancelBusy(false)
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Voltar"
          style={styles.back}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" color="#fff" size={22} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Agenda</Text>
          <Text style={styles.subtitle}>Avaliações Físicas</Text>
        </View>
      </View>
      <View style={styles.daysBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.days}
        >
          {days.map((day) => {
            const key = dateKey(day)
            const selected = key === selectedDate
            const count = entries.filter((entry) => entry.date === key).length
            return (
              <TouchableOpacity
                key={key}
                accessibilityLabel={dayLabel(day)}
                accessibilityState={{ selected }}
                onPress={() => selectDay(key)}
                style={[styles.day, selected && styles.selectedDay]}
              >
                <Text style={[styles.weekday, selected && styles.white]}>
                  {weekday(day).toUpperCase()}
                </Text>
                <Text style={styles.dayNumber}>{day.getDate()}</Text>
                <Text style={[styles.dayCount, selected && styles.white]}>
                  {agenda.isPending || agenda.isError ? '—' : `${count} aval.`}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selecionar Aluno</Text>
          <View style={[styles.search, picking && styles.searchOpen]}>
            <Ionicons name="search" size={18} color="#888" />
            <TextInput
              accessibilityLabel="Buscar aluno"
              placeholder="Buscar aluno..."
              placeholderTextColor="#888"
              style={styles.searchInput}
              value={search}
              onFocus={() => setPicking(true)}
              onChangeText={(text) => {
                setSearch(text)
                setStudentId(null)
                setPicking(true)
              }}
            />
            <TouchableOpacity
              accessibilityLabel={picking ? 'Fechar lista de alunos' : 'Abrir lista de alunos'}
              hitSlop={8}
              onPress={() => setPicking(!picking)}
            >
              <Ionicons name={picking ? 'chevron-up' : 'chevron-down'} size={18} color="#888" />
            </TouchableOpacity>
          </View>
          {picking && (
            <View style={styles.dropdown}>
              {students.isPending ? (
                <ActivityIndicator color="#E60012" style={styles.dropdownStatus} />
              ) : students.isError ? (
                <TouchableOpacity onPress={() => void students.refetch()}>
                  <Text style={[styles.error, styles.dropdownStatus]}>
                    Erro ao carregar alunos. Toque para tentar de novo.
                  </Text>
                </TouchableOpacity>
              ) : filteredStudents.length === 0 ? (
                <Text style={[styles.subtitle, styles.dropdownStatus]}>
                  Nenhum aluno encontrado.
                </Text>
              ) : (
                filteredStudents.map(({ student: option }) => (
                  <TouchableOpacity
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: option.id === studentId }}
                    style={styles.option}
                    onPress={() => selectStudent(option.id, option.name)}
                  >
                    <View style={styles.neutralAvatar}>
                      <Text style={styles.avatarText}>{initials(option.name)}</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.studentName}>{option.name}</Text>
                      <Text style={styles.subtitle}>{option.goal || 'Objetivo não informado'}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          <Text style={styles.slotsTitle}>Horários disponíveis</Text>
          <View style={styles.slots}>
            {SLOTS.map((time) => {
              const busy = taken.has(time) || isPast(time)
              const selected = time === slot
              return (
                <TouchableOpacity
                  key={time}
                  disabled={busy || agenda.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={`${time}, ${busy ? 'indisponível' : 'disponível'}`}
                  accessibilityState={{ selected, disabled: busy }}
                  onPress={() => {
                    setSlot(selected ? null : time)
                    setError('')
                  }}
                  style={[styles.slot, busy ? styles.slotBusy : selected && styles.slotSelected]}
                >
                  <Text style={[styles.slotText, busy && styles.slotTextBusy]}>{time}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <TouchableOpacity
            disabled={saving || !student || !slot}
            style={[styles.button, (saving || !student || !slot) && styles.disabled]}
            onPress={() => void schedule()}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Agendar Avaliação</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.summary}>
          <Text style={styles.red}>{dayLabel(selectedDay)}</Text>
          {agenda.isPending
            ? ' - Carregando…'
            : agenda.isError
              ? ' - Agenda indisponível'
              : ` - ${daily.length} ${daily.length === 1 ? 'Agendamento' : 'Agendamentos'}`}
        </Text>
        {agenda.isError ? (
          <TouchableOpacity onPress={() => void agenda.refetch()}>
            <Text style={styles.error}>Não foi possível carregar. Toque para tentar de novo.</Text>
          </TouchableOpacity>
        ) : agenda.isPending ? (
          <ActivityIndicator color="#E60012" />
        ) : daily.length === 0 ? (
          <Text style={styles.subtitle}>Nenhuma avaliação agendada neste dia.</Text>
        ) : (
          daily.map((entry, index) => (
            <View key={entry.id} style={styles.entry}>
              <View style={styles.timeColumn}>
                <Text style={styles.time}>{entry.time}</Text>
                {index < daily.length - 1 && <View style={styles.line} />}
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${entry.time}, ${entry.student.name}, avaliação física. Toque para cancelar`}
                style={styles.entryCard}
                onPress={() => openCancel(entry)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.red}>{initials(entry.student.name)}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.studentName}>{entry.student.name}</Text>
                  <Text style={styles.subtitle}>
                    <Text style={styles.red}>• </Text>Avaliação Física
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
      <InstructorTabBar />

      <Modal
        visible={cancelling !== null}
        transparent
        animationType="fade"
        onRequestClose={closeCancel}
      >
        <Pressable style={styles.backdrop} onPress={closeCancel} accessibilityLabel="Fechar">
          {/* Pressable interno segura o toque para não fechar ao tocar no cartão */}
          <Pressable style={styles.modal} accessibilityViewIsModal>
            <View style={styles.modalIcon}>
              <Ionicons name="calendar-outline" size={26} color="#FF3B30" />
            </View>
            <Text style={styles.modalTitle}>Cancelar avaliação?</Text>
            <Text style={styles.modalMessage}>O horário volta a ficar disponível na agenda.</Text>

            {cancelling && (
              <View style={styles.modalCard}>
                <View style={styles.avatar}>
                  <Text style={styles.red}>{initials(cancelling.student.name)}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.studentName}>{cancelling.student.name}</Text>
                  <Text style={styles.subtitle}>Avaliação Física</Text>
                </View>
                <View style={styles.modalWhen}>
                  <Text style={styles.modalTime}>{cancelling.time}</Text>
                  <Text style={styles.subtitle}>{dayLabel(selectedDay)}</Text>
                </View>
              </View>
            )}

            {!!cancelError && (
              <Text accessibilityRole="alert" style={styles.error}>
                {cancelError}
              </Text>
            )}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={cancelBusy}
                onPress={closeCancel}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.keep,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.keepText}>Manter</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={cancelBusy}
                onPress={() => void confirmCancel()}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.confirmCancel,
                  pressed && styles.pressed,
                ]}
              >
                {cancelBusy ? (
                  <ActivityIndicator color="#FF3B30" />
                ) : (
                  <Text style={styles.confirmCancelText}>Cancelar</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  white: { color: '#fff' },
  red: { color: '#FF3B30', fontFamily: 'SpaceGrotesk_700Bold' },
  disabled: { opacity: 0.4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18 },
  back: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, color: '#fff', fontFamily: 'SpaceGrotesk_700Bold' },
  subtitle: { color: '#888', fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 2 },
  daysBar: { borderBottomWidth: 1, borderBottomColor: '#191919' },
  days: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  day: {
    width: 54,
    minHeight: 72,
    borderRadius: 15,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  selectedDay: { backgroundColor: '#FF3B30' },
  weekday: { color: '#888', fontSize: 9, fontFamily: 'SpaceGrotesk_500Medium' },
  dayNumber: { color: '#fff', fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold' },
  dayCount: { color: '#888', fontSize: 9 },
  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    padding: 18,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardTitle: { color: '#fff', fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold' },
  search: {
    borderColor: '#3A3A3A',
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  searchOpen: { borderColor: '#FF3B30' },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#fff',
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  dropdown: { backgroundColor: '#141414', borderRadius: 12, overflow: 'hidden' },
  dropdownStatus: { padding: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  neutralAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold' },
  slotsTitle: { color: '#fff', fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium', marginTop: 4 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    width: '23%',
    flexGrow: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF3B30',
    backgroundColor: '#3A1414',
    alignItems: 'center',
  },
  slotSelected: { backgroundColor: '#FF3B30' },
  slotBusy: { borderColor: '#3A3A3A', backgroundColor: 'transparent' },
  slotText: { color: '#fff', fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium' },
  slotTextBusy: { color: '#666' },
  button: {
    backgroundColor: '#FF3B30',
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 },
  summary: {
    color: '#aaa',
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
    marginTop: 8,
  },
  entry: { flexDirection: 'row', gap: 12 },
  timeColumn: { width: 42, alignItems: 'center' },
  time: { color: '#aaa', fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12, marginTop: 14 },
  line: { flex: 1, width: 1, backgroundColor: '#333', marginTop: 6, marginBottom: -12 },
  entryCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 15,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3A2020',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: { color: '#fff', fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },
  error: { color: '#FF7777', fontSize: 12 },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A0A0D',
    borderWidth: 1,
    borderColor: '#5C0A12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
  modalMessage: {
    color: '#888',
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
  },
  modalCard: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 12,
    marginVertical: 6,
  },
  modalWhen: { alignItems: 'flex-end' },
  modalTime: { color: '#FF3B30', fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },
  modalActions: { flexDirection: 'row', gap: 12, alignSelf: 'stretch', marginTop: 6 },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keep: { backgroundColor: '#1C1C1E' },
  keepText: { color: '#fff', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 },
  confirmCancel: { backgroundColor: '#1F0508', borderWidth: 1, borderColor: '#5C0A12' },
  confirmCancelText: { color: '#FF3B30', fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 14 },
  pressed: { opacity: 0.6 },
})
