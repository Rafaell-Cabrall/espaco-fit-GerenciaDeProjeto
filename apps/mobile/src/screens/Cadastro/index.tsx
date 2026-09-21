import { authResponseSchema, registerSchema } from '@espacofit/shared'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { api } from '@/api/client'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/Button'
import { Checkbox } from '@/components/Checkbox'
import { Field } from '@/components/Field'
import { PasswordRules } from '@/components/PasswordRules'
import { styles } from './styles'

export function CadastroScreen() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [accepted, setAccepted] = useState(false)

  const register = useMutation({
    mutationFn: async () => {
      const parsed = registerSchema.safeParse({ name, email, password, acceptedTerms: accepted })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message)
      if (password !== confirm) throw new Error('As senhas não coincidem')
      // A API já devolve tokens, mas o Figma manda o aluno para o Login depois do sucesso
      await api('/auth/register', authResponseSchema, {
        method: 'POST',
        body: parsed.data,
        auth: false,
      })
    },
    onSuccess: () => router.replace('/(auth)/conta-criada'),
  })

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Preencha seus dados para começar"
      inlineBack
      error={register.error?.message}
      footer={
        <>
          <Button
            title="Criar conta"
            onPress={() => register.mutate()}
            loading={register.isPending}
          />
          <Text style={styles.login}>
            Já tenho uma conta.{'  '}
            <Text style={styles.link} onPress={() => router.dismissTo('/(auth)/login')}>
              Entrar
            </Text>
          </Text>
        </>
      }
    >
      <Field
        label="Nome completo"
        placeholder="João Silva"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
      />
      <Field
        label="E-mail"
        placeholder="joao@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <View style={styles.password}>
        <Field
          label="Senha"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete="new-password"
          textContentType="newPassword"
        />
        {!!password && <PasswordRules value={password} />}
      </View>
      <Field
        label="Confirmar senha"
        placeholder="••••••••"
        value={confirm}
        onChangeText={setConfirm}
        secure
        autoComplete="new-password"
        textContentType="newPassword"
      />
      {/* ponytail: Termos e Política sem link até existir o texto jurídico */}
      <Checkbox
        checked={accepted}
        onChange={setAccepted}
        accessibilityLabel="Li e aceito os termos de uso e a política de privacidade"
        label={
          <>
            Li e aceito os <Text style={styles.link}>Termos de Uso</Text> e a{' '}
            <Text style={styles.link}>Política de Privacidade</Text>, incluindo o tratamento de
            dados sensíveis de saúde conforme a <Text style={styles.bold}>LGPD</Text>.
          </>
        }
      />
    </AuthLayout>
  )
}
