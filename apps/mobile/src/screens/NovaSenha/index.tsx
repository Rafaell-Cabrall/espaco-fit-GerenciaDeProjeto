import { password as passwordSchema } from '@espacofit/shared'
import { useMutation } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { z } from 'zod'
import { api } from '@/api/client'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/Button'
import { Field } from '@/components/Field'
import { PasswordRules } from '@/components/PasswordRules'

export function NovaSenhaScreen() {
  const router = useRouter()
  const { email, code } = useLocalSearchParams<{ email: string; code: string }>()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = !!confirm && confirm !== password

  const reset = useMutation({
    mutationFn: () =>
      api('/auth/reset-password', z.undefined(), {
        method: 'POST',
        body: { email, code, password },
        auth: false,
      }),
    onSuccess: () => router.replace('/(auth)/senha-atualizada'),
  })

  return (
    <AuthLayout
      title="Criar nova senha"
      subtitle="Escolha uma senha forte para proteger sua conta."
      error={mismatch ? 'As senhas não coincidem' : reset.error?.message}
      footer={
        <Button
          title="Redefinir Senha"
          onPress={() => reset.mutate()}
          disabled={!passwordSchema.safeParse(password).success || confirm !== password}
          loading={reset.isPending}
        />
      }
    >
      <View style={{ gap: 12 }}>
        <Field
          label="Nova senha"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          autoFocus
        />
        <PasswordRules value={password} />
      </View>
      <Field
        label="Confirmar nova senha"
        placeholder="••••••••"
        value={confirm}
        onChangeText={setConfirm}
        secure
        autoComplete="new-password"
        textContentType="newPassword"
      />
    </AuthLayout>
  )
}
