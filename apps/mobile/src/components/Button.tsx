import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { tokens } from '@/design-system/tokens'

type Props = { title: string; onPress: () => void; disabled?: boolean; loading?: boolean }

export function Button({ title, onPress, disabled, loading }: Props) {
  const off = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [styles.button, (off || pressed) && styles.dim]}
    >
      {loading ? (
        <ActivityIndicator color={tokens.colors.onPrimary} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: 20,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.45 },
  text: { color: tokens.colors.onPrimary, fontSize: 16, fontFamily: tokens.fonts.bold },
})
