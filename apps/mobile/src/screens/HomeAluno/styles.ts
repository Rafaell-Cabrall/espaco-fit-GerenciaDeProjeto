import { StyleSheet } from 'react-native'
import { tokens } from '@/design-system/tokens'

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  logout: {
    backgroundColor: tokens.colors.surface,
    padding: 10,
    borderRadius: 20,
  },

  // Streak
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.surface,
    padding: 16,
    borderRadius: 16,
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakIcon: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)', // Fundo translúcido do ícone
    padding: 8,
    borderRadius: 12,
  },
  streakDotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  streakDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.border, // Bolinha inativa
  },
  streakDotActive: {
    backgroundColor: tokens.colors.primary, // Bolinha ativa (vermelha/laranja)
  },

  // Workout do Dia
  workout: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: tokens.colors.surface,
    padding: 0,
    borderWidth: 0,
  },
  cover: {
    width: '100%',
    height: 140,
  },
  workoutBody: {
    padding: 16,
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    backgroundColor: 'rgba(0, 128, 0, 0.15)', // Fundo verde translúcido
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#4ADE80', // Verde do texto "Hoje"
    fontFamily: tokens.fonts.bold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  action: {
    marginTop: 12,
  },

  // Avisos (Sprint 3/4)
  avisoCard: {
    backgroundColor: tokens.colors.surface,
    padding: 16,
    borderRadius: 16,
    gap: 4,
  },
  avisoHeader: {
    color: tokens.colors.primary,
    fontFamily: tokens.fonts.bold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  avisoText: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  // Tiles Grid (Contrato e Histórico)
  tilesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  tileIconContrato: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileIconHistorico: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileTitle: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.bold,
    fontSize: 14,
  },
})
