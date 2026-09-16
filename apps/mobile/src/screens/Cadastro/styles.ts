import { StyleSheet } from 'react-native'
import { tokens } from '@/design-system/tokens'

export const styles = StyleSheet.create({
  password: { gap: 10 },
  terms: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  checkbox: {
    width: 20,
    height: 20,
    marginTop: 2,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: tokens.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
  check: { color: tokens.colors.onPrimary, fontSize: 13, fontWeight: '900' },
  termsText: {
    flex: 1,
    color: tokens.colors.textSecondary,
    fontFamily: tokens.fonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  link: { color: tokens.colors.primary, fontFamily: tokens.fonts.semibold },
  bold: { color: tokens.colors.textPrimary, fontFamily: tokens.fonts.bold },
  login: {
    color: tokens.colors.textSecondary,
    fontFamily: tokens.fonts.regular,
    fontSize: 14,
    textAlign: 'center',
  },
})
