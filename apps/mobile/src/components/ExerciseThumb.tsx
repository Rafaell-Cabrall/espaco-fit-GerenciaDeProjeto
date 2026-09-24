// Miniatura do exercício (GIF da biblioteca). A URL é assinada e expira: nada de cache em disco.
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'
import { tokens } from '@/design-system/tokens'

export function ExerciseThumb({ url, size = 64 }: { url: string | null; size?: number }) {
  const box = { width: size, height: size }
  if (!url)
    return (
      <View style={[styles.thumb, styles.empty, box]}>
        <Ionicons name="barbell-outline" size={size / 2.5} color={tokens.colors.textSecondary} />
      </View>
    )
  return (
    <Image
      source={{ uri: url }}
      style={[styles.thumb, box]}
      contentFit="cover"
      cachePolicy="memory"
    />
  )
}

const styles = StyleSheet.create({
  thumb: { borderRadius: tokens.borderRadius.lg, backgroundColor: '#D9D9D9' },
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.colors.border },
})
