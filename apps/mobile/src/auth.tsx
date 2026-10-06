// Sessão do usuário logado. `user === undefined` = ainda carregando.
import { authResponseSchema, type LoginInput, type User, userSchema } from '@espacofit/shared'
import { QueryClient } from '@tanstack/react-query'
import * as SecureStore from 'expo-secure-store'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { api, tokens } from './api/client'

const FORGET = 'forget-session'

// Home de cada perfil. Redirecionar para "/" de dentro de um grupo não serve: o expo-router
// resolve "/" para o index do próprio grupo, e o layout redireciona de novo em laço.
export const homeOf = (user: User | null) =>
  user
    ? ({ ALUNO: '/(aluno)/(tabs)', INSTRUTOR: '/(instrutor)', ADMIN: '/(admin)' } as const)[
        user.role
      ]
    : '/(auth)'

type Auth = {
  user: User | null | undefined
  login: (input: LoginInput, remember?: boolean) => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  // Mantém a instância estável do QueryClient para evitar falhas do useQueryClient() na montagem inicial
  const [queryClient] = useState(() => new QueryClient())

  useEffect(() => {
    // "Lembrar Acesso" desmarcado: a sessão só vale até o app fechar, então morre na abertura
    SecureStore.getItemAsync(FORGET)
      .then(async (forget) => {
        if (!forget) return api('/auth/me', userSchema)
        await Promise.all([tokens.clear(), SecureStore.deleteItemAsync(FORGET)])
        queryClient.clear()
        return null
      })
      .then(setUser)
      .catch(() => setUser(null))
  }, [queryClient])

  const login = async (input: LoginInput, remember = true) => {
    const data = await api('/auth/login', authResponseSchema, {
      method: 'POST',
      body: input,
      auth: false,
    })
    await tokens.set(data.accessToken, data.refreshToken)
    if (remember) await SecureStore.deleteItemAsync(FORGET)
    else await SecureStore.setItemAsync(FORGET, '1')
    setUser(data.user)
  }

  const logout = async () => {
    await tokens.clear()
    // O cache do TanStack é persistido em AsyncStorage: sem limpar, a anamnese e a ficha de um
    // aluno continuariam no aparelho para o próximo login (RN09).
    queryClient.clear()
    setUser(null)
  }

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}