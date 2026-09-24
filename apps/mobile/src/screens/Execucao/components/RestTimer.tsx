// Barra de descanso entre séries. Só exibe: o som ao zerar é disparado pela tela, para não
// tocar de novo se o acordeão fechar e reabrir.
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/Text'
import { tokens } from '@/design-system/tokens'

export const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

type Props = { seconds: number; startedAt: number; onStop: () => void }

export function RestTimer({ seconds, startedAt, onStop }: Props) {
  const [now, setNow] = useState(Date.now)
  const left = Math.max(0, seconds - (now - startedAt) / 1000)
  const finished = left === 0

  // Conta pelo relógio e não por tique: segundo plano atrasa o intervalo, não o horário
  useEffect(() => {
    if (finished) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [finished])

  if (finished)
    return (
      <View style={[styles.box, styles.done]}>
        <Ionicons name="checkmark-circle" size={18} color={tokens.colors.highlight} />
        <Text style={styles.doneText}>Descanso Concluído</Text>
      </View>
    )

  return (
    <View style={styles.box}>
      <Pressable
        onPress={onStop}
        accessibilityRole="button"
        accessibilityLabel="Pular descanso"
        hitSlop={8}
        style={styles.stop}
      >
        <View style={styles.stopIcon} />
      </Pressable>
      <View style={styles.bar}>
        <View style={styles.labels}>
          <Text variant="caption">Descanso entre séries</Text>
          <Text style={styles.time}>{mmss(Math.ceil(left))}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(left / seconds) * 100}%` }]} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: 10,
    borderRadius: tokens.borderRadius.full,
    borderWidth: 1,
    borderColor: '#E1FF0040',
    backgroundColor: '#E1FF000D',
  },
  done: { justifyContent: 'center' },
  doneText: {
    color: tokens.colors.highlight,
    fontFamily: tokens.fonts.semibold,
    fontSize: tokens.fontSizes.sm,
  },
  stop: {
    width: 28,
    height: 28,
    borderRadius: tokens.borderRadius.full,
    borderWidth: 1,
    borderColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: { width: 10, height: 10, borderRadius: 2, backgroundColor: tokens.colors.primary },
  bar: { flex: 1, gap: 4 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  time: {
    color: tokens.colors.highlight,
    fontFamily: tokens.fonts.bold,
    fontSize: tokens.fontSizes.sm,
  },
  track: { height: 4, borderRadius: 2, backgroundColor: tokens.colors.border, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: tokens.colors.highlight },
})
