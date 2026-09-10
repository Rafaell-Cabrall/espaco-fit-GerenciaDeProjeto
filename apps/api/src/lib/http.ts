import type { NextFunction, Request, Response } from 'express'
import { ZodError, type ZodType } from 'zod'

// Erro de domínio com status HTTP. Lançar de qualquer service; o errorHandler converte.
export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Valida req.body com um schema do @espacofit/shared e substitui pelo valor tipado.
export function validate<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body)
    next()
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Dados inválidos', issues: err.issues })
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
  console.error(err)
  return res.status(500).json({ error: 'Erro interno' })
}
