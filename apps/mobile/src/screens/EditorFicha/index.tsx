// Editor de ficha do instrutor (RU01/RN04). Sem planId cria um rascunho para o studentId. Com
// planId carrega a ficha: rascunho é editado no lugar (PUT); ficha ativa ou expirada vira uma ficha
// nova copiada (POST), porque a API só edita rascunho.
import {
  createPlanSchema,
  type Exercise,
  exerciseSchema,
  MuscleGroup,
  type Plan,
  planSchema,
  studentLinkSchema,
  type Template,
  templateSchema,
} from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { z } from 'zod'
import { api } from '@/api/client'
import { useAuth } from '@/auth'
import { InstructorTabBar } from '@/components/InstructorTabBar'
import { Status } from '@/components/Status'
import { Text } from '@/components/Text'
import { tokens } from '@/design-system/tokens'
import { maskDate } from '../NovoAluno/form'
import { styles } from './style'

// Dia da semana é só rótulo (0 = domingo, igual a Date.getDay()).
const DAYS = [
  { label: 'Seg', weekday: 1 },
  { label: 'Ter', weekday: 2 },
  { label: 'Qua', weekday: 3 },
  { label: 'Qui', weekday: 4 },
  { label: 'Sex', weekday: 5 },
  { label: 'Sáb', weekday: 6 },
  { label: 'Dom', weekday: 0 },
]
const LABELS = 'ABCDEFG'
const MAX_DIVISIONS = LABELS.length

type Item = {
  key: string
  exercise: Exercise
  sets: string
  reps: string
  restSeconds: string
  targetLoadKg: string
}
type Div = { key: string; muscles: string[]; weekday: number | null; exercises: Item[] }

let seq = 0
const newKey = () => String(++seq)
const pad = (n: number) => String(n).padStart(2, '0')
const localIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toBr = (iso: string) => iso.split('-').reverse().join('/')
const toIso = (br: string) => br.split('/').reverse().join('-')
const inDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return localIso(d)
}

const emptyDivision = (weekday: number | null = null): Div => ({
  key: newKey(),
  muscles: [],
  weekday,
  exercises: [],
})
const toItem = (
  exercise: Exercise,
  e?: { sets: number; reps: string; restSeconds: number; targetLoadKg: number | null },
): Item => ({
  key: newKey(),
  exercise,
  sets: String(e?.sets ?? 3),
  reps: e?.reps ?? '12',
  restSeconds: String(e?.restSeconds ?? 60),
  targetLoadKg: e?.targetLoadKg == null ? '' : String(e.targetLoadKg),
})
const fromPlan = (plan: Plan): Div[] =>
  plan.divisions.map((d) => ({
    key: newKey(),
    muscles: [
      ...new Set([
        ...d.title.split(' & ').filter(Boolean),
        ...d.exercises.map((e) => e.exercise.muscleGroup),
      ]),
    ],
    weekday: d.weekday,
    exercises: d.exercises.map((e) => toItem(e.exercise, e)),
  }))

export function EditorFichaScreen() {
  const { studentId = '', planId } = useLocalSearchParams<{ studentId?: string; planId?: string }>()
  const source = useQuery({
    queryKey: ['plan', planId],
    queryFn: () => api(`/plans/${planId}`, planSchema),
    enabled: !!planId,
  })

  if (!studentId) return <Status message="Abra a ficha pela tela do aluno." />
  if (planId && source.isPending) return <Status />
  if (planId && source.isError)
    return (
      <Status message={source.error.message} action="Tentar de novo" onAction={source.refetch} />
    )
  return (
    <Editor key={`${studentId}:${planId ?? 'new'}`} studentId={studentId} source={source.data} />
  )
}

function Editor({ studentId, source }: { studentId: string; source?: Plan }) {
  const router = useRouter()
  const cache = useQueryClient()
  const { user } = useAuth()
  const [building, setBuilding] = useState(!!source)
  const [method, setMethod] = useState<'library' | 'scratch'>('scratch')
  const [templateSearch, setTemplateSearch] = useState('')
  const [importError, setImportError] = useState('')
  const templates = useQuery({
    queryKey: ['plan-templates', user?.id],
    queryFn: () => api('/plans/templates', z.array(templateSchema)),
    enabled: !building,
  })
  const students = useQuery({
    queryKey: ['instructor-home', user?.id, 'students'],
    queryFn: () => api('/links', z.array(studentLinkSchema)),
  })
  const student = students.data?.find((link) => link.student.id === studentId)?.student
  const isDraft = source?.status === 'DRAFT'
  // Rascunho que este editor grava. Ficha ativa ou expirada ganha um rascunho novo no 1º salvar.
  const [draftId, setDraftId] = useState(isDraft ? source.id : null)
  const [name, setName] = useState(source?.name ?? '')
  const [startsOn, setStartsOn] = useState(toBr(isDraft ? source.startsOn : localIso(new Date())))
  const [endsOn, setEndsOn] = useState(toBr(isDraft ? source.endsOn : inDays(90)))
  const [divisions, setDivisions] = useState<Div[]>(() =>
    source ? fromPlan(source) : DAYS.map((day) => emptyDivision(day.weekday)),
  )
  const [selected, setSelected] = useState(0)
  const [notify, setNotify] = useState(true)
  const [picking, setPicking] = useState(false)
  const [pickingMuscle, setPickingMuscle] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const exercises = useQuery({
    queryKey: ['exercises'],
    queryFn: () => api('/exercises', z.array(exerciseSchema)),
  })

  const division = divisions[selected] ?? emptyDivision()
  const label = LABELS[selected] ?? ''
  const updateDivision = (patch: Partial<Div>) =>
    setDivisions((all) => all.map((d, i) => (i === selected ? { ...d, ...patch } : d)))
  const updateItem = (key: string, patch: Partial<Item>) =>
    updateDivision({
      exercises: division.exercises.map((e) => (e.key === key ? { ...e, ...patch } : e)),
    })
  const removeMuscle = (muscle: string) => {
    const remove = () =>
      updateDivision({
        muscles: division.muscles.filter((m) => m !== muscle),
        exercises: division.exercises.filter((item) => item.exercise.muscleGroup !== muscle),
      })
    if (division.exercises.some((item) => item.exercise.muscleGroup === muscle)) {
      Alert.alert(
        'Remover grupo?',
        `Os exercícios de ${muscle} deste dia também serão removidos.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Remover', style: 'destructive', onPress: remove },
        ],
      )
    } else remove()
  }
  const toggleMuscle = (muscle: string) => {
    if (division.muscles.includes(muscle)) removeMuscle(muscle)
    else updateDivision({ muscles: [...division.muscles, muscle] })
  }
  const openPicker = (muscle: string | null) => {
    setPickingMuscle(muscle)
    setSearch('')
    setPicking(true)
  }

  // Valida no app com o mesmo contrato da API, com mensagens que dizem qual treino corrigir
  const parse = () => {
    const populated = divisions.filter((d) => d.exercises.length || d.muscles.length)
    if (!populated.length) return 'Adicione pelo menos um exercício à ficha.'
    for (const [i, d] of populated.entries()) {
      if (!d.muscles.length) return `Escolha os grupos musculares do Treino ${LABELS[i]}.`
      if (!d.exercises.length) return `Adicione exercícios ao Treino ${LABELS[i]}.`
    }
    const result = createPlanSchema.safeParse({
      studentId,
      name,
      startsOn: toIso(startsOn),
      endsOn: toIso(endsOn),
      divisions: populated.map((d, i) => ({
        label: LABELS[i],
        title: d.muscles.join(' & '),
        weekday: d.weekday,
        exercises: d.exercises.map((e) => ({
          exerciseId: e.exercise.id,
          sets: Number(e.sets),
          reps: e.reps.trim(),
          restSeconds: Number(e.restSeconds),
          targetLoadKg: e.targetLoadKg.trim() ? Number(e.targetLoadKg.replace(',', '.')) : null,
        })),
      })),
    })
    if (result.success) return result.data
    const issue = result.error.issues[0]
    // path = ['divisions', i, 'exercises', j, campo]
    const [, i, , j, field] = issue?.path ?? []
    if (typeof i === 'number' && typeof j === 'number') {
      const what = { sets: 'séries', reps: 'repetições', restSeconds: 'descanso' }[String(field)]
      return `Treino ${LABELS[i]}, exercício ${j + 1}: confira ${what ?? 'a carga'}. ${issue?.message ?? ''}`
    }
    return issue?.message ?? 'Confira os dados da ficha.'
  }

  const fail = (title: string, cause: unknown) =>
    Alert.alert(title, cause instanceof Error ? cause.message : 'Tente de novo.')

  const save = async () => {
    if (busy) return null
    const data = parse()
    if (typeof data === 'string') {
      Alert.alert('Confira a ficha', data)
      return null
    }
    const { studentId: _, ...body } = data
    setBusy(true)
    try {
      const plan = draftId
        ? await api(`/plans/${draftId}`, planSchema, { method: 'PUT', body })
        : await api('/plans', planSchema, { method: 'POST', body: data })
      setDraftId(plan.id)
      void cache.invalidateQueries({ queryKey: ['instructor-plans'] })
      return plan.id
    } catch (cause) {
      fail('Não foi possível salvar', cause)
      return null
    } finally {
      setBusy(false)
    }
  }

  const saveDraft = async () => {
    if (await save()) Alert.alert('Rascunho salvo', 'O aluno só vê a ficha depois de publicada.')
  }

  const publish = async () => {
    const id = await save()
    if (!id) return
    setBusy(true)
    try {
      await api(`/plans/${id}/publish`, planSchema, { method: 'POST', body: { notify } })
      void cache.invalidateQueries({ queryKey: ['instructor-plans'] })
      Alert.alert('Ficha publicada', 'A ficha já está ativa para o aluno.')
      router.back()
    } catch (cause) {
      fail('Não foi possível publicar', cause)
    } finally {
      setBusy(false)
    }
  }

  const saveTemplate = async () => {
    const data = parse()
    if (typeof data === 'string') return Alert.alert('Confira a ficha', data)
    setBusy(true)
    try {
      await api('/plans/templates', templateSchema, {
        method: 'POST',
        body: { name: data.name, divisions: data.divisions },
      })
      void cache.invalidateQueries({ queryKey: ['plan-templates'] })
      Alert.alert('Modelo salvo', 'A ficha foi para a sua biblioteca de modelos.')
    } catch (cause) {
      fail('Não foi possível salvar o modelo', cause)
    } finally {
      setBusy(false)
    }
  }

  const q = search.trim().toLocaleLowerCase('pt-BR')
  // Ao abrir por um grupo, a busca permanece dentro desse grupo muscular.
  const library = (exercises.data ?? []).filter(
    (ex) =>
      (!pickingMuscle || ex.muscleGroup === pickingMuscle) &&
      (!q || ex.name.toLocaleLowerCase('pt-BR').includes(q)),
  )
  const chips = [...new Set([...MuscleGroup.options, ...division.muscles])]

  const importTemplate = (template: Template) => {
    const available = new Map(exercises.data?.map((exercise) => [exercise.id, exercise]))
    if (template.divisions.some((d) => d.exercises.some((e) => !available.has(e.exerciseId)))) {
      setImportError('Este modelo contém exercícios indisponíveis. Escolha outro modelo.')
      return
    }
    setDivisions(
      template.divisions.map((d) => ({
        key: newKey(),
        muscles: [
          ...new Set([
            ...d.title.split(' & ').filter(Boolean),
            ...d.exercises.flatMap((e) => {
              const exercise = available.get(e.exerciseId)
              return exercise ? [exercise.muscleGroup] : []
            }),
          ]),
        ],
        weekday: d.weekday ?? null,
        exercises: d.exercises.flatMap((e) => {
          const exercise = available.get(e.exerciseId)
          return exercise
            ? [
                toItem(exercise, {
                  ...e,
                  restSeconds: e.restSeconds ?? 60,
                  targetLoadKg: e.targetLoadKg ?? null,
                }),
              ]
            : []
        }),
      })),
    )
    setName(template.name)
    setSelected(0)
    setBuilding(true)
  }

  if (!building)
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Voltar"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <View style={styles.flex}>
            <Text style={styles.heading}>Nova Ficha de Treino</Text>
            <Text style={styles.subtitle}>{student?.name || 'Nova ficha'}</Text>
          </View>
        </View>
        <View style={styles.steps}>
          <Text style={styles.stepActive}>❶ Ponto de Partida</Text>
          <View style={styles.stepLine} />
          <Text style={styles.subtitle}>② Montar Treino</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={styles.introTitle}>Como deseja criar?</Text>
            <Text style={styles.subtitle}>Escolha o ponto de partida</Text>
          </View>
          <View style={styles.methodRow}>
            {(
              [
                [
                  'library',
                  'Importar da Biblioteca',
                  'Use um template existente como base',
                  'briefcase-outline',
                ],
                [
                  'scratch',
                  'Criar do Zero',
                  'Monte exercício por exercício, dia a dia',
                  'document-outline',
                ],
              ] as const
            ).map(([value, title, description, icon]) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: method === value }}
                style={[styles.methodCard, method === value && styles.methodSelected]}
                onPress={() => setMethod(value)}
              >
                <View style={[styles.methodIcon, method !== value && styles.methodIconInactive]}>
                  <Ionicons name={icon} size={22} color={method === value ? '#FF3B30' : '#666'} />
                </View>
                <Text style={[styles.methodTitle, method !== value && styles.methodTitleInactive]}>
                  {title}
                </Text>
                <Text style={styles.subtitle}>{description}</Text>
                {method === value && (
                  <Ionicons
                    style={styles.methodCheck}
                    name="checkmark-circle"
                    size={22}
                    color="#FF3B30"
                  />
                )}
              </Pressable>
            ))}
          </View>
          {method === 'library' && (
            <>
              <TextInput
                accessibilityLabel="Buscar pasta ou ficha"
                style={styles.search}
                value={templateSearch}
                onChangeText={setTemplateSearch}
                placeholder="Buscar pasta ou ficha..."
                placeholderTextColor="#888"
              />
              {templates.isPending ? (
                <ActivityIndicator color="#FF3B30" />
              ) : templates.isError ? (
                <Pressable onPress={() => void templates.refetch()}>
                  <Text style={styles.emptyText}>
                    Não foi possível carregar os modelos. Toque para tentar novamente.
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.templateGrid}>
                  {templates.data
                    .filter((t) =>
                      t.name
                        .toLocaleLowerCase('pt-BR')
                        .includes(templateSearch.trim().toLocaleLowerCase('pt-BR')),
                    )
                    .map((template) => (
                      <Pressable
                        key={template.id}
                        style={styles.templateCard}
                        disabled={!exercises.isSuccess}
                        onPress={() => importTemplate(template)}
                      >
                        <View style={styles.methodIcon}>
                          <Ionicons name="book" color="#FF3B30" size={22} />
                        </View>
                        <Text style={styles.methodTitle}>{template.name}</Text>
                      </Pressable>
                    ))}
                  {!templates.data.length && (
                    <Text style={styles.emptyText}>
                      Sua biblioteca ainda não tem modelos. Comece criando do zero.
                    </Text>
                  )}
                  {!!templates.data.length &&
                    !templates.data.some((t) =>
                      t.name
                        .toLocaleLowerCase('pt-BR')
                        .includes(templateSearch.trim().toLocaleLowerCase('pt-BR')),
                    ) && <Text style={styles.emptyText}>Nenhum modelo encontrado.</Text>}
                </View>
              )}
              {exercises.isPending && <ActivityIndicator color="#FF3B30" />}
              {exercises.isError && (
                <Pressable onPress={() => void exercises.refetch()}>
                  <Text style={styles.emptyText}>
                    Erro ao carregar exercícios. Toque para tentar novamente.
                  </Text>
                </Pressable>
              )}
              {!!importError && <Text style={styles.error}>{importError}</Text>}
            </>
          )}
        </ScrollView>
        {method === 'scratch' && (
          <View style={styles.nextFooter}>
            <Pressable
              accessibilityRole="button"
              style={styles.btnPrimary}
              onPress={() => setBuilding(true)}
            >
              <Text style={styles.btnPrimaryText}>Próximo: Montar Treino</Text>
            </Pressable>
          </View>
        )}
        <InstructorTabBar active="Alunos" />
      </SafeAreaView>
    )

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Pressable
            accessibilityLabel="Voltar"
            style={styles.backButton}
            onPress={() => (source ? router.back() : setBuilding(false))}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.textPrimary} />
          </Pressable>
          <TextInput
            accessibilityLabel="Nome da ficha"
            style={styles.titleInput}
            value={name}
            onChangeText={setName}
            placeholder="Nome do treino..."
            maxLength={60}
            placeholderTextColor={tokens.colors.textMuted}
          />
        </View>
        <Pressable style={styles.saveDraftButton} onPress={saveDraft} disabled={busy}>
          <Text style={styles.saveDraftText}>{busy ? 'Salvando…' : 'Salvar'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {source && !isDraft && (
          <Text style={styles.notice}>
            Ficha {source.status === 'ACTIVE' ? 'ativa' : 'expirada'} não é alterada: ao salvar,
            nasce uma ficha nova em rascunho com estas divisões. Publicá-la substitui a atual.
          </Text>
        )}

        <View style={styles.weekRow}>
          {divisions.map((d, i) => (
            <Pressable
              key={d.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: i === selected }}
              style={[styles.dayTab, i === selected && styles.dayTabActive]}
              onPress={() => setSelected(i)}
            >
              <Text style={[styles.dayTabText, i === selected && styles.dayTabTextActive]}>
                {DAYS.find((day) => day.weekday === d.weekday)?.label ?? `Treino ${LABELS[i]}`}
              </Text>
            </Pressable>
          ))}
          {divisions.length < MAX_DIVISIONS && (
            <Pressable
              accessibilityLabel="Adicionar treino"
              style={styles.dayTab}
              onPress={() => {
                setDivisions([...divisions, emptyDivision()])
                setSelected(divisions.length)
              }}
            >
              <Ionicons name="add" size={16} color="#FF3B30" />
            </Pressable>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.muscleRow}
        >
          {chips.map((muscle) => {
            const active = division.muscles.includes(muscle)
            return (
              <Pressable
                key={muscle}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                style={[styles.muscleChip, active && styles.muscleChipSelected]}
                onPress={() => toggleMuscle(muscle)}
              >
                <Ionicons
                  name={active ? 'checkmark' : 'add'}
                  size={12}
                  color={active ? '#FF3B30' : '#888'}
                />
                <Text style={[styles.muscleChipText, active && styles.muscleChipTextSelected]}>
                  {muscle}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
        {!division.muscles.length ? (
          <View style={styles.sectionBox}>
            <Text style={styles.emptyText}>
              Nenhum exercício para{' '}
              {DAYS.find((day) => day.weekday === division.weekday)?.label ?? `Treino ${label}`}.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.addExerciseBtn}
              onPress={() => openPicker(null)}
            >
              <Ionicons name="add" size={20} color="#FF3B30" />
              <Text style={styles.addExerciseText}>Adicionar Exercício</Text>
            </Pressable>
          </View>
        ) : (
          division.muscles.map((muscle) => (
            <View key={muscle} style={styles.sectionBox}>
              <View style={styles.groupHeader}>
                <View style={styles.groupDot} />
                <Text style={styles.sectionTitle}>{muscle}</Text>
                <View style={styles.groupLine} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover grupo ${muscle}`}
                  onPress={() => removeMuscle(muscle)}
                >
                  <Text style={styles.removeText}>Remover</Text>
                </Pressable>
              </View>
              {division.exercises
                .filter((item) => item.exercise.muscleGroup === muscle)
                .map((item, index) => (
                  <View key={item.key} style={styles.exerciseCard}>
                    <View style={styles.exerciseTopRow}>
                      <Text style={styles.exerciseNumber}>{index + 1}</Text>
                      <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remover ${item.exercise.name}`}
                        hitSlop={8}
                        onPress={() =>
                          updateDivision({
                            exercises: division.exercises.filter((e) => e.key !== item.key),
                          })
                        }
                      >
                        <Ionicons name="close" size={18} color="#888" />
                      </Pressable>
                    </View>
                    <View style={styles.stepperGrid}>
                      {(
                        [
                          ['sets', 'Séries', 1, 20, 1],
                          ['reps', 'Reps', 1, 999, 1],
                          ['restSeconds', 'Descanso (s)', 0, 600, 15],
                        ] as const
                      ).map(([field, title, min, max, step]) => {
                        const numeric = Number(item[field])
                        const canStep = Number.isInteger(numeric) && item[field].trim() !== ''
                        const change = (delta: number) =>
                          updateItem(item.key, {
                            [field]: String(Math.min(max, Math.max(min, numeric + delta))),
                          })
                        return (
                          <View key={field} style={styles.stepperColumn}>
                            <Text style={styles.controlLabel}>{title}</Text>
                            <View style={styles.stepperRow}>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Diminuir ${title} de ${item.exercise.name}`}
                                disabled={!canStep || numeric <= min}
                                style={[
                                  styles.stepButton,
                                  (!canStep || numeric <= min) && styles.stepDisabled,
                                ]}
                                onPress={() => change(-step)}
                              >
                                <Ionicons name="remove" color="#aaa" size={14} />
                              </Pressable>
                              <TextInput
                                accessibilityLabel={`${title} de ${item.exercise.name}`}
                                style={styles.stepInput}
                                value={item[field]}
                                onChangeText={(value) => updateItem(item.key, { [field]: value })}
                                keyboardType={field === 'reps' ? 'default' : 'number-pad'}
                              />
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Aumentar ${title} de ${item.exercise.name}`}
                                disabled={!canStep || numeric >= max}
                                style={[
                                  styles.stepButton,
                                  styles.stepPlus,
                                  (!canStep || numeric >= max) && styles.stepDisabled,
                                ]}
                                onPress={() => change(step)}
                              >
                                <Ionicons name="add" color="#fff" size={14} />
                              </Pressable>
                            </View>
                          </View>
                        )
                      })}
                    </View>
                    <View style={styles.loadRow}>
                      <Text style={styles.controlLabel}>Carga-alvo (kg)</Text>
                      <TextInput
                        accessibilityLabel={`Carga-alvo de ${item.exercise.name}`}
                        style={[styles.stepInput, styles.loadInput]}
                        value={item.targetLoadKg}
                        onChangeText={(value) => updateItem(item.key, { targetLoadKg: value })}
                        keyboardType="decimal-pad"
                        placeholder="Livre"
                        placeholderTextColor="#888"
                      />
                    </View>
                  </View>
                ))}
              <Pressable
                accessibilityRole="button"
                style={[styles.addExerciseBtn, styles.groupAddButton]}
                onPress={() => openPicker(muscle)}
              >
                <Ionicons name="add" size={18} color="#FF3B30" />
                <Text style={styles.addExerciseText}>Adicionar exercício de {muscle}</Text>
              </Pressable>
            </View>
          ))
        )}

        {divisions.some((d) => d.exercises.length > 0) && (
          <>
            <View style={styles.sectionBox}>
              <Text style={styles.controlLabel}>Dia deste treino (opcional)</Text>
              <View style={styles.chipsWrap}>
                {DAYS.map((day) => (
                  <Pressable
                    key={day.weekday}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: division.weekday === day.weekday }}
                    style={[
                      styles.muscleChip,
                      division.weekday === day.weekday && styles.muscleChipSelected,
                    ]}
                    onPress={() =>
                      updateDivision({
                        weekday: division.weekday === day.weekday ? null : day.weekday,
                      })
                    }
                  >
                    <Text style={styles.muscleChipText}>{day.label}</Text>
                  </Pressable>
                ))}
              </View>
              {divisions.length > 1 && (
                <Pressable
                  onPress={() => {
                    setDivisions((all) => all.filter((_, i) => i !== selected))
                    setSelected(Math.max(0, selected - 1))
                  }}
                >
                  <Text style={styles.removeText}>Remover este treino</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.periodRow}>
              {(
                [
                  ['Início', startsOn, setStartsOn],
                  ['Fim', endsOn, setEndsOn],
                ] as const
              ).map(([title, value, set]) => (
                <View key={title} style={styles.controlGroup}>
                  <Text style={styles.controlLabel}>{title}</Text>
                  <TextInput
                    accessibilityLabel={`${title} da ficha`}
                    style={[styles.controlStepper, styles.stepperVal]}
                    value={value}
                    onChangeText={(text) => set(maskDate(text))}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={tokens.colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
              ))}
            </View>

            <View style={styles.publishSection}>
              <View style={styles.notifyRow}>
                <Text style={styles.notifyText}>Notificar aluno</Text>
                <Switch
                  value={notify}
                  onValueChange={setNotify}
                  trackColor={{ false: tokens.colors.surface, true: tokens.colors.primary }}
                  thumbColor={tokens.colors.textPrimary}
                />
              </View>
              <Pressable style={styles.btnPrimary} onPress={publish} disabled={busy}>
                <Text style={styles.btnPrimaryText}>{busy ? 'Aguarde…' : 'Publicar Ficha'}</Text>
              </Pressable>
              <Pressable style={styles.btnSecondary} onPress={saveTemplate} disabled={busy}>
                <Text style={styles.btnSecondaryText}>Salvar como Modelo</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
      <InstructorTabBar active="Alunos" disabled={busy} />

      <Modal
        visible={picking}
        transparent
        animationType="slide"
        onRequestClose={() => setPicking(false)}
      >
        <View style={styles.overlay}>
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {pickingMuscle ? `● Exercícios de ${pickingMuscle}` : 'Biblioteca de exercícios'}
              </Text>
              <Pressable accessibilityLabel="Fechar" hitSlop={8} onPress={() => setPicking(false)}>
                <Ionicons name="close" size={22} color={tokens.colors.textMuted} />
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Buscar exercício"
              style={styles.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar exercício…"
              placeholderTextColor={tokens.colors.textMuted}
            />
            {exercises.isPending ? (
              <ActivityIndicator color={tokens.colors.primary} />
            ) : exercises.isError ? (
              <Pressable onPress={() => exercises.refetch()}>
                <Text style={styles.emptyText}>
                  {exercises.error.message} Toque para tentar de novo.
                </Text>
              </Pressable>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                {library.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Nenhum exercício encontrado. Busque pelo nome ou cadastre na biblioteca.
                  </Text>
                ) : (
                  library.map((ex) => (
                    <Pressable
                      key={ex.id}
                      style={styles.libraryRow}
                      onPress={() => {
                        updateDivision({
                          exercises: [...division.exercises, toItem(ex)],
                          muscles: division.muscles.includes(ex.muscleGroup)
                            ? division.muscles
                            : [...division.muscles, ex.muscleGroup],
                        })
                        setPicking(false)
                        setSearch('')
                      }}
                    >
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      <View style={styles.libraryAdd}>
                        <Ionicons name="add" size={18} color="#fff" />
                      </View>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            )}
            <Pressable
              accessibilityRole="button"
              style={styles.cancelButton}
              onPress={() => setPicking(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
