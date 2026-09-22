import { useState } from 'react'
import { ScrollView, Text, View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { usePlan } from '@/hooks/usePlan'
import { useAuth } from '@/hooks/useAuth'
import { styles } from './styles'

export function MeusTreinosScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { data: plan } = usePlan(user?.id ?? '1')

  const divisions = plan?.divisions ?? [
    {
      id: 'A',
      label: 'A',
      title: 'Peito & Tríceps',
      exercises: [
        { id: 1, name: 'Supreto Reto com Barra', sets: 4, reps: '8-10 reps', rest: '80s desc.' },
        { id: 2, name: 'Supino Inclinado com Haltere', sets: 3, reps: '10-12 reps', rest: '75s desc.' },
        { id: 3, name: 'Crucifixo no Cross', sets: 3, reps: '12-15 reps', rest: '60s desc.' },
      ]
    },
    {
      id: 'B',
      label: 'B',
      title: 'Costas & Bíceps',
      exercises: [
        { id: 1, name: 'Barra Fixa (Pegada Supinada)', sets: 4, reps: '6-10 reps', rest: '90s desc.' },
        { id: 2, name: 'Remada Curvada com Barra', sets: 4, reps: '10-12 reps', rest: '75s desc.' },
        { id: 3, name: 'Rosca Direta com Barra', sets: 3, reps: '10-12 reps', rest: '60s desc.' },
      ]
    },
    {
      id: 'C',
      label: 'C',
      title: 'Pernas & Glúteos',
      exercises: [
        { id: 1, name: 'Agachamento Livre', sets: 4, reps: '8-10 reps', rest: '120s desc.' },
        { id: 2, name: 'Leg Press 45º', sets: 4, reps: '12 reps', rest: '90s desc.' },
      ]
    }
  ]

  const [selectedDivisionId, setSelectedDivisionId] = useState(
    plan?.todayDivisionId ?? divisions[0]?.id
  )

  const selectedDivision = divisions.find((d: any) => d.id === selectedDivisionId) ?? divisions[0]

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Treinos</Text>
        <Text style={styles.headerSubtitle}>Ficha atual — atualizada há 5 dias</Text>
      </View>

      {/* Seletor de Divisões (Treino A, B, C interativo) */}
      <View style={styles.tabRow}>
        {divisions.map((division: any) => {
          const isSelected = division.id === selectedDivision?.id
          const isToday = division.id === plan?.todayDivisionId

          return (
            <Pressable
              key={division.id}
              style={[styles.tabButton, isSelected && styles.tabButtonActive]}
              onPress={() => setSelectedDivisionId(division.id)}
            >
              <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextActive]}>
                Treino {division.label}
              </Text>
              {isToday && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>hoje</Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </View>

      {/* Resumo da Divisão e Botão de Iniciar */}
      {selectedDivision && (
        <View style={styles.summaryContainer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>
              Treino {selectedDivision.label} — {selectedDivision.title}
            </Text>
            <Text style={styles.summarySubtitle}>
              {selectedDivision.exercises?.length ?? 0} exercícios · Treino de hoje
            </Text>
          </View>
          <Pressable 
            style={styles.startButton}
            onPress={() => {
              router.push({
                pathname: '/(aluno)/execucao',
                params: { divisionId: selectedDivision.id }
              })
            }}
          >
            <Text style={styles.startButtonText}>Iniciar</Text>
          </Pressable>
        </View>
      )}

      {/* Lista de Exercícios Interativa */}
      <View style={styles.exercisesList}>
        {selectedDivision?.exercises?.map((exercise: any, index: number) => (
          <View key={index} style={styles.exerciseCard}>
            <View style={styles.exerciseThumbPlaceholder}>
              <Ionicons name="barbell-outline" size={24} color="#F59E0B" />
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{exercise.name ?? `Exercício #${index + 1}`}</Text>
              <Text style={styles.exerciseDetails}>
                {exercise.sets} séries · {exercise.reps}
              </Text>
              <Text style={styles.exerciseRest}>{exercise.rest}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#71717A" />
          </View>
        ))}
      </View>
    </ScrollView>
  )
}