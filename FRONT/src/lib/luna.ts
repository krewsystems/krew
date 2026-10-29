import type { AtRiskCase, LunaCase, LunaConversation, LunaDataset, SalesOpportunity, Sentiment, TopicId } from '@/data/luna/types'

// Luna's derived figures. Pure and deterministic: every count on screen is computed from the same records,
// so the Pulse, Opportunities, Conversations and Insights always agree.

const DAY = 86_400_000

export const isOpenOpportunity = (o: SalesOpportunity) => o.status === 'new' || o.status === 'followed_up'
export const isActiveRisk = (r: AtRiskCase) => r.status === 'open' || r.status === 'in_progress'
export const isActiveCase = (c: LunaCase) => (c.type === 'opportunity' ? isOpenOpportunity(c) : isActiveRisk(c))

/** Customer messages at the end of the thread with no brand reply after them. */
export function unansweredCount(conv: LunaConversation): number {
  let n = 0
  for (let i = conv.messages.length - 1; i >= 0 && conv.messages[i].from === 'customer'; i--) n++
  return n
}

export const lastMessage = (conv: LunaConversation) => conv.messages[conv.messages.length - 1]
export const lastActivity = (conv: LunaConversation) => lastMessage(conv).at

/** How long the oldest unanswered customer message has waited, in hours. */
export function waitingHours(conv: LunaConversation, now = Date.now()): number {
  const n = unansweredCount(conv)
  if (!n) return 0
  return (now - new Date(conv.messages[conv.messages.length - n].at).getTime()) / 3_600_000
}

export function casesFor(conversationId: string, cases: LunaCase[]): LunaCase[] {
  return cases.filter((c) => c.conversationId === conversationId)
}

/**
 * A conversation needs attention only when Luna opened an at-risk case on it that is still active.
 * A thread that simply ends with the customer's "thanks" is not waiting for anything, so silence alone never flags it.
 */
export function needsAttention(conv: LunaConversation, risks: AtRiskCase[]): boolean {
  return risks.some((r) => r.conversationId === conv.id && isActiveRisk(r))
}

// ---------------------------------------------------------------------------
// Pulse

export function inWindow(iso: string, fromDaysAgo: number, toDaysAgo: number, now = Date.now()): boolean {
  const t = new Date(iso).getTime()
  return t > now - fromDaysAgo * DAY && t <= now - toDaysAgo * DAY
}

export interface SentimentSplit {
  positive: number
  neutral: number
  mixed: number
  negative: number
  total: number
}

export function sentimentSplit(convs: LunaConversation[]): SentimentSplit {
  const s: SentimentSplit = { positive: 0, neutral: 0, mixed: 0, negative: 0, total: convs.length }
  for (const c of convs) s[c.analysis.sentiment]++
  return s
}

/** Share of conversations that are positive, minus the share that are negative, on a 0 to 100 scale. 50 is balanced. */
export function sentimentScore(split: SentimentSplit): number | null {
  if (!split.total) return null
  return Math.round(50 + ((split.positive - split.negative) / split.total) * 50)
}

export function sentimentLabel(score: number | null): string {
  if (score === null) return 'No conversations'
  if (score >= 65) return 'Mostly positive'
  if (score >= 50) return 'Balanced'
  if (score >= 38) return 'Mixed'
  return 'Mostly negative'
}

export interface PulseStats {
  analyzed: number
  analyzedPrev: number
  openOpportunities: number
  highIntent: number
  pipelineValue: number
  attention: number
  attentionHigh: number
  sentiment: { score: number | null; prev: number | null; split: SentimentSplit }
}

/** The four headline figures. "This week" is the last 7 days of conversation activity. */
export function pulseStats(data: { conversations: LunaConversation[]; opportunities: SalesOpportunity[]; risks: AtRiskCase[] }, now = Date.now()): PulseStats {
  const week = data.conversations.filter((c) => inWindow(lastActivity(c), 7, 0, now))
  const prevWeek = data.conversations.filter((c) => inWindow(lastActivity(c), 14, 7, now))
  const open = data.opportunities.filter(isOpenOpportunity)
  const active = data.risks.filter(isActiveRisk)
  const split = sentimentSplit(week)
  return {
    analyzed: week.length,
    analyzedPrev: prevWeek.length,
    openOpportunities: open.length,
    highIntent: open.filter((o) => o.intent === 'high').length,
    pipelineValue: open.reduce((s, o) => s + (o.estimatedValue ?? 0), 0),
    attention: active.length,
    attentionHigh: active.filter((r) => r.priority === 'high').length,
    sentiment: { score: sentimentScore(split), prev: sentimentScore(sentimentSplit(prevWeek)), split },
  }
}

/** Customer messages per day for the last `days` days, oldest first. */
export function messageActivity(convs: LunaConversation[], days = 14, now = Date.now()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const out = Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getTime() - (days - 1 - i) * DAY)
    return { date: d, customer: 0, negative: 0 }
  })
  for (const c of convs)
    for (const m of c.messages) {
      if (m.from !== 'customer') continue
      const t = new Date(m.at)
      t.setHours(0, 0, 0, 0)
      const idx = Math.round((t.getTime() - out[0].date.getTime()) / DAY)
      if (idx >= 0 && idx < days) {
        out[idx].customer++
        if (c.analysis.sentiment === 'negative') out[idx].negative++
      }
    }
  return out
}

export function topicCounts(convs: LunaConversation[]): { topic: TopicId; count: number; conversationIds: string[] }[] {
  const map = new Map<TopicId, string[]>()
  for (const c of convs) for (const t of c.analysis.topics) map.set(t, [...(map.get(t) ?? []), c.id])
  return [...map.entries()].map(([topic, ids]) => ({ topic, count: ids.length, conversationIds: ids })).sort((a, b) => b.count - a.count)
}

export interface ProductMention {
  productId: string
  name: string
  conversationIds: string[]
  negative: number
  opportunities: number
}

export function productMentions(data: Pick<LunaDataset, 'conversations' | 'products' | 'opportunities'>): ProductMention[] {
  const rows = new Map<string, ProductMention>()
  for (const c of data.conversations)
    for (const p of new Set(c.analysis.products.map((x) => x.productId))) {
      const row = rows.get(p) ?? { productId: p, name: data.products.find((x) => x.id === p)?.name ?? p, conversationIds: [], negative: 0, opportunities: 0 }
      row.conversationIds.push(c.id)
      if (c.analysis.sentiment === 'negative') row.negative++
      rows.set(p, row)
    }
  for (const o of data.opportunities) for (const p of o.productIds) if (rows.has(p) && isOpenOpportunity(o)) rows.get(p)!.opportunities++
  return [...rows.values()].sort((a, b) => b.conversationIds.length - a.conversationIds.length)
}

// ---------------------------------------------------------------------------
// Search

export function matchesQuery(conv: LunaConversation, customerName: string, handle: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    customerName.toLowerCase().includes(q) ||
    handle.toLowerCase().includes(q) ||
    conv.analysis.summary.toLowerCase().includes(q) ||
    conv.messages.some((m) => m.text.toLowerCase().includes(q))
  )
}

export const SENTIMENT_ORDER: Sentiment[] = ['negative', 'mixed', 'neutral', 'positive']
