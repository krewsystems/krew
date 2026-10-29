import type { LunaCase, LunaConversation } from '@/data/luna/types'
import type { RetentionCase, WaitFor } from '@/data/retention/types'

// Retention's rules over Luna's records. Pure: readiness is recomputed from Luna's current state every time,
// so resolving a case in Luna makes its follow-up ready here without any copy to keep in sync.

/** `short` is a two or three word version for table cells. */
export type Readiness =
  | { state: 'ready'; reason: string; short: string }
  | { state: 'waiting'; reason: string; short: string }
  /** Luna's record moved on (converted, dismissed, closed as no contact): the follow-up is no longer needed. */
  | { state: 'closed_by_luna'; reason: string; short: string }

export type Lane = 'ready' | 'waiting' | 'sent' | 'done'

const HOUR = 3_600_000
const NO_CONTACT = ['Not interested', 'Asked not to be contacted']

/** Hours since the customer last wrote. */
export function customerQuietHours(conv: LunaConversation, now = Date.now()): number {
  const lastCustomer = [...conv.messages].reverse().find((m) => m.from === 'customer')
  return lastCustomer ? (now - new Date(lastCustomer.at).getTime()) / HOUR : Infinity
}

function waitReason(w: WaitFor, conv: LunaConversation, productName: (id: string) => string, now: number): { reason: string; short: string } | null {
  switch (w.kind) {
    case 'restock':
      return { reason: `Waiting for the ${w.variant ? `${w.variant} ` : ''}${productName(w.productId)} to be back in stock (expected ${w.expected}).`, short: 'Restock' }
    case 'date': {
      const day = new Date(w.at).toLocaleDateString('en', { month: 'short', day: 'numeric' })
      return new Date(w.at).getTime() > now ? { reason: `Planned for ${w.label}, ${day}.`, short: `${w.label}, ${day}` } : null
    }
    case 'event':
      return { reason: `Waiting until: ${w.label.charAt(0).toLowerCase()}${w.label.slice(1)}.`, short: 'An event' }
    case 'quiet': {
      const h = customerQuietHours(conv, now)
      return h < w.hours ? { reason: `Too soon. The customer wrote ${Math.round(h)} hours ago; give it ${Math.ceil(w.hours - h)} more.`, short: `In ${Math.ceil(w.hours - h)}h` } : null
    }
  }
}

/** Whether the follow-up can go now, and why not. Luna's case comes first, then Retention's own conditions. */
export function readiness(rc: RetentionCase, luna: LunaCase | undefined, conv: LunaConversation, productName: (id: string) => string, now = Date.now()): Readiness {
  if (luna?.type === 'risk') {
    if (luna.status === 'dismissed') return { state: 'closed_by_luna', reason: 'Luna’s case was dismissed, so there is nothing to recover.', short: 'Dismissed in Luna' }
    if (luna.status !== 'resolved') return { state: 'waiting', reason: `Luna’s case is still ${luna.status === 'open' ? 'open' : 'in progress'}. A recovery message only makes sense once the problem is fixed.`, short: 'Fix first' }
  }
  if (luna?.type === 'opportunity') {
    if (luna.status === 'converted') return { state: 'closed_by_luna', reason: `Marked converted in Luna${luna.orderRef ? ` (order ${luna.orderRef})` : ''}. No follow-up needed.`, short: 'Bought' }
    if (luna.status === 'closed' && luna.reason && NO_CONTACT.includes(luna.reason)) return { state: 'closed_by_luna', reason: `Closed in Luna as “${luna.reason.toLowerCase()}”. Not contacted again.`, short: 'Closed in Luna' }
    if (luna.orderMatch && (luna.status === 'new' || luna.status === 'followed_up')) return { state: 'waiting', reason: 'Luna found a possible order. Confirm it in Luna first; following up someone who already bought is worse than not following up.', short: 'Confirm order' }
  }
  for (const w of rc.waitFor ?? []) {
    const r = waitReason(w, conv, productName, now)
    if (r) return { state: 'waiting', ...r }
  }
  return { state: 'ready', reason: 'Ready when you are.', short: 'Ready' }
}

export function lane(rc: RetentionCase, r: Readiness): Lane {
  if (rc.status === 'sent') return 'sent'
  if (rc.status === 'done' || rc.status === 'dismissed' || r.state === 'closed_by_luna') return 'done'
  return r.state === 'ready' ? 'ready' : 'waiting'
}

/** Why a Luna case did not become a Retention case. Shown so the owner can trust what is missing. */
export function notTakenReason(c: LunaCase): string {
  if (c.type === 'opportunity') {
    if (c.status === 'converted') return 'Already bought.'
    if (c.orderMatch) return 'Luna found a possible order. Confirm it in Luna first.'
    if (c.status === 'closed') return c.reason && NO_CONTACT.includes(c.reason) ? 'Closed as not interested.' : `Closed in Luna (${(c.reason ?? 'no reason').toLowerCase()}). Nothing new to offer yet.`
    return 'Low intent with nothing new to say.'
  }
  if (c.status === 'dismissed') return 'Dismissed in Luna: nothing to recover.'
  return 'Not worth a follow-up on its own.'
}

/** Customer-facing channels limit when a business may write first. Shown as guidance; V1 sends nothing. */
export function channelWindow(conv: LunaConversation, now = Date.now()): { open: boolean; text: string } {
  const h = customerQuietHours(conv, now)
  if (h < 24) return { open: true, text: `Inside Instagram’s 24-hour window (customer wrote ${Math.max(1, Math.round(h))}h ago).` }
  const d = Math.round(h / 24)
  return { open: false, text: `Outside Instagram’s 24-hour window (customer wrote ${d} ${d === 1 ? 'day' : 'days'} ago). Send it yourself from the Instagram app.` }
}
