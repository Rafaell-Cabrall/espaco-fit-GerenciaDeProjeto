import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@/auth'

// Guarda de perfil: só ALUNO entra neste grupo.
export default function Layout() {
  const { user } = useAuth()
  if (user === undefined) return null
  if (user?.role !== 'ALUNO') return <Redirect href="/" />
  return <Stack screenOptions={{ headerShown: false }} />
}
