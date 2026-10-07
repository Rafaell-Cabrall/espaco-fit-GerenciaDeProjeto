import { StyleSheet } from 'react-native'
import { tokens } from '@/design-system/tokens'

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.bold,
    fontSize: 20,
  },
  createButton: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.bold,
    fontSize: 12,
  },
  sectionTitle: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.bold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 16,
  },
  activeCard: {
    backgroundColor: tokens.colors.backgroundDark,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.bold,
    fontSize: 16,
  },
  planLabels: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#22c55e',
    fontFamily: tokens.fonts.bold,
    fontSize: 10,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: tokens.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnOutlineText: {
    color: tokens.colors.primary,
    fontFamily: tokens.fonts.bold,
    fontSize: 14,
  },
  historyCard: {
    backgroundColor: tokens.colors.backgroundDark,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.bold,
    fontSize: 14,
  },
  historyDates: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: tokens.colors.border,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusBadgeText: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.bold,
    fontSize: 10,
  },
})