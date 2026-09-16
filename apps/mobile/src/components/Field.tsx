// Rótulo + input do Figma. `secure` liga o botão de mostrar/ocultar senha.
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native'
import { tokens } from '@/design-system/tokens'

type Props = TextInputProps & { label: string; secure?: boolean }

export function Field({ label, secure, style, ...input }: Props) {
  const [hidden, setHidden] = useState(true)
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={tokens.colors.textMuted}
          selectionColor={tokens.colors.primary}
          autoCapitalize={secure ? 'none' : undefined}
          autoCorrect={!secure}
          secureTextEntry={secure && hidden}
          style={[styles.input, style]}
          {...input}
        />
        {secure && (
          <Pressable onPress={() => setHidden(!hidden)} hitSlop={12} accessibilityRole="button">
            <Text style={styles.toggle}>{hidden ? 'Mostrar' : 'Ocultar'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { color: tokens.colors.textSecondary, fontFamily: tokens.fonts.regular, fontSize: 13 },
  box: {
    height: 52,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: tokens.colors.textPrimary,
    fontFamily: tokens.fonts.regular,
    fontSize: 15,
  },
  toggle: { color: tokens.colors.textSecondary, fontFamily: tokens.fonts.regular, fontSize: 13 },
})
