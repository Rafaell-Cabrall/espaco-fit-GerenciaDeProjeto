import { planSchema, type Session } from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { api } from '@/api/client'

export function DetalhesTreino({ session, studentId }: { session: Session; studentId: string }) {
  const router = useRouter()
  const plan = useQuery({
    queryKey: ['plan', session.division.planId],
    queryFn: () => api(`/plans/${encodeURIComponent(session.division.planId)}`, planSchema),
  })
  const division = plan.data?.divisions.find((item) => item.id === session.divisionId)
  return (
    <View style={styles.details}>
      {plan.isPending ? (
        <ActivityIndicator color="#FF3B30" />
      ) : plan.isError ? (
        <TouchableOpacity accessibilityRole="button" onPress={() => void plan.refetch()}>
          <Text style={styles.muted}>
            Não foi possível carregar os exercícios. Toque para tentar novamente.
          </Text>
        </TouchableOpacity>
      ) : !division ? (
        <Text style={styles.muted}>
          Os exercícios deste treino não estão mais disponíveis na ficha.
        </Text>
      ) : (
        [...division.exercises]
          .sort((a, b) => a.order - b.order)
          .map((item) => {
            const logged = new Set(
              session.sets
                .filter((set) => set.divisionExerciseId === item.id)
                .map((set) => set.setNumber),
            ).size
            const complete = logged >= item.sets
            const note = session.notes.find((note) => note.divisionExerciseId === item.id)
            return (
              <View key={item.id} style={styles.exercise}>
                <View style={styles.row}>
                  <View
                    accessibilityLabel={
                      complete ? 'Exercício concluído' : 'Exercício não concluído'
                    }
                    style={[styles.icon, !complete && styles.incompleteIcon]}
                  >
                    <Ionicons
                      name={complete ? 'checkmark' : 'close'}
                      size={16}
                      color={complete ? '#21C55D' : '#FF3B30'}
                    />
                  </View>
                  <Text style={[styles.name, !complete && styles.incompleteName]}>
                    {item.exercise.name}
                  </Text>
                </View>
                {note ? (
                  <View style={styles.note}>
                    <Text style={styles.noteText}>{note.text}</Text>
                  </View>
                ) : (
                  <Text style={styles.series}>
                    {logged}/{item.sets} séries registradas · Sem comentário.
                  </Text>
                )}
              </View>
            )
          })
      )}
      <View style={styles.footer}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Ajustar ficha do treino ${session.division.label}`}
          style={styles.adjust}
          onPress={() =>
            router.push({
              pathname: '/(instrutor)/ficha',
              params: { studentId, planId: session.division.planId },
            })
          }
        >
          <Text style={styles.adjustText}>Ajustar Ficha</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  details: { borderTopWidth: 1, borderTopColor: '#292929' },
  exercise: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#292929', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#173B27',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incompleteIcon: { backgroundColor: '#4A1D1B' },
  name: { flex: 1, color: '#fff', fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium' },
  incompleteName: { color: '#777', textDecorationLine: 'line-through' },
  note: {
    marginLeft: 34,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#292929',
    borderWidth: 1,
    borderColor: '#303030',
  },
  noteText: { color: '#bbb', fontSize: 11, lineHeight: 17, fontFamily: 'SpaceGrotesk_400Regular' },
  series: { marginLeft: 34, color: '#888', fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
  muted: { padding: 14, color: '#999', fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },
  footer: { padding: 14 },
  adjust: {
    padding: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#68231D',
    backgroundColor: '#3A201E',
    alignItems: 'center',
  },
  adjustText: { color: '#FF3B30', fontSize: 12, fontFamily: 'SpaceGrotesk_500Medium' },
})
