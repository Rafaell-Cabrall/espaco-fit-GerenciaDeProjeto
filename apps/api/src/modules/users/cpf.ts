import type { Prisma } from '@prisma/client'
import { HttpError } from '../../lib/http.ts'

// Trava por CPF até o fim da transação, inclusive em cadastros simultâneos.
export async function ensureAvailableCpf(
  tx: Prisma.TransactionClient,
  cpf: string,
  studentId?: string,
) {
  if (!cpf) return
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`student-cpf:${cpf}`}))::text`
  const matches = await tx.$queryRaw<{ studentId: string }[]>`
    SELECT "studentId" FROM "Anamnesis"
    WHERE regexp_replace(answers->>'cpf', '[^0-9]', '', 'g') = ${cpf}
    AND (${studentId ?? null}::text IS NULL OR "studentId" <> ${studentId ?? null}::text)
    LIMIT 1`
  if (matches.length) throw new HttpError(409, 'Já existe um aluno cadastrado com este CPF.')
}
