import { forgotPasswordSchema } from '@espacofit/shared'
import { useMutation } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { z } from 'zod'
import { api } from '@/api/client'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/Button'
import { Field } from '@/components/Field'

// "Enviar Código" aqui e "Reenviar código" na tela seguinte usam a mesma rota
export async function sendResetCode(email: string) {
  const parsed = forgotPasswordSchema.safeParse({ email })
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message)
  await api('/auth/forgot-password', z.undefined(), {
    method: 'POST',
    body: parsed.data,
    auth: false,
  })
  return parsed.data.email
}

// Também é a tela "Primeiro acesso" (?primeiro=1): o código já foi no e-mail de convite, então
// ela só confere o e-mail e segue, sem pedir outro código.
export function EsqueciSenhaScreen() {
  const router = useRouter()
  const { primeiro } = useLocalSearchParams<{ primeiro?: string }>()
  const [email, setEmail] = useState('')

  const send = useMutation({
    mutationFn: async () => {
      if (!primeiro) return sendResetCode(email)
      const parsed = forgotPasswordSchema.safeParse({ email })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message)
      return parsed.data.email
    },
    onSuccess: (sent) =>
      router.push({ pathname: '/(auth)/verificar-codigo', params: { email: sent, primeiro } }),
  })

  return (
    <AuthLayout
      title={primeiro ? 'Primeiro acesso' : 'Esqueci minha senha'}
      subtitle={
        primeiro
          ? 'Digite o e-mail que você informou na academia. Na próxima tela, use o código que enviamos no convite.'
          : 'Não se preocupe! Digite o e-mail associado à sua conta e enviaremos um código de recuperação.'
      }
      error={send.error?.message}
      footer={
        <Button
          title={primeiro ? 'Continuar' : 'Enviar Código'}
          onPress={() => send.mutate()}
          disabled={!email.trim()}
          loading={send.isPending}
        />
      }
    >
      <Field
        label="E-mail"
        placeholder="Seu e-mail cadastrado"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        autoFocus
      />
    </AuthLayout>
  )
}
