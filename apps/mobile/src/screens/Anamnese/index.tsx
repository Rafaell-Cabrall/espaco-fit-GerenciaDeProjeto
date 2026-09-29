// Anamnese do primeiro acesso (RN05/RN09). O portão fica em app/(aluno)/_layout.tsx: só chega
// aqui quem tem GET /anamnesis/:id == null. Rótulos e opções seguem Evolução > Anamnese.
import {
  anamnesisInputSchema,
  anamnesisSchema,
  FitnessLevel,
  Goal,
  WeeklyFrequency,
} from '@espacofit/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Text } from 'react-native'
import { api } from '@/api/client'
import { useAuth } from '@/auth'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/Button'
import { Checkbox } from '@/components/Checkbox'
import { Field } from '@/components/Field'
import { Choice } from './components/Choice'
import { styles } from './styles'

export function AnamneseScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [injuries, setInjuries] = useState('')
  const [conditions, setConditions] = useState('')
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>()
  const [goal, setGoal] = useState<Goal>()
  const [weeklyFrequency, setWeeklyFrequency] = useState<WeeklyFrequency>()
  const [consent, setConsent] = useState(false)

  const responder = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sessão expirada')
      // A API só devolve 400 "Dados inválidos": a mensagem por campo sai do schema aqui
      const parsed = anamnesisInputSchema.safeParse({
        injuries,
        conditions,
        fitnessLevel,
        goal,
        weeklyFrequency,
        consent,
      })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message)
      return api(`/anamnesis/${user.id}`, anamnesisSchema, { method: 'PUT', body: parsed.data })
    },
    // Preenche o cache que o portão lê: sem isso ele buscaria de novo e piscaria o formulário
    onSuccess: (anamnesis) => {
      queryClient.setQueryData(['anamnesis', user?.id], anamnesis)
      router.replace('/(aluno)/(tabs)')
    },
  })

  return (
    <AuthLayout
      hideBack
      title="Antes de começar"
      subtitle="Suas respostas são o que o instrutor usa para montar a sua ficha. Leva menos de um minuto."
      error={responder.error?.message}
      footer={
        <Button
          title="Continuar"
          onPress={() => responder.mutate()}
          loading={responder.isPending}
        />
      }
    >
      <Field
        label="Lesões ou restrições"
        placeholder="Ex: dor no ombro direito ao elevar o braço"
        value={injuries}
        onChangeText={setInjuries}
        multiline
        maxLength={500}
      />
      <Choice
        label="Nível de condicionamento"
        options={FitnessLevel.options}
        value={fitnessLevel}
        onChange={setFitnessLevel}
      />
      <Choice label="Objetivo principal" options={Goal.options} value={goal} onChange={setGoal} />
      <Choice
        label="Frequência semanal"
        options={WeeklyFrequency.options}
        value={weeklyFrequency}
        onChange={setWeeklyFrequency}
      />
      <Field
        label="Doenças preexistentes"
        placeholder="Ex: asma, hipertensão, diabetes"
        value={conditions}
        onChangeText={setConditions}
        multiline
        maxLength={500}
      />
      <Checkbox
        checked={consent}
        onChange={setConsent}
        accessibilityLabel="Autorizo o uso dos meus dados de saúde"
        label={
          <>
            Autorizo o Espaço Fit a usar meus dados de saúde para montar e acompanhar meu treino,
            conforme a <Text style={styles.bold}>LGPD</Text>. Só eu e o meu instrutor vemos estas
            respostas.
          </>
        }
      />
      <Text style={styles.note}>
        Os dois campos de texto são opcionais. Você pode atualizar tudo depois em Evolução {'>'}{' '}
        Anamnese.
      </Text>
    </AuthLayout>
  )
}
