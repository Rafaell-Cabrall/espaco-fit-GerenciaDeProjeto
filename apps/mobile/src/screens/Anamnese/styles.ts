import { StyleSheet } from 'react-native'
import { tokens } from '@/design-system/tokens'

export const styles = StyleSheet.create({
  bold: { color: tokens.colors.textPrimary, fontFamily: tokens.fonts.bold },
  section: { color: tokens.colors.textPrimary, fontFamily: tokens.fonts.bold, fontSize: 15 },
  row: { gap: 2 },
  label: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  value: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  note: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.regular,
    fontSize: 12,
    lineHeight: 18,
  },
})
