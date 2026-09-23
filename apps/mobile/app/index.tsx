import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useAuth } from '@/auth'
import { SplashScreen } from '@/screens/Splash'

const home = { ALUNO: '/(aluno)', INSTRUTOR: '/(instrutor)', ADMIN: '/(admin)' } as const

export default function Index() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Se o usuário já estiver autenticado ao abrir o app, redireciona direto para a Home do seu papel
    if (user) {
      router.replace(home[user.role] as any)
    }
  }, [user])

  // Se a sessão ainda estiver carregando, não renderiza nada para evitar piscar tela
  if (user === undefined) return null

  // Se não estiver logado, renderiza a tela Splash personalizada (Toque para continuar)
  return <SplashScreen />
}