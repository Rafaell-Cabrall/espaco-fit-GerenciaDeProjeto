import { exerciseSchema, templateSchema } from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api } from '@/api/client'
import { InstructorTabBar } from '@/components/InstructorTabBar'
import { Status } from '@/components/Status'
import { Text } from '@/components/Text'
import { tokens } from '@/design-system/tokens'
import { styles } from './styles'

export default function TemplateDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const router = useRouter()

  const templateQuery = useQuery({
    queryKey: ['plan-templates'],
    queryFn: () => api('/plans/templates', templateSchema.array()),
    enabled: !!id,
  })

  const template = templateQuery.data?.find((item) => item.id === id)

  const exercisesQuery = useQuery({
    queryKey: ['exercises'],
    queryFn: () => api('/exercises', exerciseSchema.array()),
    enabled: !!template,
  })

  if (!id) {
    return (
      <Status message="Template não informado." action="Voltar" onAction={() => router.back()} />
    )
  }
  if (templateQuery.isPending) return <Status />
  if (templateQuery.isError)
    return (
      <Status
        message={templateQuery.error.message}
        action="Tentar de novo"
        onAction={templateQuery.refetch}
      />
    )

  if (!template) {
    return (
      <Status message="Template não encontrado." action="Voltar" onAction={() => router.back()} />
    )
  }

  if (exercisesQuery.isPending) return <Status />
  if (exercisesQuery.isError) {
    return (
      <Status
        message={exercisesQuery.error.message}
        action="Tentar de novo"
        onAction={exercisesQuery.refetch}
      />
    )
  }
  const exerciseNames = new Map(exercisesQuery.data.map((exercise) => [exercise.id, exercise.name]))

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Pressable
            accessibilityLabel="Voltar"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.textPrimary} />
          </Pressable>
          <Text style={styles.heading} numberOfLines={1}>
            {template.name}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={styles.saveDraftButton}
          onPress={() =>
            router.push({
              pathname: '/(instrutor)/ficha',
              params: { templateId: template.id },
            })
          }
        >
          <Ionicons name="create-outline" size={16} color="#FF3B30" style={{ marginRight: 4 }} />
          <Text style={styles.saveDraftText}>Editar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.sectionBox, { marginBottom: 16 }]}>
          <Text style={styles.controlLabel}>Template salvo</Text>
          <Text style={[styles.emptyText, { textAlign: 'left', marginTop: 4 }]}>
            Edite o nome, os treinos e os exercícios pelo botão acima.
          </Text>
        </View>

        {template.divisions.map((div, index) => (
          <View key={div.label || div.title} style={styles.sectionBox}>
            <View style={styles.groupHeader}>
              <View style={styles.groupDot} />
              <Text style={styles.sectionTitle} numberOfLines={2}>
                Treino {div.label || String.fromCharCode(65 + index)}: {div.title}
              </Text>
              <View style={styles.groupLine} />
            </View>

            {div.exercises.map((exItem, exIndex) => (
              <View key={exItem.exerciseId} style={styles.exerciseCard}>
                <View style={styles.exerciseTopRow}>
                  <Text style={styles.exerciseNumber}>{exIndex + 1}</Text>
                  <Text style={styles.exerciseName}>
                    {exerciseNames.get(exItem.exerciseId) ?? 'Exercício indisponível'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                  <Text style={styles.controlLabel}>Séries: {exItem.sets}</Text>
                  <Text style={styles.controlLabel}>Reps: {exItem.reps}</Text>
                  <Text style={styles.controlLabel}>Descanso: {exItem.restSeconds}s</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <InstructorTabBar active="Biblioteca" />
    </SafeAreaView>
  )
}
