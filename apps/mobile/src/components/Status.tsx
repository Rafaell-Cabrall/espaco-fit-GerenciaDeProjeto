// Tela inteira de espera, erro ou vazio. Sem `message` mostra só o carregando.
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { tokens } from '@/design-system/tokens'
import { Button } from './Button'
import { Text } from './Text'

type Props = { message?: string; action?: string; onAction?: () => void; loading?: boolean }

export function Status({ message, action, onAction, loading }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      {message === undefined ? (
        <ActivityIndicator color={tokens.colors.primary} />
      ) : (
        <View style={styles.box}>
          <Text style={styles.message}>{message}</Text>
          {action && onAction && <Button title={action} onPress={onAction} loading={loading} />}
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: tokens.colors.background,
  },
  box: { gap: tokens.spacing.lg },
  message: { color: tokens.colors.textSecondary, textAlign: 'center' },
})
