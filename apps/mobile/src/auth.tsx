// Sessão do usuário logado. `user === undefined` = ainda carregando.
import { authResponseSchema, type LoginInput, type User, userSchema } from '@espacofit/shared'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { api, tokens } from './api/client'

type Auth = {
  user: User | null | undefined
  login: (input: LoginInput) => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const queryClient = useQueryClient()

  useEffect(() => {
    api('/auth/me', userSchema)
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  const login = async (input: LoginInput) => {
    const data = await api('/auth/login', authResponseSchema, {
      method: 'POST',
      body: input,
      auth: false,
    })
    await tokens.set(data.accessToken, data.refreshToken)
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
