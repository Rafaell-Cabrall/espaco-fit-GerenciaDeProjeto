// fetch + zod. Renova o access token uma vez em 401 usando o refresh token do SecureStore.
import { authResponseSchema } from '@espacofit/shared'
import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import type { ZodType } from 'zod'

// Sem EXPO_PUBLIC_API_URL, a API é procurada na máquina que serve o Metro (hostUri = "IP:8081"):
// o IP acompanha a rede sozinho. A URL explícita fica para apontar para outro servidor.
const devHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'
const BASE =
  process.env.EXPO_PUBLIC_API_URL || `http://${devHost}:${process.env.EXPO_PUBLIC_API_PORT || 3000}`

export const tokens = {
  get: (k: 'access' | 'refresh') => SecureStore.getItemAsync(k),
  set: async (access: string, refresh: string) => {
    await SecureStore.setItemAsync('access', access)
    await SecureStore.setItemAsync('refresh', refresh)
  },
  clear: async () => {
    await SecureStore.deleteItemAsync('access')
    await SecureStore.deleteItemAsync('refresh')
  },
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// IP errado ou API fora do ar não recusam a conexão, ficam penduradas. Sem prazo, quem espera a
// resposta (AuthProvider, portão da anamnese) renderiza null para sempre: tela branca sem erro.
// AbortController na mão porque AbortSignal.timeout não é garantido no Hermes.
const TIMEOUT_MS = 10_000

async function raw(path: string, init: RequestInit, auth: boolean) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (auth) {
    const access = await tokens.get('access')
    if (access) headers.authorization = `Bearer ${access}`
  }
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
  try {
    return await fetch(BASE + path, { ...init, headers, signal: abort.signal })
  } catch {
    // status 0 = não chegou na API. A URL na mensagem é o que acha IP errado em minutos.
    throw new ApiError(0, `Sem resposta de ${BASE}. A API está no ar e o IP está certo?`)
  } finally {
    clearTimeout(timer)
  }
}

async function refresh() {
  const refreshToken = await tokens.get('refresh')
  if (!refreshToken) return false
  const res = await raw(
    '/auth/refresh',
    { method: 'POST', body: JSON.stringify({ refreshToken }) },
    false,
  )
  if (!res.ok) {
    await tokens.clear()
    return false
  }
  const data = authResponseSchema.parse(await res.json())
  await tokens.set(data.accessToken, data.refreshToken)
  return true
}

export async function api<T>(
  path: string,
  schema: ZodType<T>,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const init: RequestInit = { method: opts.method ?? 'GET' }
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body)
  const auth = opts.auth ?? true

  let res = await raw(path, init, auth)
  if (res.status === 401 && auth && (await refresh())) res = await raw(path, init, auth)

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.error ?? `Erro ${res.status}`)
  }
  if (res.status === 204) return schema.parse(undefined)
  return schema.parse(await res.json())
}
