// Meus Treinos: uma aba por divisão da ficha, com o selo "Hoje" no treino do dia (RN08).
// "Iniciar" funciona em qualquer aba: o aluno pode trocar a divisão sugerida.
import type { Division } from '@espacofit/shared'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card } from '@/components/Card'
import { ExerciseThumb } from '@/components/ExerciseThumb'
import { Status } from '@/components/Status'
import { Tabs } from '@/components/Tabs'
import { Text } from '@/components/Text'
import { usePlan } from '@/hooks/usePlan'
import { styles } from './styles'

const DAY = 24 * 60 * 60 * 1000

function atualizada(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / DAY)
  if (dias < 1) return 'atualizada hoje'
  return dias === 1 ? 'atualizada há 1 dia' : `atualizada há ${dias} dias`
}

export function MeusTreinosScreen() {
  const router = useRouter()
  const plan = usePlan()
  // undefined = segue o treino do dia até o aluno tocar numa aba
  const [picked, setPicked] = useState<string>()

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
  if (!plan.data)
    return (
      <Status message="Sua ficha ainda não foi publicada. Assim que o instrutor montar seus treinos, eles aparecem aqui." />
    )

  const { divisions, todayDivisionId, updatedAt } = plan.data
  const division: Division | undefined =
    divisions.find((d) => d.id === (picked ?? todayDivisionId)) ?? divisions[0]
  if (!division) return <Status message="Sua ficha está sem treinos." />
  const isToday = division.id === todayDivisionId

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text variant="heading">Meus Treinos</Text>
          <Text variant="label">Ficha atual — {atualizada(updatedAt)}</Text>
        </View>

        <Tabs
          items={divisions.map((d) => ({
            id: d.id,
            label: `Treino ${d.label}`,
            badge: d.id === todayDivisionId ? 'Hoje' : undefined,
          }))}
          value={division.id}
          onChange={setPicked}
        />

        <Card style={styles.summary}>
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>
              Treino {division.label} — {division.title}
            </Text>
            <Text variant="caption">
              {division.exercises.length} exercícios
              {isToday ? ' · Treino de hoje' : ''}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/(aluno)/treino/[divisionId]',
                params: { divisionId: division.id },
              })
            }
            style={({ pressed }) => [styles.start, pressed && styles.pressed]}
          >
            <Text style={styles.startText}>Iniciar</Text>
          </Pressable>
        </Card>

        {division.exercises.map((item) => (
          <Card key={item.id} style={styles.exercise}>
            <ExerciseThumb url={item.exercise.mediaUrl} />
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>{item.exercise.name}</Text>
              <View style={styles.chips}>
                <Text style={styles.chip}>{item.sets} séries</Text>
                <Text style={styles.chip}>{item.reps} reps</Text>
                <Text style={styles.chip}>{item.restSeconds}s desc.</Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
