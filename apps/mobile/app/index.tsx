// Ponto de entrada: redireciona pelo perfil do usuário logado.
import { Redirect } from 'expo-router'
import { useAuth } from '@/auth'

const home = { ALUNO: '/(aluno)', INSTRUTOR: '/(instrutor)', ADMIN: '/(admin)' } as const

export default function Index() {
  const { user } = useAuth()
  if (user === undefined) return null
  return <Redirect href={user ? home[user.role] : '/(auth)/login'} />
}
