import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { tokens } from '@/design-system/tokens'

// Barra inferior do Figma do aluno. Evolução e Perfil entram quando as telas existirem (Sprint 3).
export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.colors.primary,
        tabBarInactiveTintColor: tokens.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: tokens.colors.background,
          borderTopColor: tokens.colors.border,
        },
        tabBarLabelStyle: { fontFamily: tokens.fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="treinos"
        options={{
          title: 'Treinos',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
