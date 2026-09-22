import { View, Pressable, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface BottomBarProps {
  currentTab: 'home' | 'treinos' | 'evolucao' | 'perfil'
  onTabChange: (tab: 'home' | 'treinos' | 'evolucao' | 'perfil') => void
}

export function BottomBar({ currentTab, onTabChange }: BottomBarProps) {
  const tabs = [
    { name: 'Home', id: 'home', icon: 'home-outline' },
    { name: 'Treinos', id: 'treinos', icon: 'barbell-outline' },
    { name: 'Evolução', id: 'evolucao', icon: 'trending-up-outline' },
    { name: 'Perfil', id: 'perfil', icon: 'person-outline' },
  ] as const

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id
        
        return (
          <Pressable 
            key={tab.id} 
            style={styles.tabItem}
            onPress={() => onTabChange(tab.id)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={22} 
              color={isActive ? '#F59E0B' : '#A1A1AA'} 
            />
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.name}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#18181B',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabText: {
    fontSize: 10,
    color: '#A1A1AA',
    marginTop: 2,
  },
  tabTextActive: {
    color: '#F59E0B',
    fontWeight: 'bold',
  },
})