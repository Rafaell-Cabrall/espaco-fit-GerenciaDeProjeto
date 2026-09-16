// Moldura das telas de cadastro e recuperação: voltar, título, subtítulo, campos, erro e rodapé.
// O rodapé (botão) fica centralizado no espaço que sobra, como no Figma.
import { useRouter } from 'expo-router'
import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { tokens } from '@/design-system/tokens'

type Props = {
  title: string
  subtitle?: ReactNode
  inlineBack?: boolean // "Criar conta" traz o voltar ao lado do título
  error?: string
  children: ReactNode
  footer: ReactNode
}

export function AuthLayout({ title, subtitle, inlineBack, error, children, footer }: Props) {
  const router = useRouter()
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={inlineBack ? styles.headerRow : styles.header}>
            <Pressable
              onPress={router.back}
              style={styles.back}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
            <View style={styles.flex}>
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          </View>
          <View style={styles.fields}>{children}</View>
          {!!error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
          <View style={styles.footer}>{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 40 },
  header: { gap: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: tokens.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  title: { color: tokens.colors.textPrimary, fontSize: 22, fontFamily: tokens.fonts.bold },
  subtitle: {
    color: tokens.colors.textSecondary,
    fontFamily: tokens.fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  fields: { gap: 20, marginTop: 36 },
  error: {
    color: tokens.colors.error,
    fontFamily: tokens.fonts.regular,
    fontSize: 13,
    marginTop: 16,
  },
  footer: { flexGrow: 1, justifyContent: 'center', gap: 24, paddingVertical: 32 },
})
