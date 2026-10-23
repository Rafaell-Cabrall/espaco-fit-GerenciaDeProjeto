import type { Measurement } from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useMeasurements } from '@/hooks/useMeasurements'
import { DeltaBadge, delta, GREEN, longDate, RED, shortDate } from '../Avaliacao/shared'

// Verde se caiu em relação à avaliação anterior, vermelho se subiu
const trend = (value: number | null, before: number | null | undefined) =>
  value == null || before == null || value === before ? null : value < before ? GREEN : RED

// Aba Resumo do aluno: "Evolução Comparativa" (3 últimas) e a lista de avaliações físicas
export function Avaliacoes({ studentId }: { studentId: string }) {
  const router = useRouter()
  const measurements = useMeasurements(studentId)
  const items = measurements.data ?? []
  const recent = items.slice(0, 3)
  const oldest: Measurement | undefined = recent[recent.length - 1]
  const open = (measurementId: string) =>
    router.push({
      pathname: '/(instrutor)/avaliacao/[measurementId]',
      params: { measurementId, studentId },
    })

  if (measurements.isPending) return <ActivityIndicator color="#E60012" />
  if (measurements.isError)
    return (
      <TouchableOpacity onPress={() => void measurements.refetch()}>
        <Text style={styles.muted}>
          Não foi possível carregar as avaliações. Toque para tentar novamente.
        </Text>
      </TouchableOpacity>
    )
  return (
    <>
      {recent.length > 1 && (
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.flex}>
              <Text style={styles.title}>Evolução Comparativa</Text>
              <Text style={styles.muted}>Últimas {recent.length} avaliações</Text>
            </View>
            <DeltaBadge value={delta(recent[0]?.weightKg ?? null, oldest?.weightKg ?? null)} />
          </View>
          <View style={styles.tableRow}>
            {['Data', 'Peso (kg)', '% Gordura'].map((label) => (
              <Text key={label} style={[styles.column, styles.columnLabel]}>
                {label}
              </Text>
            ))}
          </View>
          {recent.map((item, index) => {
            const before = items[index + 1]
            return (
              <View key={item.id} style={styles.tableRow}>
                <View style={styles.column}>
                  <Text style={styles.cell}>{shortDate(item.measuredOn)}</Text>
                  {index === 0 && <Text style={styles.current}>ATUAL</Text>}
                </View>
                <Text
                  style={[
                    styles.column,
                    styles.number,
                    { color: trend(item.weightKg, before?.weightKg) ?? '#fff' },
                  ]}
                >
                  {item.weightKg}
                </Text>
                <Text
                  style={[
                    styles.column,
                    styles.number,
                    { color: trend(item.bodyFatPct, before?.bodyFatPct) ?? '#fff' },
                  ]}
                >
                  {item.bodyFatPct == null ? '—' : `${item.bodyFatPct}%`}
                </Text>
              </View>
            )
          })}
          <View style={styles.legend}>
            <View style={[styles.dot, { backgroundColor: GREEN }]} />
            <Text style={styles.muted}>Redução (positivo)</Text>
            <View style={[styles.dot, { backgroundColor: RED }]} />
            <Text style={styles.muted}>Aumento</Text>
          </View>
        </View>
      )}
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={[styles.title, styles.flex]}>Avaliações Físicas</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Nova avaliação física"
            style={styles.new}
            onPress={() =>
              router.push({ pathname: '/(instrutor)/avaliacao/nova', params: { studentId } })
            }
          >
            <Text style={styles.newText}>+ Nova</Text>
          </TouchableOpacity>
        </View>
        {!items.length && (
          <Text style={[styles.muted, styles.empty]}>Nenhuma avaliação física registrada.</Text>
        )}
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            accessibilityRole="button"
            style={styles.item}
            onPress={() => open(item.id)}
          >
            <View style={styles.icon}>
              <Ionicons name="body-outline" size={16} color={RED} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>Avaliação Física</Text>
              <Text style={styles.muted}>{longDate(item.measuredOn)}</Text>
            </View>
            {index === 0 && <Text style={styles.current}>ATUAL</Text>}
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
        ))}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#303030',
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  title: { color: '#fff', fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },
  muted: { color: '#888', fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 2 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#292929',
  },
  column: { flex: 1 },
  columnLabel: { color: '#888', fontSize: 10, fontFamily: 'SpaceGrotesk_500Medium' },
  cell: { color: '#ddd', fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium' },
  number: { fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold' },
  current: { color: RED, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', marginTop: 2 },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#292929',
  },
  dot: { width: 7, height: 7, borderRadius: 4, marginLeft: 4 },
  new: {
    borderWidth: 1,
    borderColor: '#68231D',
    backgroundColor: '#3A201E',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  newText: { color: RED, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold' },
  empty: { paddingHorizontal: 14, paddingBottom: 14 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#292929',
  },
  icon: { backgroundColor: '#3A2020', borderRadius: 8, padding: 7 },
  itemTitle: { color: '#fff', fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium' },
})
