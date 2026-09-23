import { Redirect } from 'expo-router'
import { useAuth } from '@/auth'
import { SplashScreen } from '@/screens/Splash'

const home = { ALUNO: '/(aluno)', INSTRUTOR: '/(instrutor)', ADMIN: '/(admin)' } as const

export default function Index() {
  const { user } = useAuth()
  // Sessão ainda carregando: nada na tela, para não piscar a splash para quem já está logado.
  if (user === undefined) return null
  if (user) return <Redirect href={home[user.role]} />
  return <SplashScreen />
}
