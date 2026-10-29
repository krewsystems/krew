// Expense rules for Tracker. Pure and deterministic, like costing.ts and projects.ts.
// The dashboard and the Tracker agent use these same rules: there is no separate path for agent-prepared entries.
//
// Rules, stated so the backend can implement them deliberately:
// - An entry counts as an expense only when it is confirmed and treated as operating. Entries in review, voided entries,
//   production costs and non-expense money movements count in no expense total.
// - Production costs belong to a batch. The batch's own cost components carry the money into COGS when units sell,
//   so the expense record is the document behind it and is never added again.
// - A project is a dimension of an operating expense, not a separate category: project expenses are part of operating expenses.
// - Each record has at most one project and one batch, so moving it never duplicates it.

import type { Batch, Expense, ExpenseCategoryDef, ExpenseField, ExpenseTreatment, PaymentMethod } from '@/data/tracker/types'

/** Built-in categories. `suggests` pre-fills the treatment; the person can always change it. */
export const EXPENSE_CATEGORIES: ExpenseCategoryDef[] = [
  { id: 'advertising', label: 'Advertising', suggests: 'operating' },
  { id: 'marketing', label: 'Marketing', suggests: 'operating' },
  { id: 'content', label: 'Photoshoot and content', suggests: 'operating' },
  { id: 'samples', label: 'Samples', suggests: 'operating' },
  { id: 'production', label: 'Materials and production', suggests: 'production' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'transport', label: 'Transportation' },
  { id: 'travel', label: 'Travel', suggests: 'operating' },
  { id: 'meals', label: 'Food', suggests: 'operating' },
  { id: 'equipment', label: 'Equipment rental', suggests: 'operating' },
  { id: 'rent', label: 'Rent', suggests: 'operating' },
  { id: 'utilities', label: 'Utilities', suggests: 'operating' },
  { id: 'software', label: 'Software', suggests: 'operating' },
  { id: 'salaries', label: 'Salaries', suggests: 'operating' },
  { id: 'professional', label: 'Professional services', suggests: 'operating' },
  { id: 'shipping', label: 'Shipping', suggests: 'operating' },
  { id: 'other', label: 'Other' },
]

export function allCategories(custom: ExpenseCategoryDef[]): ExpenseCategoryDef[] {
  return [...EXPENSE_CATEGORIES, ...custom]
}

export function categoryLabel(id: string | undefined, categories: ExpenseCategoryDef[]): string {
  if (!id) return 'Uncategorized'
  return categories.find((c) => c.id === id)?.label ?? id
}

/** A new custom category, or the problem with the name. Names are unique without regard to case. */
export function validateCategoryName(name: string, categories: ExpenseCategoryDef[]): string | null {
  const n = name.trim()
  if (!n) return 'Name the category.'
  if (n.length > 40) return 'Keep the name under 40 characters.'
  if (categories.some((c) => c.label.toLowerCase() === n.toLowerCase())) return 'That category already exists.'
  return null
}

/* ---------------- Counting ---------------- */

/** The one rule for whether an entry adds to expenses: confirmed and operating. */
export function countsAsExpense(e: Expense): boolean {
  return e.status === 'confirmed' && e.treatment === 'operating'
}

/** How the ledger shows an entry. Project is a view of operating expenses, not a separate accounting category. */
export type ExpenseClass = 'project' | 'operating' | 'production' | 'non_expense' | 'unclassified'

export function classify(e: Pick<Expense, 'treatment' | 'projectId'>): ExpenseClass {
  if (!e.treatment) return 'unclassified'
  if (e.treatment === 'operating') return e.projectId ? 'project' : 'operating'
  return e.treatment
}

export interface ExpenseRange {
  /** Inclusive ISO dates. Missing means unbounded. */
  from?: string
  to?: string
}

export const dayOf = (e: Pick<Expense, 'at'>) => e.at.slice(0, 10)
const inRange = (e: Expense, r: ExpenseRange) => (!r.from || dayOf(e) >= r.from) && (!r.to || dayOf(e) <= r.to)

export interface ExpenseSummary {
  /** Confirmed operating expenses, with and without a project. */
  total: number
  project: number
  general: number
  counted: number
  review: { count: number; amount: number }
  /** Recorded but not counted as expenses, shown so nothing looks lost. */
  production: number
  nonExpense: number
  voided: number
}

export function summarizeExpenses(expenses: Expense[], range: ExpenseRange = {}): ExpenseSummary {
  const s: ExpenseSummary = { total: 0, project: 0, general: 0, counted: 0, review: { count: 0, amount: 0 }, production: 0, nonExpense: 0, voided: 0 }
  for (const e of expenses) {
    if (!inRange(e, range)) continue
    if (e.status === 'void') s.voided += 1
    else if (e.status === 'needs_review') {
      s.review.count += 1
      s.review.amount += e.amount
    } else if (e.treatment === 'production') s.production += e.amount
    else if (e.treatment === 'non_expense') s.nonExpense += e.amount
    else if (countsAsExpense(e)) {
      s.total += e.amount
      s.counted += 1
      if (e.projectId) s.project += e.amount
      else s.general += e.amount
    }
  }
  return s
}

/** Counted expenses grouped by category, largest first, with how much of each is linked to projects. */
export function expensesByCategory(expenses: Expense[], range: ExpenseRange = {}): { category?: string; total: number; project: number; count: number }[] {
  const groups = new Map<string, { category?: string; total: number; project: number; count: number }>()
  for (const e of expenses) {
    if (!countsAsExpense(e) || !inRange(e, range)) continue
    const key = e.category ?? ''
    const g = groups.get(key) ?? { category: e.category, total: 0, project: 0, count: 0 }
    g.total += e.amount
    g.count += 1
    if (e.projectId) g.project += e.amount
    groups.set(key, g)
  }
  return [...groups.values()].sort((a, b) => b.total - a.total)
}

/** A project's expense entries: the ones it counts, and the ones linked but still waiting for review. */
export function projectExpenseSplit(expenses: Expense[], projectId: string): { counted: Expense[]; pending: Expense[] } {
  const linked = expenses.filter((e) => e.projectId === projectId && e.status !== 'void')
  return { counted: linked.filter(countsAsExpense), pending: linked.filter((e) => e.status === 'needs_review') }
}

/* ---------------- Validation ---------------- */

/** What the add and edit form holds. Amount is NaN while empty, so "not entered" never reads as zero. */
export interface ExpenseDraft {
  label: string
  amount: number
  /** YYYY-MM-DD. */
  date: string
  category?: string
  treatment?: ExpenseTreatment
  projectId?: string
  batchId?: string
  vendor?: string
  paymentMethod?: PaymentMethod
  reference?: string
  notes?: string
}

export type DraftErrors = Partial<Record<'label' | 'amount' | 'date' | 'category' | 'batchId' | 'projectId', string>>

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
export const MAX_AMOUNT = 10_000_000
const EARLIEST = '2000-01-01'

function validDay(iso: string): boolean {
  if (!ISO_DAY.test(iso)) return false
  const d = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso
}

/**
 * Field problems that block saving. `prepare` is the agent's bar: something to show a person, category optional.
 * `save` is a person's bar: amount, description, date and category.
 */
export function validateExpense(d: ExpenseDraft, ctx: { today: string; batches: Batch[]; mode?: 'prepare' | 'save' }): DraftErrors {
  const errors: DraftErrors = {}
  if (!d.label.trim()) errors.label = 'Describe the expense.'
  else if (d.label.trim().length > 140) errors.label = 'Keep the description under 140 characters.'
  if (!Number.isFinite(d.amount)) errors.amount = 'Enter an amount.'
  else if (d.amount <= 0) errors.amount = 'Enter an amount above zero. Refunds and money coming in are recorded elsewhere.'
  else if (d.amount > MAX_AMOUNT) errors.amount = 'That amount looks too large. Check it again.'
  else if (Math.abs(d.amount * 100 - Math.round(d.amount * 100)) > 1e-6) errors.amount = 'Use at most two decimals.'
  if (!d.date) errors.date = 'Choose the date of the expense.'
  else if (!validDay(d.date)) errors.date = 'That date is not valid.'
  else if (d.date > ctx.today) errors.date = 'The date cannot be in the future.'
  else if (d.date < EARLIEST) errors.date = 'The date is too far in the past.'
  if ((ctx.mode ?? 'save') === 'save' && !d.category) errors.category = 'Choose a category.'
  if (d.batchId) {
    const b = ctx.batches.find((x) => x.id === d.batchId)
    if (!b) errors.batchId = 'That batch no longer exists.'
    else if (b.status === 'revised') errors.batchId = 'That batch was revised. Choose its revision.'
  }
  return errors
}

/** Why a valid entry cannot be confirmed yet. Empty means it can be. */
export function confirmBlockers(d: ExpenseDraft): string[] {
  const out: string[] = []
  if (!d.category) out.push('Choose a category.')
  if (!d.treatment) out.push('Decide how it counts: operating expense, production cost, or not an expense.')
  if (d.treatment === 'production' && !d.batchId) out.push('Choose the batch this production cost belongs to.')
  return out
}

/**
 * Relationships that only make sense for one treatment are dropped, so a record can never count twice:
 * production costs reach projects through their batch, and only production costs belong to a batch.
 */
export function normalizeDraft(d: ExpenseDraft): ExpenseDraft {
  const trim = (s?: string) => s?.trim() || undefined
  return {
    ...d,
    label: d.label.trim(),
    amount: Math.round(d.amount * 100) / 100,
    vendor: trim(d.vendor),
    reference: trim(d.reference),
    notes: trim(d.notes),
    projectId: d.treatment === 'production' || d.treatment === 'non_expense' ? undefined : d.projectId,
    batchId: d.treatment === 'production' ? d.batchId : undefined,
  }
}

export function draftOf(e: Expense): ExpenseDraft {
  return {
    label: e.label,
    amount: e.amount,
    date: dayOf(e),
    category: e.category,
    treatment: e.treatment,
    projectId: e.projectId,
    batchId: e.batchId,
    vendor: e.vendor,
    paymentMethod: e.paymentMethod,
    reference: e.reference,
    notes: e.notes,
  }
}

/** Keeps the original time of day when only the date is unchanged; a new date is stored at midday so time zones never move it a day. */
export function atFromDate(date: string, previous?: string): string {
  if (previous && previous.slice(0, 10) === date) return previous
  return `${date}T12:00:00.000Z`
}

/** Fields that differ between two versions of an entry. */
export function changedFields(before: Expense, after: Expense): ExpenseField[] {
  const keys: ExpenseField[] = ['amount', 'label', 'at', 'vendor', 'category', 'treatment', 'projectId', 'batchId']
  return keys.filter((k) => (k === 'at' ? dayOf(before) !== dayOf(after) : before[k] !== after[k]))
}

/** Entries that look like the same expense: same amount, same vendor or description, within three days. */
export function possibleDuplicates(d: Pick<ExpenseDraft, 'amount' | 'date' | 'vendor' | 'label'>, list: Expense[], ignoreId?: string): Expense[] {
  if (!Number.isFinite(d.amount) || !d.date || !validDay(d.date)) return []
  const t = new Date(`${d.date}T00:00:00Z`).getTime()
  const same = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()
  return list.filter((e) => {
    if (e.id === ignoreId || e.status === 'void') return false
    if (Math.abs(e.amount - d.amount) > 0.005) return false
    if (Math.abs(new Date(`${dayOf(e)}T00:00:00Z`).getTime() - t) > 3 * 86_400_000) return false
    return same(e.vendor, d.vendor) || same(e.label, d.label)
  })
}

/* ---------------- Ledger view ---------------- */

export type StatusFilter = 'all' | 'needs_review' | 'confirmed' | 'void'
export type ExpenseSort = 'newest' | 'oldest' | 'amount-desc' | 'amount-asc'

export interface ExpenseFilters extends ExpenseRange {
  query?: string
  status?: StatusFilter
  category?: string
  /** A project id, or "none" for entries without a project. */
  project?: string
  classification?: ExpenseClass
}

export function filterExpenses(list: Expense[], f: ExpenseFilters, categories: ExpenseCategoryDef[]): Expense[] {
  const q = f.query?.trim().toLowerCase()
  return list.filter((e) => {
    // Voided entries are kept for history but stay out of the way unless asked for.
    if ((f.status ?? 'all') === 'all' ? e.status === 'void' : e.status !== f.status) return false
    if (!inRange(e, f)) return false
    if (f.category && e.category !== f.category) return false
    if (f.project === 'none' ? !!e.projectId : f.project && e.projectId !== f.project) return false
    if (f.classification && classify(e) !== f.classification) return false
    if (q && !`${e.label} ${e.vendor ?? ''} ${e.reference ?? ''} ${categoryLabel(e.category, categories)}`.toLowerCase().includes(q)) return false
    return true
  })
}

export function sortExpenses(list: Expense[], sort: ExpenseSort): Expense[] {
  const out = [...list]
  if (sort === 'oldest') return out.sort((a, b) => a.at.localeCompare(b.at))
  if (sort === 'amount-desc') return out.sort((a, b) => b.amount - a.amount || b.at.localeCompare(a.at))
  if (sort === 'amount-asc') return out.sort((a, b) => a.amount - b.amount || b.at.localeCompare(a.at))
  return out.sort((a, b) => b.at.localeCompare(a.at))
}

/** Receipts the prototype accepts: images and PDFs up to 10 MB. */
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024
export function receiptProblem(file: { type: string; size: number }): string | null {
  if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) return 'Attach an image or a PDF.'
  if (file.size > RECEIPT_MAX_BYTES) return 'That file is over 10 MB.'
  if (file.size === 0) return 'That file is empty.'
  return null
}
