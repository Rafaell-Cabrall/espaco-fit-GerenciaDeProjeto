import { forgotPasswordSchema } from '@espacofit/shared'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
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

export function EsqueciSenhaScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')

  const send = useMutation({
    mutationFn: () => sendResetCode(email),
    onSuccess: (sent) =>
      router.push({ pathname: '/(auth)/verificar-codigo', params: { email: sent } }),
  })

  return (
    <AuthLayout
      title="Esqueci minha senha"
      subtitle="Não se preocupe! Digite o e-mail associado à sua conta e enviaremos um código de recuperação."
      error={send.error?.message}
      footer={
        <Button
          title="Enviar Código"
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
