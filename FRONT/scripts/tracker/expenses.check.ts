import assert from 'node:assert/strict'
import { classify, confirmBlockers, countsAsExpense, filterExpenses, normalizeDraft, possibleDuplicates, sortExpenses, summarizeExpenses, validateExpense, EXPENSE_CATEGORIES } from '../../src/lib/expenses.ts'
import { projectFinancials } from '../../src/lib/projects.ts'

type E = Parameters<typeof countsAsExpense>[0]
const base = { source: 'manual' as const, createdAt: '2026-10-01T12:00:00.000Z' }
const ex = (id: string, amount: number, at: string, extra: Partial<E> = {}): E => ({ id, label: id, amount, at: `${at}T12:00:00.000Z`, status: 'confirmed', treatment: 'operating', ...base, ...extra })

const list: E[] = [
  ex('rent', 9_000, '2026-10-01', { category: 'rent' }),
  ex('shoot', 1_200, '2026-10-10', { category: 'content', projectId: 'w27' }),
  ex('freight', 1_350, '2026-10-05', { category: 'transport', treatment: 'production', batchId: 'b1' }),
  ex('supplier', 15_600, '2026-10-06', { category: 'other', treatment: 'non_expense' }),
  ex('draft', 1_500, '2026-10-20', { category: 'content', projectId: 'w27', status: 'needs_review', source: 'chat' }),
  ex('unknown', 86.4, '2026-10-21', { status: 'needs_review', treatment: undefined, category: undefined }),
  ex('voided', 400, '2026-10-12', { category: 'meals', status: 'void' }),
]

// Only confirmed operating entries count; a project is a view of operating expenses, not an extra total.
{
  const s = summarizeExpenses(list)
  assert.equal(s.total, 10_200)
  assert.equal(s.project, 1_200)
  assert.equal(s.general, 9_000)
  assert.equal(s.project + s.general, s.total, 'project + general = total, nothing counted twice')
  assert.equal(s.review.count, 2)
  assert.equal(s.review.amount, 1_586.4)
  assert.equal(s.production, 1_350)
  assert.equal(s.nonExpense, 15_600)
  assert.equal(s.voided, 1)
  assert.equal(summarizeExpenses(list, { from: '2026-10-05', to: '2026-10-10' }).total, 1_200)
  console.log('Summary ok: total 10,200 = project 1,200 + general 9,000; production, non-expense, review and void excluded')
}

// The project counts the same record once; the pending draft is listed, not counted; moving it changes both projects.
{
  const p = (id: string) => ({ id, name: id, type: 'season' as const, status: 'active' as const, startsAt: '2026-10-01', createdAt: '' })
  const records = { batches: [], batchSales: [], expenses: list }
  const w = projectFinancials(p('w27'), records)
  assert.equal(w.operatingExpenses, 1_200)
  assert.equal(w.pendingExpenses.length, 1)
  const moved = list.map((e) => (e.id === 'shoot' ? { ...e, projectId: 's27' } : e))
  assert.equal(projectFinancials(p('w27'), { ...records, expenses: moved }).operatingExpenses, 0)
  assert.equal(projectFinancials(p('s27'), { ...records, expenses: moved }).operatingExpenses, 1_200)
  assert.equal(summarizeExpenses(moved).total, 10_200, 'moving between projects never changes the total')
  const unlinked = list.map((e) => (e.id === 'shoot' ? { ...e, projectId: undefined } : e))
  assert.equal(summarizeExpenses(unlinked).general, 10_200, 'unlinking keeps the expense, now general')
  const edited = list.map((e) => (e.id === 'shoot' ? { ...e, amount: 1_450 } : e))
  assert.equal(projectFinancials(p('w27'), { ...records, expenses: edited }).operatingExpenses, 1_450)
  assert.equal(summarizeExpenses(edited).total, 10_450)
  console.log('Project ok: counted once, pending listed only, move and unlink and edit recalculate')
}

// Classification is a treatment, not a category.
assert.equal(classify({ treatment: 'operating', projectId: 'w27' }), 'project')
assert.equal(classify({ treatment: 'operating' }), 'operating')
assert.equal(classify({ treatment: 'production' }), 'production')
assert.equal(classify({}), 'unclassified')
assert.equal(EXPENSE_CATEGORIES.find((c) => c.id === 'packaging')!.suggests, undefined, 'packaging depends, so nothing is suggested')

// Normalizing drops relationships that would count a record twice.
{
  const d = normalizeDraft({ label: ' Freight ', amount: 10.005, date: '2026-10-01', treatment: 'production', projectId: 'w27', batchId: 'b1' })
  assert.equal(d.projectId, undefined, 'production cost reaches the project through its batch')
  assert.equal(d.batchId, 'b1')
  assert.equal(d.label, 'Freight')
  assert.equal(normalizeDraft({ label: 'Rent', amount: 1, date: '2026-10-01', treatment: 'operating', batchId: 'b1' }).batchId, undefined)
  console.log('Normalize ok')
}

// Validation.
{
  const ctx = { today: '2026-10-29', batches: [] }
  const ok = { label: 'Shoot', amount: 1_200, date: '2026-10-28', category: 'content' }
  assert.deepEqual(validateExpense(ok, ctx), {})
  assert.ok(validateExpense({ ...ok, amount: Number.NaN }, ctx).amount)
  assert.ok(validateExpense({ ...ok, amount: 0 }, ctx).amount)
  assert.ok(validateExpense({ ...ok, amount: -5 }, ctx).amount)
  assert.ok(validateExpense({ ...ok, amount: 1.234 }, ctx).amount)
  assert.deepEqual(validateExpense({ ...ok, amount: 10.1 }, ctx), {}, '10.1 has two decimals at most')
  assert.ok(validateExpense({ ...ok, label: '  ' }, ctx).label)
  assert.ok(validateExpense({ ...ok, date: '' }, ctx).date)
  assert.ok(validateExpense({ ...ok, date: '2026-02-31' }, ctx).date, 'impossible date')
  assert.ok(validateExpense({ ...ok, date: '2026-11-02' }, ctx).date, 'future date')
  assert.ok(validateExpense({ ...ok, category: undefined }, ctx).category)
  assert.deepEqual(validateExpense({ ...ok, category: undefined }, { ...ctx, mode: 'prepare' }), {}, 'Tracker may prepare without a category')
  assert.deepEqual(confirmBlockers({ ...ok, treatment: 'operating' }), [])
  assert.equal(confirmBlockers({ ...ok }).length, 1, 'undecided treatment blocks confirmation')
  assert.equal(confirmBlockers({ ...ok, treatment: 'production' }).length, 1, 'production needs a batch')
  console.log('Validation ok')
}

// Duplicates, filters and sorting.
{
  assert.deepEqual(possibleDuplicates({ amount: 1_200, date: '2026-10-11', label: 'shoot' }, list).map((e) => e.id), ['shoot'])
  assert.equal(possibleDuplicates({ amount: 1_200, date: '2026-10-20', label: 'shoot' }, list).length, 0, 'more than three days apart')
  assert.equal(possibleDuplicates({ amount: 400, date: '2026-10-12', label: 'voided' }, list).length, 0, 'void entries are ignored')
  const cats = EXPENSE_CATEGORIES
  assert.deepEqual(filterExpenses(list, { status: 'needs_review' }, cats).map((e) => e.id), ['draft', 'unknown'])
  assert.equal(filterExpenses(list, {}, cats).some((e) => e.id === 'voided'), false, 'void hidden by default')
  assert.deepEqual(filterExpenses(list, { status: 'void' }, cats).map((e) => e.id), ['voided'])
  assert.deepEqual(filterExpenses(list, { project: 'w27' }, cats).map((e) => e.id), ['shoot', 'draft'])
  assert.deepEqual(filterExpenses(list, { classification: 'production' }, cats).map((e) => e.id), ['freight'])
  assert.deepEqual(filterExpenses(list, { query: 'photoshoot' }, cats).map((e) => e.id), ['shoot', 'draft'], 'search covers the category name')
  assert.deepEqual(filterExpenses(list, { from: '2026-10-20' }, cats).map((e) => e.id), ['draft', 'unknown'])
  assert.deepEqual(sortExpenses(list, 'amount-desc').slice(0, 2).map((e) => e.id), ['supplier', 'rent'])
  assert.equal(sortExpenses(list, 'newest')[0].id, 'unknown')
  assert.equal(sortExpenses(list, 'oldest')[0].id, 'rent')
  console.log('Duplicates, filters and sorting ok')
}
