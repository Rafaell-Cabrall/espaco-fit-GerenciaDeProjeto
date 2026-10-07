import { InstructorTabBar } from '@/components/InstructorTabBar'
import { Tabs } from 'expo-router'
import { tokens } from '@/design-system/tokens'

// Barra inferior do Figma do instrutor: Home, Alunos, Biblioteca e Perfil. Alunos e Biblioteca
// entram aqui junto com as telas (Meus Alunos e Biblioteca de Treinos): um Tabs.Screen cada,
// na ordem do Figma, com o arquivo em app/(instrutor)/(tabs)/.
export default function Layout() {
  return (
    <Tabs
      tabBar={({ state }) => <InstructorTabBar active={state.routes[state.index]?.name === 'perfil' ? 'Perfil' : state.routes[state.index]?.name === 'alunos' ? 'Alunos' : 'Home'} />}
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
        }}
      />
      <Tabs.Screen name="alunos" options={{ title: 'Alunos' }} />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
        }}
      />
    </Tabs>
  )
}
