// URL pré-assinada S3 (SigV4) para o MinIO, sem AWS SDK. O host do S3_ENDPOINT entra na assinatura:
// precisa ser o endereço que o celular alcança.
import { createHash, createHmac } from 'node:crypto'
import { env } from './env.ts'

const hmac = (key: string | Buffer, data: string) => createHmac('sha256', key).update(data).digest()
const sha256 = (data: string) => createHash('sha256').update(data).digest('hex')

export function presign(method: 'GET' | 'PUT', key: string, expiresSeconds = 3600) {
  const url = new URL(`${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`)
  const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '') // 20260916T120000Z
  const scope = `${amzDate.slice(0, 8)}/${env.S3_REGION}/s3/aws4_request`
  url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256')
  url.searchParams.set('X-Amz-Credential', `${env.S3_ACCESS_KEY}/${scope}`)
  url.searchParams.set('X-Amz-Date', amzDate)
  url.searchParams.set('X-Amz-Expires', String(expiresSeconds))
  url.searchParams.set('X-Amz-SignedHeaders', 'host')
  url.searchParams.sort()

  const canonical = [
    method,
    url.pathname,
    url.search.slice(1),
    `host:${url.host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ]
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical.join('\n'))].join('\n')
  let signingKey: Buffer = hmac(`AWS4${env.S3_SECRET_KEY}`, amzDate.slice(0, 8))
  for (const part of [env.S3_REGION, 's3', 'aws4_request']) signingKey = hmac(signingKey, part)
  url.searchParams.set(
    'X-Amz-Signature',
    createHmac('sha256', signingKey).update(toSign).digest('hex'),
  )
  return url.toString()
}

export const mediaUrl = (key: string | null) => key && presign('GET', key)
