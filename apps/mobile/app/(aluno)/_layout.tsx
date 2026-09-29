import { anamnesisSchema } from '@espacofit/shared'
import { useQuery } from '@tanstack/react-query'
import { Redirect, Stack, usePathname } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { api } from '@/api/client'
import { homeOf, useAuth } from '@/auth'
import { Button } from '@/components/Button'
import { tokens } from '@/design-system/tokens'

// Guarda de perfil: só ALUNO entra neste grupo.
// Portão da anamnese (RN05/RN09). O instrutor cadastra a anamnese com o aluno; null = ainda não
// cadastrou, e o app espera. consentAt null = falta o aluno autorizar, e nada abre antes disso.
// Erro de rede não é null: o portão mostra o erro em vez de concluir que falta cadastro.
export default function Layout() {
  const { user } = useAuth()
  const pathname = usePathname()
  const isAluno = user?.role === 'ALUNO'
  const anamnese = useQuery({
    queryKey: ['anamnesis', user?.id],
    queryFn: () => api(`/anamnesis/${user?.id}`, anamnesisSchema.nullable()),
    enabled: isAluno,
  })

  if (user === undefined) return null
  // Deslogado vai direto para (auth): "/" daqui de dentro resolveria para o index deste grupo
  if (user === null) return <Redirect href="/(auth)" />
  if (!isAluno) return <Redirect href={homeOf(user)} />
  if (anamnese.isPending)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={tokens.colors.primary} />
      </View>
    )
  if (anamnese.isError)
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{anamnese.error.message}</Text>
        <Button
          title="Tentar de novo"
          onPress={() => anamnese.refetch()}
          loading={anamnese.isFetching}
        />
      </View>
    )
  if (anamnese.data === null)
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          Seu cadastro ainda não tem a avaliação física. Procure seu instrutor para liberar os
          treinos.
        </Text>
        <Button
          title="Tentar de novo"
          onPress={() => anamnese.refetch()}
          loading={anamnese.isFetching}
        />
      </View>
    )

  // O Stack fica montado sempre: a rota da anamnese vive dentro dele, e devolver o <Redirect> no
  // lugar dele deixaria o destino sem navegador onde montar — tela branca.
  // endsWith e não igualdade: o grupo some da URL, mas um laço de redirect aqui trava o app.
  return (
    <>
      {anamnese.data.consentAt === null && !pathname.endsWith('/anamnese') && (
        <Redirect href="/(aluno)/anamnese" />
      )}
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 20,
    backgroundColor: tokens.colors.background,
  },
  message: {
    color: tokens.colors.textSecondary,
    fontFamily: tokens.fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
})
