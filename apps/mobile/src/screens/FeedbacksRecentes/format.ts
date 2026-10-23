export function feedbackDate(value: string, now = new Date()) {
  const date = new Date(value)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const day =
    date.toDateString() === now.toDateString()
      ? 'Hoje'
      : date.toDateString() === yesterday.toDateString()
        ? 'Ontem'
        : date.toLocaleDateString('pt-BR')
  return `${day} · ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export function feedbackInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return [parts[0]?.[0], parts.length > 1 ? parts[parts.length - 1]?.[0] : '']
    .join('')
    .toUpperCase()
}
