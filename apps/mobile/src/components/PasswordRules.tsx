// Checklist "Mínimo 8 caracteres / Uma letra maiúscula / Um número", verde quando a regra passa.
import { passwordRules } from '@espacofit/shared'
import { StyleSheet, Text, View } from 'react-native'
import { tokens } from '@/design-system/tokens'

export function PasswordRules({ value }: { value: string }) {
  return (
    <View style={styles.list}>
      {passwordRules.map(([rule, re]) => {
        const ok = re.test(value)
        return (
          <View
            key={rule}
            style={styles.row}
            accessibilityLabel={`${rule}: ${ok ? 'ok' : 'pendente'}`}
          >
            <View style={[styles.dot, ok && styles.dotOk]}>
              {ok && <Text style={styles.check}>✓</Text>}
            </View>
            <Text style={[styles.text, ok && styles.textOk]}>{rule}</Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: tokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOk: { backgroundColor: tokens.colors.success },
  check: { color: tokens.colors.onPrimary, fontSize: 9, fontWeight: '900' },
  text: { color: tokens.colors.textMuted, fontFamily: tokens.fonts.regular, fontSize: 11 },
  textOk: { color: tokens.colors.success },
})
