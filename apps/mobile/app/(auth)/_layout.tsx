import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@/auth'

// Sessão criada (login, ou app reaberto com token válido) tira o usuário do fluxo de autenticação:
// "/" manda cada perfil para a sua home. Sem isto o login entra e a tela continua no formulário.
export default function Layout() {
  const { user } = useAuth()
  if (user) return <Redirect href="/" />
  return <Stack screenOptions={{ headerShown: false }} />
}
