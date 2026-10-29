// Profitability views for Tracker. Pure and deterministic, built only from existing records:
// sales from the ledger, costs from Product costing batches (lib/finance.ts costTimeline), projects from lib/projects.ts.
// Operating expenses are never spread over products: product profitability stops at gross profit.

import type { Batch, LedgerDay, Product, TrackerDataset } from '@/data/tracker/types'
import { costBatch, sortBatches } from './costing'
import { costOn, productNet, type CostTimeline, type ProfitRow } from './finance'
import { money } from './format'
import type { ProjectFinancials } from './projects'

/** Gross margin below this is flagged as low. A rule of thumb for consumer goods, not a law; the backend can make it a setting. */
export const LOW_MARGIN = 30
/** A batch whose unit cost rose by more than this, against the batch before it, is flagged. */
export const COST_RISE = 0.05

export type ProfitStatus = 'healthy' | 'low' | 'loss' | 'missing'

export function profitStatus(row: Pick<ProfitRow, 'margin' | 'unitCost'>): ProfitStatus {
  if (row.unitCost === null || row.margin === null) return 'missing'
  if (row.margin < 0) return 'loss'
  if (row.margin < LOW_MARGIN) return 'low'
  return 'healthy'
}

/* ---------------- Product detail ---------------- */

export interface BatchCostRow {
  batch: Batch
  /** Null for drafts: no final cost yet. */
  unitCost: number | null
  /** Margin at the product's list price. */
  margin: number | null
  unitsSold: number
  /** Change in unit cost against the previous finalized batch, as a fraction. */
  costChange: number | null
  /** Margin points gained or lost against the previous finalized batch. */
  marginChange: number | null
}

/** Every batch of a product, oldest first, with what each change in cost did to the margin. Revised batches are left out. */
export function batchCostHistory(product: Product, data: Pick<TrackerDataset, 'batches' | 'batchSales'>): BatchCostRow[] {
  const sold = new Map(data.batchSales.map((s) => [s.batchId, s.unitsSold]))
  const batches = sortBatches(data.batches.filter((b) => b.productId === product.id && b.status !== 'revised')).reverse()
  let prev: { unit: number; margin: number } | null = null
  return batches.map((batch) => {
    const unit = batch.status === 'finalized' ? costBatch(batch).unitCost : null
    const margin = unit === null || product.price <= 0 ? null : ((product.price - unit) / product.price) * 100
    const row: BatchCostRow = {
      batch,
      unitCost: unit,
      margin,
      unitsSold: sold.get(batch.id) ?? 0,
      costChange: unit !== null && prev ? (unit - prev.unit) / prev.unit : null,
      marginChange: margin !== null && prev ? margin - prev.margin : null,
    }
    if (unit !== null && margin !== null) prev = { unit, margin }
    return row
  })
}

export interface ProductPoint {
  date: string
  end: string
  revenue: number
  cogs: number
  grossProfit: number
  /** Units sold in the bucket with no recorded cost. */
  uncostedUnits: number
}

/** One product's sales and cost of goods over the period, daily up to 45 days and weekly beyond. */
export function productSeries(days: LedgerDay[], product: Product, costs: CostTimeline): ProductPoint[] {
  const size = days.length > 45 ? 7 : 1
  const out: ProductPoint[] = []
  for (let end = days.length; end > 0; end -= size) {
    const chunk = days.slice(Math.max(0, end - size), end)
    let revenue = 0
    let cogs = 0
    let uncostedUnits = 0
    for (const d of chunk) {
      const u = d.units[product.id] ?? 0
      const c = costOn(costs, product.id, d.date)
      revenue += productNet(d, product)
      if (c === null) uncostedUnits += u
      else cogs += u * c
    }
    out.unshift({ date: chunk[0].date, end: chunk[chunk.length - 1].date, revenue, cogs, grossProfit: revenue - cogs, uncostedUnits })
  }
  return out
}

/* ---------------- Findings ---------------- */

export interface Finding {
  id: string
  tone: 'warn' | 'bad'
  title: string
  detail: string
  /** Where to act on it. */
  target: { kind: 'product' | 'costing' | 'project'; id: string }
}

/**
 * Deterministic findings from the records, most consequential first. These are rules, not AI:
 * the Tracker agent will later explain the same findings in chat.
 */
export function findings(products: ProfitRow[], data: TrackerDataset, projects: ProjectFinancials[]): Finding[] {
  const out: Finding[] = []
  const totalRevenue = products.reduce((s, r) => s + r.revenue, 0)
  const costed = products.filter((r) => r.margin !== null && r.revenue > 0)
  const avgMargin = costed.length ? costed.reduce((s, r) => s + r.grossProfit!, 0) / costed.reduce((s, r) => s + r.revenue, 0) * 100 : null

  for (const r of products) {
    const status = profitStatus(r)
    if (status === 'missing' && r.revenue > 0)
      out.push({ id: `missing-${r.id}`, tone: 'warn', title: `${r.name} has no recorded cost`, detail: `${money(r.revenue)} of sales count at zero cost, so profit reads high.`, target: { kind: 'costing', id: r.id } })
    else if (status === 'loss') out.push({ id: `loss-${r.id}`, tone: 'bad', title: `${r.name} is selling below cost`, detail: `Gross margin ${r.margin!.toFixed(1)}%. Each sale loses money before any operating cost.`, target: { kind: 'product', id: r.id } })
    else if (status === 'low') out.push({ id: `low-${r.id}`, tone: 'warn', title: `${r.name} has a thin margin`, detail: `Gross margin ${r.margin!.toFixed(1)}%, under the ${LOW_MARGIN}% guide.`, target: { kind: 'product', id: r.id } })
    // A big seller that earns less than the business does on average.
    else if (avgMargin !== null && r.margin !== null && totalRevenue > 0 && r.revenue / totalRevenue >= 0.15 && r.margin < avgMargin - 8)
      out.push({ id: `seller-${r.id}`, tone: 'warn', title: `${r.name} sells well but earns less`, detail: `${Math.round((r.revenue / totalRevenue) * 100)}% of sales at a ${r.margin.toFixed(1)}% margin, against ${avgMargin.toFixed(1)}% overall.`, target: { kind: 'product', id: r.id } })
  }

  for (const p of data.products) {
    const history = batchCostHistory(p, data).filter((b) => b.unitCost !== null)
    const last = history.at(-1)
    if (last?.costChange != null && last.costChange > COST_RISE && last.marginChange !== null)
      out.push({
        id: `rise-${p.id}`,
        tone: 'warn',
        title: `${p.name}: margin fell on batch ${last.batch.label}`,
        detail: `Unit cost up ${(last.costChange * 100).toFixed(0)}% on the batch before, ${Math.abs(last.marginChange).toFixed(1)} margin points lost at the same price.`,
        target: { kind: 'product', id: p.id },
      })
  }

  for (const f of projects) {
    if (f.project.status === 'archived' || f.project.status === 'planning') continue
    if (f.spending > 0 && f.netSales > 0 && f.profit < 0)
      out.push({ id: `project-${f.project.id}`, tone: 'bad', title: `${f.project.name} is losing money so far`, detail: `Estimated profit ${money(f.profit)} after project expenses.`, target: { kind: 'project', id: f.project.id } })
    else if (f.netSales > 0 && f.operatingExpenses / f.netSales > 0.3)
      out.push({ id: `project-${f.project.id}`, tone: 'warn', title: `${f.project.name} spends heavily for its sales`, detail: `Project expenses are ${Math.round((f.operatingExpenses / f.netSales) * 100)}% of its net sales.`, target: { kind: 'project', id: f.project.id } })
    else if (f.budgetUsed !== null && f.budgetUsed > 100)
      out.push({ id: `project-${f.project.id}`, tone: 'warn', title: `${f.project.name} is over budget`, detail: `Spending is at ${Math.round(f.budgetUsed)}% of its budget.`, target: { kind: 'project', id: f.project.id } })
  }

  const weight = (f: Finding) => (f.tone === 'bad' ? 0 : f.id.startsWith('missing') ? 1 : 2)
  return out.sort((a, b) => weight(a) - weight(b))
}
