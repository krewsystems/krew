import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CaseEvent, OpportunityStatus, RiskStatus } from '@/data/luna/types'
import { useKrew } from './krew'

// Luna's case decisions for the demo, per workspace, saved in the browser.
// Conversations, analysis and insights are read-only (Luna produces them). The only writes are a person's
// status changes on opportunities and at-risk cases, each one a future backend operation:
// opportunity: new, followed up, converted (with order evidence), closed (with a reason), reopened;
// at-risk case: open, in progress, resolved (with a note), dismissed (with a reason), reopened.

/** A person's latest decision on one case. Replaces the seeded status and fields. */
export interface CaseUpdate {
  status: OpportunityStatus | RiskStatus
  at: string
  orderRef?: string
  reason?: string
  note?: string
}

interface Lists {
  updates: Record<string, CaseUpdate>
  events: CaseEvent[]
}

interface LunaState {
  workspaces: Record<string, Lists>
  setCaseStatus: (ws: string, caseId: string, from: CaseUpdate['status'], update: Omit<CaseUpdate, 'at'>) => void
  resetAll: () => void
}

export const useLunaStore = create<LunaState>()(
  persist(
    (set) => ({
      workspaces: {},
      setCaseStatus: (ws, caseId, from, update) =>
        set((s) => {
          const at = new Date().toISOString()
          const lists = s.workspaces[ws] ?? { updates: {}, events: [] }
          const note = update.status === 'converted' && update.orderRef ? [`Order ${update.orderRef}`, update.note].filter(Boolean).join('. ') : [update.reason, update.note].filter(Boolean).join('. ')
          const event: CaseEvent = { id: `ev-${caseId}-${Date.now()}`, caseId, at, by: 'you', kind: 'status_changed', from, to: update.status, note: note || undefined }
          return { workspaces: { ...s.workspaces, [ws]: { updates: { ...lists.updates, [caseId]: { ...update, at } }, events: [...lists.events, event] } } }
        }),
      resetAll: () => set({ workspaces: {} }),
    }),
    { name: 'krew-luna-demo', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
)

// "Reset demo data" in KREW reseeds every workspace; Luna's case decisions follow it.
useKrew.subscribe((state, prev) => {
  if (state.seededAt !== prev.seededAt) useLunaStore.getState().resetAll()
})
