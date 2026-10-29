import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { lunaDataset } from '@/data/luna/mock'
import type { AtRiskCase, LunaCase, LunaCustomer, LunaDataset, SalesOpportunity } from '@/data/luna/types'
import { useWorkspace } from '@/store/krew'
import { useLunaStore, type CaseUpdate } from '@/store/luna'

export interface LunaData extends LunaDataset {
  customer: (id: string) => LunaCustomer
  cases: LunaCase[]
}

/** The active workspace's Luna records: the seeded sample with a person's case decisions applied. */
export function useLunaData(): LunaData {
  const ws = useWorkspace()
  const seed = useMemo(() => lunaDataset(ws.id), [ws.id])
  const stored = useLunaStore((s) => s.workspaces[ws.id])
  return useMemo(() => {
    const apply = <T extends SalesOpportunity | AtRiskCase>(c: T): T => {
      const u = stored?.updates[c.id]
      return u ? { ...c, status: u.status, orderRef: u.orderRef, reason: u.reason, note: u.note, statusChangedAt: u.at } : c
    }
    const opportunities = seed.opportunities.map(apply)
    const risks = seed.risks.map(apply)
    const byId = new Map(seed.customers.map((c) => [c.id, c]))
    return {
      ...seed,
      opportunities,
      risks,
      cases: [...opportunities, ...risks],
      events: [...seed.events, ...(stored?.events ?? [])],
      customer: (id: string) => byId.get(id)!,
    }
  }, [seed, stored])
}

/** A person's status decisions. Luna never changes a status herself. */
export function useCaseActions() {
  const ws = useWorkspace()
  const set = useLunaStore((s) => s.setCaseStatus)
  return useCallback((c: LunaCase, update: Omit<CaseUpdate, 'at'>) => set(ws.id, c.id, c.status, update), [ws.id, set])
}

/**
 * Which record is open in the focused sheet. Kept in the URL so any section can open any record and links reopen it:
 * ?conversation=, ?case=, ?insight= (an insight can also hold a conversation, shown with a trail back).
 */
export function useLunaSheet() {
  const [params, setParams] = useSearchParams()
  const open = useCallback(
    (next: { conversation?: string; case?: string; insight?: string }) =>
      setParams((p) => {
        const out = new URLSearchParams(p)
        for (const k of ['conversation', 'case', 'insight'] as const) {
          if (next[k]) out.set(k, next[k]!)
          else out.delete(k)
        }
        return out
      }),
    [setParams],
  )
  return {
    conversation: params.get('conversation'),
    case: params.get('case'),
    insight: params.get('insight'),
    open,
    close: () => open({}),
  }
}
