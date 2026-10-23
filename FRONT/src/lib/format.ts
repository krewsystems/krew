const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now
  const abs = Math.abs(diff)
  const min = 60_000
  if (abs < min) return diff <= 0 ? 'Just now' : 'In a moment'
  if (abs < 60 * min) return rtf.format(Math.round(diff / min), 'minute')
  if (abs < 24 * 60 * min) return rtf.format(Math.round(diff / (60 * min)), 'hour')
  if (abs < 7 * 24 * 60 * min) return rtf.format(Math.round(diff / (24 * 60 * min)), 'day')
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

/** Compact relative label: "4m", "3h", "2d". */
export function shortAgo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const m = Math.round(diff / 60_000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
}

export function dayGroup(iso: string, now = Date.now()): 'Today' | 'Yesterday' | 'Earlier this week' | 'Earlier' {
  const d = new Date(iso)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const t = d.getTime()
  if (t >= today.getTime()) return 'Today'
  if (t >= today.getTime() - 86_400_000) return 'Yesterday'
  if (t >= today.getTime() - 6 * 86_400_000) return 'Earlier this week'
  return 'Earlier'
}

export function money(value: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact && Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(value >= 100_000 ? 0 : 1)}K`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export function number(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function longDate(date = new Date()): string {
  return date.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })
}
