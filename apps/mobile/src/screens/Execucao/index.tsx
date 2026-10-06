// Execução do treino (RU02): carga por série, concluir série, cronômetro de descanso com som.
// A sessão só é criada na primeira série concluída: abrir e sair sem treinar não deixa rastro.
// Todas as escritas passam por uma fila: marcar e desmarcar rápido chegam na API na ordem certa,
// e "Finalizar" espera as séries pendentes (RN03 conta o que já chegou no servidor).

import {
  type PlanExercise,
  sessionSchema,
  setLogInputSchema,
  setLogSchema,
} from '@espacofit/shared'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { z } from 'zod'
import { ApiError, api } from '@/api/client'
import { Button } from '@/components/Button'
import { ExerciseThumb } from '@/components/ExerciseThumb'
import { Field } from '@/components/Field'
import { Status } from '@/components/Status'
import { Text } from '@/components/Text'
import { tokens } from '@/design-system/tokens'
import { usePlan } from '@/hooks/usePlan'
import { Demo } from './components/Demo'
import { mmss, RestTimer } from './components/RestTimer'
import { styles } from './styles'

const keyOf = (item: PlanExercise, set: number) => `${item.id}:${set}`
// Carga sugerida: a última que o aluno usou; senão, a alvo do instrutor
const suggested = (item: PlanExercise) => item.lastLoadKg ?? item.targetLoadKg
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

export function ExecucaoScreen() {
  const { divisionId } = useLocalSearchParams<{ divisionId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const plan = usePlan()
  const beep = useAudioPlayer(require('../../../assets/descanso.wav'))

  const sessionId = useRef<string>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const restAlarm = useRef<ReturnType<typeof setTimeout>>(undefined)

  const [open, setOpen] = useState<string | null>()
  const [loads, setLoads] = useState<Record<string, string>>({})
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [rest, setRest] = useState<{ key: string; seconds: number; startedAt: number }>()
  const [demo, setDemo] = useState<PlanExercise>()

  useEffect(() => {
    // Academia costuma ter celular no silencioso: o aviso do descanso toca mesmo assim
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
    return () => clearTimeout(restAlarm.current)
  }, [])

  const enqueue = <T,>(op: () => Promise<T>) => {
    const next = queue.current.then(op)
    queue.current = next.catch(() => {})
    return next
  }

  const ensureSession = async () => {
    sessionId.current ??= (
      await api('/sessions', sessionSchema, { method: 'POST', body: { divisionId } })
    ).id
    return sessionId.current
  }

  const division = plan.data?.divisions.find((d) => d.id === divisionId)
  const doneCount = Object.values(done).filter(Boolean).length

  // "Sair do treino": descarta a sessão aberta (RN03)
  const discard = () => {
    clearTimeout(restAlarm.current)
    // Dentro da fila: a criação da sessão pode estar em voo e só existir depois dela
    enqueue(async () => {
      if (sessionId.current)
        await api(`/sessions/${sessionId.current}`, z.undefined(), { method: 'DELETE' })
    }).catch(() => {})
    router.back()
  }

  const finish = useMutation({
    mutationFn: () =>
      enqueue(async () => {
        const id = await ensureSession()
        const filled = Object.fromEntries(Object.entries(notes).filter(([, t]) => t.trim()))
        return api(`/sessions/${id}/finish`, sessionSchema, {
          method: 'POST',
          body: { notes: filled },
        })
      }),
    onSuccess: (session) => {
      clearTimeout(restAlarm.current)
      // Treino do dia avança para a próxima divisão (RN08) e a carga sugerida muda
      queryClient.invalidateQueries({ queryKey: ['plan'] })
      queryClient.invalidateQueries({ queryKey: ['frequency'] })
      const ms = Date.parse(session.finishedAt ?? '') - Date.parse(session.startedAt)
      router.replace({
        pathname: '/(aluno)/treino/concluido',
        params: {
          title: division ? `Treino ${division.label} — ${division.title}` : '',
          sets: session.sets.length,
          exercises: new Set(session.sets.map((s) => s.divisionExerciseId)).size,
          minutes: Math.max(1, Math.round(ms / 60_000)),
        },
      })
    },
    onError: (e) => {
      // RN03: o botão só libera com série marcada, mas a série pode não ter chegado ao servidor
      // (sem rede, ou desmarcada em outra tentativa). Aí o treino não conta: continuar ou sair.
      if (e instanceof ApiError && e.status === 422) {
        return Alert.alert(
          'Nenhum exercício concluído',
          'Nenhuma série foi registrada neste treino. Conclua ao menos uma série para contabilizar o treino ou saia sem salvar.',
          [
            { text: 'Continuar treino', style: 'cancel' },
            { text: 'Sair do treino', style: 'destructive', onPress: discard },
          ],
        )
      }
      Alert.alert('Não foi possível finalizar', e.message)
    },
  })

  if (plan.isPending) return <Status />
  if (plan.isError)
    return (
      <Status
        message={plan.error.message}
        action="Tentar de novo"
        onAction={() => plan.refetch()}
        loading={plan.isFetching}
      />
    )
  if (!division)
    return (
      <Status
        message="Este treino não está mais na sua ficha atual."
        action="Voltar"
        onAction={() => router.back()}
      />
    )

  const loadText = (item: PlanExercise, set: number) =>
    loads[keyOf(item, set)] ?? String(suggested(item) ?? '')

  const parseSet = (item: PlanExercise, set: number) => {
    const text = loadText(item, set).trim().replace(',', '.')
    return setLogInputSchema.safeParse({
      divisionExerciseId: item.id,
      setNumber: set,
      loadKg: text ? Number(text) : null,
    })
  }

  const saveSet = (item: PlanExercise, set: number) => {
    const input = parseSet(item, set)
    if (!input.success) {
      Alert.alert('Carga inválida', 'Informe a carga em kg, por exemplo 22,5. Vazio = sem carga.')
      return null
    }
    return enqueue(async () =>
      api(`/sessions/${await ensureSession()}/sets`, setLogSchema, {
        method: 'PUT',
        body: input.data,
      }),
    )
  }

  const startRest = (key: string, seconds: number) => {
    clearTimeout(restAlarm.current)
    setRest({ key, seconds, startedAt: Date.now() })
    // ponytail: setTimeout pausa com o app em segundo plano; notificação local se virar queixa
    restAlarm.current = setTimeout(() => {
      beep.seekTo(0)
      beep.play()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    }, seconds * 1000)
  }

  const stopRest = () => {
    clearTimeout(restAlarm.current)
    setRest(undefined)
  }

  const toggle = async (item: PlanExercise, set: number) => {
    const key = keyOf(item, set)
    const wasDone = !!done[key]
    const request = wasDone
      ? enqueue(async () =>
          api(`/sessions/${await ensureSession()}/sets/${item.id}/${set}`, z.undefined(), {
            method: 'DELETE',
          }),
        )
      : saveSet(item, set)
    if (!request) return

    setDone((d) => ({ ...d, [key]: !wasDone }))
    if (wasDone && rest?.key === key) stopRest()
    if (!wasDone && set < item.sets && item.restSeconds > 0) startRest(key, item.restSeconds)
    try {
      await request
    } catch (e) {
      setDone((d) => ({ ...d, [key]: wasDone }))
      Alert.alert('Série não salva', (e as Error).message)
    }
  }

  // Corrigir a carga de uma série já concluída reenvia a série (a API trata como correção)
  const correct = (item: PlanExercise, set: number) => {
    if (!done[keyOf(item, set)]) return
    saveSet(item, set)?.catch((e: Error) => Alert.alert('Carga não salva', e.message))
  }

  const leave = () => {
    if (doneCount === 0) return discard()
    Alert.alert('Sair do treino?', 'As séries marcadas não serão contabilizadas.', [
      { text: 'Continuar treino', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: discard },
    ])
  }

  const current = open === undefined ? division.exercises[0]?.id : open
  const exercisesDone = division.exercises.filter((item) =>
    range(item.sets).every((set) => done[keyOf(item, set)]),
  ).length

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={leave}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={8}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={tokens.colors.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            Treino {division.label} — {division.title}
          </Text>
          <Text variant="caption">
            {exercisesDone}/{division.exercises.length} exercícios concluídos
          </Text>
        </View>
        <View style={styles.counter}>
          <View style={[styles.dot, doneCount > 0 && styles.dotOn]} />
          <Text variant="label">{doneCount} séries</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {division.exercises.map((item) => {
            const isOpen = item.id === current
            const load = suggested(item)
            const complete = range(item.sets).every((set) => done[keyOf(item, set)])
            return (
              <View key={item.id} style={styles.card}>
                <Pressable
                  onPress={() => setOpen(isOpen ? null : item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  style={styles.cardHeader}
                >
                  <Pressable
                    onPress={() => setDemo(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver demonstração de ${item.exercise.name}`}
                  >
                    <ExerciseThumb url={item.exercise.mediaUrl} size={56} />
                    <View style={styles.play}>
                      <Ionicons name="play" size={12} color={tokens.colors.onPrimary} />
                    </View>
                  </Pressable>
                  <View style={styles.cardText}>
                    <Text style={styles.name}>{item.exercise.name}</Text>
                    <Text variant="label">
                      {item.sets}x {item.reps}
                      {load !== null ? ` | ${load} kg` : ''}
                    </Text>
                  </View>
                  <Ionicons
                    name={complete ? 'checkmark-circle' : isOpen ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={complete ? tokens.colors.success : tokens.colors.accent}
                  />
                </Pressable>

                {isOpen && (
                  <View style={styles.sets}>
                    {range(item.sets).map((set) => {
                      const key = keyOf(item, set)
                      const isDone = !!done[key]
                      return (
                        <Fragment key={key}>
                          <View style={styles.set}>
                            <Text style={styles.setLabel}>
                              SÉRIE {set} · {item.reps} reps
                            </Text>
                            <View style={styles.setRow}>
                              <View style={styles.loadBox}>
                                <Ionicons
                                  name="barbell-outline"
                                  size={16}
                                  color={tokens.colors.textMuted}
                                />
                                <TextInput
                                  accessibilityLabel={`Carga da série ${set} em kg`}
                                  value={loadText(item, set)}
                                  onChangeText={(t) => setLoads((l) => ({ ...l, [key]: t }))}
                                  onEndEditing={() => correct(item, set)}
                                  placeholder="Carga (kg)"
                                  placeholderTextColor={tokens.colors.textMuted}
                                  selectionColor={tokens.colors.accent}
                                  keyboardType="decimal-pad"
                                  maxLength={6}
                                  style={styles.loadInput}
                                />
                                <Text variant="caption">kg</Text>
                              </View>
                              <Pressable
                                onPress={() => toggle(item, set)}
                                accessibilityRole="checkbox"
                                accessibilityLabel={`Concluir série ${set}`}
                                accessibilityState={{ checked: isDone }}
                                hitSlop={6}
                                style={[styles.check, isDone && styles.checkOn]}
                              >
                                <Ionicons
                                  name="checkmark"
                                  size={20}
                                  color={isDone ? tokens.colors.onPrimary : tokens.colors.textMuted}
                                />
                              </Pressable>
                            </View>
                          </View>
                          {set < item.sets &&
                            item.restSeconds > 0 &&
                            (rest?.key === key ? (
                              <RestTimer
                                seconds={rest.seconds}
                                startedAt={rest.startedAt}
                                onStop={stopRest}
                              />
                            ) : (
                              <View style={styles.restHint}>
                                <Ionicons
                                  name="time-outline"
                                  size={16}
                                  color={tokens.colors.textMuted}
                                />
                                <Text variant="caption">
                                  {mmss(item.restSeconds)} descanso após concluir a série
                                </Text>
                              </View>
                            ))}
                        </Fragment>
                      )
                    })}
                    <Field
                      label="Nota do exercício"
                      placeholder="Ex: Senti o ombro, manter a carga... Como foi a execução?"
                      value={notes[item.id] ?? ''}
                      onChangeText={(t) => setNotes((n) => ({ ...n, [item.id]: t }))}
                      multiline
                      maxLength={500}
                    />
                  </View>
                )}
              </View>
            )
          })}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Finalizar Treino"
            onPress={() => finish.mutate()}
            disabled={doneCount === 0}
            loading={finish.isPending}
          />
          {doneCount === 0 && (
            <Text variant="caption" style={styles.hint}>
              Marque ao menos 1 série para contabilizar o treino
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>

      <Demo exercise={demo?.exercise} onClose={() => setDemo(undefined)} />
    </SafeAreaView>
  )
}
