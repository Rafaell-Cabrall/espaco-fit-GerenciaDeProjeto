import { Redirect } from 'expo-router'
import { homeOf, useAuth } from '@/auth'
import { SplashScreen } from '@/screens/Splash'

export default function Index() {
  const { user } = useAuth()
  // Sessão ainda carregando: nada na tela, para não piscar a splash para quem já está logado.
  if (user === undefined) return null
  if (user) return <Redirect href={homeOf(user)} />
  return <SplashScreen />
}
