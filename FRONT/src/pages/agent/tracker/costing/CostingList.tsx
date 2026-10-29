import { ArrowUpDown, ChevronRight, RotateCcw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DropdownMenu } from '@/components/arc/dropdown-menu/dropdown-menu'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { CostingStatusBadge, ProductThumb } from '@/components/tracker/costing/parts'
import { sectionPath } from '@/components/tracker/sections'
import { useBatchActions, useTrackerData } from '@/components/tracker/use-tracker'
import { summarizeProductCost, type ProductCostSummary } from '@/lib/costing'
import { moneyExact, number } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toasts'

type Filter = 'all' | 'missing' | 'batches' | 'drafts'
type Sort = 'name' | 'margin-asc' | 'margin-desc' | 'cost' | 'stock'

const SORTS: { id: Sort; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'margin-asc', label: 'Lowest margin' },
  { id: 'margin-desc', label: 'Highest margin' },
  { id: 'cost', label: 'Highest unit cost' },
  { id: 'stock', label: 'Most stock' },
]

function matches(s: ProductCostSummary, filter: Filter, q: string): boolean {
  if (filter === 'missing' && s.status === 'costed') return false
  if (filter === 'batches' && s.batches.length < 2) return false
  if (filter === 'drafts' && s.draftCount === 0) return false
  if (!q) return true
  const hay = `${s.product.name} ${s.product.sku} ${s.product.variants.map((v) => `${v.title} ${v.sku}`).join(' ')}`.toLowerCase()
  return hay.includes(q.toLowerCase())
}

function compare(sort: Sort) {
  // Products without a cost always sort last on cost and margin, so they never pose as the cheapest.
  const nullLast = (a: number | null | undefined, b: number | null | undefined, dir: 1 | -1) => (a == null ? 1 : b == null ? -1 : (a - b) * dir)
  return (a: ProductCostSummary, b: ProductCostSummary) => {
    if (sort === 'margin-asc') return nullLast(a.economics?.margin, b.economics?.margin, 1)
    if (sort === 'margin-desc') return nullLast(a.economics?.margin, b.economics?.margin, -1)
    if (sort === 'cost') return nullLast(a.unitCost, b.unitCost, -1)
    if (sort === 'stock') return nullLast(a.inventory, b.inventory, -1)
    return a.product.name.localeCompare(b.product.name)
  }
}

export function CostingList() {
  const { data } = useTrackerData()
  const actions = useBatchActions()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('name')
  const [confirmReset, setConfirmReset] = useState(false)

  const all = useMemo(() => data.products.map((p) => summarizeProductCost(p, data.batches)), [data])
  const rows = all.filter((s) => matches(s, filter, query)).sort(compare(sort))
  const costed = all.filter((s) => s.economics)
  const avgMargin = costed.length ? costed.reduce((a, s) => a + s.economics!.margin, 0) / costed.length : null
  const counts = {
    missing: all.filter((s) => s.status !== 'costed').length,
    batches: all.filter((s) => s.batches.length > 1).length,
    drafts: all.filter((s) => s.draftCount > 0).length,
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[24px] font-medium leading-tight tracking-[-0.025em] text-ink">Product costing</h2>
          <p className="mt-1.5 max-w-xl text-[13.5px] text-ink-3">What each product costs to make or buy, batch by batch. Open a product to see its batches and unit economics.</p>
        </div>
        {actions.edited &&
          (confirmReset ? (
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-ink-2">Discard your demo batches?</span>
              <button
                type="button"
                onClick={() => {
                  actions.reset()
                  setConfirmReset(false)
                  toast('Demo costs reset')
                }}
                className="rounded-[8px] bg-inverse px-2.5 py-1 text-ink-inverse"
              >
                Reset
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className="px-1.5 py-1 text-ink-2 hover:text-ink">
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} className="inline-flex items-center gap-1.5 self-start text-[13px] text-ink-3 hover:text-ink sm:self-auto">
              <RotateCcw className="size-3.5" strokeWidth={1.7} /> Reset demo costs
            </button>
          ))}
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line sm:grid-cols-4">
        {[
          { label: 'Products', value: number(all.length) },
          { label: 'With a recorded cost', value: number(costed.length) },
          { label: 'Missing a cost', value: number(counts.missing), warn: counts.missing > 0 },
          { label: 'Average gross margin', value: avgMargin === null ? 'n/a' : `${avgMargin.toFixed(1)}%` },
        ].map((s) => (
          <div key={s.label} className="bg-panel px-5 py-4">
            <dt className="text-[12.5px] text-ink-3">{s.label}</dt>
            <dd className={cn('tabular mt-1 text-[20px] font-light tracking-[-0.02em]', s.warn ? 'text-warn' : 'text-ink')}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-label="Products" className="rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]">
        <div className="flex flex-col gap-3 border-b border-line-subtle p-4 sm:p-5 lg:flex-row lg:items-center">
          <label className="relative block lg:w-64">
            <span className="sr-only">Search products</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.7} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, SKU or variant"
              className="h-10 w-full rounded-[10px] border border-line bg-panel pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-3 hover:border-line-strong focus-visible:border-ink"
            />
          </label>
          <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
            <SegmentedControl
              label="Show"
              value={filter}
              onValueChange={(v) => setFilter(v as Filter)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'missing', label: 'Missing cost', accessory: counts.missing ? <span className="tabular text-[11.5px] text-warn">{counts.missing}</span> : undefined },
                { value: 'batches', label: 'Several batches', accessory: <span className="tabular text-[11.5px] text-ink-3">{counts.batches}</span> },
                { value: 'drafts', label: 'Drafts', accessory: counts.drafts ? <span className="tabular text-[11.5px] text-ink-3">{counts.drafts}</span> : undefined },
              ]}
            />
          </div>
          <div className="lg:ml-auto">
            <DropdownMenu label={`Sort: ${SORTS.find((s) => s.id === sort)!.label}`} icon={<ArrowUpDown className="size-4" strokeWidth={1.6} />} items={SORTS.map((s) => ({ label: s.label, onSelect: () => setSort(s.id) }))} />
          </div>
        </div>

        <div className="hidden grid-cols-[minmax(0,1fr)_84px_92px_124px_108px_14px] gap-4 px-5 pb-1 pt-3 text-[12px] text-ink-3 md:grid">
          <span>Product</span>
          <span className="text-right">Price</span>
          <span className="text-right">Unit cost</span>
          <span>Gross margin</span>
          <span>Status</span>
          <span />
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <p className="text-[14px] text-ink">No products match</p>
            <p className="text-[13px] text-ink-3">{query ? `Nothing found for “${query}”.` : 'Nothing fits this filter right now.'}</p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setFilter('all')
              }}
              className="mt-2 text-[13px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink"
            >
              Show all products
            </button>
          </div>
        ) : (
          <ul className="flex flex-col px-2 pb-2 md:px-0 md:pb-1">
            {rows.map((s) => (
              <li key={s.product.id} className="border-b border-line-subtle last:border-0 md:border-0">
                <Link
                  to={`${sectionPath('costing')}/${s.product.id}`}
                  className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 rounded-[12px] px-3 py-3.5 transition-colors hover:bg-panel-muted md:mx-2 md:grid-cols-[minmax(0,1fr)_84px_92px_124px_108px_14px] md:gap-4 md:px-3"
                >
                  <span className="contents md:flex md:min-w-0 md:items-center md:gap-3.5">
                    <ProductThumb name={s.product.name} />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] text-ink">{s.product.name}</span>
                      <span className="block truncate text-[12.5px] text-ink-3">
                        {s.product.sku} · {s.product.variants.length === 1 ? s.product.variants[0].title : `${s.product.variants.length} variants`}
                        {s.inventory !== null && ` · ${number(s.inventory)} in stock`}
                        {s.batches.length > 1 && ` · ${s.batches.length} batches`}
                      </span>
                    </span>
                  </span>
                  <span className="md:hidden">
                    <CostingStatusBadge status={s.status} />
                  </span>
                  <span className="tabular hidden text-right text-[13.5px] text-ink md:block">{moneyExact(s.product.price)}</span>
                  <span className={cn('tabular hidden text-right text-[13.5px] md:block', s.unitCost === null ? 'text-ink-3' : 'text-ink')}>{s.unitCost === null ? 'Not set' : moneyExact(s.unitCost)}</span>
                  <span className="hidden items-center gap-2.5 md:flex">
                    {s.economics ? (
                      <>
                        <span className="h-1.5 w-12 overflow-hidden rounded-full bg-sunken" aria-hidden>
                          <span className={cn('block h-full rounded-full', s.economics.margin >= 0 ? 'bg-profit' : 'bg-bad')} style={{ width: `${Math.max(0, Math.min(100, s.economics.margin))}%` }} />
                        </span>
                        <span className="tabular text-[13.5px] text-ink">{s.economics.margin.toFixed(1)}%</span>
                      </>
                    ) : (
                      <span className="text-[13px] text-ink-3">n/a</span>
                    )}
                  </span>
                  <span className="hidden md:block">
                    <CostingStatusBadge status={s.status} />
                  </span>
                  <ChevronRight className="hidden size-4 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink md:block" strokeWidth={1.7} />

                  {/* Phones: the key numbers on one quiet line under the name. */}
                  <span className="col-span-3 grid grid-cols-3 gap-2 text-[12.5px] md:hidden">
                    <span>
                      <span className="block text-ink-3">Price</span>
                      <span className="tabular text-ink">{moneyExact(s.product.price)}</span>
                    </span>
                    <span>
                      <span className="block text-ink-3">Unit cost</span>
                      <span className={cn('tabular', s.unitCost === null ? 'text-ink-3' : 'text-ink')}>{s.unitCost === null ? 'Not set' : moneyExact(s.unitCost)}</span>
                    </span>
                    <span>
                      <span className="block text-ink-3">Margin</span>
                      <span className="tabular text-ink">{s.economics ? `${s.economics.margin.toFixed(1)}%` : 'n/a'}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-[12px] text-ink-3">Current unit cost is taken from each product’s most recent finalized batch. Products and stock are sample data; nothing is written to your store.</p>
    </div>
  )
}
