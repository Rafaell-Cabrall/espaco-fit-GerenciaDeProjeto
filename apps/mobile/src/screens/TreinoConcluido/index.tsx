// Treino concluído: a execução troca para cá (replace) ao finalizar, então voltar leva à aba de
// onde o treino começou. O feedback de esforço entra aqui na Sprint 2.
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { tokens } from '@/design-system/tokens'

type Params = { title: string; sets: string; exercises: string; minutes: string }

export function TreinoConcluidoScreen() {
  const router = useRouter()
  const { title, sets, exercises, minutes } = useLocalSearchParams<Params>()

  const stats = [
    { value: sets, label: 'séries' },
    { value: exercises, label: 'exercícios' },
    { value: minutes, label: 'minutos' },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <View style={styles.icon}>
          <Ionicons name="checkmark" size={48} color={tokens.colors.onPrimary} />
        </View>
        <Text variant="heading" style={styles.text}>
          Treino concluído!
        </Text>
        <Text variant="label" style={styles.text}>
          {title}
        </Text>

        <Card style={styles.stats}>
          {stats.map((s, i) => (
            <View key={s.label} style={[styles.stat, i > 0 && styles.divider]}>
              <Text style={styles.value}>{s.value}</Text>
              <Text variant="caption">{s.label}</Text>
            </View>
          ))}
        </Card>
      </View>

      <Button title="Voltar" onPress={() => router.back()} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: tokens.colors.background,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: tokens.spacing.md },
  icon: {
    width: 96,
    height: 96,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: tokens.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sm,
  },
  text: { textAlign: 'center' },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: tokens.spacing.lg,
    paddingVertical: 20,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  divider: { borderLeftWidth: 1, borderLeftColor: tokens.colors.border },
  value: {
    color: tokens.colors.accent,
    fontFamily: tokens.fonts.bold,
    fontSize: 28,
  },
})
