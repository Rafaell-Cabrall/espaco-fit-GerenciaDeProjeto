import { StyleSheet } from 'react-native'
import { tokens } from '@/design-system/tokens'

export const styles = StyleSheet.create({
  bold: { color: tokens.colors.textPrimary, fontFamily: tokens.fonts.bold },
  note: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.regular,
    fontSize: 12,
    lineHeight: 18,
  },
})
