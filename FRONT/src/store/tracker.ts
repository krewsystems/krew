import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Batch, Expense, ExpenseCategoryDef, ExpenseEvent, Project, ProjectEvent } from '@/data/tracker/types'
import { clearReceiptFiles } from '@/lib/receipt-files'
import { useKrew } from './krew'

// Tracker's financial records for the demo, per workspace, saved in the browser.
// Each action is an operation the backend (and the Tracker agent, after confirmation) must support:
// batches: save a draft, finalize, revise, discard a draft, attach to or detach from a project;
// projects: create, update, change status; expenses: create (by hand or prepared by Tracker), update (edit, categorize,
// classify, link or unlink a project or batch, attach a receipt, confirm, void, restore); categories: add a custom one.
// Seed records live in data/tracker/mock.ts; this store holds a workspace's list only once someone changes it.
// Resetting the KREW demo also resets these.

interface Seed {
  batches: Batch[]
  projects: Project[]
  expenses: Expense[]
  projectEvents: ProjectEvent[]
  expenseEvents: ExpenseEvent[]
  expenseCategories: ExpenseCategoryDef[]
}

/** History written with an expense change: the entry's own, and the projects it joined or left. */
export interface ExpenseHistory {
  expense: ExpenseEvent[]
  project: ProjectEvent[]
}

type Lists = Partial<Seed>

interface TrackerState {
  workspaces: Record<string, Lists>
  saveDraft: (ws: string, seed: Seed, batch: Batch) => void
  /** Locks a draft as a historical record. If it revises another batch, that batch is marked revised. */
  finalize: (ws: string, seed: Seed, batch: Batch) => void
  discardDraft: (ws: string, seed: Seed, batchId: string) => void
  /** Changes only which project a batch belongs to. Its quantities and costs are never touched. */
  setBatchProject: (ws: string, seed: Seed, batchId: string, projectId: string | undefined, event?: ProjectEvent) => void
  saveProject: (ws: string, seed: Seed, project: Project, events: ProjectEvent[]) => void
  /** Adds a new entry. An id that already exists is ignored, so a double submit never records it twice. */
  createExpense: (ws: string, seed: Seed, expense: Expense, history: ExpenseHistory) => void
  /** Replaces one entry with its next version. Moving it between projects changes this one record, so it is never counted twice. */
  updateExpense: (ws: string, seed: Seed, expense: Expense, history: ExpenseHistory) => void
  addExpenseCategory: (ws: string, seed: Seed, category: ExpenseCategoryDef) => void
  resetWorkspace: (ws: string) => void
  resetAll: () => void
}

const now = () => new Date().toISOString()

/** A version 3 expense: categorized ones were counted as operating expenses, so they stay confirmed; the rest wait for review. */
function fromV3(e: Expense): Expense {
  const legacy = (e as { source: string }).source
  const source: Expense['source'] = legacy === 'receipt' ? 'manual' : legacy === 'shopify' ? 'tracker' : e.source
  return { ...e, source, status: e.status ?? (e.category ? 'confirmed' : 'needs_review'), treatment: e.treatment ?? (e.category ? 'operating' : undefined), createdAt: e.createdAt ?? e.at }
}

export const useTrackerStore = create<TrackerState>()(
  persist(
    (set) => {
      /** The workspace's current list: its edited copy if there is one, otherwise the seed. */
      const get = <K extends keyof Seed>(s: TrackerState, ws: string, seed: Seed, key: K): Seed[K] => (s.workspaces[ws]?.[key] as Seed[K] | undefined) ?? seed[key]
      const write = (s: TrackerState, ws: string, lists: Lists) => ({ workspaces: { ...s.workspaces, [ws]: { ...s.workspaces[ws], ...lists } } })
      const withEvent = (s: TrackerState, ws: string, seed: Seed, events: (ProjectEvent | undefined)[]) => {
        const add = events.filter((e): e is ProjectEvent => !!e)
        return add.length ? { projectEvents: [...get(s, ws, seed, 'projectEvents'), ...add] } : {}
      }
      const withExpenseEvents = (s: TrackerState, ws: string, seed: Seed, events: ExpenseEvent[]) =>
        events.length ? { expenseEvents: [...get(s, ws, seed, 'expenseEvents'), ...events] } : {}

      return {
        workspaces: {},
        saveDraft: (ws, seed, batch) =>
          set((s) => {
            const list = get(s, ws, seed, 'batches')
            const existing = list.find((b) => b.id === batch.id)
            if (existing && existing.status !== 'draft') return s
            const next: Batch = { ...batch, status: 'draft', updatedAt: now() }
            return write(s, ws, { batches: existing ? list.map((b) => (b.id === batch.id ? next : b)) : [...list, next] })
          }),
        finalize: (ws, seed, batch) =>
          set((s) => {
            const list = get(s, ws, seed, 'batches')
            const existing = list.find((b) => b.id === batch.id)
            if (existing && existing.status !== 'draft') return s
            const at = now()
            const done: Batch = { ...batch, status: 'finalized', finalizedAt: at, updatedAt: at }
            const batches = (existing ? list.map((b) => (b.id === batch.id ? done : b)) : [...list, done]).map((b) =>
              b.id === batch.revisionOf && b.status === 'finalized' ? { ...b, status: 'revised' as const, revisedBy: batch.id, updatedAt: at } : b,
            )
            return write(s, ws, { batches })
          }),
        discardDraft: (ws, seed, batchId) =>
          set((s) => {
            const list = get(s, ws, seed, 'batches')
            if (list.find((b) => b.id === batchId)?.status !== 'draft') return s
            return write(s, ws, { batches: list.filter((b) => b.id !== batchId) })
          }),
        setBatchProject: (ws, seed, batchId, projectId, event) =>
          set((s) => {
            const batches = get(s, ws, seed, 'batches').map((b) => (b.id === batchId ? { ...b, projectId } : b))
            return write(s, ws, { batches, ...withEvent(s, ws, seed, [event]) })
          }),
        saveProject: (ws, seed, project, events) =>
          set((s) => {
            const list = get(s, ws, seed, 'projects')
            const projects = list.some((p) => p.id === project.id) ? list.map((p) => (p.id === project.id ? project : p)) : [...list, project]
            return write(s, ws, { projects, ...withEvent(s, ws, seed, events) })
          }),
        createExpense: (ws, seed, expense, history) =>
          set((s) => {
            const list = get(s, ws, seed, 'expenses')
            if (list.some((e) => e.id === expense.id)) return s
            return write(s, ws, { expenses: [...list, expense], ...withExpenseEvents(s, ws, seed, history.expense), ...withEvent(s, ws, seed, history.project) })
          }),
        updateExpense: (ws, seed, expense, history) =>
          set((s) => {
            const list = get(s, ws, seed, 'expenses')
            if (!list.some((e) => e.id === expense.id)) return s
            const next: Expense = { ...expense, updatedAt: now() }
            return write(s, ws, { expenses: list.map((e) => (e.id === expense.id ? next : e)), ...withExpenseEvents(s, ws, seed, history.expense), ...withEvent(s, ws, seed, history.project) })
          }),
        addExpenseCategory: (ws, seed, category) =>
          set((s) => {
            const list = get(s, ws, seed, 'expenseCategories')
            if (list.some((c) => c.id === category.id)) return s
            return write(s, ws, { expenseCategories: [...list, category] })
          }),
        resetWorkspace: (ws) =>
          set((s) => {
            void clearReceiptFiles(ws)
            const rest = { ...s.workspaces }
            delete rest[ws]
            return { workspaces: rest }
          }),
        resetAll: () => {
          void clearReceiptFiles()
          set({ workspaces: {} })
        },
      }
    },
    {
      name: 'krew-tracker-demo',
      version: 4,
      // Version 2 kept only batches; version 3 expenses had no status or treatment. Carry both over.
      migrate: (persisted, version) => {
        const old = persisted as { batches?: Record<string, Batch[]>; workspaces?: Record<string, Lists> }
        if (version === 2 && old.batches) return { workspaces: Object.fromEntries(Object.entries(old.batches).map(([ws, batches]) => [ws, { batches }])) } as unknown as TrackerState
        const workspaces = old.workspaces ?? {}
        if (version === 3)
          for (const lists of Object.values(workspaces)) if (lists.expenses) lists.expenses = lists.expenses.map(fromV3)
        return { workspaces } as unknown as TrackerState
      },
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

// "Reset demo data" in KREW reseeds every workspace; Tracker's demo records follow it.
useKrew.subscribe((state, prev) => {
  if (state.seededAt !== prev.seededAt) useTrackerStore.getState().resetAll()
})
