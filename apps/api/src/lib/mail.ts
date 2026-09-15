// Envio de e-mail por SMTP (Gmail, Brevo ou qualquer provedor). Só o worker chama; a API enfileira o job 'email'.
import nodemailer from 'nodemailer'
import { env } from './env.ts'

export type Mail = { to: string; subject: string; text: string }

const transport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // 465 = TLS direto; 587 = STARTTLS
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null

export async function sendMail(mail: Mail) {
  if (!transport) {
    // Em produção isso vazaria o código de recuperação no log
    if (process.env.NODE_ENV === 'production') throw new Error('SMTP_HOST não configurado')
    console.log(`[dev] e-mail para ${mail.to}: ${mail.subject}\n${mail.text}`)
    return
  }
  const from = env.MAIL_FROM || `Espaço Fit <${env.SMTP_USER || 'no-reply@espacofit.local'}>`
  await transport.sendMail({ from, ...mail })
}
