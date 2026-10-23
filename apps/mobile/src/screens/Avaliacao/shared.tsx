import type { Measurement } from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, Text, View } from 'react-native'

export const composition = [
  { key: 'weightKg', label: 'Peso', unit: 'kg' },
  { key: 'heightCm', label: 'Altura', unit: 'm' },
  { key: 'bodyFatPct', label: '% de Gordura', unit: '%' },
  { key: 'leanMassKg', label: 'Massa Magra', unit: 'kg' },
] as const
export const perimeters = [
  { key: 'chestCm', label: 'Tórax', unit: 'cm' },
  { key: 'waistCm', label: 'Cintura', unit: 'cm' },
  { key: 'abdomenCm', label: 'Abdômen', unit: 'cm' },
  { key: 'rightArmCm', label: 'Braço Dir.', unit: 'cm' },
  { key: 'leftArmCm', label: 'Braço Esq.', unit: 'cm' },
  { key: 'thighCm', label: 'Coxa', unit: 'cm' },
  { key: 'calfCm', label: 'Panturrilha', unit: 'cm' },
] as const
export type FieldKey = (typeof composition)[number]['key'] | (typeof perimeters)[number]['key']

// A altura é guardada em cm e exibida em metros, como no protótipo ("1.68 m")
export const shown = (m: Measurement | undefined, key: FieldKey) => {
  const value = m?.[key]
  return value == null ? null : key === 'heightCm' ? value / 100 : value
}
export const delta = (a: number | null, b: number | null) =>
  a == null || b == null ? null : Math.round((a - b) * 10) / 10

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const parts = (iso: string) => iso.split('-').map(Number)
// "10 Ago"
export const shortDate = (iso: string) => {
  const [, month = 1, day] = parts(iso)
  return `${day} ${MONTHS[month - 1]}`
}
// "10 de Agosto de 2026"
export const longDate = (iso: string) => {
  const [year = 0, month = 1, day] = parts(iso)
  const name = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })
  return `${day} de ${name.charAt(0).toUpperCase()}${name.slice(1)} de ${year}`
}

// Queda em verde e alta em vermelho, como a legenda "Redução (positivo) / Aumento"
export function DeltaBadge({ value }: { value: number | null }) {
  if (!value) return null
  const down = value < 0
  return (
    <View
      accessibilityLabel={`${down ? 'Redução' : 'Aumento'} de ${Math.abs(value)}`}
      style={[styles.badge, down ? styles.down : styles.up]}
    >
      <Ionicons name={down ? 'arrow-down' : 'arrow-up'} size={11} color={down ? GREEN : RED} />
      <Text style={[styles.text, { color: down ? GREEN : RED }]}>{down ? value : `+${value}`}</Text>
    </View>
  )
}

export const GREEN = '#22C55E'
export const RED = '#FF3B30'

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  down: { backgroundColor: '#14301E' },
  up: { backgroundColor: '#3A1A18' },
  text: { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold' },
})
