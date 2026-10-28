// Faixa "Modo Offline" (RNF03): sem rede, com quantas escritas esperam a conexão voltar.
import { Ionicons } from '@expo/vector-icons'
import { useIsMutating } from '@tanstack/react-query'
import { StyleSheet, View } from 'react-native'
import { syncKey, useOnline } from '@/api/sync'
import { tokens } from '@/design-system/tokens'
import { Text } from './Text'

export function OfflineBanner() {
  const online = useOnline()
  const pending = useIsMutating({ mutationKey: syncKey })
  if (online) return null
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={18} color={tokens.colors.accent} />
      <View style={styles.text}>
        <Text style={styles.title}>Modo Offline</Text>
        <Text variant="caption">
          {pending
            ? `${pending} ${pending === 1 ? 'registro será enviado' : 'registros serão enviados'} quando a conexão voltar.`
            : 'Mostrando os últimos dados salvos no aparelho.'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.accent,
    backgroundColor: tokens.colors.surface,
  },
  text: { flex: 1 },
  title: { color: tokens.colors.accent, fontFamily: tokens.fonts.bold, fontSize: 13 },
})
