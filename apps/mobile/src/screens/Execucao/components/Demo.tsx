// Demonstração do exercício: GIF da biblioteca (RNF06) e o texto de execução correta.

import type { Exercise } from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/Text'
import { tokens } from '@/design-system/tokens'

export function Demo({ exercise, onClose }: { exercise?: Exercise; onClose: () => void }) {
  return (
    <Modal visible={!!exercise} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar">
        {exercise && (
          <Pressable style={styles.sheet}>
            {exercise.mediaUrl ? (
              <Image
                source={{ uri: exercise.mediaUrl }}
                style={styles.media}
                contentFit="contain"
              />
            ) : (
              <View style={[styles.media, styles.empty]}>
                <Ionicons name="barbell-outline" size={48} color={tokens.colors.textMuted} />
              </View>
            )}
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar demonstração"
              hitSlop={8}
              style={styles.close}
            >
              <Ionicons name="close" size={20} color={tokens.colors.textPrimary} />
            </Pressable>
            <View style={styles.body}>
              <Text style={styles.name}>{exercise.name}</Text>
              {exercise.description && <Text variant="label">{exercise.description}</Text>}
            </View>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', backgroundColor: '#000000CC' },
  sheet: { backgroundColor: tokens.colors.surface },
  media: { width: '100%', aspectRatio: 1, backgroundColor: '#FFFFFF' },
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.colors.border },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: tokens.borderRadius.md,
    backgroundColor: '#1C1C1CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 20, gap: tokens.spacing.sm },
  name: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.bold,
    fontSize: tokens.fontSizes.lg,
  },
})
