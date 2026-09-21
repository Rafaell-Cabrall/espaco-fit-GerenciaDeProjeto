// Escolha única em chips. As opções vêm do `.options` do enum do shared: se o contrato mudar
// uma opção, a tela acompanha sozinha.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { tokens } from '@/design-system/tokens'

type Props<T extends string> = {
  label: string
  options: readonly T[]
  value: T | undefined
  onChange: (value: T) => void
}

export function Choice<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const selected = option === value
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[styles.chip, selected && styles.chipOn]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>{option}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: 10 },
  label: { color: tokens.colors.textSecondary, fontFamily: tokens.fonts.regular, fontSize: 13 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44, // alvo de toque mínimo
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: tokens.borderRadius.full,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  chipOn: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
  chipText: { color: tokens.colors.textPrimary, fontFamily: tokens.fonts.regular, fontSize: 14 },
  chipTextOn: { color: tokens.colors.onPrimary, fontFamily: tokens.fonts.bold },
})
