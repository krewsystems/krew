import assert from 'node:assert/strict'
import { canFinalize, costBatch, currentBatch, nextBatchLabel, unitEconomics } from '../../src/lib/costing.ts'

const near = (a: number | null, b: number, msg: string) => assert.ok(a !== null && Math.abs(a - b) < 1e-6, `${msg}: got ${a}, want ${b}`)
const one = [{ variantId: 'v1', quantity: 1 }]

// Scenario A: simple reseller, 300 per unit + 30 packaging per unit.
{
  const c = costBatch({ quantities: [{ variantId: 'v1', quantity: 40 }], components: [
    { id: 'a', label: 'Product purchase', basis: 'per_unit', amount: 300 },
    { id: 'b', label: 'Packaging', basis: 'per_unit', amount: 30 },
  ] })
  near(c.unitCost, 330, 'A unit cost')
  near(c.totalCost, 13_200, 'A total')
  assert.ok(c.reconciles && c.issues.length === 0)
  console.log('A ok: unit 330')
}

// Scenario B: manufacturer, 100 pieces.
{
  const c = costBatch({ quantities: [{ variantId: 'v1', quantity: 100 }], components: [
    { id: 'f', label: 'Fabric', basis: 'batch_total', amount: 20_000 },
    { id: 'b', label: 'Buttons', basis: 'batch_total', amount: 2_000 },
    { id: 'm', label: 'Manufacturing', basis: 'batch_total', amount: 15_000 },
    { id: 'p', label: 'Packaging', basis: 'per_unit', amount: 30 },
  ] })
  near(c.totalCost, 40_000, 'B total')
  near(c.unitCost, 400, 'B unit cost')
  near(c.components.find((x) => x.id === 'f')!.perUnit, 200, 'B fabric per unit')
  console.log('B ok: total 40,000, unit 400')
}

// Scenario C: two batches keep independent histories; the latest finalized one is current.
{
  const b1 = { id: 'b1', productId: 'p', label: 'Batch 001', kind: 'purchase' as const, receivedAt: '2026-08-01', status: 'finalized' as const, quantities: [{ variantId: 'v1', quantity: 100 }], components: [{ id: 'x', label: 'Purchase', basis: 'per_unit' as const, amount: 300 }] }
  const b2 = { ...b1, id: 'b2', label: 'Batch 002', receivedAt: '2026-10-01', quantities: [{ variantId: 'v1', quantity: 150 }], components: [{ id: 'x', label: 'Purchase', basis: 'per_unit' as const, amount: 350 }] }
  near(costBatch(b1).unitCost, 300, 'C batch 1')
  near(costBatch(b2).unitCost, 350, 'C batch 2')
  near(costBatch(b1).totalCost, 30_000, 'C batch 1 total')
  near(costBatch(b2).totalCost, 52_500, 'C batch 2 total')
  assert.equal(currentBatch([b1, b2], 'p')?.id, 'b2')
  assert.equal(nextBatchLabel([b1, b2], 'p', 'B-'), 'Batch 003'); assert.equal(nextBatchLabel([{ ...b1, label: 'DN-08 Winter' }], 'p', 'B-'), 'DN-09'); assert.equal(nextBatchLabel([], 'p', 'SH-BED-'), 'SH-BED-001')
  console.log('C ok: 300 and 350 kept separately, next label', nextBatchLabel([b1, b2], 'p', 'B-'))
}

// Scenario D: variants with shared and scoped costs reconcile.
{
  const q = [{ variantId: 'S', quantity: 30 }, { variantId: 'M', quantity: 50 }, { variantId: 'L', quantity: 20 }]
  const c = costBatch({ quantities: q, components: [
    { id: 'fab', label: 'Fabric', basis: 'batch_total', amount: 10_000 },
    { id: 'lab', label: 'Sewing', basis: 'per_unit', amount: 40 },
    { id: 'big', label: 'Extra fabric, L', basis: 'per_unit', amount: 25, appliesTo: ['L'] },
    { id: 'sm', label: 'Size labels, S and M', basis: 'batch_total', amount: 800, appliesTo: ['S', 'M'] },
  ] })
  // 10,000 + 40*100 + 25*20 + 800 = 15,300
  near(c.totalCost, 15_300, 'D total')
  near(c.unitCost, 153, 'D unit')
  const v = Object.fromEntries(c.variants.map((x) => [x.variantId, x]))
  // S: 3,000 fabric + 1,200 sewing + 300 labels = 4,500 -> 150
  near(v.S.cost, 4_500, 'D S cost'); near(v.S.unitCost, 150, 'D S unit')
  // M: 5,000 + 2,000 + 500 = 7,500 -> 150
  near(v.M.cost, 7_500, 'D M cost')
  // L: 2,000 + 800 + 500 = 3,300 -> 165
  near(v.L.cost, 3_300, 'D L cost'); near(v.L.unitCost, 165, 'D L unit')
  near(c.variants.reduce((s, x) => s + x.cost, 0), c.totalCost, 'D reconcile')
  assert.ok(c.reconciles)
  console.log('D ok: S 150, M 150, L 165, reconciles to 15,300')

  // Ambiguous allocation is flagged, never spread silently.
  const bad = costBatch({ quantities: [{ variantId: 'S', quantity: 30 }, { variantId: 'L', quantity: 0 }], components: [{ id: 'big', label: 'Extra fabric, L', basis: 'batch_total', amount: 500, appliesTo: ['L'] }] })
  assert.ok(bad.issues.some((i) => i.kind === 'unallocatable'))
  assert.equal(bad.reconciles, false)
  assert.equal(canFinalize(bad, { label: 'x' }), false)
  console.log('D ok: cost scoped to a variant with no quantity is blocked')
}

// Add, edit, remove.
{
  let comps = [{ id: 'a', label: 'Purchase', basis: 'per_unit' as const, amount: 300 }]
  comps = [...comps, { id: 'b', label: 'Packaging', basis: 'per_unit' as const, amount: 30 }]
  near(costBatch({ quantities: one, components: comps }).unitCost, 330, 'add')
  comps = comps.map((c) => (c.id === 'b' ? { ...c, amount: 45 } : c))
  near(costBatch({ quantities: one, components: comps }).unitCost, 345, 'edit')
  comps = comps.map((c) => (c.id === 'b' ? { ...c, basis: 'batch_total' as const, amount: 450 } : c))
  near(costBatch({ quantities: [{ variantId: 'v1', quantity: 10 }], components: comps }).unitCost, 345, 'switch basis')
  comps = comps.filter((c) => c.id !== 'b')
  near(costBatch({ quantities: one, components: comps }).unitCost, 300, 'remove')
  const e = unitEconomics(500, 330)
  near(e.grossProfit, 170, 'profit'); near(e.margin, 34, 'margin')
  console.log('Add, edit, switch basis, remove ok; economics 500 - 330 = 170, 34%')
}
