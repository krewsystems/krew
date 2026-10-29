import assert from 'node:assert/strict'
import { projectFinancials, validateProject } from '../../src/lib/projects.ts'

const near = (a: number | null, b: number, msg: string) => assert.ok(a !== null && Math.abs(a - b) < 1e-6, `${msg}: got ${a}, want ${b}`)
const project = { id: 'w27', name: 'Winter 27', type: 'season' as const, status: 'planning' as const, startsAt: '2026-11-01', budget: 50_000, revenueTarget: 80_000, createdAt: '2026-10-28' }
const batch = (id: string, qty: number, unit: number, projectId?: string, status: 'finalized' | 'draft' = 'finalized') => ({
  id, productId: 'p', projectId, label: id, kind: 'production' as const, receivedAt: '2026-10-01', status,
  quantities: [{ variantId: 'v', quantity: qty }], components: [{ id: 'c', label: 'Cost', basis: 'per_unit' as const, amount: unit }],
})

// 100 units made at 300, only 30 sold: COGS is 30 x 300, not 100 x 300.
{
  const batches = [batch('A', 100, 300, 'w27'), batch('B', 50, 350, 'w27'), batch('C', 80, 200)]
  const batchSales = [{ batchId: 'A', unitsSold: 30, netSales: 27_000 }, { batchId: 'B', unitsSold: 10, netSales: 9_000 }, { batchId: 'C', unitsSold: 40, netSales: 30_000 }]
  const counted = { status: 'confirmed' as const, treatment: 'operating' as const, createdAt: '' }
  const expenses = [{ id: 'e1', label: 'Shoot', amount: 2_000, at: '', projectId: 'w27', source: 'manual' as const, ...counted }, { id: 'e2', label: 'Other', amount: 999, at: '', source: 'manual' as const, ...counted }]
  const f = projectFinancials(project, { batches, batchSales, expenses })
  near(f.investment, 30_000 + 17_500, 'investment = all production')
  near(f.cogs, 30 * 300 + 10 * 350, 'COGS = sold units only')
  near(f.inventoryValue, 70 * 300 + 40 * 350, 'inventory = unsold units')
  near(f.investment, f.cogs + f.inventoryValue, 'investment = COGS + inventory')
  near(f.netSales, 36_000, 'sales only from project batches (C excluded)')
  near(f.operatingExpenses, 2_000, 'only linked expense')
  near(f.profit, 36_000 - 12_500 - 2_000, 'profit')
  near(f.spending, 47_500 + 2_000, 'spending')
  near(f.budgetRemaining, 50_000 - 49_500, 'budget remaining')
  near(f.revenueProgress, 45, 'revenue progress')
  console.log('COGS vs investment ok: invested 47,500, COGS 12,500, inventory 35,000, profit 21,500')

  // Detach B: B's own cost is unchanged, project numbers drop B.
  const detached = batches.map((b) => (b.id === 'B' ? { ...b, projectId: undefined } : b))
  const g = projectFinancials(project, { batches: detached, batchSales, expenses })
  near(g.investment, 30_000, 'after detach')
  assert.deepEqual(detached.find((b) => b.id === 'B')!.components, batches.find((b) => b.id === 'B')!.components)
  console.log('Detach ok: project drops B, B keeps its cost')

  // Expense counted once even if "linked" again: there is one record with one projectId.
  const relinked = expenses.map((e) => ({ ...e, projectId: 'w27' }))
  near(projectFinancials(project, { batches, batchSales, expenses: relinked }).operatingExpenses, 2_999, 'linking moves, never duplicates')
  console.log('Expense once ok')

  // Draft batch with sales is flagged, not costed at zero silently.
  const withDraft = [...batches, batch('D', 20, 100, 'w27', 'draft')]
  const h = projectFinancials(project, { batches: withDraft, batchSales: [...batchSales, { batchId: 'D', unitsSold: 5, netSales: 2_500 }], expenses })
  assert.equal(h.uncostedBatches, 1); near(h.uncostedSales, 2_500, 'uncosted sales')
  console.log('Draft flagged ok')

  // Empty project.
  const e = projectFinancials({ ...project, id: 'empty', budget: undefined, revenueTarget: undefined }, { batches, batchSales, expenses })
  assert.equal(e.batches.length, 0); assert.equal(e.netSales, 0); assert.equal(e.grossMargin, null); assert.equal(e.budgetUsed, null)
  console.log('Empty project ok')
}
assert.ok(validateProject({ name: ' ', startsAt: '' }, []).name)
assert.ok(validateProject({ name: 'Winter 27', startsAt: '2026-11-01', endsAt: '2026-10-01' }, []).endsAt)
assert.ok(validateProject({ name: 'winter 27', startsAt: '2026-11-01' }, ['Winter 27']).name)
assert.deepEqual(validateProject({ name: 'Winter 27', startsAt: '2026-11-01' }, []), {})
console.log('Validation ok')
