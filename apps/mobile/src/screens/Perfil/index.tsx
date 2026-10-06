// Perfil (aluno e instrutor usam a mesma tela): identificação e sair. Contrato, conta, notificações e
// privacidade do Figma entram com as APIs das Sprints 3 a 5.
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/auth'
import { SairModal } from '@/components/SairModal'
import { Text } from '@/components/Text'
import { tokens } from '@/design-system/tokens'

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .filter((_, i, all) => i === 0 || i === all.length - 1)
    .join('')
    .toUpperCase()

export function PerfilScreen() {
  const { user } = useAuth()
  const [sair, setSair] = useState(false)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials(user?.name)}</Text>
        </View>
        <Text variant="title">{user?.name}</Text>
        <Text variant="label">{user?.email}</Text>
      </View>

      <Text style={styles.section}>CONTA</Text>
      <Pressable
        onPress={() => setSair(true)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <Ionicons name="log-out-outline" size={20} color={tokens.colors.error} />
        <Text style={styles.exit}>Sair da conta</Text>
      </Pressable>

      <SairModal visible={sair} onClose={() => setSair(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: tokens.spacing.md,
    backgroundColor: tokens.colors.background,
  },
  header: { alignItems: 'center', gap: 4, marginVertical: tokens.spacing.lg },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: tokens.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sm,
  },
  initials: { color: tokens.colors.onPrimary, fontFamily: tokens.fonts.bold, fontSize: 28 },
  section: {
    color: tokens.colors.textSecondary,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.xs,
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  pressed: { opacity: 0.6 },
  exit: { color: tokens.colors.error },
})
