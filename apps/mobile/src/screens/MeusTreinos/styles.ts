import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    padding: 20,
    paddingTop: 40,
    gap: 20,
  },
  header: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FAFAFA',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#A1A1AA',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tabButton: {
    flex: 1,
    backgroundColor: '#18181B',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  tabButtonActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  tabButtonText: {
    color: '#A1A1AA',
    fontWeight: '600',
    fontSize: 14,
  },
  tabButtonTextActive: {
    color: '#000000',
  },
  todayBadge: {
    position: 'absolute',
    top: -8,
    right: -4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FAFAFA',
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FAFAFA',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 12,
    color: '#A1A1AA',
  },
  startButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  startButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  exercisesList: {
    gap: 16,
    marginTop: 8,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  exerciseThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#18181B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseIcon: {
    fontSize: 24,
  },
  exerciseInfo: {
    flex: 1,
    gap: 4,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  exerciseDetails: {
    fontSize: 13,
    color: '#A1A1AA',
  },
  exerciseRest: {
    fontSize: 12,
    color: '#F59E0B',
  },
})