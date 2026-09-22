import { StyleSheet } from 'react-native'
import { tokens } from '@/design-system/tokens'

export const styles = StyleSheet.create({
  password: { gap: 10 },
  link: { color: tokens.colors.primary, fontFamily: tokens.fonts.semibold },
  bold: { color: tokens.colors.textPrimary, fontFamily: tokens.fonts.bold },
  login: {
    color: tokens.colors.textSecondary,
    fontFamily: tokens.fonts.regular,
    fontSize: 14,
    textAlign: 'center',
  },
})
