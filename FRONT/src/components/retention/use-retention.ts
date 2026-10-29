import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLunaData, type LunaData } from '@/components/luna/use-luna'
import type { LunaCase, LunaConversation, LunaCustomer } from '@/data/luna/types'
import { retentionDataset } from '@/data/retention/mock'
import type { Outcome, RetentionCase, RetentionEvent } from '@/data/retention/types'
import { lane, notTakenReason, readiness, type Lane, type Readiness } from '@/lib/retention'
import { useWorkspace } from '@/store/krew'
import { useLunaStore } from '@/store/luna'
import { useRetentionStore } from '@/store/retention'

/** One Retention case joined to the Luna records it came from. */
export interface RetentionItem {
  rc: RetentionCase
  customer: LunaCustomer
  conv: LunaConversation
  luna?: LunaCase
  readiness: Readiness
  lane: Lane
  /** The draft as it stands now: the person's edit if there is one. */
  draftText: string
  edited: boolean
  /**
   * Money attached to the follow-up, from list prices (never revenue). Sales: Luna's possible order value.
   * Recovery: the value of the products in the order that went wrong, which is what the customer's trust is tied to.
   */
  value: number
}

export interface RetentionData {
  items: RetentionItem[]
  events: RetentionEvent[]
  luna: LunaData
  /** Luna cases that did not become follow-ups, with the reason. */
  notTaken: { c: LunaCase; reason: string }[]
  /** Luna conversations with no case and no follow-up: routine questions, order updates, praise. */
  routineCount: number
  productName: (id: string) => string
}

export function useRetentionData(): RetentionData {
  const ws = useWorkspace()
  const luna = useLunaData()
  const seed = useMemo(() => retentionDataset(ws.id), [ws.id])
  const stored = useRetentionStore((s) => s.workspaces[ws.id])
  return useMemo(() => {
    const productName = (id: string) => luna.products.find((p) => p.id === id)?.name ?? id
    const listValue = (ids: string[]) => ids.reduce((s, id) => s + (luna.products.find((p) => p.id === id)?.price ?? 0), 0)
    const items = seed.cases.map((base): RetentionItem => {
      const ch = stored?.changes[base.id]
      const rc: RetentionCase = ch
        ? {
            ...base,
            status: ch.status ?? base.status,
            preparedAt: ch.preparedAt ?? base.preparedAt,
            sentAt: ch.sentAt ?? base.sentAt,
            sentText: ch.sentText ?? base.sentText,
            outcome: ch.outcome === null ? undefined : (ch.outcome ?? base.outcome),
            dismissReason: ch.dismissReason === null ? undefined : (ch.dismissReason ?? base.dismissReason),
          }
        : base
      const conv = luna.conversations.find((c) => c.id === rc.conversationId)!
      const lunaCase = rc.lunaCaseId ? luna.cases.find((c) => c.id === rc.lunaCaseId) : undefined
      const r = readiness(rc, lunaCase, conv, productName)
      const value = lunaCase?.type === 'opportunity' && lunaCase.estimatedValue !== undefined ? lunaCase.estimatedValue : listValue(rc.productIds)
      return { rc, customer: luna.customer(rc.customerId), conv, luna: lunaCase, readiness: r, lane: lane(rc, r), draftText: ch?.draftText ?? rc.draft.text, edited: ch?.draftText !== undefined && ch.draftText !== rc.draft.text, value }
    })
    const taken = new Set(seed.cases.map((c) => c.lunaCaseId).filter(Boolean))
    const takenConvs = new Set(seed.cases.map((c) => c.conversationId))
    const notTaken = luna.cases.filter((c) => !taken.has(c.id)).map((c) => ({ c, reason: notTakenReason(c) }))
    const routineCount = luna.conversations.filter((c) => !takenConvs.has(c.id) && !luna.cases.some((k) => k.conversationId === c.id)).length
    return { items, events: [...seed.events, ...(stored?.events ?? [])], luna, notTaken, routineCount, productName }
  }, [seed, stored, luna])
}

/** A person's actions on a follow-up. Nothing here contacts a customer: "sent" records what a person did themselves. */
export function useRetentionActions() {
  const ws = useWorkspace()
  const change = useRetentionStore((s) => s.change)
  const setLuna = useLunaStore((s) => s.setCaseStatus)
  return useMemo(() => {
    const now = () => new Date().toISOString()
    return {
      saveDraft: (it: RetentionItem, text: string) => change(ws.id, it.rc.id, { draftText: text }, { kind: 'draft_edited' }),
      resetDraft: (it: RetentionItem) => change(ws.id, it.rc.id, { draftText: it.rc.draft.text }, { kind: 'draft_edited', note: 'Back to Retention’s draft' }),
      prepare: (it: RetentionItem, text: string) => change(ws.id, it.rc.id, { status: 'prepared', draftText: text, preparedAt: now() }, { kind: 'prepared' }),
      markSent: (it: RetentionItem, text: string) => change(ws.id, it.rc.id, { status: 'sent', draftText: text, sentText: text, sentAt: now() }, { kind: 'sent', note: 'Sent by hand in Instagram' }),
      recordOutcome: (it: RetentionItem, outcome: Omit<Outcome, 'at'>) => {
        change(ws.id, it.rc.id, { status: 'done', outcome: { ...outcome, at: now() } }, { kind: 'outcome', note: [outcome.orderRef && `Order ${outcome.orderRef}`, outcome.note].filter(Boolean).join('. ') || undefined })
        // A purchase is one fact: it also converts Luna's opportunity, still as the person's decision.
        if (outcome.kind === 'bought' && it.luna?.type === 'opportunity' && it.luna.status !== 'converted')
          setLuna(ws.id, it.luna.id, it.luna.status, { status: 'converted', orderRef: outcome.orderRef, note: 'Recorded from a Retention follow-up' })
      },
      dismiss: (it: RetentionItem, reason: string) => change(ws.id, it.rc.id, { status: 'dismissed', dismissReason: reason }, { kind: 'dismissed', note: reason }),
      /** Done goes back to waiting for an outcome; dismissed goes back to where it was before. */
      reopen: (it: RetentionItem) =>
        change(ws.id, it.rc.id, { status: it.rc.status === 'done' && it.rc.sentAt ? 'sent' : it.rc.preparedAt ? 'prepared' : 'suggested', outcome: null, dismissReason: null }, { kind: 'reopened' }),
    }
  }, [ws.id, change, setLuna])
}

export function useRetentionSheet() {
  const [params, setParams] = useSearchParams()
  const open = useCallback(
    (id: string | null) =>
      setParams((p) => {
        const out = new URLSearchParams(p)
        if (id) out.set('case', id)
        else out.delete('case')
        return out
      }),
    [setParams],
  )
  return { caseId: params.get('case'), open }
}
