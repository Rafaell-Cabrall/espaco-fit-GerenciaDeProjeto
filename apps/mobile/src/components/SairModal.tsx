// Pop-up "Sair da conta?" do Figma do aluno. Home e Perfil abrem o mesmo.
import { Ionicons } from '@expo/vector-icons'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { useAuth } from '@/auth'
import { tokens } from '@/design-system/tokens'
import { Text } from './Text'

type Props = { visible: boolean; onClose: () => void }

export function SairModal({ visible, onClose }: Props) {
  const { logout } = useAuth()
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar">
        {/* Pressable interno segura o toque para não fechar ao tocar no cartão */}
        <Pressable style={styles.box} accessibilityViewIsModal>
          <View style={styles.titleRow}>
            <View style={styles.icon}>
              <Ionicons name="log-out-outline" size={20} color={tokens.colors.error} />
            </View>
            <Text variant="title" style={styles.title}>
              Sair da conta?
            </Text>
          </View>
          <Text variant="label" style={styles.message}>
            Tem certeza que deseja sair da conta? Você precisará fazer login novamente para acessar
            seus treinos.
          </Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onClose()
                logout()
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, styles.exit, pressed && styles.pressed]}
            >
              <Text style={styles.exitText}>Sair</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  box: {
    backgroundColor: '#000000',
    borderRadius: 20,
    padding: 20,
    gap: tokens.spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: '#2A0A0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: tokens.fontSizes.lg },
  message: { lineHeight: 20 },
  actions: { flexDirection: 'row', gap: tokens.spacing.md, marginTop: tokens.spacing.sm },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: { backgroundColor: tokens.colors.surface },
  exit: { backgroundColor: '#1F0508', borderWidth: 1, borderColor: '#5C0A12' },
  pressed: { opacity: 0.6 },
  cancelText: { fontFamily: tokens.fonts.semibold },
  exitText: { color: tokens.colors.error, fontFamily: tokens.fonts.semibold },
})
