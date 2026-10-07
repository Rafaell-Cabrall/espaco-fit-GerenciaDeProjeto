import { Ionicons } from '@expo/vector-icons'
import { Goal, studentLinkSchema } from '@espacofit/shared'
import { useQuery } from '@tanstack/react-query'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { z } from 'zod'
import { api } from '@/api/client'
import { useAuth } from '@/auth'
import { initials } from '../Agenda/data'

export function lastWorkoutLabel(value: string | null, now = new Date()) {
  if (!value) return 'Ainda não treinou'
  const date = new Date(value)
  const calendarDay = (day: Date) => Date.UTC(day.getFullYear(), day.getMonth(), day.getDate())
  const days = Math.max(0, Math.floor((calendarDay(now) - calendarDay(date)) / 86400000))
  return days === 0 ? 'Hoje' : days === 1 ? 'Ontem' : `${days} dias atrás`
}
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
export default function MeusAlunosScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [goal, setGoal] = useState<string | null>(null)
  const [filterVisible, setFilterVisible] = useState(false)
  const students = useQuery({ queryKey: ['instructor-home', user?.id, 'students'], queryFn: () => api('/links', z.array(studentLinkSchema)), enabled: !!user })
  useFocusEffect(useCallback(() => { void students.refetch() }, [students.refetch]))
  const data = students.data?.filter(({ student }) => normalize(student.name).includes(normalize(search)) && (!goal || student.goal === goal)) || []
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <View style={styles.header}>
      <View style={styles.heading}><Text style={styles.title}>Meus Alunos</Text><TouchableOpacity accessibilityLabel="Cadastrar novo aluno" style={styles.add} onPress={() => router.push('/(instrutor)/students/new')}><Ionicons name="person-add" color="#fff" size={23} /></TouchableOpacity></View>
      <View style={styles.searchRow}><View style={styles.search}><Ionicons name="search" color="#888" size={18} /><TextInput accessibilityLabel="Buscar aluno por nome" style={styles.searchInput} placeholder="Buscar por nome..." placeholderTextColor="#888" value={search} onChangeText={setSearch} />{!!search && <TouchableOpacity accessibilityLabel="Limpar busca" onPress={() => setSearch('')}><Ionicons name="close-circle" color="#888" size={18} /></TouchableOpacity>}</View><TouchableOpacity accessibilityLabel="Filtrar alunos por objetivo" style={[styles.filter, goal && styles.activeFilter]} onPress={() => setFilterVisible(true)}><Ionicons name="filter" color={goal ? '#E60012' : '#888'} size={20} /></TouchableOpacity></View>
      {goal && <TouchableOpacity onPress={() => setGoal(null)}><Text style={styles.filterLabel}>{goal} · Limpar filtro</Text></TouchableOpacity>}
    </View>
    {students.isPending ? <ActivityIndicator style={styles.loading} color="#E60012" /> : students.isError ? <View style={styles.empty}><Text style={styles.muted}>Não foi possível carregar os alunos.</Text><TouchableOpacity style={styles.button} onPress={() => void students.refetch()}><Text style={styles.name}>Tentar novamente</Text></TouchableOpacity></View> : <FlatList data={data} keyExtractor={(link) => link.id} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={students.isRefetching} onRefresh={() => void students.refetch()} tintColor="#E60012" />} ListEmptyComponent={<Text style={styles.muted}>{search || goal ? 'Nenhum aluno encontrado para esta busca.' : 'Você ainda não tem alunos vinculados. Use o botão acima para cadastrar.'}</Text>} renderItem={({ item: { student } }) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Consultar ${student.name}`} style={styles.card} onPress={() => router.push({ pathname: '/(instrutor)/students/[studentId]', params: { studentId: student.id } })}><View style={styles.avatar}><Text style={styles.initials}>{initials(student.name)}</Text></View><View style={styles.info}><Text style={styles.name}>{student.name}</Text><Text style={styles.description}>{student.goal || 'Objetivo não informado'} · {lastWorkoutLabel(student.lastWorkoutAt)}</Text></View><Text accessibilityLabel="Mensalidade sem informação" style={styles.badge}>Sem informação</Text></TouchableOpacity>} />}
    <Modal visible={filterVisible} transparent animationType="fade" onRequestClose={() => setFilterVisible(false)}><View style={styles.overlay}><View style={styles.modal}><View style={styles.heading}><Text style={styles.modalTitle}>Filtrar por objetivo</Text><TouchableOpacity accessibilityLabel="Fechar filtro" onPress={() => setFilterVisible(false)}><Ionicons name="close" color="#fff" size={24} /></TouchableOpacity></View><ScrollView>{['Todos', ...Goal.options].map((option) => <TouchableOpacity key={option} style={styles.option} onPress={() => { setGoal(option === 'Todos' ? null : option); setFilterVisible(false) }}><Text style={styles.name}>{option}</Text>{(goal === option || (!goal && option === 'Todos')) && <Ionicons name="checkmark" color="#E60012" size={22} />}</TouchableOpacity>)}</ScrollView></View></View></Modal>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' }, header: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: 18, paddingTop: 30, borderBottomWidth: 1, borderBottomColor: '#191919', gap: 12 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, title: { color: '#fff', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24 }, add: { padding: 10 }, searchRow: { flexDirection: 'row', gap: 8 }, search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1C1C1E', borderRadius: 12, borderColor: '#303030', borderWidth: 1, paddingHorizontal: 12 }, searchInput: { flex: 1, color: '#fff', paddingVertical: 12, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' }, filter: { width: 44, minHeight: 44, borderWidth: 1, borderColor: '#303030', borderRadius: 12, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' }, activeFilter: { borderColor: '#E60012' }, filterLabel: { color: '#E60012', fontSize: 12 },
  list: { padding: 18, gap: 10, width: '100%', maxWidth: 600, alignSelf: 'center', flexGrow: 1 }, card: { backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#303030', borderRadius: 15, padding: 12, minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center' }, initials: { fontSize: 12, color: '#fff', fontFamily: 'SpaceGrotesk_700Bold' }, info: { flex: 1 }, name: { color: '#fff', fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold' }, description: { color: '#888', fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 4, lineHeight: 16 }, badge: { backgroundColor: '#303030', color: '#aaa', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4, fontSize: 9, maxWidth: 80, textAlign: 'center' },
  loading: { marginTop: 40 }, empty: { padding: 24, alignItems: 'center', gap: 16 }, muted: { color: '#999', fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 20 }, button: { backgroundColor: '#E60012', padding: 14, borderRadius: 12 }, overlay: { flex: 1, padding: 20, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' }, modal: { width: '100%', maxWidth: 500, maxHeight: '85%', padding: 20, backgroundColor: '#1C1C1E', borderRadius: 20, borderWidth: 1, borderColor: '#303030' }, modalTitle: { color: '#fff', fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' }, option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#303030' }, details: { marginTop: 16 }, detailSection: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#303030', gap: 14 }, sectionTitle: { color: '#E60012', fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold' }, detailRow: { flexDirection: 'row', gap: 12 }, detailLabel: { width: '35%', color: '#888', fontSize: 12 }, detailValue: { flex: 1, color: '#ddd', fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },
})
