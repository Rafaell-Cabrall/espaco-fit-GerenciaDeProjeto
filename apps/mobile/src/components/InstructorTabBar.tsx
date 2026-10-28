import { Ionicons } from '@expo/vector-icons'
import { type RelativePathString, useRouter } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const items = [
  { label: 'Home', icon: 'home', route: '/(instrutor)/(tabs)' },
  { label: 'Alunos', icon: 'people-outline', route: '/(instrutor)/(tabs)/alunos' },
  { label: 'Biblioteca', icon: 'document-text-outline', route: '/(instrutor)/(tabs)/biblioteca' },
  { label: 'Perfil', icon: 'person', route: '/(instrutor)/(tabs)/perfil' },
] as const

export function InstructorTabBar({
  active,
  disabled = false,
  onNavigate,
}: {
  active?: string
  disabled?: boolean
  onNavigate?: () => void
}) {
  const router = useRouter()
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.row}>
        {items.map((item) => {
          const selected = active === item.label
          const color = selected ? '#E60012' : '#808080'
          return (
            <TouchableOpacity
              key={item.label}
              disabled={disabled}
              accessibilityRole="tab"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={item.label}
              style={styles.item}
              onPress={() => {
                if (item.route) {
                  onNavigate?.()
                  router.navigate(item.route as RelativePathString)
                }
              }}
            >
              {selected && <View style={styles.indicator} />}
              <Ionicons name={item.icon} size={22} color={color} />
              <Text style={[styles.label, { color }]}>{item.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#0E0E0E', borderTopWidth: 1, borderTopColor: '#292929' },
  row: { flexDirection: 'row' },
  item: {
    flex: 1,
    minHeight: 54,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10 },
  indicator: { position: 'absolute', top: 0, width: 22, height: 2, backgroundColor: '#E60012' },
})
