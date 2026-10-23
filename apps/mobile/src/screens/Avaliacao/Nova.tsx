import { createMeasurementSchema, measurementSchema, studentLinkSchema } from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import { measurementsKey } from '@/hooks/useMeasurements'
import { dateKey } from '../Agenda/data'
import { birthDateInfo, maskDate } from '../NovoAluno/form'
import { composition, type FieldKey, perimeters } from './shared'

const todayBr = () => dateKey(new Date()).split('-').reverse().join('/')

export default function NovaAvaliacaoScreen() {
  const router = useRouter()
  const { studentId = '' } = useLocalSearchParams<{ studentId: string }>()
  const { user } = useAuth()
  const cache = useQueryClient()
  const links = useQuery({
    queryKey: ['instructor-home', user?.id, 'students'],
    queryFn: () => api('/links', z.array(studentLinkSchema)),
    enabled: !!user,
  })
  const student = links.data?.find((link) => link.student.id === studentId)?.student
  const [date, setDate] = useState(todayBr)
  const [values, setValues] = useState<Partial<Record<FieldKey, string>>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (saving) return
    const measuredOn = birthDateInfo(date)?.iso
    if (!measuredOn) return setError('Informe a data da avaliação (DD/MM/AAAA), até hoje.')
    const num = (key: FieldKey) => {
      const text = values[key]?.trim().replace(',', '.')
      return text ? Number(text) : null
    }
    if (num('weightKg') == null) return setError('Informe o peso.')
    const height = num('heightCm')
    const body = {
      ...Object.fromEntries([...composition, ...perimeters].map(({ key }) => [key, num(key)])),
      studentId,
      measuredOn,
      // Aceita "1.68" (m) ou "168" (cm)
      heightCm: height == null ? null : Math.round(height > 3 ? height : height * 100),
    }
    const result = createMeasurementSchema.safeParse(body)
    if (!result.success) {
      const key = result.error.issues[0]?.path[0]
      const field = [...composition, ...perimeters].find((item) => item.key === key)
      return setError(
        field ? `Confira o valor de ${field.label}.` : 'Confira os dados da avaliação.',
      )
    }
    setError('')
    setSaving(true)
    try {
      const created = await api('/measurements', measurementSchema, {
        method: 'POST',
        body: result.data,
      })
      await cache.invalidateQueries({ queryKey: measurementsKey(user?.id, studentId) })
      router.replace({
        pathname: '/(instrutor)/avaliacao/[measurementId]',
        params: { measurementId: created.id, studentId },
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const input = ({ key, label, unit }: { key: FieldKey; label: string; unit: string }) => (
    <View key={key} style={styles.field}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={styles.inputBox}>
        <TextInput
          accessibilityLabel={`${label} em ${unit}`}
          editable={!saving}
          style={styles.input}
          value={values[key] ?? ''}
          onChangeText={(text) => setValues((previous) => ({ ...previous, [key]: text }))}
          keyboardType="decimal-pad"
          placeholder={key === 'heightCm' ? '1.68' : '0'}
          placeholderTextColor="#555"
          maxLength={6}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Voltar"
          disabled={saving}
          style={styles.back}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" color="#fff" size={22} />
        </TouchableOpacity>
        <View>
          <Text style={styles.muted}>{student?.name ?? ''}</Text>
          <Text style={styles.title}>Nova Avaliação</Text>
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, styles.cardBody]}>
            <Text style={styles.label}>DATA DA AVALIAÇÃO</Text>
            <View style={styles.inputBox}>
              <TextInput
                accessibilityLabel="Data da avaliação"
                editable={!saving}
                style={styles.input}
                value={date}
                onChangeText={(text) => setDate(maskDate(text))}
                keyboardType="number-pad"
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#555"
                maxLength={10}
              />
              <Ionicons name="calendar-outline" size={18} color="#888" />
            </View>
          </View>
          {(
            [
              ['Composição Corporal', composition],
              ['Perímetros e Medidas', perimeters],
            ] as const
          ).map(([title, fields]) => (
            <View key={title} style={styles.card}>
              <Text style={styles.cardTitle}>{title}</Text>
              <View style={[styles.cardBody, styles.grid]}>
                {fields.map((field) => input(field))}
              </View>
            </View>
          ))}
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={saving}
            style={styles.save}
            onPress={() => void save()}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Salvar Avaliação</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <InstructorTabBar active="Alunos" disabled={saving} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#191919',
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, color: '#fff', fontFamily: 'SpaceGrotesk_700Bold' },
  muted: { color: '#888', fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
  content: { padding: 18, gap: 14, width: '100%', maxWidth: 600, alignSelf: 'center' },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#303030',
    overflow: 'hidden',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#292929',
  },
  cardBody: { padding: 14, gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 12 },
  field: { width: '48%', gap: 6 },
  label: { color: '#888', fontSize: 10, fontFamily: 'SpaceGrotesk_500Medium', letterSpacing: 0.5 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090909',
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  unit: { color: '#888', fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },
  error: { color: '#FF7777', fontSize: 12 },
  save: {
    backgroundColor: '#E60012',
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 },
})
