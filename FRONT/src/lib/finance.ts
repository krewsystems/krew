// Financial calculations for Tracker. Pure functions over the dataset; no React, no formatting.

import { costBatch, currentBatch, sortBatches } from './costing'
import type { Batch, ExpenseCategory, LedgerDay, Product, TrackerDataset } from '@/data/tracker/types'

const DAY = 86_400_000

/* ---------------- Costs ---------------- */

/** Average landed cost of one unit from a batch. Null when no cost is recorded. */
export function unitCost(batch: Batch | undefined): number | null {
  return batch ? costBatch(batch).unitCost : null
}

/** Total cost of a batch, or null when no cost is recorded. */
export function batchCost(batch: Batch): number | null {
  const c = costBatch(batch)
  return c.unitCost === null ? null : c.totalCost
}

/** Unit cost per product, from its most recent finalized batch. */
export function costIndex(data: TrackerDataset): Map<string, number | null> {
  return new Map(data.products.map((p) => [p.id, unitCost(currentBatch(data.batches, p.id))]))
}

/** One step of a product's cost history: a finalized batch's unit cost, in effect from the day it was received. */
export interface CostStep {
  from: string
  unitCost: number
  batchId: string
}

/**
 * Each product's cost over time, so a sale is costed at the batch in stock on its date, not at today's cost.
 * Prototype rule, standing in for the backend's cost-flow method (FIFO or weighted average):
 * - a sale uses the most recent finalized batch received on or before the sale date;
 * - sales before the first recorded batch use that first batch (older stock was never recorded);
 * - drafts have no cost yet, and revised batches are replaced by their revision.
 */
export type CostTimeline = Map<string, CostStep[]>

export function costTimeline(data: Pick<TrackerDataset, 'products' | 'batches'>): CostTimeline {
  return new Map(
    data.products.map((p) => {
      const steps = data.batches
        .filter((b) => b.productId === p.id && b.status === 'finalized')
        .flatMap((b) => {
          const c = unitCost(b)
          return c === null ? [] : [{ from: b.receivedAt.slice(0, 10), unitCost: c, batchId: b.id }]
        })
        .sort((a, b) => a.from.localeCompare(b.from))
      return [p.id, steps]
    }),
  )
}

/** The cost step that applies to a sale on this date, or undefined when the product has no recorded cost. */
export function costStepOn(costs: CostTimeline, productId: string, date: string): CostStep | undefined {
  const steps = costs.get(productId)
  if (!steps?.length) return undefined
  let hit = steps[0]
  for (const s of steps) if (s.from <= date) hit = s
  return hit
}

export function costOn(costs: CostTimeline, productId: string, date: string): number | null {
  return costStepOn(costs, productId, date)?.unitCost ?? null
}

/* ---------------- Periods ---------------- */

export type PeriodPreset = '7d' | '30d' | '90d'

export interface Period {
  /** Inclusive ISO dates. */
  from: string
  to: string
}

function shift(iso: string, days: number): string {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * DAY).toISOString().slice(0, 10)
}

export function periodLength(p: Period): number {
  return Math.round((new Date(`${p.to}T00:00:00Z`).getTime() - new Date(`${p.from}T00:00:00Z`).getTime()) / DAY) + 1
}

export function presetPeriod(preset: PeriodPreset, lastDay: string): Period {
  const n = Number.parseInt(preset, 10)
  return { from: shift(lastDay, -(n - 1)), to: lastDay }
}

/** The period of equal length right before this one. */
export function previousPeriod(p: Period): Period {
  const n = periodLength(p)
  return { from: shift(p.from, -n), to: shift(p.from, -1) }
}

export function sliceLedger(ledger: LedgerDay[], p: Period): LedgerDay[] {
  return ledger.filter((d) => d.date >= p.from && d.date <= p.to)
}

/** Books are closed and reconciled for whole months, about ten days after month end. */
export function finalizedThrough(today = new Date()): string {
  const monthsBack = today.getDate() < 10 ? 1 : 0
  const lastDay = new Date(Date.UTC(today.getFullYear(), today.getMonth() - monthsBack, 0))
  return lastDay.toISOString().slice(0, 10)
}

/** Share of a period's days that fall in closed months, 0 to 1. */
export function finalizedShare(p: Period, through: string): number {
  if (p.from > through) return 0
  if (p.to <= through) return 1
  return periodLength({ from: p.from, to: through }) / periodLength(p)
}

/* ---------------- Summaries ---------------- */

export interface PeriodSummary {
  days: number
  grossSales: number
  discounts: number
  refunds: number
  netSales: number
  cogs: number
  grossProfit: number
  /** Percent of net sales. */
  grossMargin: number
  opex: number
  opexByCategory: Record<ExpenseCategory, number>
  netProfit: number
  netMargin: number
  units: number
  /** Net sales from products with no recorded cost. Their COGS is missing, so profit is overstated by up to their cost. */
  uncostedSales: number
}

const pct = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100)

/** Net sales for a day split across products by gross contribution, so product rows add up to the period total. */
export function productNet(day: LedgerDay, product: Product): number {
  if (day.grossSales === 0) return 0
  const net = day.grossSales - day.discounts - day.refunds
  return ((day.units[product.id] ?? 0) * product.price * net) / day.grossSales
}

export function summarize(days: LedgerDay[], products: Product[], costs: CostTimeline): PeriodSummary {
  const opexByCategory: Record<ExpenseCategory, number> = { marketing: 0, shipping: 0, payment_fees: 0, software: 0, payroll: 0, rent: 0, other: 0 }
  let grossSales = 0
  let discounts = 0
  let refunds = 0
  let cogs = 0
  let units = 0
  let uncostedSales = 0
  for (const d of days) {
    grossSales += d.grossSales
    discounts += d.discounts
    refunds += d.refunds
    for (const p of products) {
      const u = d.units[p.id] ?? 0
      units += u
      const c = costOn(costs, p.id, d.date)
      if (c === null) uncostedSales += productNet(d, p)
      else cogs += u * c
    }
    for (const k of Object.keys(d.opex) as ExpenseCategory[]) opexByCategory[k] += d.opex[k]
  }
  const netSales = grossSales - discounts - refunds
  const grossProfit = netSales - cogs
  const opex = Object.values(opexByCategory).reduce((a, b) => a + b, 0)
  const netProfit = grossProfit - opex
  return {
    days: days.length,
    grossSales,
    discounts,
    refunds,
    netSales,
    cogs,
    grossProfit,
    grossMargin: pct(grossProfit, netSales),
    opex,
    opexByCategory,
    netProfit,
    netMargin: pct(netProfit, netSales),
    units,
    uncostedSales,
  }
}

/** Percent change, or null when there is nothing to compare against. */
export function change(current: number, previous: number): number | null {
  if (!previous) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

/* ---------------- Breakdown ---------------- */

export interface ProfitRow {
  id: string
  name: string
  detail: string
  units: number
  revenue: number
  /** Average unit cost. Null when no cost is recorded. */
  unitCost: number | null
  grossProfit: number | null
  margin: number | null
  /** Share of period revenue, 0 to 100. */
  share: number
}

export function productRows(data: TrackerDataset, days: LedgerDay[], costs: CostTimeline): ProfitRow[] {
  const total = days.reduce((s, d) => s + d.grossSales - d.discounts - d.refunds, 0)
  const collections = new Map(data.collections.map((c) => [c.id, c.name]))
  return data.products.map((p) => {
    const units = days.reduce((s, d) => s + (d.units[p.id] ?? 0), 0)
    const revenue = days.reduce((s, d) => s + productNet(d, p), 0)
    // COGS adds each day's units at the cost in effect that day; the unit cost shown is the period's average.
    const costed = (costs.get(p.id)?.length ?? 0) > 0
    const cogs = days.reduce((s, d) => s + (d.units[p.id] ?? 0) * (costOn(costs, p.id, d.date) ?? 0), 0)
    const c = !costed ? null : units ? cogs / units : costOn(costs, p.id, days.at(-1)?.date ?? '')
    const grossProfit = !costed ? null : revenue - cogs
    return {
      id: p.id,
      name: p.name,
      detail: `${collections.get(p.collectionId) ?? 'Uncollected'} · ${p.sku}`,
      units,
      revenue,
      unitCost: c,
      grossProfit,
      margin: grossProfit === null ? null : pct(grossProfit, revenue),
      share: pct(revenue, total),
    }
  })
}

/** Collection totals. Unit cost and margin cover only the products with recorded costs. */
export function collectionRows(data: TrackerDataset, products: ProfitRow[]): ProfitRow[] {
  const total = products.reduce((s, r) => s + r.revenue, 0)
  return data.collections.map((col) => {
    const members = data.products.filter((p) => p.collectionId === col.id).map((p) => products.find((r) => r.id === p.id)!)
    const costed = members.filter((r) => r.unitCost !== null)
    const units = members.reduce((s, r) => s + r.units, 0)
    const revenue = members.reduce((s, r) => s + r.revenue, 0)
    const costedUnits = costed.reduce((s, r) => s + r.units, 0)
    const costedRevenue = costed.reduce((s, r) => s + r.revenue, 0)
    const costedProfit = costed.reduce((s, r) => s + (r.grossProfit ?? 0), 0)
    const missing = members.length - costed.length
    return {
      id: col.id,
      name: col.name,
      detail: `${members.length} products${missing ? ` · ${missing} without cost` : ''}`,
      units,
      revenue,
      unitCost: costedUnits ? (costedRevenue - costedProfit) / costedUnits : null,
      grossProfit: costed.length ? costedProfit : null,
      margin: costed.length ? pct(costedProfit, costedRevenue) : null,
      share: pct(revenue, total),
    }
  })
}

/* ---------------- Time series ---------------- */

export interface SeriesPoint {
  /** First day of the bucket. */
  date: string
  /** Last day of the bucket (same as date for daily buckets). */
  end: string
  netSales: number
  grossProfit: number
  netProfit: number
}

/** Daily points up to 45 days, weekly buckets beyond that so long ranges stay readable. */
export function performanceSeries(days: LedgerDay[], products: Product[], costs: CostTimeline): SeriesPoint[] {
  const size = days.length > 45 ? 7 : 1
  const out: SeriesPoint[] = []
  // Buckets are aligned to the end of the range so the latest bucket is always a full one.
  for (let end = days.length; end > 0; end -= size) {
    const chunk = days.slice(Math.max(0, end - size), end)
    const s = summarize(chunk, products, costs)
    out.unshift({ date: chunk[0].date, end: chunk[chunk.length - 1].date, netSales: s.netSales, grossProfit: s.grossProfit, netProfit: s.netProfit })
  }
  return out
}

/* ---------------- Data quality ---------------- */

export interface MissingCost {
  product: Product
  /** The batch received without costs, when there is one. */
  batch?: Batch
}

/** Products whose COGS cannot be computed: no finalized batch with costs yet. */
export function productsMissingCost(data: TrackerDataset): MissingCost[] {
  return data.products.flatMap((product) => {
    if (unitCost(currentBatch(data.batches, product.id)) !== null) return []
    // Point at the newest draft, if one exists, so the owner knows where to finish.
    return [{ product, batch: sortBatches(data.batches.filter((b) => b.productId === product.id))[0] }]
  })
}

/**
 * Likely cost of the sales that have no recorded cost, assuming those products cost what the costed ones do
 * relative to their sales. Used to show net profit as a range instead of a single overstated figure.
 */
export function estimatedMissingCogs(s: PeriodSummary): number {
  const costedSales = s.netSales - s.uncostedSales
  if (s.uncostedSales <= 0 || costedSales <= 0) return 0
  return s.uncostedSales * (s.cogs / costedSales)
}
