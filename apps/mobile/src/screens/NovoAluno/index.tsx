import { Goal, userSchema } from '@espacofit/shared'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, Keyboard, Modal, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { InstructorTabBar } from '@/components/InstructorTabBar'
import { api } from '@/api/client'
import { useAuth } from '@/auth'
import { birthDateInfo, maskDate, maskPhone, maskCpf, studentPayload } from './form'

const historySections = [
  ['3. Histórico de Atividade Física', [['activityHistory', 'Pratica ou praticou atividade física?'], ['weightTrainingExperience', 'Experiência com musculação']]],
  ['4. Histórico de Saúde e Clínico', [['conditions', 'Doenças diagnosticadas'], ['effortSymptoms', 'Dores, tonturas ou falta de ar durante esforço'], ['injuries', 'Lesões atuais ou cirurgias recentes'], ['medications', 'Medicamentos em uso contínuo'], ['familyHeartHistory', 'Histórico familiar de doenças cardíacas graves antes dos 50 anos']]],
  ['5. Hábitos de Vida', [['sleep', 'Qualidade do sono'], ['hydration', 'Hidratação diária estimada'], ['smokingAlcohol', 'Tabagismo / Consumo de álcool']]],
] as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionHeader}><View style={styles.accent} /><Text style={styles.sectionTitle}>{title}</Text></View><View style={styles.fields}>{children}</View></View>
}

export default function NovoAlunoScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { width } = useWindowDimensions()
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)
  const [successVisible, setSuccessVisible] = useState(false)
  const finishRegistration = () => {
    setSuccessVisible(false)
    router.replace('/(instrutor)/(tabs)')
  }
  const [choosingGoal, setChoosingGoal] = useState(false)
  const sending = useRef(false)
  const scroll = useRef<ScrollView>(null)
  const birth = birthDateInfo(values.birthDate || '')
  const set = (key: string, value: string) => {
    if (key === 'daysPerWeek' && value !== '' && !/^[1-7]$/.test(value)) return
    setValues((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => ({ ...previous, [key]: '' }))
    setServerError('')
  }
  const field = (key: string, label: string, options: { numeric?: boolean; multiline?: boolean; readOnly?: boolean; value?: string; maxLength?: number } = {}) => (
    <View style={styles.field} key={key}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <TextInput accessibilityLabel={label} style={[styles.input, options.multiline && styles.multiline, errors[key] ? styles.invalid : null, options.readOnly && styles.readOnly]}
        value={options.value ?? values[key] ?? ''} editable={!saving && !options.readOnly}
        onChangeText={(text) => set(key, key === 'birthDate' ? maskDate(text) : key === 'phone' ? maskPhone(text) : key === 'cpf' ? maskCpf(text) : text)}
        keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : options.numeric ? 'number-pad' : 'default'}
        autoCapitalize={key === 'email' ? 'none' : 'sentences'} autoCorrect={key !== 'email'}
        placeholder={key === 'birthDate' ? 'DD/MM/AAAA' : undefined} placeholderTextColor="#666"
        maxLength={options.maxLength ?? (options.multiline ? 500 : undefined)} multiline={options.multiline} />
      {!!errors[key] && <Text style={styles.error}>{errors[key]}</Text>}
    </View>
  )
  const row = (children: ReactNode) => <View style={[styles.row, width < 350 && styles.stacked]}>{children}</View>
  const submit = async () => {
    if (sending.current) return
    const result = studentPayload(values)
    if (!result.success) {
      const next: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[issue.path.length - 1])
        next[key] = key === 'birthDate' ? 'Informe uma data de nascimento válida.' : issue.message
      }
      setErrors(next)
      setServerError('Confira os campos indicados antes de cadastrar.')
      scroll.current?.scrollTo({ y: 0, animated: true })
      return
    }
    sending.current = true
    setSaving(true)
    setServerError('')
    try {
      await api('/users', userSchema, { method: 'POST', body: result.data })
      void queryClient.invalidateQueries({ queryKey: ['instructor-home', user?.id, 'students'] })
      Keyboard.dismiss()
      setChoosingGoal(false)
      setSuccessVisible(true)
      setValues({})
      setErrors({})
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Não foi possível cadastrar. Tente novamente.')
    } finally {
      sending.current = false
      setSaving(false)
    }
  }
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <View style={styles.header}><TouchableOpacity disabled={saving} accessibilityLabel="Voltar" style={styles.back} onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color="#fff" /></TouchableOpacity><Text style={styles.title}>Novo Aluno</Text></View>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Section title="1. Dados Pessoais">
          {field('name', 'Nome completo')}
          {row(<>{field('birthDate', 'Data de nascimento', { numeric: true, maxLength: 10 })}{field('age', 'Idade', { readOnly: true, value: birth ? `${birth.age} anos` : '' })}</>)}
          {row(<>{field('phone', 'Telefone', { maxLength: 20 })}{field('cpf', 'CPF', { numeric: true, maxLength: 14 })}</>)}
          {field('email', 'E-mail')}{field('profession', 'Profissão', { maxLength: 500 })}
        </Section>
        <Section title="2. Objetivos e Expectativas">
          <View style={styles.field}><Text style={styles.label}>PRINCIPAL OBJETIVO</Text><TouchableOpacity disabled={saving} style={[styles.input, styles.select, errors.goal ? styles.invalid : null]} accessibilityLabel="Escolher objetivo principal" onPress={() => setChoosingGoal((previous) => !previous)}><Text style={styles.value}>{values.goal || 'Selecionar'}</Text><Ionicons name="chevron-down" size={16} color="#888" /></TouchableOpacity>{choosingGoal && <View style={styles.goalOptions}>{Goal.options.map((goal) => <TouchableOpacity key={goal} disabled={saving} style={styles.goalOption} onPress={() => { set('goal', goal); setChoosingGoal(false) }}><Text style={styles.value}>{goal}</Text></TouchableOpacity>)}</View>}{!!errors.goal && <Text style={styles.error}>{errors.goal}</Text>}</View>
          {row(<>{field('daysPerWeek', 'Dias por semana', { numeric: true, maxLength: 1 })}{field('minutesPerSession', 'Tempo disponível (min)', { numeric: true, maxLength: 3 })}</>)}
          {field('goalDetails', 'Detalhes do objetivo', { multiline: true })}
        </Section>
        {historySections.map(([title, fields]) => <Section key={title} title={title}>{fields.map(([key, label]) => field(key, label, { multiline: true }))}</Section>)}
        {!!serverError && <Text accessibilityRole="alert" style={styles.error}>{serverError}</Text>}
        <TouchableOpacity accessibilityRole="button" disabled={saving} style={[styles.submit, saving && { opacity: 0.6 }]} onPress={submit}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Cadastrar Aluno</Text>}</TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    <InstructorTabBar disabled={saving} />
    <Modal visible={successVisible} transparent animationType="fade" onRequestClose={finishRegistration} statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.modalContent} bounces={false}>
            <View style={styles.successIcon}><Ionicons name="checkmark" size={32} color="#22C55E" /></View>
            <Text accessibilityRole="header" style={styles.modalTitle}>Aluno cadastrado!</Text>
            <Text style={styles.modalDescription}>Cadastro e anamnese salvos com sucesso. O aluno receberá por e-mail as instruções para o primeiro acesso.</Text>
            <TouchableOpacity accessibilityRole="button" style={[styles.submit, styles.modalButton]} onPress={finishRegistration}>
              <Text style={styles.submitText}>Voltar à Home</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 360, maxHeight: '85%', backgroundColor: '#1C1C1E', borderRadius: 22, borderWidth: 1, borderColor: '#303030', overflow: 'hidden' },
  modalContent: { padding: 24, alignItems: 'center', gap: 16 },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#142E18', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: '#fff', fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center' },
  modalDescription: { color: '#aaa', fontSize: 14, lineHeight: 21, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center' },
  modalButton: { alignSelf: 'stretch', marginTop: 4 },
  screen: { flex: 1, backgroundColor: '#000' }, flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12, borderBottomWidth: 1, borderBottomColor: '#181818' },
  back: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: 18, gap: 14, paddingBottom: 28 },
  section: { backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#303030', borderRadius: 18, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#161616', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#292929' },
  accent: { height: 18, width: 3, borderRadius: 2, backgroundColor: '#E60012' },
  sectionTitle: { flex: 1, color: '#fff', fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold' },
  fields: { padding: 14, gap: 10 }, field: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', gap: 12 }, stacked: { flexDirection: 'column' },
  label: { color: '#999', fontSize: 10, fontFamily: 'SpaceGrotesk_500Medium', letterSpacing: 0.5, marginBottom: 6 },
  input: { minHeight: 42, borderWidth: 1, borderColor: '#303030', borderRadius: 11, backgroundColor: '#090909', color: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular' },
  multiline: { minHeight: 64, textAlignVertical: 'top' }, readOnly: { color: '#999' }, invalid: { borderColor: '#FF5555' },
  goalOptions: { borderWidth: 1, borderColor: '#303030', borderRadius: 10, marginTop: 6, overflow: 'hidden' },
  goalOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#303030' },
  select: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, value: { flex: 1, color: '#eee', fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14 },
  error: { color: '#FF7777', fontSize: 12, marginTop: 5, fontFamily: 'SpaceGrotesk_400Regular' },
  submit: { minHeight: 48, backgroundColor: '#E60012', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold' },
})
