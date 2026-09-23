// Abas do Figma: "Treino A/B/C" em Meus Treinos e as seções da Evolução.
// `badge` marca a aba do treino de hoje (RN08). Rola na horizontal porque uma ficha pode ter
// mais divisões do que cabe na tela.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { tokens } from '@/design-system/tokens'

type Item<T extends string> = { id: T; label: string; badge?: string }

type Props<T extends string> = {
  items: Item<T>[]
  value: T
  onChange: (id: T) => void
}

export function Tabs<T extends string>({ items, value, onChange }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((item) => {
        const selected = item.id === value
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(item.id)}
            style={[styles.tab, selected && styles.tabSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{item.label}</Text>
            {!!item.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.spacing.sm, paddingVertical: tokens.spacing.xs },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    height: 40,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.borderRadius.full,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  tabSelected: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
  label: {
    color: tokens.colors.textSecondary,
    fontFamily: tokens.fonts.medium,
    fontSize: tokens.fontSizes.sm,
  },
  labelSelected: { color: tokens.colors.textPrimary, fontFamily: tokens.fonts.bold },
  badge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.full,
    backgroundColor: tokens.colors.background,
  },
  badgeText: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.medium,
    fontSize: tokens.fontSizes.xs,
  },
})
