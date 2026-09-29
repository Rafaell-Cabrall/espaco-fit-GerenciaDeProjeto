// Consentimento do primeiro acesso (RN09). O instrutor preencheu a anamnese no cadastro; o aluno
// confere e autoriza. O portão fica em app/(aluno)/_layout.tsx: só chega aqui quem tem consentAt null.
import { type Anamnesis, anamnesisSchema } from '@espacofit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { api } from '@/api/client'
import { useAuth } from '@/auth'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Checkbox } from '@/components/Checkbox'
import { styles } from './styles'

const brDate = (d: string) => d.split('-').reverse().join('/')

// As 5 seções do Figma do instrutor ("Anamnese Completa"), com os mesmos rótulos
const sections: [string, [string, (a: Anamnesis) => string | number | null][]][] = [
  [
    '1. Dados Pessoais',
    [
      ['Data de Nascimento', (a) => brDate(a.birthDate)],
      ['Telefone', (a) => a.phone],
      ['CPF', (a) => a.cpf],
      ['Profissão', (a) => a.profession],
    ],
  ],
  [
    '2. Objetivos e Expectativas',
    [
      ['Principal Objetivo', (a) => [a.goal, a.goalDetails].filter(Boolean).join(' — ')],
      ['Dias por semana', (a) => a.daysPerWeek],
      ['Tempo disponível', (a) => a.minutesPerSession && `${a.minutesPerSession} min`],
    ],
  ],
  [
    '3. Histórico de Atividade Física',
    [
      ['Pratica ou praticou atividade física?', (a) => a.activityHistory],
      ['Experiência com musculação', (a) => a.weightTrainingExperience],
    ],
  ],
  [
    '4. Histórico de Saúde e Clínico',
    [
      ['Doenças diagnosticadas', (a) => a.conditions],
      ['Dores, tonturas ou falta de ar durante esforço', (a) => a.effortSymptoms],
      ['Lesões atuais ou cirurgias recentes', (a) => a.injuries],
      ['Medicamentos em uso contínuo', (a) => a.medications],
      [
        'Histórico familiar de doenças cardíacas graves antes dos 50 anos',
        (a) => a.familyHeartHistory,
      ],
    ],
  ],
  [
    '5. Hábitos de Vida',
    [
      ['Qualidade do sono', (a) => a.sleep],
      ['Hidratação diária estimada', (a) => a.hydration],
      ['Tabagismo / Consumo de álcool', (a) => a.smokingAlcohol],
    ],
  ],
]

export function AnamneseScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [consent, setConsent] = useState(false)

  // Mesma chave do portão: já vem do cache, sem outra requisição
  const anamnese = useQuery({
    queryKey: ['anamnesis', user?.id],
    queryFn: () => api(`/anamnesis/${user?.id}`, anamnesisSchema.nullable()),
    enabled: !!user,
  })

  const autorizar = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sessão expirada')
      if (!consent) throw new Error('Autorize o uso dos seus dados de saúde para continuar')
      return api(`/anamnesis/${user.id}/consent`, anamnesisSchema, { method: 'POST' })
    },
    // Preenche o cache que o portão lê: sem isso ele buscaria de novo e piscaria esta tela
    onSuccess: (anamnesis) => {
      queryClient.setQueryData(['anamnesis', user?.id], anamnesis)
      router.replace('/(aluno)/(tabs)')
    },
  })

  const data = anamnese.data
  return (
    <AuthLayout
      hideBack
      title="Confira sua avaliação"
      subtitle="Estes são os dados que o seu instrutor registrou. Autorize o uso para liberar seus treinos."
      error={autorizar.error?.message}
      footer={
        <Button
          title="Continuar"
          onPress={() => autorizar.mutate()}
          loading={autorizar.isPending}
        />
      }
    >
      {data &&
        sections.map(([title, rows]) => (
          <Card key={title}>
            <Text style={styles.section}>{title}</Text>
            {rows.map(([label, value]) => (
              <View key={label} style={styles.row}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value(data) || '—'}</Text>
              </View>
            ))}
          </Card>
        ))}
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
        Algum dado errado? Fale com o seu instrutor: ele corrige na próxima avaliação.
      </Text>
    </AuthLayout>
  )
}
