import { StyleSheet } from 'react-native'
import { tokens } from '@/design-system/tokens'

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background },
  content: { padding: 20, gap: tokens.spacing.md },
  summary: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md },
  summaryText: { flex: 1, gap: 2 },
  summaryTitle: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.bold,
    fontSize: tokens.fontSizes.md,
  },
  start: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: tokens.colors.accent,
  },
  pressed: { opacity: 0.6 },
  startText: {
    color: tokens.colors.onPrimary,
    fontFamily: tokens.fonts.bold,
    fontSize: tokens.fontSizes.sm,
  },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md },
  exerciseInfo: { flex: 1, gap: tokens.spacing.sm },
  exerciseName: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.semibold,
    fontSize: 15,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 3,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: tokens.colors.border,
    overflow: 'hidden',
    color: tokens.colors.textSecondary,
    fontFamily: tokens.fonts.regular,
    fontSize: tokens.fontSizes.xs,
  },
})
