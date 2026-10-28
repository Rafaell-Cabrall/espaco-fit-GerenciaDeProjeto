import { type Exercise, exerciseSchema, templateSchema } from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api } from '@/api/client'
import { useAuth } from '@/auth'
import { Text } from '@/components/Text'
import { styles } from './Index'

export default function BibliotecaScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const templates = useQuery({
    queryKey: ['plan-templates', user?.id],
    queryFn: () => api('/plans/templates', templateSchema.array()),
    enabled: !!user,
  })

  const exercises = useQuery({
    queryKey: ['exercises'],
    queryFn: () => api('/exercises', exerciseSchema.array()),
  })

  const q = search.trim().toLocaleLowerCase('pt-BR')

  const filteredTemplates = (templates.data ?? []).filter((t) =>
    t.name.toLocaleLowerCase('pt-BR').includes(q),
  )

  const filteredExercises = (exercises.data ?? []).filter(
    (exercise) =>
      !q ||
      exercise.name.toLocaleLowerCase('pt-BR').includes(q) ||
      exercise.muscleGroup.toLocaleLowerCase('pt-BR').includes(q),
  )

  const exercisesByGroup = filteredExercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    let group = acc[ex.muscleGroup]
    if (!group) {
      group = []
      acc[ex.muscleGroup] = group
    }
    group.push(ex)
    return acc
  }, {})

  const categories = Object.entries(exercisesByGroup).map(([group, list]) => ({
    muscleGroup: group,
    count: list.length,
    exercises: list,
  }))

  const toggleCategory = (group: string) => {
    setExpandedCategory(expandedCategory === group ? null : group)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.heading}>Biblioteca de Treinos</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar fichas ou exercícios..."
          placeholderTextColor="#888"
        />

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>MEUS TEMPLATES</Text>
          <Pressable
            accessibilityRole="button"
            style={styles.newTemplateBtn}
            onPress={() =>
              router.push({ pathname: '/(instrutor)/ficha', params: { templateOnly: 'true' } })
            }
          >
            <Ionicons name="add" size={16} color="#FF3B30" />
            <Text style={styles.newTemplateText}>Novo Template</Text>
          </Pressable>
        </View>

        {templates.isPending ? (
          <ActivityIndicator color="#FF3B30" style={{ marginVertical: 16 }} />
        ) : templates.isError ? (
          <Text style={styles.emptyText}>Não foi possível carregar os templates.</Text>
        ) : (
          <View style={styles.templateGrid}>
            {filteredTemplates.map((template) => (
              <Pressable
                key={template.id}
                accessibilityRole="button"
                style={styles.templateCard}
                onPress={() =>
                  router.push({
                    pathname: '/(instrutor)/templates/[id]',
                    params: { id: template.id },
                  })
                }
              >
                <View style={styles.templateIconBox}>
                  <Ionicons name="book" color="#FF3B30" size={20} />
                </View>
                <Text style={styles.templateTitle} numberOfLines={2}>
                  {template.name}
                </Text>
              </Pressable>
            ))}
            {!filteredTemplates.length && (
              <Text style={styles.emptyText}>Nenhum template encontrado.</Text>
            )}
          </View>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>EXERCÍCIOS POR CATEGORIA</Text>

        {exercises.isPending ? (
          <ActivityIndicator color="#FF3B30" style={{ marginVertical: 16 }} />
        ) : exercises.isError ? (
          <Text style={styles.emptyText}>Não foi possível carregar os exercícios.</Text>
        ) : (
          <View style={styles.categoriesContainer}>
            {categories.map((cat) => {
              const isExpanded = expandedCategory === cat.muscleGroup
              return (
                <View key={cat.muscleGroup} style={styles.categoryCard}>
                  <Pressable
                    style={styles.categoryHeader}
                    onPress={() => toggleCategory(cat.muscleGroup)}
                  >
                    <View style={styles.categoryTitleRow}>
                      <Text style={styles.categoryName}>{cat.muscleGroup}</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{cat.count}</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#888"
                    />
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.exerciseList}>
                      {cat.exercises.map((ex) => (
                        <View key={ex.id} style={styles.exerciseItem}>
                          <Text style={styles.exerciseItemText}>{ex.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )
            })}
            {!categories.length && (
              <Text style={styles.emptyText}>Nenhum exercício encontrado.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
