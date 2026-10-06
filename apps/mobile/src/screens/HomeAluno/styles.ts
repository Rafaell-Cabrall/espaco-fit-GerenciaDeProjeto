import { StyleSheet } from 'react-native'
import { tokens } from '@/design-system/tokens'

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.background },
  content: { padding: 20, gap: tokens.spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  logout: {
    width: 40,
    height: 40,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streak: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md },
  streakIcon: {
    width: 40,
    height: 40,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: '#D5051726',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workout: { padding: 0, overflow: 'hidden' },
  cover: { height: 150 },
  workoutBody: { padding: tokens.spacing.md, gap: tokens.spacing.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  badge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: '#05D51A26',
  },
  badgeText: {
    color: tokens.colors.success,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.xs,
  },
  action: { marginTop: tokens.spacing.sm },
  // Metade da largura como no Figma; o card Contrato Ativo entra ao lado na Sprint 4
  row: { flexDirection: 'row', gap: tokens.spacing.md },
  tile: { flex: 1, maxWidth: '50%', gap: tokens.spacing.sm },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: '#FF940026',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.md,
  },
})
