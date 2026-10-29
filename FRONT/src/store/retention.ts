import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Outcome, RetentionEvent, RetentionStatus } from '@/data/retention/types'
import { useKrew } from './krew'

// Retention's follow-up decisions for the demo, per workspace, saved in the browser.
// Each action is a future backend operation: edit the draft, approve it (prepared), mark it sent (by hand in V1),
// record the outcome, dismiss, reopen. Retention's suggestions themselves live in data/retention/mock.ts.

export interface CaseChange {
  status?: RetentionStatus
  draftText?: string
  preparedAt?: string
  sentAt?: string
  sentText?: string
  outcome?: Outcome | null
  dismissReason?: string | null
}

interface Lists {
  changes: Record<string, CaseChange>
  events: RetentionEvent[]
}

interface RetentionState {
  workspaces: Record<string, Lists>
  change: (ws: string, caseId: string, change: CaseChange, event?: Omit<RetentionEvent, 'id' | 'caseId' | 'at' | 'by'>) => void
  resetAll: () => void
}

export const useRetentionStore = create<RetentionState>()(
  persist(
    (set) => ({
      workspaces: {},
      change: (ws, caseId, change, event) =>
        set((s) => {
          const lists = s.workspaces[ws] ?? { changes: {}, events: [] }
          const at = new Date().toISOString()
          const events = event ? [...lists.events, { ...event, id: `rev-${caseId}-${Date.now()}`, caseId, at, by: 'you' as const }] : lists.events
          return { workspaces: { ...s.workspaces, [ws]: { changes: { ...lists.changes, [caseId]: { ...lists.changes[caseId], ...change } }, events } } }
        }),
      resetAll: () => set({ workspaces: {} }),
    }),
    { name: 'krew-retention-demo', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
)

// "Reset demo data" in KREW reseeds every workspace; Retention's decisions follow it.
useKrew.subscribe((state, prev) => {
  if (state.seededAt !== prev.seededAt) useRetentionStore.getState().resetAll()
})
