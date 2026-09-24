// Evolução: placeholder da Sprint 1. Resumo, Anamnese e Frequência do Figma entram na Sprint 3.
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { tokens } from '@/design-system/tokens'

export function EvolucaoScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View>
        <Text variant="title">Evolução</Text>
        <Text variant="label">Acompanhe sua jornada</Text>
      </View>
      <Card style={styles.card}>
        <Ionicons name="trending-up" size={32} color={tokens.colors.accent} />
        <Text style={styles.center}>Em breve</Text>
        <Text variant="label" style={styles.center}>
          Medidas corporais, metas do mês e calendário de frequência vão aparecer aqui.
        </Text>
      </Card>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: tokens.spacing.lg,
    backgroundColor: tokens.colors.background,
  },
  card: { alignItems: 'center', paddingVertical: tokens.spacing.xl },
  center: { textAlign: 'center' },
})
