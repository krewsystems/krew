import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { SortableDataTable } from '@/components/arc/sortable-data-table/sortable-data-table'
import type { TrackerDataset } from '@/data/tracker/types'
import { collectionRows, type ProfitRow } from '@/lib/finance'
import { money, moneyExact, number } from '@/lib/format'
import { cn } from '@/lib/utils'
import { sectionPath } from './sections'

type View = 'products' | 'collections'

/** Margin as a quiet bar plus the number, so rows compare at a glance. */
function MarginCell({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-[12.5px] text-warn">Needs cost</span>
  return (
    <span className="inline-flex items-center justify-end gap-2.5 whitespace-nowrap">
      <span className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-sunken xl:block" aria-hidden>
        <span className="block h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, margin))}%` }} />
      </span>
      <span className="tabular whitespace-nowrap text-right text-ink">{margin.toFixed(1)}%</span>
    </span>
  )
}

interface ProfitabilityPanelProps {
  data: TrackerDataset
  products: ProfitRow[]
  className?: string
}

const PREVIEW = 5

/** Top performers by gross profit, with every product (and collections) one step away. Expanded, it takes the full row so the table has room. */
export function ProfitabilityPanel({ data, products, className }: ProfitabilityPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const ranked = [...products].filter((r) => r.grossProfit !== null).sort((a, b) => (b.grossProfit ?? 0) - (a.grossProfit ?? 0))
  const top = ranked.slice(0, PREVIEW)
  const best = top[0]?.grossProfit ?? 1
  const unranked = products.length - ranked.length

  return (
    <section aria-label="Top products" className={cn('flex flex-col rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]', expanded && 'xl:col-span-2', className)}>
      <header className="flex items-start justify-between gap-3 px-6 pt-5 sm:px-7">
        <div>
          <h2 className="text-[15px] font-medium tracking-[-0.01em] text-ink">Top products</h2>
          <p className="mt-0.5 text-[13px] text-ink-3">Ranked by gross profit in this period</p>
        </div>
        <Link to={sectionPath('profitability')} className="inline-flex shrink-0 items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
          Profitability <ArrowUpRight className="size-3.5" strokeWidth={1.7} />
        </Link>
      </header>

      {top.length === 0 ? (
        <p className="px-6 py-10 text-center text-[13.5px] text-ink-3">No products with recorded costs yet.</p>
      ) : (
        <ol className="mt-3 flex flex-col px-3">
          {top.map((r) => (
            <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-[12px] px-3 py-3 sm:grid-cols-[minmax(0,1fr)_120px_96px]">
              <div className="min-w-0">
                <p className="truncate text-[14px] text-ink">{r.name}</p>
                <p className="tabular mt-0.5 text-[12.5px] text-ink-3">
                  {money(r.revenue, { compact: true })} sales · {number(r.units)} units
                </p>
              </div>
              <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                <div className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
                  <div className="h-full rounded-full bg-profit transition-[width] duration-500" style={{ width: `${((r.grossProfit ?? 0) / best) * 100}%` }} />
                </div>
              </div>
              <div className="text-right">
                <p className="tabular text-[14px] text-ink">{money(r.grossProfit ?? 0, { compact: true })}</p>
                <p className="tabular text-[12px] text-ink-3">{(r.margin ?? 0).toFixed(1)}% margin</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle px-6 py-3.5 sm:px-7">
        <p className="text-[12.5px] text-ink-3">{unranked > 0 ? `${unranked} ${unranked === 1 ? 'product is' : 'products are'} not ranked until a cost is recorded.` : `${products.length} products in total.`}</p>
        <button type="button" onClick={() => setExpanded((x) => !x)} aria-expanded={expanded} className="inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
          {expanded ? 'Hide full table' : `All ${products.length} products`}
          <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} strokeWidth={1.7} />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-line-subtle">
          <ProfitabilityTable data={data} products={products} />
        </div>
      )}
    </section>
  )
}

/** The complete breakdown: every product or collection, sortable. */
function ProfitabilityTable({ data, products }: { data: TrackerDataset; products: ProfitRow[] }) {
  const [view, setView] = useState<View>('products')
  const rows = useMemo(() => (view === 'products' ? products : collectionRows(data, products)), [view, data, products])

  return (
    <div className="px-2 pb-3 pt-4">
      <div className="mb-2 px-4">
        <SegmentedControl
          label="Group by"
          value={view}
          onValueChange={(v) => setView(v as View)}
          options={[
            { value: 'products', label: 'Products' },
            { value: 'collections', label: 'Collections' },
          ]}
        />
      </div>
      <div className="thin-scroll overflow-x-auto">
      {rows.length === 0 ? (
        <p className="py-10 text-center text-[13.5px] text-ink-3">No products yet. They appear here once your store is connected.</p>
      ) : (
        <div className="min-w-[620px]">
          <SortableDataTable<Record<string, unknown> & ProfitRow>
            key={view}
            caption={view === 'products' ? 'Profitability by product' : 'Profitability by collection'}
            rowKey="id"
            rows={rows as (Record<string, unknown> & ProfitRow)[]}
            defaultSort={{ key: 'revenue', direction: 'desc' }}
            columns={[
              {
                key: 'name',
                label: view === 'products' ? 'Product' : 'Collection',
                render: (_, r) => (
                  <span className="block min-w-0">
                    <span className="block truncate text-ink">{r.name}</span>
                    <span className="block truncate text-[12px] text-ink-3">{r.detail}</span>
                  </span>
                ),
              },
              {
                key: 'revenue',
                label: 'Net sales',
                numeric: true,
                render: (_, r) => (
                  <span className="block text-right">
                    <span className="tabular block text-ink">{money(r.revenue)}</span>
                    <span className="tabular block text-[12px] text-ink-3">{r.share.toFixed(0)}% of total</span>
                  </span>
                ),
              },
              { key: 'units', label: 'Units sold', numeric: true, width: 92, render: (_, r) => <span className="tabular">{number(r.units)}</span> },
              {
                key: 'unitCost',
                width: 104,
                label: view === 'products' ? 'Unit cost' : 'Avg. unit cost',
                numeric: true,
                render: (_, r) => (r.unitCost === null ? <span className="text-ink-3">No cost</span> : <span className="tabular">{moneyExact(r.unitCost)}</span>),
              },
              {
                key: 'grossProfit',
                width: 112,
                label: 'Gross profit',
                numeric: true,
                render: (_, r) => (r.grossProfit === null ? <span className="text-ink-3">n/a</span> : <span className="tabular">{money(r.grossProfit)}</span>),
              },
              { key: 'margin', label: 'Margin', numeric: true, width: 128, render: (_, r) => <MarginCell margin={r.margin} /> },
            ]}
          />
        </div>
      )}
      {view === 'collections' && rows.some((r) => r.detail.includes('without cost')) && (
        <p className="px-3 pt-2 text-[12px] text-ink-3">Collection cost and margin cover only products with a recorded cost.</p>
      )}
      </div>
    </div>
  )
}
