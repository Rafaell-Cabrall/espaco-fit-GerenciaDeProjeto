import { Ionicons } from '@expo/vector-icons'
import { studentLinkSchema } from '@espacofit/shared'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { z } from 'zod'
import { api } from '@/api/client'
import { useAuth } from '@/auth'
import { InstructorTabBar } from '@/components/InstructorTabBar'
import { dateKey, dayLabel, initials, openingHours, useAgenda } from './data'

const time = (hour: number) => `${String(hour).padStart(2, '0')}:00`

export default function AgendaScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const agenda = useAgenda(user?.id)
  const students = useQuery({ queryKey: ['instructor-home', user?.id, 'students'], queryFn: () => api('/links', z.array(studentLinkSchema)), enabled: !!user })
  const [days] = useState(() => Array.from({ length: 30 }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + index); return date }))
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const selectedDay = days.find((day) => dateKey(day) === selectedDate) || days[0]!
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const entries = agenda.data || []
  const daily = entries.filter((entry) => entry.date === selectedDate)
  const availableHours = openingHours(selectedDay)
  // Preserva a visualização e o cancelamento de agendamentos antigos fora do expediente.
  const hours = [...new Set([...availableHours, ...daily.map((entry) => entry.hour)])].sort((a, b) => a - b)
  const appointment = daily.find((entry) => entry.hour === selectedHour)
  const close = () => { if (!saving) { setSelectedHour(null); setSearch(''); setStudentId(null); setError('') } }
  const open = (hour: number) => { setSelectedHour(hour); setStudentId(null); setError(''); setSearch('') }
  const isPast = (hour: number) => { const date = new Date(selectedDay); date.setHours(hour, 0, 0, 0); return date <= new Date() }
  const persist = async (cancel = false) => {
    if (saving || selectedHour === null) return
    const student = students.data?.find((link) => link.student.id === studentId)?.student
    if (!cancel && (!student || isPast(selectedHour) || !availableHours.includes(selectedHour))) { setError('Selecione um aluno e um horário futuro dentro do expediente.'); return }
    setSaving(true)
    try {
      const current = await agenda.refetch()
      if (current.error || !current.data) throw new Error('Não foi possível carregar a agenda. Tente novamente.')
      const existing = current.data.find((entry) => entry.date === selectedDate && entry.hour === selectedHour)
      if (!cancel && existing) throw new Error('Este horário já está ocupado.')
      const next = cancel ? current.data.filter((entry) => entry.id !== appointment?.id) : [...current.data, { id: `${selectedDate}:${selectedHour}`, date: selectedDate, hour: selectedHour, studentId: student!.id, studentName: student!.name }]
      await agenda.save(next)
      setSelectedHour(null); setSearch(''); setStudentId(null); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar. Tente novamente.') }
    finally { setSaving(false) }
  }
  const filteredStudents = students.data?.filter((link) => link.student.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))) || []
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <View style={styles.header}><TouchableOpacity accessibilityLabel="Voltar" style={styles.back} onPress={() => router.back()}><Ionicons name="chevron-back" color="#fff" size={22} /></TouchableOpacity><View><Text style={styles.title}>Agenda</Text><Text style={styles.subtitle}>Avaliações Físicas</Text></View></View>
    <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>{days.map((day) => {
      const key = dateKey(day), selected = key === selectedDate, count = entries.filter((entry) => entry.date === key).length
      return <TouchableOpacity key={key} accessibilityLabel={dayLabel(day)} accessibilityState={{ selected }} onPress={() => setSelectedDate(key)} style={[styles.day, selected && styles.selectedDay]}><Text style={[styles.weekday, selected && styles.white]}>{day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()}</Text><Text style={styles.dayNumber}>{day.getDate()}</Text><Text style={[styles.dayCount, selected && styles.white]}>{agenda.isPending || agenda.isError ? '—' : `${count} aval.`}</Text></TouchableOpacity>
    })}</ScrollView></View>
    <ScrollView contentContainerStyle={styles.timeline} showsVerticalScrollIndicator={false}>
      <Text style={styles.summary}><Text style={styles.red}>{dayLabel(selectedDay)}</Text>{agenda.isPending ? ' · Carregando…' : agenda.isError ? ' · Agenda indisponível' : ` · ${daily.length} ${daily.length === 1 ? 'avaliação agendada' : 'avaliações agendadas'}`}</Text>
      <Text style={styles.subtitle}>{selectedDay.getDay() === 0 ? 'Academia fechada aos domingos.' : selectedDay.getDay() === 6 ? 'Funcionamento: 14h às 18h.' : 'Funcionamento: 05h às 22h.'}</Text>
      {agenda.isError ? <TouchableOpacity onPress={() => void agenda.refetch()}><Text style={styles.error}>Não foi possível carregar. Toque para tentar novamente.</Text></TouchableOpacity> : agenda.isPending ? <ActivityIndicator color="#E60012" /> : hours.map((hour) => {
        const entry = daily.find((item) => item.hour === hour), past = isPast(hour)
        return <View key={hour} style={styles.slot}><View style={styles.timeColumn}><Text style={styles.hour}>{time(hour)}</Text><View style={styles.line} /></View><TouchableOpacity disabled={!entry && past} accessibilityLabel={entry ? `${time(hour)}, ${entry.studentName}, avaliação física` : `${time(hour)}, ${past ? 'Horário encerrado' : 'Agendar avaliação'}`} style={[styles.slotCard, entry && styles.booked, !entry && past && { opacity: 0.4 }]} onPress={() => open(hour)}>
          {entry ? <><View style={styles.avatar}><Text style={styles.red}>{initials(entry.studentName)}</Text></View><View style={styles.flex}><Text style={styles.studentName}>{entry.studentName}</Text><Text style={styles.subtitle}><Text style={styles.red}>• </Text>Avaliação Física</Text></View></> : <><Ionicons name="add-circle-outline" size={26} color="#555" /><Text style={styles.available}>{past ? 'Horário encerrado' : 'Horário disponível — Toque para agendar'}</Text></>}
        </TouchableOpacity></View>
      })}
      <Text style={styles.localNote}>Agenda salva neste aparelho. O funcionamento em feriados depende de confirmação da academia.</Text>
    </ScrollView>
    <InstructorTabBar />
    <Modal visible={selectedHour !== null} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}><Text style={styles.badge}>{selectedHour === null ? '' : time(selectedHour)}</Text><View style={styles.flex}><Text style={styles.studentName}>{dayLabel(selectedDay)}</Text><Text style={styles.subtitle}>{appointment ? 'Avaliação agendada' : 'Qual aluno fará a avaliação?'}</Text></View><TouchableOpacity accessibilityLabel="Fechar" disabled={saving} onPress={close}><Ionicons name="close" size={24} color="#aaa" /></TouchableOpacity></View>
          {appointment ? <View style={styles.appointment}><View style={styles.avatar}><Text style={styles.red}>{initials(appointment.studentName)}</Text></View><Text style={styles.studentName}>{appointment.studentName}</Text></View> : <>
            <View style={styles.search}><Ionicons name="search" size={18} color="#888" /><TextInput accessibilityLabel="Buscar aluno" placeholder="Buscar aluno..." placeholderTextColor="#888" style={styles.searchInput} value={search} onChangeText={setSearch} /></View>
            <ScrollView style={styles.studentList} keyboardShouldPersistTaps="handled">
              {students.isPending ? <ActivityIndicator color="#E60012" /> : students.isError ? <TouchableOpacity onPress={() => void students.refetch()}><Text style={styles.error}>Erro ao carregar alunos. Toque para tentar novamente.</Text></TouchableOpacity> : filteredStudents.length === 0 ? <Text style={styles.subtitle}>Nenhum aluno encontrado.</Text> : filteredStudents.map(({ student }) => <TouchableOpacity key={student.id} accessibilityRole="button" accessibilityState={{ selected: studentId === student.id }} disabled={saving} style={[styles.studentRow, studentId === student.id && styles.selectedStudent]} onPress={() => setStudentId(student.id)}><View style={styles.neutralAvatar}><Text style={styles.studentName}>{initials(student.name)}</Text></View><Text style={[styles.studentName, styles.flex]}>{student.name}</Text>{studentId === student.id && <Ionicons name="checkmark-circle" color="#E60012" size={22} />}</TouchableOpacity>)}
            </ScrollView>
          </>}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <TouchableOpacity disabled={saving || (!appointment && !studentId)} style={[styles.button, (saving || (!appointment && !studentId)) && { opacity: 0.4 }]} onPress={() => void persist(!!appointment)}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{appointment ? 'Cancelar agendamento' : studentId ? 'Agendar avaliação' : 'Selecione um aluno'}</Text>}</TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' }, flex: { flex: 1 }, white: { color: '#fff' }, red: { color: '#FF3B30', fontFamily: 'SpaceGrotesk_700Bold' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: '#191919' }, back: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 18, color: '#fff', fontFamily: 'SpaceGrotesk_700Bold' }, subtitle: { color: '#888', fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 4 },
  days: { padding: 12, gap: 8 }, day: { width: 54, minHeight: 72, borderRadius: 15, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 }, selectedDay: { backgroundColor: '#FF3B30' }, weekday: { color: '#888', fontSize: 9, fontFamily: 'SpaceGrotesk_500Medium' }, dayNumber: { color: '#fff', fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold' }, dayCount: { color: '#888', fontSize: 9 },
  timeline: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: 18, paddingBottom: 24, gap: 12 }, summary: { color: '#888', fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', marginBottom: 4 }, slot: { flexDirection: 'row', gap: 12, minHeight: 60 }, timeColumn: { width: 38, alignItems: 'center' }, hour: { color: '#888', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 12, marginTop: 14 }, line: { flex: 1, width: 1, backgroundColor: '#222', marginTop: 6 }, slotCard: { flex: 1, borderWidth: 1, borderColor: '#222', borderStyle: 'dashed', borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, booked: { backgroundColor: '#1C1C1E', borderStyle: 'solid' }, avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3A2020', borderWidth: 1, borderColor: '#592828', justifyContent: 'center', alignItems: 'center' }, studentName: { color: '#fff', fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' }, available: { flex: 1, fontSize: 11, color: '#888', fontFamily: 'SpaceGrotesk_500Medium' }, localNote: { color: '#666', fontSize: 11, textAlign: 'center', marginTop: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }, sheet: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '85%', width: '100%', maxWidth: 600, alignSelf: 'center' }, handle: { width: 34, height: 3, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }, sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }, badge: { backgroundColor: '#331B19', color: '#FF3B30', padding: 10, borderRadius: 10, fontFamily: 'SpaceGrotesk_700Bold' }, search: { backgroundColor: '#1C1C1E', borderColor: '#303030', borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, marginBottom: 12 }, searchInput: { flex: 1, paddingVertical: 12, color: '#fff', fontFamily: 'SpaceGrotesk_400Regular' }, studentList: { maxHeight: 260, backgroundColor: '#1C1C1E', borderRadius: 14 }, studentRow: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#303030' }, selectedStudent: { backgroundColor: '#352020' }, neutralAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#303030', alignItems: 'center', justifyContent: 'center' }, appointment: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 }, button: { backgroundColor: '#E60012', minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18 }, buttonText: { color: '#fff', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 }, error: { color: '#FF7777', fontSize: 12, marginTop: 8 },
})
