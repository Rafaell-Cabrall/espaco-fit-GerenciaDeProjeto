// Datas civis: evita que horário e mudanças de fuso alterem o progresso do período.
export function periodProgress(startsOn: string, endsOn: string, now = new Date()) {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const start = Date.parse(`${startsOn}T00:00:00Z`)
  const end = Date.parse(`${endsOn}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.min(100, Math.max(0, Math.round(((today - start) / (end - start)) * 100)))
}
