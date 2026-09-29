// Envio de e-mail por SMTP (Gmail, Brevo ou qualquer provedor). Só o worker chama; a API enfileira o job 'email'.
import { fileURLToPath } from 'node:url'
import nodemailer from 'nodemailer'
import { env } from './env.ts'

// Cópia recortada e reduzida de apps/mobile/assets/logo.png (a original tem 557 KB)
const logoPath = fileURLToPath(new URL('../../assets/email-logo.png', import.meta.url))

export type Mail = { to: string; subject: string; text: string; html?: string }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

// E-mail com código em destaque (recuperação de senha e, depois, convite). Vai em HTML + texto:
// cliente sem HTML lê o texto, e mandar os dois pesa a favor nos filtros de spam.
// CSS inline e tabela porque Gmail/Outlook ignoram <style> e flexbox.
export function codeMail(
  to: string,
  subject: string,
  name: string,
  intro: string,
  code: string,
  outro: string,
): Mail {
  const text = `Olá, ${name}!\n\n${intro}\n\n${code}\n\n${outro}\n\nEspaço Fit`
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f2f2f2">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c">
<tr><td style="background:#0a0a0a;padding:24px;text-align:center;font-size:22px;font-weight:bold;letter-spacing:2px;color:#f0f0f0"><img src="cid:logo" width="240" height="76" alt="ESPAÇO FIT" style="display:block;margin:0 auto;border:0"></td></tr>
<tr><td style="padding:32px 28px 8px;font-size:16px;line-height:24px">
<p style="margin:0 0 16px;font-size:20px;font-weight:bold">Olá, ${esc(name)}!</p>
<p style="margin:0 0 24px">${esc(intro)}</p>
<div style="margin:0 0 24px;padding:18px;background:#f7f7f7;border:2px dashed #d50517;border-radius:10px;text-align:center;font-size:34px;font-weight:bold;letter-spacing:10px;color:#0a0a0a">${esc(code)}</div>
<p style="margin:0 0 24px;color:#555555;font-size:14px;line-height:20px">${esc(outro)}</p>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #eeeeee;text-align:center;font-size:12px;color:#888888">Espaço Fit · Este é um e-mail automático, não responda.</td></tr>
</table></td></tr></table></body></html>`
  return { to, subject, text, html }
}

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
  // Logo anexada ao e-mail (cid:logo): não depende de URL pública e o Gmail exibe sem "mostrar imagens".
  // Entra aqui, não no job, para o arquivo não passar pelo Redis.
  const attachments = mail.html
    ? [{ filename: 'logo.png', path: logoPath, cid: 'logo' }]
    : undefined
  await transport.sendMail({ from, ...mail, attachments })
}
