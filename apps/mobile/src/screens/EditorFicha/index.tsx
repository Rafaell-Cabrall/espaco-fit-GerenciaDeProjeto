import { useState, useEffect } from 'react'
import { View, ScrollView, Pressable, TextInput, Alert, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/api/client'
import { Text } from '@/components/Text'
import { Status } from '@/components/Status'
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

export function EditarFichaScreen() {
  const router = useRouter()
  const { planId } = useLocalSearchParams()
  
  const [planName, setPlanName] = useState('')
  const [selectedDayKey, setSelectedDayKey] = useState('SEG')
  const [notifyStudent, setNotifyStudent] = useState(true)
  
  const [divisionsData, setDivisionsData] = useState<Record<string, { label: string; muscles: string[]; exercises: any[] }>>({
    SEG: { label: 'A', muscles: [], exercises: [] },
    TER: { label: 'B', muscles: [], exercises: [] },
    QUA: { label: 'C', muscles: [], exercises: [] },
    QUI: { label: 'D', muscles: [], exercises: [] },
    SEX: { label: 'E', muscles: [], exercises: [] },
    SAB: { label: 'F', muscles: [], exercises: [] },
    DOM: { label: 'G', muscles: [], exercises: [] },
  })

  const planQuery = useQuery({
    queryKey: ['plan', planId],
    queryFn: () => api(`/plans/${planId}`, {} as any),
    enabled: !!planId,
  })

  useEffect(() => {
    if (planQuery.data) {
      const plan = planQuery.data
      setPlanName(plan.name)
      
      const newDivs: any = {
        SEG: { label: 'A', muscles: [], exercises: [] },
        TER: { label: 'B', muscles: [], exercises: [] },
        QUA: { label: 'C', muscles: [], exercises: [] },
        QUI: { label: 'D', muscles: [], exercises: [] },
        SEX: { label: 'E', muscles: [], exercises: [] },
        SAB: { label: 'F', muscles: [], exercises: [] },
        DOM: { label: 'G', muscles: [], exercises: [] },
      }

      plan.divisions.forEach((d: any) => {
        const dayMatch = DAYS.find(day => day.weekday === d.weekday)
        if (dayMatch) {
          newDivs[dayMatch.key] = {
            label: d.label,
            muscles: d.title ? d.title.split(' & ') : [],
            exercises: d.exercises.map((e: any) => ({
              id: e.id,
              exerciseId: e.exercise.id,
              name: e.exercise.name,
              sets: e.sets,
              reps: e.reps,
              restSeconds: e.restSeconds,
              targetLoadKg: e.targetLoadKg || 0,
            }))
          }
        }
      })
      setDivisionsData(newDivs)
    }
  }, [planQuery.data])

  const prepareDivisionsPayload = () => {
    return Object.entries(divisionsData)
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
            targetLoadKg: e.targetLoadKg > 0 ? e.targetLoadKg : null,
          }))
        }
      })
  }

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => api(`/plans/${planId}`, { method: 'PUT', body: payload }),
    onSuccess: () => Alert.alert('Sucesso', 'Rascunho atualizado!'),
    onError: (err: any) => Alert.alert('Erro', err.message || 'Erro ao salvar rascunho.')
  })

  const publishMutation = useMutation({
    mutationFn: async () => api(`/plans/${planId}/publish`, { method: 'POST', body: { notify: notifyStudent } }),
    onSuccess: () => {
      Alert.alert('Publicado', 'A ficha está agora ativa para o aluno!')
      router.back()
    },
    onError: (err: any) => {
      if (err.message?.toLowerCase().includes('anamnese')) {
        Alert.alert('Publicação Bloqueada', 'O aluno ainda não tem anamnese preenchida.')
      } else {
        Alert.alert('Erro', err.message || 'Erro ao publicar a ficha.')
      }
    }
  })

  const templateMutation = useMutation({
    mutationFn: async (payload: any) => api('/plans/templates', { method: 'POST', body: payload }),
    onSuccess: () => Alert.alert('Sucesso', 'Ficha salva na sua Biblioteca de Modelos!'),
    onError: (err: any) => Alert.alert('Erro', err.message || 'Erro ao salvar modelo.')
  })

  const handleSaveDraft = () => {
    const activeDivisions = prepareDivisionsPayload()
    if (activeDivisions.length === 0) return Alert.alert('Atenção', 'Adicione exercícios antes de salvar.')
    
    updateMutation.mutate({
      name: planName,
      startsOn: new Date().toISOString().slice(0, 10),
      endsOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      divisions: activeDivisions,
    })
  }

  const handlePublish = async () => {
    const activeDivisions = prepareDivisionsPayload()
    if (activeDivisions.length === 0) return Alert.alert('Atenção', 'A ficha precisa de exercícios para ser publicada.')
    
    try {
      await updateMutation.mutateAsync({
        name: planName,
        startsOn: new Date().toISOString().slice(0, 10),
        endsOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        divisions: activeDivisions,
      })
      publishMutation.mutate()
    } catch (error) {
      console.log('Update falhou antes de publicar')
    }
  }

  const handleSaveAsTemplate = () => {
    const activeDivisions = prepareDivisionsPayload()
    if (activeDivisions.length === 0) return Alert.alert('Atenção', 'A ficha está vazia.')
    
    templateMutation.mutate({
      name: planName,
      divisions: activeDivisions,
    })
  }

  const toggleMuscle = (muscle: string) => {
    const currentDivision = divisionsData[selectedDayKey]
    const exists = currentDivision.muscles.includes(muscle)
    const updatedMuscles = exists
      ? currentDivision.muscles.filter((m) => m !== muscle)
      : [...currentDivision.muscles, muscle]
    
    setDivisionsData({
      ...divisionsData,
      [selectedDayKey]: { ...currentDivision, muscles: updatedMuscles }
    })
  }

  const handleOpenLibrary = () => {
    const newEx = {
      id: String(Date.now()),
      exerciseId: 'id-da-biblioteca',
      name: 'Exercício Selecionado (Mock)',
      sets: 3,
      reps: '10',
      restSeconds: 60,
      targetLoadKg: 0,
    }
    const currentDivision = divisionsData[selectedDayKey]
    setDivisionsData({
      ...divisionsData,
      [selectedDayKey]: { ...currentDivision, exercises: [...currentDivision.exercises, newEx] }
    })
  }

  const currentDayConfig = DAYS.find(d => d.key === selectedDayKey) || DAYS[0]
  const currentDivision = divisionsData[selectedDayKey] || { label: 'A', muscles: [], exercises: [] }

  if (planQuery.isPending) return <Status />

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
            placeholder="Nome da ficha..."
            placeholderTextColor={tokens.colors.textMuted}
          />
        </View>
        <Pressable style={styles.saveDraftButton} onPress={handleSaveDraft} disabled={updateMutation.isPending}>
          <Text style={styles.saveDraftText}>Salvar</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekDaysScroll}>
        {DAYS.map((d) => {
          const isSelected = selectedDayKey === d.key
          return (
            <Pressable key={d.key} style={[styles.dayTab, isSelected && styles.dayTabActive]} onPress={() => setSelectedDayKey(d.key)}>
              <Text style={[styles.dayTabText, isSelected && styles.dayTabTextActive]}>{d.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.muscleScroll}>
        {MUSCLES.map((muscle) => {
          const isSelected = currentDivision.muscles.includes(muscle)
          return (
            <Pressable key={muscle} style={[styles.muscleChip, isSelected && styles.muscleChipSelected]} onPress={() => toggleMuscle(muscle)}>
              {isSelected && <Ionicons name="checkmark" size={12} color={tokens.colors.primary} />}
              <Text style={[styles.muscleChipText, isSelected && styles.muscleChipTextSelected]}>{muscle}</Text>
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
                      <Text style={styles.exerciseName} numberOfLines={1}>{ex.name}</Text>
                      <Ionicons name="close" size={16} color={tokens.colors.textMuted} />
                    </View>

                    <View style={styles.controlsGrid}>
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
                      <View style={styles.controlGroup}>
                        <Text style={styles.controlLabel}>Carga (kg)</Text>
                        <View style={styles.controlStepper}>
                          <Text style={styles.stepperVal}>{ex.targetLoadKg}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}

              <Pressable style={styles.addExerciseBtn} onPress={handleOpenLibrary}>
                <Ionicons name="search" size={16} color={tokens.colors.primary} />
                <Text style={styles.addExerciseText}>Buscar exercício na biblioteca</Text>
              </Pressable>
            </View>
          ))
        )}

        <View style={styles.publishSection}>
          <View style={styles.notifyRow}>
            <Text style={styles.notifyText}>Notificar aluno</Text>
            <Switch
              value={notifyStudent}
              onValueChange={setNotifyStudent}
              trackColor={{ false: tokens.colors.backgroundDark, true: tokens.colors.primary }}
              thumbColor={tokens.colors.textPrimary}
            />
          </View>
          
          <Pressable style={styles.btnPrimary} onPress={handlePublish} disabled={publishMutation.isPending}>
            <Text style={styles.btnPrimaryText}>{publishMutation.isPending ? 'Publicando...' : 'Publicar Ficha'}</Text>
          </Pressable>

          <Pressable style={styles.btnSecondary} onPress={handleSaveAsTemplate} disabled={templateMutation.isPending}>
            <Text style={styles.btnSecondaryText}>Salvar como Modelo</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}