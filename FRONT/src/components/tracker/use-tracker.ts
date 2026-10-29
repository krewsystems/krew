import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { trackerDataset } from '@/data/tracker/mock'
import { uid } from '@/data/seed-utils'
import type { Batch, Expense, ExpenseCategoryDef, ExpenseEvent, LedgerDay, Project, ProjectEvent, TrackerDataset } from '@/data/tracker/types'
import { allCategories, categoryLabel, changedFields } from '@/lib/expenses'
import {
  costTimeline,
  estimatedMissingCogs,
  finalizedShare,
  finalizedThrough,
  performanceSeries,
  periodLength,
  presetPeriod,
  previousPeriod,
  productRows,
  sliceLedger,
  summarize,
  type CostTimeline,
  type Period,
  type PeriodPreset,
} from '@/lib/finance'
import { money, shortDate } from '@/lib/format'
import { useWorkspace } from '@/store/krew'
import { useTrackerStore, type ExpenseHistory } from '@/store/tracker'
import { TREATMENT } from './expenses/labels'

/** Mock latency so loading states are real. The backend call replaces this. */
const LOAD_MS = 420

/** The active workspace's Tracker dataset (seed plus saved batch edits), with a short simulated fetch on first open. */
export function useTrackerData() {
  const ws = useWorkspace()
  const seed = useMemo(() => trackerDataset(ws.id, ws.daily), [ws.id, ws.daily])
  const stored = useTrackerStore((s) => s.workspaces[ws.id])
  const data: TrackerDataset = useMemo(() => {
    const merged = stored ? { ...seed, ...stored } : seed
    // Activity about an expense takes its review state and amount from the expense record, the one source of truth.
    const byId = new Map(merged.expenses.map((e) => [e.id, e]))
    const activity = merged.activity.map((a) => {
      const e = a.expenseId ? byId.get(a.expenseId) : undefined
      return e ? { ...a, amount: e.amount, needsReview: e.status === 'needs_review' } : a
    })
    return { ...merged, activity }
  }, [seed, stored])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  useEffect(() => {
    const t = window.setTimeout(() => setLoadedFor(ws.id), LOAD_MS)
    return () => window.clearTimeout(t)
  }, [ws.id])
  return { ws, data, costs: useMemo(() => costTimeline(data), [data]), loading: loadedFor !== ws.id }
}

export const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
]

const ISO = /^\d{4}-\d{2}-\d{2}$/

export interface PeriodState {
  period: Period
  previous: Period
  preset: PeriodPreset | 'custom'
  /** Bounds for a custom range: late enough that its comparison period still has data. */
  bounds: Period
  maxDays: number
  setPreset: (p: PeriodPreset) => void
  setCustom: (p: Period) => void
}

export const MAX_CUSTOM_DAYS = 90

/** Selected period, kept in the URL (?period=30d or ?from=…&to=…) so it survives reloads and can be shared. */
export function usePeriod(ledger: LedgerDay[]): PeriodState {
  const [params, setParams] = useSearchParams()
  const from = params.get('from')
  const to = params.get('to')
  const firstDay = ledger[0]?.date ?? ''
  const lastDay = ledger.at(-1)?.date ?? ''
  const bounds = { from: ledger[MAX_CUSTOM_DAYS]?.date ?? firstDay, to: lastDay }

  let preset: PeriodState['preset'] = PRESETS.some((p) => p.value === params.get('period')) ? (params.get('period') as PeriodPreset) : '30d'
  let period = presetPeriod(preset, lastDay)
  // A custom range is honoured only inside the bounds, so its comparison period always has data.
  if (from && to && ISO.test(from) && ISO.test(to) && from <= to && from >= bounds.from && to <= lastDay && periodLength({ from, to }) <= MAX_CUSTOM_DAYS) {
    preset = 'custom'
    period = { from, to }
  }

  return {
    period,
    previous: previousPeriod(period),
    preset,
    bounds,
    maxDays: MAX_CUSTOM_DAYS,
    setPreset: (p) => setParams(p === '30d' ? {} : { period: p }, { replace: true }),
    setCustom: (p) => setParams({ from: p.from, to: p.to }, { replace: true }),
  }
}

/** Everything the Overview shows for the selected period, computed once. */
export function useOverviewFigures(data: TrackerDataset, costs: CostTimeline, { from, to }: Period) {
  return useMemo(() => {
    const period = { from, to }
    const days = sliceLedger(data.ledger, period)
    const prevDays = sliceLedger(data.ledger, previousPeriod(period))
    const through = finalizedThrough()
    const current = summarize(days, data.products, costs)
    return {
      days,
      current,
      missingCogs: estimatedMissingCogs(current),
      series: performanceSeries(days, data.products, costs),
      prior: summarize(prevDays, data.products, costs),
      products: productRows(data, days, costs),
      through,
      finalized: finalizedShare(period, through),
      length: periodLength(period),
    }
  }, [data, costs, from, to])
}

/** The seed lists the store falls back to for the active workspace. */
function useSeedLists() {
  const ws = useWorkspace()
  return useMemo(() => {
    const d = trackerDataset(ws.id, ws.daily)
    return { batches: d.batches, projects: d.projects, expenses: d.expenses, projectEvents: d.projectEvents, expenseEvents: d.expenseEvents, expenseCategories: d.expenseCategories }
  }, [ws.id, ws.daily])
}

/** Batch operations for the active workspace. Mock today; each maps to one backend call later. */
export function useBatchActions() {
  const ws = useWorkspace()
  const seed = useSeedLists()
  const store = useTrackerStore()
  return {
    edited: !!store.workspaces[ws.id],
    saveDraft: (b: Batch) => store.saveDraft(ws.id, seed, b),
    finalize: (b: Batch) => store.finalize(ws.id, seed, b),
    discardDraft: (id: string) => store.discardDraft(ws.id, seed, id),
    reset: () => store.resetWorkspace(ws.id),
  }
}

/** Project operations. Every change also writes one entry to the project's history. Expense links go through the shared expense actions. */
export function useProjectActions() {
  const ws = useWorkspace()
  const seed = useSeedLists()
  const store = useTrackerStore()
  const expenses = useExpenseActions()
  const event = (projectId: string, kind: ProjectEvent['kind'], text: string): ProjectEvent => ({ id: uid('ev'), projectId, kind, text, at: new Date().toISOString() })
  return {
    save: (project: Project, events: { kind: ProjectEvent['kind']; text: string }[]) =>
      store.saveProject(ws.id, seed, project, events.map((e) => event(project.id, e.kind, e.text))),
    attachBatch: (projectId: string, batch: Batch) => store.setBatchProject(ws.id, seed, batch.id, projectId, event(projectId, 'batch_attached', `Batch ${batch.label} attached`)),
    detachBatch: (projectId: string, batch: Batch) => store.setBatchProject(ws.id, seed, batch.id, undefined, event(projectId, 'batch_detached', `Batch ${batch.label} removed`)),
    linkExpense: (projectId: string, expense: Expense) => expenses.update(expense, { ...expense, projectId }),
    unlinkExpense: (expense: Expense) => expenses.update(expense, { ...expense, projectId: undefined }),
  }
}

/**
 * Expense operations: the one write path for expense entries, used by the Expenses section, by Seasons, and later by the
 * Tracker agent (which may only create entries in review). Each call records the entry's history and, when a project is
 * involved, the project's history too.
 */
export function useExpenseActions() {
  const ws = useWorkspace()
  const seed = useSeedLists()
  const store = useTrackerStore()
  const lists = store.workspaces[ws.id]
  const projects = lists?.projects ?? seed.projects
  const batches = lists?.batches ?? seed.batches
  const categories = allCategories(lists?.expenseCategories ?? seed.expenseCategories)

  const now = () => new Date().toISOString()
  const xev = (e: Expense, kind: ExpenseEvent['kind'], text: string, by: ExpenseEvent['by'] = 'you'): ExpenseEvent => ({ id: uid('xe'), expenseId: e.id, kind, text, at: now(), by })
  const pev = (projectId: string, kind: ProjectEvent['kind'], text: string): ProjectEvent => ({ id: uid('ev'), projectId, kind, text, at: now() })
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? 'a project'
  const batchLabel = (id: string) => batches.find((b) => b.id === id)?.label ?? 'a batch'

  /** The history one change writes, worked out by comparing the two versions of the record. */
  function describe(before: Expense, after: Expense): ExpenseHistory {
    const h: ExpenseHistory = { expense: [], project: [] }
    const fields = changedFields(before, after)
    const lines: string[] = []
    for (const f of fields) {
      if (f === 'amount') lines.push(`Amount changed from ${money(before.amount)} to ${money(after.amount)}`)
      else if (f === 'label') lines.push(`Description changed to “${after.label}”`)
      else if (f === 'at') lines.push(`Date changed to ${shortDate(after.at)}`)
      else if (f === 'vendor') lines.push(after.vendor ? `Vendor set to ${after.vendor}` : 'Vendor removed')
      else if (f === 'category') lines.push(`Category set to ${categoryLabel(after.category, categories)}`)
      else if (f === 'treatment') lines.push(after.treatment ? `Counts as ${TREATMENT[after.treatment].label.toLowerCase()}` : 'Treatment left undecided')
      else if (f === 'batchId') lines.push(after.batchId ? `Linked to batch ${batchLabel(after.batchId)}` : 'Batch link removed')
    }
    if (before.paymentMethod !== after.paymentMethod || before.reference !== after.reference || before.notes !== after.notes) lines.push('Payment details or notes updated')
    if (lines.length) h.expense.push(xev(after, 'updated', lines.join('. ')))

    if (before.projectId !== after.projectId) {
      const text = before.projectId && after.projectId ? `Moved from ${projectName(before.projectId)} to ${projectName(after.projectId)}` : after.projectId ? `Linked to ${projectName(after.projectId)}` : `Removed from ${projectName(before.projectId!)}`
      h.expense.push(xev(after, 'project_changed', text))
      if (before.projectId) h.project.push(pev(before.projectId, 'expense_unlinked', after.projectId ? `Expense moved to ${projectName(after.projectId)}: ${after.label}` : `Expense removed: ${after.label}`))
      if (after.projectId) h.project.push(pev(after.projectId, 'expense_linked', `Expense linked: ${after.label}, ${money(after.amount)}`))
    } else if (after.projectId && fields.includes('amount')) {
      h.project.push(pev(after.projectId, 'expense_updated', `Expense updated: ${after.label}, ${money(before.amount)} to ${money(after.amount)}`))
    }

    if (before.receipt?.id !== after.receipt?.id) {
      if (after.receipt) h.expense.push(xev(after, 'receipt_attached', before.receipt ? `Receipt replaced: ${after.receipt.name}` : `Receipt attached: ${after.receipt.name}`))
      else h.expense.push(xev(after, 'receipt_removed', 'Receipt removed'))
    }

    if (before.status !== after.status) {
      if (after.status === 'confirmed') {
        h.expense.push(xev(after, 'confirmed', 'Confirmed'))
        if (after.projectId) h.project.push(pev(after.projectId, 'expense_confirmed', `Expense confirmed: ${after.label}, ${money(after.amount)}`))
      } else if (after.status === 'void') {
        h.expense.push(xev(after, 'voided', after.voidReason ? `Voided: ${after.voidReason}` : 'Voided'))
        if (after.projectId) h.project.push(pev(after.projectId, 'expense_unlinked', `Expense voided: ${after.label}`))
      } else if (before.status === 'void') h.expense.push(xev(after, 'restored', 'Restored for review'))
      else h.expense.push(xev(after, 'updated', 'Moved back to review'))
    }
    return h
  }

  return {
    categories,
    create: (e: Expense) => {
      const h: ExpenseHistory = { expense: [], project: [] }
      const human = e.source === 'manual'
      h.expense.push(xev(e, human ? 'created' : 'prepared', human ? (e.status === 'confirmed' ? 'Entered by hand and confirmed' : 'Entered by hand, saved for review') : 'Prepared by Tracker', human ? 'you' : 'tracker'))
      if (e.receipt) h.expense.push(xev(e, 'receipt_attached', `Receipt attached: ${e.receipt.name}`, human ? 'you' : 'tracker'))
      if (e.projectId) h.project.push(pev(e.projectId, 'expense_added', e.status === 'confirmed' ? `Expense recorded: ${e.label}, ${money(e.amount)}` : `Expense to review: ${e.label}, ${money(e.amount)}`))
      store.createExpense(ws.id, seed, e, h)
    },
    /** Saves the next version of an entry. Nothing is written when nothing changed. */
    update: (before: Expense, after: Expense) => {
      const h = describe(before, after)
      if (!h.expense.length && !h.project.length) return
      store.updateExpense(ws.id, seed, after, h)
    },
    /** Creates a custom category, or returns the existing one with that name. */
    addCategory: (label: string): ExpenseCategoryDef => {
      const name = label.trim()
      const existing = categories.find((c) => c.label.toLowerCase() === name.toLowerCase())
      if (existing) return existing
      const def: ExpenseCategoryDef = { id: uid('cat'), label: name, custom: true }
      store.addExpenseCategory(ws.id, seed, def)
      return def
    },
  }
}

