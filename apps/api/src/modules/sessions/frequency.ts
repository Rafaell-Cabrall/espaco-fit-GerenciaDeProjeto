// Frequência (Evolução > Frequência e Home): sequência de dias corridos com treino, em Brasília
const DAY_MS = 86_400_000
const toIndex = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY_MS

// en-CA formata como AAAA-MM-DD
export const dayInSaoPaulo = (d: Date) =>
  d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

// days: ordenados e sem repetição. A sequência atual segue viva se o último treino foi hoje ou ontem.
export function streaks(days: string[], today: string) {
  let best = 0
  let run = 0
  let prev = Number.NaN
  for (const day of days) {
    const i = toIndex(day)
    run = i - prev === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = i
  }
  return { currentStreak: toIndex(today) - prev <= 1 ? run : 0, bestStreak: best }
}
