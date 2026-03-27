export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDuration(
  startedAt: string,
  completedAt: string | null
): string {
  if (!completedAt) return 'In progress'
  const ms =
    new Date(completedAt).getTime() - new Date(startedAt).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export function cn(
  ...classes: (string | undefined | false | null)[]
): string {
  return classes.filter(Boolean).join(' ')
}
