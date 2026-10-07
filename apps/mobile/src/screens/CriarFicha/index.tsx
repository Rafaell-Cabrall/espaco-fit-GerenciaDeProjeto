import { useState } from 'react'
import { View, ScrollView, Pressable, TextInput, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Text } from '@/components/Text'
import { tokens } from '@/design-system/tokens'
import { styles } from './style'

const DAYS = [
  { key: 'SEG', label: 'Seg', weekday: 1 },
  { key: 'TER', label: 'Ter', weekday: 2 },
  { key: 'QUA', label: 'Qua', weekday: 3 },
  { key: 'QUI', label: 'Qui', weekday: 4 },
  { key: 'SEX', label: 'Sex', weekday: 5 },
  { key: 'SAB', label: 'Sáb', weekday: 6 },
  { key: 'DOM', label: 'Dom', weekday: 0 },
]

const MUSCLES = ['Peito', 'Costas', 'Bíceps', 'Tríceps', 'Ombros', 'Pernas', 'Abdômen']

export function CriarFichaScreen() {
  const router = useRouter()
  const { studentId } = useLocalSearchParams()
  
  const [planName, setPlanName] = useState('Hipertrofia - ABC')
  const [selectedDayKey, setSelectedDayKey] = useState('SEG')
  
  const [divisionsData, setDivisionsData] = useState<Record<string, { label: string; muscles: string[]; exercises: any[] }>>({
    SEG: { label: 'A', muscles: ['Peito'], exercises: [{ id: '1', exerciseId: 'default-ex-id', name: 'Supino Reto com Barra', sets: 3, reps: '12', restSeconds: 90 }] },
    TER: { label: 'B', muscles: ['Costas'], exercises: [] },
    QUA: { label: 'C', muscles: ['Pernas'], exercises: [] },
    QUI: { label: 'D', muscles: ['Ombros'], exercises: [] },
    SEX: { label: 'E', muscles: [], exercises: [] },
    SAB: { label: 'F', muscles: [], exercises: [] },
    DOM: { label: 'G', muscles: [], exercises: [] },
  })

  const currentDayConfig = DAYS.find(d => d.key === selectedDayKey) || DAYS[0]
  const currentDivision = divisionsData[selectedDayKey] || { label: 'A', muscles: [], exercises: [] }

  const createPlanMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api('/plans', {
        method: 'POST',
        body: payload,
      })
    },
    onSuccess: () => {
      Alert.alert('Sucesso', 'Ficha criada com sucesso!')
      router.back()
    },
    onError: (err: any) => {
      Alert.alert('Erro', err.message || 'Não foi possível criar a ficha.')
    }
  })

  const handleSave = () => {
    const activeDivisions = Object.entries(divisionsData)
      .filter(([_, div]) => div.muscles.length > 0 && div.exercises.length > 0)
      .map(([key, div]) => {
        const dayObj = DAYS.find(d => d.key === key)
        return {
          label: div.label,
          title: div.muscles.join(' & '),
          weekday: dayObj ? dayObj.weekday : 1,
          exercises: div.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            sets: e.sets,
            reps: e.reps,
            restSeconds: e.restSeconds,
            targetLoadKg: null,
          }))
        }
      })

    if (activeDivisions.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos uma divisão com exercícios.')
      return
    }

    const todayStr = new Date().toISOString().slice(0, 10)
    const nextMonthStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const payload = {
      studentId,
      name: planName,
      startsOn: todayStr,
      endsOn: nextMonthStr,
      divisions: activeDivisions,
    }

    createPlanMutation.mutate(payload)
  }

  const toggleMuscle = (muscle: string) => {
    const exists = currentDivision.muscles.includes(muscle)
    const updatedMuscles = exists
      ? currentDivision.muscles.filter((m) => m !== muscle)
      : [...currentDivision.muscles, muscle]
    
    setDivisionsData({
      ...divisionsData,
      [selectedDayKey]: { ...currentDivision, muscles: updatedMuscles }
    })
  }

  const handleAddExercise = () => {
    const newEx = {
      id: String(Date.now()),
      exerciseId: 'default-ex-id',
      name: 'Novo Exercício',
      sets: 3,
      reps: '10',
      restSeconds: 60,
    }
    setDivisionsData({
      ...divisionsData,
      [selectedDayKey]: {
        ...currentDivision,
        exercises: [...currentDivision.exercises, newEx]
      }
    })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={tokens.colors.textPrimary} />
          </Pressable>
          <TextInput
            style={styles.titleInput}
            value={planName}
            onChangeText={setPlanName}
            placeholder="Nome do treino..."
            placeholderTextColor={tokens.colors.textMuted}
          />
        </View>
        <Pressable 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={createPlanMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {createPlanMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekDaysScroll}>
        {DAYS.map((d) => {
          const isSelected = selectedDayKey === d.key
          return (
            <Pressable
              key={d.key}
              style={[styles.dayTab, isSelected && styles.dayTabActive]}
              onPress={() => setSelectedDayKey(d.key)}
            >
              <Text style={[styles.dayTabText, isSelected && styles.dayTabTextActive]}>
                {d.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.muscleScroll}>
        {MUSCLES.map((muscle) => {
          const isSelected = currentDivision.muscles.includes(muscle)
          return (
            <Pressable
              key={muscle}
              style={[styles.muscleChip, isSelected && styles.muscleChipSelected]}
              onPress={() => toggleMuscle(muscle)}
            >
              {isSelected && <Ionicons name="checkmark" size={12} color={tokens.colors.primary} />}
              <Text style={[styles.muscleChipText, isSelected && styles.muscleChipTextSelected]}>
                {muscle}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {currentDivision.muscles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="fitness-outline" size={32} color={tokens.colors.textMuted} />
            <Text style={styles.emptyText}>Nenhum grupo muscular selecionado para {currentDayConfig.label}.</Text>
          </View>
        ) : (
          currentDivision.muscles.map((muscle) => (
            <View key={muscle} style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{muscle}</Text>
                <Pressable onPress={() => toggleMuscle(muscle)}>
                  <Text style={styles.removeText}>Remover</Text>
                </Pressable>
              </View>

              {currentDivision.exercises.length === 0 ? (
                <Text style={styles.emptyText}>Nenhum exercício adicionado.</Text>
              ) : (
                currentDivision.exercises.map((ex: any) => (
                  <View key={ex.id} style={styles.exerciseCard}>
                    <View style={styles.exerciseTopRow}>
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      <Ionicons name="close" size={16} color={tokens.colors.textMuted} />
                    </View>

                    <View style={styles.controlsRow}>
                      <View style={styles.controlGroup}>
                        <Text style={styles.controlLabel}>Séries</Text>
                        <View style={styles.controlStepper}>
                          <Text style={styles.stepperVal}>{ex.sets}</Text>
                        </View>
                      </View>
                      <View style={styles.controlGroup}>
                        <Text style={styles.controlLabel}>Reps</Text>
                        <View style={styles.controlStepper}>
                          <Text style={styles.stepperVal}>{ex.reps}</Text>
                        </View>
                      </View>
                      <View style={styles.controlGroup}>
                        <Text style={styles.controlLabel}>Descanso</Text>
                        <View style={styles.controlStepper}>
                          <Text style={styles.stepperVal}>{ex.restSeconds}s</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}

              <Pressable style={styles.addExerciseBtn} onPress={handleAddExercise}>
                <Ionicons name="add" size={16} color={tokens.colors.primary} />
                <Text style={styles.addExerciseText}>Adicionar exercício de {muscle}</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}