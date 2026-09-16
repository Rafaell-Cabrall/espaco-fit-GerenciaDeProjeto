import { StyleSheet } from 'react-native'
import { tokens } from '@/design-system/tokens'

export const styles = StyleSheet.create({
  strong: { color: tokens.colors.textPrimary, fontFamily: tokens.fonts.bold },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1,
    maxWidth: 46,
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: tokens.colors.primary },
  digit: { color: tokens.colors.textPrimary, fontSize: 19, fontFamily: tokens.fonts.bold },
  hiddenInput: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0 },
  resend: {
    color: tokens.colors.textSecondary,
    fontFamily: tokens.fonts.regular,
    fontSize: 12,
    textAlign: 'center',
  },
  resendLink: { color: tokens.colors.primary, fontSize: 14, fontFamily: tokens.fonts.bold },
})
