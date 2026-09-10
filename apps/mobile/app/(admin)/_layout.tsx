import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@/auth'

// Guarda de perfil: só ADMIN entra neste grupo.
export default function Layout() {
  const { user } = useAuth()
  if (user === undefined) return null
  if (user?.role !== 'ADMIN') return <Redirect href="/" />
  return <Stack screenOptions={{ headerShown: false }} />
}
