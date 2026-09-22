// "Conta Criada com Sucesso!" e "Senha atualizada!": mesmo layout, texto por rota.
import { useRouter } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/Button'
import { tokens } from '@/design-system/tokens'

export function SucessoScreen({ title, message }: { title: string; message: string }) {
  const router = useRouter()
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.circle}>
        <Text style={styles.check}>✓</Text>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.button}>
        <Button title="Ir para o Login" onPress={() => router.dismissTo('/(auth)/login')} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingBottom: 120,
  },
  circle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
    borderColor: '#2F7A12',
    backgroundColor: '#0B200B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  check: { color: tokens.colors.textPrimary, fontSize: 40, fontWeight: '300' },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 24,
    fontFamily: tokens.fonts.bold,
    textAlign: 'center',
  },
  message: {
    color: tokens.colors.textSecondary,
    fontFamily: tokens.fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 16,
  },
  button: { alignSelf: 'stretch', marginTop: 40 },
})
