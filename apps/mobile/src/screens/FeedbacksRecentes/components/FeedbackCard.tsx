import type { Feedback } from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, Pressable, View } from 'react-native'
import { Text } from '@/components/Text'
import { tokens } from '@/design-system/tokens'
import { feedbackDate, feedbackInitials } from '../format'
import { styles } from '../styles'

type Props = {
  feedback: Feedback
  busy: boolean
  disabled: boolean
  onRead: () => void
  onAdjust: () => void
}

export function FeedbackCard({ feedback, busy, disabled, onRead, onAdjust }: Props) {
  return (
    <View style={[styles.card, !feedback.read && styles.unreadCard]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${feedback.student.name}. ${feedback.exercise}. ${feedback.text}. ${feedback.read ? 'Lido' : 'Não lido'}`}
        accessibilityHint="Marca os comentários deste treino como lidos"
        accessibilityState={{ disabled: disabled || feedback.read, busy }}
        disabled={disabled || feedback.read}
        onPress={onRead}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text variant="caption" style={styles.initials}>
              {feedbackInitials(feedback.student.name)}
            </Text>
          </View>
          <View style={styles.student}>
            <Text variant="label" style={styles.name}>
              {feedback.student.name}
            </Text>
            <Text variant="caption" style={styles.subtitle}>
              {feedbackDate(feedback.finishedAt)}
            </Text>
          </View>
          {busy ? (
            <ActivityIndicator color={tokens.colors.primary} />
          ) : (
            !feedback.read && <View style={styles.dot} />
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.exercise}>
            <Ionicons name="barbell" size={13} color={tokens.colors.textSecondary} />
            <Text variant="caption" style={styles.exerciseText}>
              {feedback.exercise.toLocaleUpperCase('pt-BR')}
            </Text>
          </View>
          <Text style={styles.comment}>{feedback.text}</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ajustar treino de ${feedback.student.name}`}
        accessibilityState={{ disabled, busy }}
        disabled={disabled}
        onPress={onAdjust}
        style={({ pressed }) => [styles.action, (pressed || disabled) && styles.pressed]}
      >
        <Text variant="caption" style={styles.actionText}>
          Ajustar Treino
        </Text>
      </Pressable>
    </View>
  )
}
