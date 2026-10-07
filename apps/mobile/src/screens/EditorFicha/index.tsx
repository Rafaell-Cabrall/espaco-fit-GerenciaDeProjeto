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
import { Status } from '@/components/Status'
import { Text } from '@/components/Text'
import { tokens } from '@/design-system/tokens'
import { maskDate } from '../NovoAluno/form'
import { styles } from './style'

// Dia da semana é só rótulo (0 = domingo, igual a Date.getDay()); tocar de novo tira o dia fixo
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

const emptyDivision = (): Div => ({ key: newKey(), muscles: [], weekday: null, exercises: [] })
const toItem = (
  exercise: Exercise,
  e?: { sets: number; reps: string; restSeconds: number; targetLoadKg: number | null },
): Item => ({
  key: newKey(),
  exercise,
  sets: String(e?.sets ?? 3),
  reps: e?.reps ?? '10',
  restSeconds: String(e?.restSeconds ?? 60),
  targetLoadKg: e?.targetLoadKg == null ? '' : String(e.targetLoadKg),
})
const fromPlan = (plan: Plan): Div[] =>
  plan.divisions.map((d) => ({
    key: newKey(),
    muscles: d.title.split(' & ').filter(Boolean),
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
  return <Editor studentId={studentId} source={source.data} />
}

function Editor({ studentId, source }: { studentId: string; source?: Plan }) {
  const router = useRouter()
  const cache = useQueryClient()
  const isDraft = source?.status === 'DRAFT'
  // Rascunho que este editor grava. Ficha ativa ou expirada ganha um rascunho novo no 1º salvar.
  const [draftId, setDraftId] = useState(isDraft ? source.id : null)
  const [name, setName] = useState(source?.name ?? '')
  const [startsOn, setStartsOn] = useState(toBr(isDraft ? source.startsOn : localIso(new Date())))
  const [endsOn, setEndsOn] = useState(toBr(isDraft ? source.endsOn : inDays(90)))
  const [divisions, setDivisions] = useState<Div[]>(() =>
    source ? fromPlan(source) : [emptyDivision()],
  )
  const [selected, setSelected] = useState(0)
  const [notify, setNotify] = useState(true)
  const [picking, setPicking] = useState(false)
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
  const toggleMuscle = (muscle: string) =>
    updateDivision({
      muscles: division.muscles.includes(muscle)
        ? division.muscles.filter((m) => m !== muscle)
        : [...division.muscles, muscle],
    })
  const removeDivision = () => {
    setDivisions((all) => all.filter((_, i) => i !== selected))
    setSelected(Math.max(0, selected - 1))
  }

  // Valida no app com o mesmo contrato da API, com mensagens que dizem qual treino corrigir
  const parse = () => {
    for (const [i, d] of divisions.entries()) {
      if (!d.muscles.length) return `Escolha os grupos musculares do Treino ${LABELS[i]}.`
      if (!d.exercises.length) return `Adicione exercícios ao Treino ${LABELS[i]}.`
    }
    const result = createPlanSchema.safeParse({
      studentId,
      name,
      startsOn: toIso(startsOn),
      endsOn: toIso(endsOn),
      divisions: divisions.map((d, i) => ({
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
      Alert.alert('Modelo salvo', 'A ficha foi para a sua biblioteca de modelos.')
    } catch (cause) {
      fail('Não foi possível salvar o modelo', cause)
    } finally {
      setBusy(false)
    }
  }

  const q = search.trim().toLocaleLowerCase('pt-BR')
  // Sem busca, mostra os exercícios dos grupos escolhidos; a busca procura na biblioteca toda
  const library = (exercises.data ?? []).filter((ex) =>
    q
      ? ex.name.toLocaleLowerCase('pt-BR').includes(q)
      : !division.muscles.length || division.muscles.includes(ex.muscleGroup),
  )
  const chips = [...new Set([...MuscleGroup.options, ...division.muscles])]

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Pressable
            accessibilityLabel="Voltar"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.textPrimary} />
          </Pressable>
          <TextInput
            accessibilityLabel="Nome da ficha"
            style={styles.titleInput}
            value={name}
            onChangeText={setName}
            placeholder="Nome da ficha (ex.: Hipertrofia — ABC)"
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {divisions.map((d, i) => (
            <Pressable
              key={d.key}
              accessibilityState={{ selected: i === selected }}
              style={[styles.dayTab, i === selected && styles.dayTabActive]}
              onPress={() => setSelected(i)}
            >
              <Text style={[styles.dayTabText, i === selected && styles.dayTabTextActive]}>
                Treino {LABELS[i]}
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
              <Ionicons name="add" size={14} color={tokens.colors.primary} />
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.sectionBox}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Treino {label}
              {division.muscles.length ? ` — ${division.muscles.join(' & ')}` : ''}
            </Text>
            {divisions.length > 1 && (
              <Pressable onPress={removeDivision}>
                <Text style={styles.removeText}>Remover treino</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.controlLabel}>Dia da semana (opcional)</Text>
          <View style={styles.chipsWrap}>
            {DAYS.map((d) => {
              const active = division.weekday === d.weekday
              return (
                <Pressable
                  key={d.weekday}
                  accessibilityState={{ selected: active }}
                  style={[styles.muscleChip, active && styles.muscleChipSelected]}
                  onPress={() => updateDivision({ weekday: active ? null : d.weekday })}
                >
                  <Text style={[styles.muscleChipText, active && styles.muscleChipTextSelected]}>
                    {d.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <Text style={styles.controlLabel}>Grupos musculares</Text>
          <View style={styles.chipsWrap}>
            {chips.map((muscle) => {
              const active = division.muscles.includes(muscle)
              return (
                <Pressable
                  key={muscle}
                  accessibilityState={{ selected: active }}
                  style={[styles.muscleChip, active && styles.muscleChipSelected]}
                  onPress={() => toggleMuscle(muscle)}
                >
                  {active && <Ionicons name="checkmark" size={12} color={tokens.colors.primary} />}
                  <Text style={[styles.muscleChipText, active && styles.muscleChipTextSelected]}>
                    {muscle}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {division.exercises.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum exercício neste treino.</Text>
          ) : (
            division.exercises.map((item, index) => (
              <View key={item.key} style={styles.exerciseCard}>
                <View style={styles.exerciseTopRow}>
                  <Text style={styles.exerciseName} numberOfLines={1}>
                    {index + 1}. {item.exercise.name}
                  </Text>
                  <Pressable
                    accessibilityLabel={`Remover ${item.exercise.name}`}
                    hitSlop={8}
                    onPress={() =>
                      updateDivision({
                        exercises: division.exercises.filter((e) => e.key !== item.key),
                      })
                    }
                  >
                    <Ionicons name="close" size={16} color={tokens.colors.textMuted} />
                  </Pressable>
                </View>
                <View style={styles.controlsGrid}>
                  {(
                    [
                      ['sets', 'Séries', 'number-pad'],
                      ['reps', 'Reps (12 ou 8-10)', 'default'],
                      ['restSeconds', 'Descanso (s)', 'number-pad'],
                      ['targetLoadKg', 'Carga-alvo (kg)', 'decimal-pad'],
                    ] as const
                  ).map(([field, title, keyboard]) => (
                    <View key={field} style={styles.controlGroup}>
                      <Text style={styles.controlLabel}>{title}</Text>
                      <TextInput
                        accessibilityLabel={`${title} de ${item.exercise.name}`}
                        style={[styles.controlStepper, styles.stepperVal]}
                        value={item[field]}
                        onChangeText={(text) => updateItem(item.key, { [field]: text })}
                        keyboardType={keyboard}
                        placeholder={field === 'targetLoadKg' ? 'Livre' : undefined}
                        placeholderTextColor={tokens.colors.textMuted}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}

          <Pressable style={styles.addExerciseBtn} onPress={() => setPicking(true)}>
            <Ionicons name="search" size={16} color={tokens.colors.primary} />
            <Text style={styles.addExerciseText}>Buscar exercício na biblioteca</Text>
          </Pressable>
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
      </ScrollView>

      <Modal
        visible={picking}
        transparent
        animationType="slide"
        onRequestClose={() => setPicking(false)}
      >
        <View style={styles.overlay}>
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Biblioteca de exercícios</Text>
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
                        updateDivision({ exercises: [...division.exercises, toItem(ex)] })
                        setPicking(false)
                        setSearch('')
                      }}
                    >
                      <Text style={styles.exerciseName}>{ex.name}</Text>
                      <Text style={styles.removeText}>{ex.muscleGroup}</Text>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
