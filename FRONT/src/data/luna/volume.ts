import { moduleData } from '@/data/modules'
import { rng } from '@/data/seed-utils'

// How many DMs Luna classified per day, by what the conversation is about. Precomputed sample.
// This is the volume behind the "what your DMs are about" chart; the detailed threads in mock.ts are a sample of it.
// The last 7 days match the brand's existing weekly figures (the Overview card), the 7 days before match last week.

export type MixKey = 'pre_purchase' | 'order_status' | 'compliments' | 'complaints' | 'returns'

export const MIX: { key: MixKey; label: string }[] = [
  { key: 'pre_purchase', label: 'Pre-purchase questions' },
  { key: 'order_status', label: 'Order status' },
  { key: 'compliments', label: 'Compliments' },
  { key: 'complaints', label: 'Complaints' },
  { key: 'returns', label: 'Returns & exchanges' },
]

export interface VolumeDay {
  date: string
  counts: Record<MixKey, number>
}

// Twice the longest range, so every range has a previous period to compare with.
const DAYS = 180
const cache = new Map<string, VolumeDay[]>()

/** Splits a weekly total over 7 days with some day-to-day noise, keeping the exact total. */
function spread(total: number, rand: () => number): number[] {
  const w = Array.from({ length: 7 }, () => 0.75 + rand() * 0.5)
  const sum = w.reduce((s, x) => s + x, 0)
  const out = w.map((x) => Math.floor((x / sum) * total))
  for (let i = 0, rest = total - out.reduce((s, x) => s + x, 0); rest > 0; i = (i + 1) % 7, rest--) out[i]++
  return out
}

export function conversationVolume(workspaceId: string): VolumeDay[] {
  const hit = cache.get(workspaceId)
  if (hit) return hit
  // The brand's weekly topic figures, in MIX order: this week and last week.
  const topics = moduleData(workspaceId).luna.topics
  const rand = rng(workspaceId === 'noor' ? 71 : 37)
  const weeks = Math.ceil(DAYS / 7)
  const perKey = MIX.map((_, k) => {
    const t = topics[k]
    const series: number[] = []
    for (let wk = 0; wk < weeks; wk++) {
      // Week 0 is the current week; older weeks drift around last week's level.
      const total = wk === 0 ? t.value : wk === 1 ? t.prev : Math.round(t.prev * (0.85 + rand() * 0.25))
      series.unshift(...spread(total, rand))
    }
    return series.slice(-DAYS)
  })
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const out: VolumeDay[] = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today.getTime() - (DAYS - 1 - i) * 86_400_000)
    return { date: d.toISOString().slice(0, 10), counts: Object.fromEntries(MIX.map((m, k) => [m.key, perKey[k][i]])) as Record<MixKey, number> }
  })
  cache.set(workspaceId, out)
  return out
}

/** Totals by category over the last `days` days, and over the `days` before that. */
export function conversationMix(workspaceId: string, days: number) {
  const all = conversationVolume(workspaceId)
  const sum = (slice: VolumeDay[]) => MIX.map((m) => ({ ...m, value: slice.reduce((s, d) => s + d.counts[m.key], 0) }))
  const current = sum(all.slice(-days))
  const previous = sum(all.slice(-2 * days, -days))
  return { current, total: current.reduce((s, m) => s + m.value, 0), previousTotal: previous.reduce((s, m) => s + m.value, 0) }
}
