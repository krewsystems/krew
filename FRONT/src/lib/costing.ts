// Product costing calculations for Tracker. Pure and deterministic: no React, no formatting, no I/O.
// The same functions should back the UI, the backend and the Tracker agent so every surface agrees.

import type { Batch, CostComponent, Product, Variant } from '../data/tracker/types'

/** Below this, money differences are rounding noise. */
const EPSILON = 0.005

export type CostIssue =
  | { kind: 'no_quantity' }
  | { kind: 'no_components' }
  | { kind: 'invalid_amount'; componentId: string }
  | { kind: 'missing_label'; componentId: string }
  | { kind: 'empty_scope'; componentId: string }
  /** A cost is scoped to variants that have no quantity in this batch, so it cannot be allocated. */
  | { kind: 'unallocatable'; componentId: string }

export interface ComponentCost {
  id: string
  label: string
  basis: CostComponent['basis']
  /** What this component adds to the batch total. */
  total: number
  /** Its contribution to the average unit cost of the whole batch. */
  perUnit: number
  /** Cost allocated to each variant. Empty when it cannot be allocated. */
  byVariant: Record<string, number>
  allocatable: boolean
}

export interface VariantCost {
  variantId: string
  quantity: number
  cost: number
  /** Null when the variant has no quantity in the batch. */
  unitCost: number | null
}

export interface BatchCosting {
  totalQuantity: number
  totalCost: number
  /** Average cost of one unit across the batch. Null when the batch has no quantity or no costs. */
  unitCost: number | null
  components: ComponentCost[]
  variants: VariantCost[]
  issues: CostIssue[]
  /** Variant allocations add up to the batch total. False only when a cost could not be allocated. */
  reconciles: boolean
}

export function quantityOf(batch: Pick<Batch, 'quantities'>, variantIds?: string[]): number {
  return batch.quantities.reduce((sum, q) => (!variantIds || variantIds.includes(q.variantId) ? sum + Math.max(0, q.quantity || 0) : sum), 0)
}

/** Variants a component applies to: its scope, or every variant with a quantity line. */
function scopeOf(c: CostComponent, batch: Pick<Batch, 'quantities'>): string[] {
  return c.appliesTo ?? batch.quantities.map((q) => q.variantId)
}

/**
 * Cost of one component, spread over variants.
 * Per unit: amount times each in-scope variant's quantity.
 * Whole batch: the amount, allocated to in-scope variants in proportion to quantity.
 */
export function costComponent(c: CostComponent, batch: Pick<Batch, 'quantities'>, totalQuantity: number): ComponentCost {
  const scope = scopeOf(c, batch)
  const scopeQty = quantityOf(batch, scope)
  const amount = Number.isFinite(c.amount) ? c.amount : 0
  const byVariant: Record<string, number> = {}
  const allocatable = scope.length > 0 && scopeQty > 0
  if (allocatable) {
    for (const q of batch.quantities) {
      if (!scope.includes(q.variantId) || q.quantity <= 0) continue
      byVariant[q.variantId] = c.basis === 'per_unit' ? amount * q.quantity : (amount * q.quantity) / scopeQty
    }
  }
  // A whole-batch amount is a real cost even when it cannot be allocated, so it still counts toward the batch total.
  const total = c.basis === 'per_unit' ? amount * scopeQty : amount
  return { id: c.id, label: c.label, basis: c.basis, total, perUnit: totalQuantity > 0 ? total / totalQuantity : 0, byVariant, allocatable }
}

export function costBatch(batch: Pick<Batch, 'quantities' | 'components'>): BatchCosting {
  const totalQuantity = quantityOf(batch)
  const issues: CostIssue[] = []
  if (totalQuantity <= 0) issues.push({ kind: 'no_quantity' })
  if (batch.components.length === 0) issues.push({ kind: 'no_components' })

  const components = batch.components.map((c) => {
    if (!c.label.trim()) issues.push({ kind: 'missing_label', componentId: c.id })
    if (!Number.isFinite(c.amount) || c.amount <= 0) issues.push({ kind: 'invalid_amount', componentId: c.id })
    if (c.appliesTo && c.appliesTo.length === 0) issues.push({ kind: 'empty_scope', componentId: c.id })
    const cost = costComponent(c, batch, totalQuantity)
    if (!cost.allocatable && totalQuantity > 0 && !(c.appliesTo && c.appliesTo.length === 0)) issues.push({ kind: 'unallocatable', componentId: c.id })
    return cost
  })

  const totalCost = components.reduce((s, c) => s + c.total, 0)
  const variants: VariantCost[] = batch.quantities.map((q) => {
    const cost = components.reduce((s, c) => s + (c.byVariant[q.variantId] ?? 0), 0)
    return { variantId: q.variantId, quantity: q.quantity, cost, unitCost: q.quantity > 0 ? cost / q.quantity : null }
  })
  const allocated = variants.reduce((s, v) => s + v.cost, 0)

  return {
    totalQuantity,
    totalCost,
    unitCost: totalQuantity > 0 && batch.components.length > 0 ? totalCost / totalQuantity : null,
    components,
    variants,
    issues,
    reconciles: Math.abs(allocated - totalCost) < EPSILON,
  }
}

/** A batch can be finalized only when every cost is named, positive and allocatable. */
export function canFinalize(costing: BatchCosting, batch: Pick<Batch, 'label'>): boolean {
  return batch.label.trim().length > 0 && costing.issues.length === 0 && costing.reconciles
}

/* ---------------- Unit economics ---------------- */

export interface UnitEconomics {
  price: number
  unitCost: number
  grossProfit: number
  /** Percent of price. */
  margin: number
}

export function unitEconomics(price: number, unitCost: number): UnitEconomics {
  const grossProfit = price - unitCost
  return { price, unitCost, grossProfit, margin: price > 0 ? (grossProfit / price) * 100 : 0 }
}

export function variantPrice(product: Product, variant: Variant | undefined): number {
  return variant?.price ?? product.price
}

/* ---------------- Batch history ---------------- */

/** Newest first: by production date, then by last change. */
export function sortBatches(batches: Batch[]): Batch[] {
  return [...batches].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt) || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

/**
 * The batch whose cost is used as the product's current cost: the most recent finalized batch.
 * This is a simple "latest cost" rule. Inventory valuation methods (FIFO, weighted average) are not applied yet.
 */
export function currentBatch(batches: Batch[], productId: string): Batch | undefined {
  return sortBatches(batches.filter((b) => b.productId === productId && b.status === 'finalized'))[0]
}

/** Suggests the next batch name from the product's existing ones, such as "DN-09" after "DN-08 Winter", or "Batch 003" after "Batch 002". */
export function nextBatchLabel(batches: Batch[], productId: string, fallbackPrefix: string): string {
  const own = batches.filter((b) => b.productId === productId)
  let prefix = fallbackPrefix
  let max = 0
  let width = 3
  for (const b of own) {
    // The first number in the name is the sequence: "DN-08 Winter" -> "DN-" and 08, "Batch 001" -> "Batch " and 001.
    const m = /^(\D*?)(\d+)/.exec(b.label)
    if (!m || Number(m[2]) < max) continue
    prefix = m[1]
    max = Number(m[2])
    width = m[2].length
  }
  return `${prefix}${String(max + 1).padStart(width, '0')}`
}

/* ---------------- Product summary ---------------- */

export type CostingStatus = 'costed' | 'draft' | 'missing'

export interface ProductCostSummary {
  product: Product
  batches: Batch[]
  current?: Batch
  currentCosting?: BatchCosting
  unitCost: number | null
  economics: UnitEconomics | null
  finalizedCount: number
  draftCount: number
  inventory: number | null
  /** Costed: has a finalized cost. Draft: only unfinished batches. Missing: nothing recorded. */
  status: CostingStatus
}

export function summarizeProductCost(product: Product, allBatches: Batch[]): ProductCostSummary {
  const batches = sortBatches(allBatches.filter((b) => b.productId === product.id))
  const current = currentBatch(batches, product.id)
  const currentCosting = current ? costBatch(current) : undefined
  const unitCost = currentCosting?.unitCost ?? null
  const draftCount = batches.filter((b) => b.status === 'draft').length
  const stock = product.variants.map((v) => v.inventory).filter((n): n is number => n !== undefined)
  return {
    product,
    batches,
    current,
    currentCosting,
    unitCost,
    economics: unitCost === null ? null : unitEconomics(product.price, unitCost),
    finalizedCount: batches.filter((b) => b.status === 'finalized').length,
    draftCount,
    inventory: stock.length ? stock.reduce((a, n) => a + n, 0) : null,
    status: unitCost !== null ? 'costed' : draftCount > 0 ? 'draft' : 'missing',
  }
}
