import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { InstructorTabBar } from '@/components/InstructorTabBar'
import { useMeasurements } from '@/hooks/useMeasurements'
import { composition, DeltaBadge, delta, longDate, perimeters, RED, shown } from './shared'

// "Resultados da Avaliação": compara a avaliação com a anterior (items[i] com items[i + 1])
export default function ResultadosAvaliacaoScreen() {
  const router = useRouter()
  const { measurementId, studentId = '' } = useLocalSearchParams<{
    measurementId: string
    studentId: string
  }>()
  const measurements = useMeasurements(studentId)
  const index = measurements.data?.findIndex((item) => item.id === measurementId) ?? -1
  const current = measurements.data?.[index]
  const previous = index >= 0 ? measurements.data?.[index + 1] : undefined

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
        <View style={styles.flex}>
          <Text style={styles.title}>Resultados da Avaliação</Text>
          {current && (
            <View style={styles.row}>
              <Ionicons name="calendar-outline" size={13} color="#888" />
              <Text style={styles.muted}>{longDate(current.measuredOn)}</Text>
            </View>
          )}
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={measurements.isRefetching}
            onRefresh={() => void measurements.refetch()}
            tintColor="#E60012"
          />
        }
      >
        {measurements.isPending ? (
          <ActivityIndicator color="#E60012" />
        ) : measurements.isError ? (
          <TouchableOpacity onPress={() => void measurements.refetch()}>
            <Text style={styles.muted}>
              Não foi possível carregar a avaliação. Toque para tentar novamente.
            </Text>
          </TouchableOpacity>
        ) : !current ? (
          <Text style={styles.muted}>Avaliação não encontrada.</Text>
        ) : (
          <>
            <View style={styles.compare}>
              <Ionicons name="time-outline" size={16} color={RED} />
              <Text style={styles.compareText}>
                {previous ? (
                  <>
                    Comparando com{' '}
                    <Text style={styles.strong}>{longDate(previous.measuredOn)}</Text>
                  </>
                ) : (
                  'Primeira avaliação: ainda não há com o que comparar.'
                )}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Composição Corporal</Text>
              {composition.map(({ key, label, unit }) => {
                const value = shown(current, key)
                return (
                  <View key={key} style={styles.line}>
                    <Text style={[styles.label, styles.flex]}>{label}</Text>
                    <Text style={styles.value}>
                      {value ?? '—'}
                      {value != null && <Text style={styles.unit}> {unit}</Text>}
                    </Text>
                    {/* Altura e massa magra sem seta, como no protótipo: subir massa magra não é ruim */}
                    {key !== 'heightCm' && key !== 'leanMassKg' && (
                      <DeltaBadge value={delta(value, shown(previous, key))} />
                    )}
                  </View>
                )
              })}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Perímetros e Medidas</Text>
              <View style={styles.grid}>
                {perimeters.map(({ key, label, unit }) => {
                  const value = shown(current, key)
                  return (
                    <View key={key} style={styles.tile}>
                      <Text style={styles.tileLabel}>{label.toUpperCase()}</Text>
                      <View style={styles.row}>
                        <Text style={styles.tileValue}>
                          {value ?? '—'}
                          {value != null && <Text style={styles.unit}> {unit}</Text>}
                        </Text>
                        <DeltaBadge value={delta(value, shown(previous, key))} />
                      </View>
                    </View>
                  )
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <InstructorTabBar active="Alunos" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  title: { fontSize: 18, color: '#fff', fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 4 },
  muted: { color: '#888', fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },
  content: { padding: 18, gap: 14, width: '100%', maxWidth: 600, alignSelf: 'center' },
  compare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A1D1B',
    backgroundColor: '#1A0A09',
  },
  compareText: { flex: 1, color: '#ccc', fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },
  strong: { color: '#fff', fontFamily: 'SpaceGrotesk_700Bold' },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#303030',
    overflow: 'hidden',
  },
  cardTitle: { color: '#fff', fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', padding: 14 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#292929',
  },
  label: { color: '#999', fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },
  value: { color: '#fff', fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold' },
  unit: { color: '#777', fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#292929',
  },
  tile: {
    width: '48%',
    padding: 12,
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#292929',
    backgroundColor: '#0E0E0E',
  },
  tileLabel: { color: '#888', fontSize: 10, fontFamily: 'SpaceGrotesk_500Medium' },
  tileValue: { color: '#fff', fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold' },
})
