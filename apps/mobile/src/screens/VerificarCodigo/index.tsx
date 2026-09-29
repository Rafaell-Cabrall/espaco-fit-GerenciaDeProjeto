import { useMutation } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { z } from 'zod'
import { api } from '@/api/client'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/Button'
import { sendResetCode } from '@/screens/EsqueciSenha'
import { styles } from './styles'

const RESEND_SEC = 60 // mesmo cooldown da API

export function VerificarCodigoScreen() {
  const router = useRouter()
  const { email, primeiro } = useLocalSearchParams<{ email: string; primeiro?: string }>()
  const [code, setCode] = useState('')
  // Primeiro acesso: o convite pode ter chegado há dias, então "Reenviar" já nasce liberado
  const [left, setLeft] = useState(primeiro ? 0 : RESEND_SEC)

  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft(left - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  const verify = useMutation({
    mutationFn: () =>
      api('/auth/verify-reset-code', z.undefined(), {
        method: 'POST',
        body: { email, code },
        auth: false,
      }),
    onSuccess: () => router.push({ pathname: '/(auth)/nova-senha', params: { email, code } }),
  })

  const resend = useMutation({
    mutationFn: () => sendResetCode(email),
    onSuccess: () => {
      setCode('')
      verify.reset()
      setLeft(RESEND_SEC)
    },
  })

  return (
    <AuthLayout
      title="Verifique seu e-mail"
      subtitle={
        <>
          {primeiro
            ? 'Digite o código de 6 dígitos do e-mail de convite enviado para '
            : 'Enviamos um código de 6 dígitos para '}
          <Text style={styles.strong}>{email}</Text>
        </>
      }
      error={verify.error?.message ?? resend.error?.message}
      footer={
        <Button
          title="Verificar Código"
          onPress={() => verify.mutate()}
          disabled={code.length < 6}
          loading={verify.isPending}
        />
      }
    >
      {/* Input invisível por cima das 6 caixas: teclado numérico, colar e autopreencher funcionam */}
      <View style={styles.boxes}>
        {Array.from({ length: 6 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: posições fixas
          <View key={i} style={[styles.box, !!code[i] && styles.boxFilled]}>
            <Text style={styles.digit}>{code[i]}</Text>
          </View>
        ))}
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          caretHidden
          accessibilityLabel="Código de 6 dígitos"
          style={styles.hiddenInput}
        />
      </View>
      {left > 0 ? (
        <Text style={styles.resend}>
          Reenviar código em <Text style={styles.strong}>00:{String(left).padStart(2, '0')}</Text>
        </Text>
      ) : (
        <Text
          style={[styles.resend, styles.resendLink]}
          onPress={resend.isPending ? undefined : () => resend.mutate()}
          accessibilityRole="button"
        >
          {resend.isPending ? 'Reenviando...' : 'Reenviar código'}
        </Text>
      )}
    </AuthLayout>
  )
}
