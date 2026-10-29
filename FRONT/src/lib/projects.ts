// Season and project financials for Tracker. Pure and deterministic, like costing.ts.
//
// Assumptions, stated so the backend can replace them deliberately:
// - Sales are attributed to a project only through its own batches: units sold out of a project batch count for that project.
//   A product being in a project does not pull every sale of that product into it.
// - Units sold per batch come from BatchSale records. The backend must produce them from order lines with a defined
//   cost-flow method (FIFO or weighted average), using each order's actual paid amount.
// - Cost of goods sold uses each batch's own average unit cost. Unsold units stay in inventory, not in COGS.
// - Only finalized batches have a cost. Draft batches count as "cost not final"; their sales are flagged, not costed at zero silently.
// - Revised batches are superseded by their revision and are left out, so a correction is never counted twice.
// - Each expense belongs to at most one project, so it is counted once. Only confirmed operating entries count
//   (lib/expenses.ts countsAsExpense); entries still in review are listed as pending and add nothing.

import type { Batch, BatchSale, Expense, Project } from '../data/tracker/types'
import { costBatch } from './costing'
import { projectExpenseSplit } from './expenses'

export interface ProjectBatchRow {
  batch: Batch
  quantity: number
  unitsSold: number
  netSales: number
  /** Null when the batch has no final cost yet. */
  unitCost: number | null
  /** Production or purchase cost of the whole batch. */
  totalCost: number | null
  /** Cost of the units that were sold. */
  cogs: number | null
  /** Cost of the units still on hand. */
  inventoryValue: number | null
}

export interface ProjectFinancials {
  project: Project
  batches: ProjectBatchRow[]
  /** Confirmed operating expenses linked to the project: the ones it counts. */
  expenses: Expense[]
  /** Linked entries still in review. Shown, never counted. */
  pendingExpenses: Expense[]
  netSales: number
  unitsSold: number
  /** Cost of goods sold: only the units that were actually sold. */
  cogs: number
  grossProfit: number
  /** Percent of net sales. Null when there are no sales. */
  grossMargin: number | null
  /** Project operating expenses: shoots, ads, travel. Never part of inventory cost. */
  operatingExpenses: number
  /** Estimated: gross profit less project expenses. */
  profit: number
  /** Everything spent producing or buying the project's batches, sold or not. */
  investment: number
  /** Part of the investment still sitting in unsold stock. */
  inventoryValue: number
  /** Production investment plus project expenses: what the budget is measured against. */
  spending: number
  budgetUsed: number | null
  budgetRemaining: number | null
  revenueProgress: number | null
  /** Batches with no final cost, and the sales that came out of them. */
  uncostedBatches: number
  uncostedSales: number
}

const pct = (part: number, whole: number | undefined) => (whole ? (part / whole) * 100 : null)

export function projectFinancials(project: Project, records: { batches: Batch[]; batchSales: BatchSale[]; expenses: Expense[] }): ProjectFinancials {
  const sales = new Map(records.batchSales.map((s) => [s.batchId, s]))
  const rows: ProjectBatchRow[] = records.batches
    .filter((b) => b.projectId === project.id && b.status !== 'revised')
    .map((batch) => {
      const c = costBatch(batch)
      const sale = sales.get(batch.id)
      const unitsSold = Math.min(sale?.unitsSold ?? 0, c.totalQuantity || Number.POSITIVE_INFINITY)
      const unit = batch.status === 'finalized' ? c.unitCost : null
      const left = Math.max(0, c.totalQuantity - unitsSold)
      return {
        batch,
        quantity: c.totalQuantity,
        unitsSold,
        netSales: sale?.netSales ?? 0,
        unitCost: unit,
        totalCost: unit === null ? null : c.totalCost,
        cogs: unit === null ? null : unitsSold * unit,
        inventoryValue: unit === null ? null : left * unit,
      }
    })

  const { counted: expenses, pending: pendingExpenses } = projectExpenseSplit(records.expenses, project.id)
  const sum = (f: (r: ProjectBatchRow) => number | null) => rows.reduce((s, r) => s + (f(r) ?? 0), 0)
  const netSales = sum((r) => r.netSales)
  const cogs = sum((r) => r.cogs)
  const operatingExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const investment = sum((r) => r.totalCost)
  const spending = investment + operatingExpenses
  const grossProfit = netSales - cogs
  const uncosted = rows.filter((r) => r.unitCost === null)

  return {
    project,
    batches: rows,
    expenses,
    pendingExpenses,
    netSales,
    unitsSold: sum((r) => r.unitsSold),
    cogs,
    grossProfit,
    grossMargin: netSales > 0 ? (grossProfit / netSales) * 100 : null,
    operatingExpenses,
    profit: grossProfit - operatingExpenses,
    investment,
    inventoryValue: sum((r) => r.inventoryValue),
    spending,
    budgetUsed: pct(spending, project.budget),
    budgetRemaining: project.budget ? project.budget - spending : null,
    revenueProgress: pct(netSales, project.revenueTarget),
    uncostedBatches: uncosted.length,
    uncostedSales: uncosted.reduce((s, r) => s + r.netSales, 0),
  }
}

/** Validation for the create and edit form. Returns field messages; empty when valid. */
export function validateProject(p: Pick<Project, 'name' | 'startsAt' | 'endsAt' | 'budget' | 'revenueTarget'>, existingNames: string[]): Partial<Record<'name' | 'startsAt' | 'endsAt' | 'budget' | 'revenueTarget', string>> {
  const errors: Partial<Record<'name' | 'startsAt' | 'endsAt' | 'budget' | 'revenueTarget', string>> = {}
  const name = p.name.trim()
  if (!name) errors.name = 'Give the project a name.'
  else if (existingNames.some((n) => n.trim().toLowerCase() === name.toLowerCase())) errors.name = 'Another project already uses this name.'
  if (!p.startsAt) errors.startsAt = 'Choose a start date.'
  if (p.endsAt && p.startsAt && p.endsAt < p.startsAt) errors.endsAt = 'The end date must be after the start date.'
  if (p.budget !== undefined && !(p.budget > 0)) errors.budget = 'Enter a budget above zero, or leave it empty.'
  if (p.revenueTarget !== undefined && !(p.revenueTarget > 0)) errors.revenueTarget = 'Enter a target above zero, or leave it empty.'
  return errors
}
