import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Navy Dark (padrão de fundo do app)
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#38BDF8', // Cyan/Blue destaque
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionButtonText: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 14,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedbackCount: {
    fontSize: 12,
    color: '#38BDF8',
    fontWeight: '500',
  },
  feedbackCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  workoutName: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
  },
  comment: {
    fontSize: 13,
    color: '#CBD5E1',
    fontStyle: 'italic',
    marginBottom: 10,
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 6,
  },
  timestamp: {
    fontSize: 11,
    color: '#64748B',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeFacil: {
    backgroundColor: '#064E3B',
    color: '#34D399',
  },
  badgeModerado: {
    backgroundColor: '#78350F',
    color: '#FBBF24',
  },
  badgeDificil: {
    backgroundColor: '#7F1D1D',
    color: '#F87171',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
})