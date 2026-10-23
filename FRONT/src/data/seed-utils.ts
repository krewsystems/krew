import { getAgent } from './agents'
import type { AgentSettings, DailyPoint } from './types'

/** ISO timestamp `minutes` before the moment the seed is built. */
export function ago(minutes: number, base = Date.now()): string {
  return new Date(base - minutes * 60_000).toISOString()
}

export function ahead(minutes: number, base = Date.now()): string {
  return new Date(base + minutes * 60_000).toISOString()
}

export const H = 60
export const D = 24 * 60

/** Deterministic pseudo-random generator so every reset produces the same demo. */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function buildDaily(seed: number, baseRevenue: number, baseOrders: number, baseConv: number): DailyPoint[] {
  const rand = rng(seed)
  const out: DailyPoint[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 59; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000)
    const weekday = d.getDay()
    const weekend = weekday === 5 || weekday === 6 ? 1.14 : 1
    const trend = 1 + (59 - i) * 0.0035
    const noise = 0.86 + rand() * 0.28
    const revenue = Math.round(baseRevenue * weekend * trend * noise)
    const prevNoise = 0.84 + rand() * 0.26
    out.push({
      date: d.toISOString().slice(0, 10),
      revenue,
      revenuePrev: Math.round(baseRevenue * 0.9 * weekend * prevNoise),
      orders: Math.round(baseOrders * weekend * trend * (0.86 + rand() * 0.28)),
      conversations: Math.round(baseConv * (0.8 + rand() * 0.4) * (i < 3 ? 1.35 : 1)),
    })
  }
  return out
}

export function defaultSettings(agentId: string, overrides: Partial<AgentSettings> = {}): AgentSettings {
  const agent = getAgent(agentId)
  return {
    displayName: agent.name,
    personality: agentId === 'tracker' ? 'analytical' : agentId === 'manager' ? 'concise' : 'warm',
    accent: agent.accent,
    schedule: agent.defaultSchedule,
    capabilities: Object.fromEntries(agent.capabilities.map((c) => [c.title, true])),
    notifyTelegram: true,
    notifyWeb: true,
    notifyDigest: agentId !== 'manager',
    approvalMode: 'high-impact',
    autonomy: 40,
    ...overrides,
  }
}

let counter = 0
export function uid(prefix: string): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}
