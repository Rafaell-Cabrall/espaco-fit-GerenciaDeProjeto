// Caixa de aceite do Figma: termos no Cadastro e consentimento de saúde na Anamnese.
// `label` aceita <Text> aninhado para as partes em destaque (links, negrito).
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { tokens } from '@/design-system/tokens'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  accessibilityLabel?: string // texto curto quando o rótulo é longo ou formatado
}

export function Checkbox({ checked, onChange, label, accessibilityLabel }: Props) {
  return (
    <Pressable
      style={styles.row}
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked && <Text style={styles.check}>✓</Text>}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  box: {
    width: 20,
    height: 20,
    marginTop: 2,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: tokens.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
  check: { color: tokens.colors.onPrimary, fontSize: 13, fontWeight: '900' },
  label: {
    flex: 1,
    color: tokens.colors.textSecondary,
    fontFamily: tokens.fonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
})
