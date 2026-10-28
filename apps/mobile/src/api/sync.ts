// Fila de escritas do treino (RNF03). São mutações do TanStack com a mesma chave: rodam uma por vez
// e na ordem (scope); sem rede ficam pausadas e vão para o AsyncStorage com o cache, e saem
// sozinhas quando a conexão volta. Reenviar não duplica: a sessão tem id gerado no app e as
// séries são idempotentes na API.
// ponytail: a API carimba início e fim do treino quando a escrita chega, então treino que só
// sincroniza no dia seguinte conta no dia seguinte (sequência, RN08). Se acontecer na academia,
// mandar startedAt/finishedAt do aparelho no POST /sessions e no finish.
import { onlineManager, type QueryClient, useMutation } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { ApiError, api } from './client'

export type SyncOp = { path: string; method: 'POST' | 'PUT' | 'DELETE'; body?: unknown }

export const syncKey = ['sync']

export function registerSync(queryClient: QueryClient) {
  queryClient.setMutationDefaults(syncKey, {
    mutationFn: ({ path, method, body }: SyncOp) => api(path, z.unknown(), { method, body }),
    scope: { id: 'sync' },
    // Só falta de rede volta para a fila; erro da API (4xx) não melhora reenviando
    retry: (_, error) => error instanceof ApiError && error.status === 0,
  })
}

// mutationFn vem do registerSync: depois de reabrir o app a mutação persistida só tem a chave
export const useSync = (options: { onSuccess?: () => void } = {}) =>
  useMutation<unknown, Error, SyncOp>({ mutationKey: syncKey, ...options })

export const useOnline = () =>
  useSyncExternalStore(onlineManager.subscribe, () => onlineManager.isOnline())

// Id da sessão gerado no app (a API aceita de 8 a 64 caracteres)
export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
