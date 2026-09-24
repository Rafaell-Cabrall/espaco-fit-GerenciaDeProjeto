// Caixa de conteúdo do Figma (divisão da ficha, exercício, aviso). Com onPress vira botão.
import type { ReactNode } from 'react'
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native'
import { tokens } from '@/design-system/tokens'

type Props = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  onPress?: () => void
  accessibilityLabel?: string
}

export function Card({ children, style, onPress, accessibilityLabel }: Props) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  pressed: { opacity: 0.6 },
})
