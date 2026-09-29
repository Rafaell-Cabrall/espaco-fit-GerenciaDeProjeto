import { Redirect, Stack } from 'expo-router'
import { homeOf, useAuth } from '@/auth'

// Sessão criada (login, ou app reaberto com token válido) tira o usuário do fluxo de autenticação
// direto para a home do perfil. Sem isto o login entra e a tela continua no formulário.
export default function Layout() {
  const { user } = useAuth()
  if (user) return <Redirect href={homeOf(user)} />
  return <Stack screenOptions={{ headerShown: false }} />
}
