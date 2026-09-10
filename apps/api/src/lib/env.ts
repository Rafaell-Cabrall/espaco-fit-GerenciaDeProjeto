import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET precisa ter pelo menos 16 caracteres'),
  PORT: z.coerce.number().default(3000),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_BUCKET: z.string().default('media'),
  S3_ACCESS_KEY: z.string().default('espacofit'),
  S3_SECRET_KEY: z.string().default('espacofit123'),
})

export const env = schema.parse(process.env)
