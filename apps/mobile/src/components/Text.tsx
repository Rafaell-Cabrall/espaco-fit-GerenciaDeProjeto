// Texto do Figma. Evita repetir fontFamily/tamanho em cada tela: a variante já traz os dois.
// A família do peso vem do token porque no Android fonte customizada ignora fontWeight.
import { Text as RNText, StyleSheet, type TextProps } from 'react-native'
import { tokens } from '@/design-system/tokens'

type Variant = 'heading' | 'title' | 'body' | 'label' | 'caption'

export function Text({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <RNText style={[styles[variant], style]} {...props} />
}

const styles = StyleSheet.create({
  heading: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.bold,
    fontSize: tokens.fontSizes.heading,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.bold,
    fontSize: tokens.fontSizes.xl,
  },
  body: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.regular,
    fontSize: tokens.fontSizes.md,
    lineHeight: 22,
  },
  label: {
    color: tokens.colors.textSecondary,
    fontFamily: tokens.fonts.medium,
    fontSize: tokens.fontSizes.sm,
  },
  caption: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.regular,
    fontSize: tokens.fontSizes.xs,
  },
})
