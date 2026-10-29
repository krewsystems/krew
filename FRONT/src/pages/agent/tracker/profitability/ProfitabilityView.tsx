import { ArrowRight, ArrowUpDown, ChevronRight, CircleCheck, Search, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/arc/badge/badge'
import { DropdownMenu } from '@/components/arc/dropdown-menu/dropdown-menu'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { ProductThumb } from '@/components/tracker/costing/parts'
import { PROFIT_STATUS } from '@/components/tracker/labels'
import { PerformancePanel } from '@/components/tracker/PerformancePanel'
import { PeriodPicker } from '@/components/tracker/PeriodPicker'
import { PROJECT_STATUS, PROJECT_TYPE_STYLE } from '@/components/tracker/projects/labels'
import { sectionPath } from '@/components/tracker/sections'
import { useOverviewFigures, usePeriod, useTrackerData } from '@/components/tracker/use-tracker'
import { change, collectionRows, productsMissingCost, type ProfitRow } from '@/lib/finance'
import { money, number, shortDate, signedPercent } from '@/lib/format'
import { findings as buildFindings, LOW_MARGIN, profitStatus, type Finding } from '@/lib/profitability'
import { projectFinancials } from '@/lib/projects'
import { cn } from '@/lib/utils'

type View = 'products' | 'collections' | 'projects'
type Filter = 'all' | 'attention' | 'missing'
type Sort = 'profit' | 'margin' | 'margin-asc' | 'revenue' | 'units'
const SORTS: { id: Sort; label: string }[] = [
  { id: 'profit', label: 'Gross profit' },
  { id: 'margin', label: 'Highest margin' },
  { id: 'margin-asc', label: 'Lowest margin' },
  { id: 'revenue', label: 'Net revenue' },
  { id: 'units', label: 'Units sold' },
]

const panel = 'rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]'
// Products without a cost sort last on profit and margin, so they never pose as the best or worst.
const nullLast = (a: number | null, b: number | null, dir: 1 | -1) => (a === null ? 1 : b === null ? -1 : (a - b) * dir)
const compare = (sort: Sort) => (a: ProfitRow, b: ProfitRow) =>
  sort === 'margin' ? nullLast(a.margin, b.margin, -1) : sort === 'margin-asc' ? nullLast(a.margin, b.margin, 1) : sort === 'revenue' ? b.revenue - a.revenue : sort === 'units' ? b.units - a.units : nullLast(a.grossProfit, b.grossProfit, -1)

function MarginBar({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-[13px] text-ink-3">n/a</span>
  return (
    <span className="flex items-center gap-2.5">
      <span className="h-1.5 w-8 shrink-0 overflow-hidden rounded-full bg-sunken" aria-hidden>
        <span className={cn('block h-full rounded-full', margin < 0 ? 'bg-bad' : margin < LOW_MARGIN ? 'bg-warn' : 'bg-profit')} style={{ width: `${Math.max(4, Math.min(100, Math.abs(margin)))}%` }} />
      </span>
      <span className={cn('tabular text-[13.5px]', margin < 0 ? 'text-bad' : 'text-ink')}>{margin.toFixed(1)}%</span>
    </span>
  )
}

function FindingsPanel({ items, linkFor }: { items: Finding[]; linkFor: (f: Finding) => string }) {
  return (
    <section aria-label="Needs attention" className={cn(panel, 'flex flex-col')}>
      <header className="flex items-center justify-between gap-3 px-5 pb-1 pt-5">
        <h2 className="text-[15px] font-medium tracking-[-0.01em] text-ink">Needs attention</h2>
        {items.length > 0 && <span className="tabular rounded-full bg-warn-soft px-2 py-0.5 text-[12px] text-warn">{items.length}</span>}
      </header>
      <p className="px-5 text-[12.5px] text-ink-3">Found by fixed rules on your records, not guesses.</p>
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <CircleCheck className="size-5 text-good" strokeWidth={1.6} />
          <p className="text-[13.5px] text-ink">Nothing stands out</p>
          <p className="text-[12.5px] text-ink-3">Every product has a cost and margins look steady.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1 p-3 pt-3">
          {items.slice(0, 6).map((f) => (
            <li key={f.id}>
              <Link to={linkFor(f)} className="group flex gap-3 rounded-[12px] p-2.5 transition-colors hover:bg-panel-muted">
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', f.tone === 'bad' ? 'bg-bad' : 'bg-warn')} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] text-ink">{f.title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">{f.detail}</span>
                </span>
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" strokeWidth={1.6} />
              </Link>
            </li>
          ))}
          {items.length > 6 && <li className="px-2.5 pt-1 text-[12px] text-ink-3">{items.length - 6} more in the tables below.</li>}
        </ul>
      )}
    </section>
  )
}

export function ProfitabilityView() {
  const { ws, data, costs, loading } = useTrackerData()
  const period = usePeriod(data.ledger)
  const f = useOverviewFigures(data, costs, period.period)
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const view = (['collections', 'projects'].includes(params.get('view') ?? '') ? params.get('view') : 'products') as View
  const filter = (['attention', 'missing'].includes(params.get('show') ?? '') ? params.get('show') : 'all') as Filter
  const sort = (SORTS.find((s) => s.id === params.get('sort'))?.id ?? 'profit') as Sort
  const query = params.get('q') ?? ''
  const set = (k: string, v?: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (v) n.set(k, v)
        else n.delete(k)
        return n
      },
      { replace: true },
    )

  const projects = useMemo(() => data.projects.filter((p) => p.status !== 'archived').map((p) => projectFinancials(p, data)), [data])
  const items = useMemo(() => buildFindings(f.products, data, projects), [f.products, data, projects])
  const missingCount = productsMissingCost(data).length
  const c = f.current
  const p = f.prior
  const marginDelta = c.grossMargin - p.grossMargin
  const productLink = (id: string) => `${sectionPath('profitability')}/${id}${location.search}`
  const linkFor = (x: Finding) => (x.target.kind === 'project' ? `${sectionPath('seasons')}/${x.target.id}` : x.target.kind === 'costing' ? `${sectionPath('costing')}/${x.target.id}` : productLink(x.target.id))

  const rows = f.products
    .filter((r) => {
      const s = profitStatus(r)
      if (filter === 'missing' && s !== 'missing') return false
      if (filter === 'attention' && (s === 'healthy' || s === 'missing')) return false
      return !query || `${r.name} ${r.detail}`.toLowerCase().includes(query.toLowerCase())
    })
    .sort(compare(sort))
  const attentionCount = f.products.filter((r) => ['low', 'loss'].includes(profitStatus(r))).length

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[24px] font-medium leading-tight tracking-[-0.025em] text-ink">Profitability</h2>
          <p className="tabular mt-1.5 text-[13.5px] text-ink-3">
            What each product, collection and season earns · {shortDate(period.period.from)} to {shortDate(period.period.to)}
          </p>
        </div>
        <PeriodPicker key={`${period.period.from}:${period.period.to}`} state={period} />
      </header>

      {/* Gross profit leads: it is what products earn. Net profit sits beside it, marked as an estimate. */}
      <section aria-label="Profit summary" className={cn(panel, 'grain overflow-hidden')}>
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-10">
          <div>
            <p className="flex items-center gap-2 text-[14px] text-ink-2">
              <span className={cn('size-2 rounded-full', c.grossProfit >= 0 ? 'bg-profit' : 'bg-bad')} aria-hidden /> Gross profit
            </p>
            <p className={cn('tabular mt-2 text-[44px] font-light leading-none tracking-[-0.03em]', c.grossProfit >= 0 ? 'text-ink' : 'text-bad')}>{money(c.grossProfit)}</p>
            <p className="tabular mt-2 text-[13px] text-ink-3">
              {signedPercent(change(c.grossProfit, p.grossProfit))} on the previous {f.length} days · net sales less the cost of units sold
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-[14px] border border-line bg-line sm:grid-cols-3">
            <div className="bg-panel px-4 py-3.5">
              <dt className="text-[12.5px] text-ink-3">Net sales</dt>
              <dd className="tabular mt-1 text-[20px] font-light tracking-[-0.02em] text-ink">{money(c.netSales)}</dd>
              <dd className="tabular text-[12px] text-ink-3">{signedPercent(change(c.netSales, p.netSales))}</dd>
            </div>
            <div className="bg-panel px-4 py-3.5">
              <dt className="text-[12.5px] text-ink-3">Gross margin</dt>
              <dd className="tabular mt-1 text-[20px] font-light tracking-[-0.02em] text-ink">{c.grossMargin.toFixed(1)}%</dd>
              <dd className="tabular text-[12px] text-ink-3">{Math.abs(marginDelta) < 0.05 ? 'No change' : `${marginDelta > 0 ? '+' : ''}${marginDelta.toFixed(1)} pts`}</dd>
            </div>
            <div className="bg-panel px-4 py-3.5">
              <dt className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
                Net profit <span className="rounded-full border border-dashed border-line-strong px-1.5 text-[11px] text-ink-3">Estimate</span>
              </dt>
              <dd className={cn('tabular mt-1 text-[20px] font-light tracking-[-0.02em]', c.netProfit < 0 ? 'text-bad' : 'text-ink')}>{money(c.netProfit)}</dd>
              <dd className="tabular text-[12px] text-ink-3">after {money(c.opex)} estimated operating costs</dd>
            </div>
          </dl>
        </div>
        {f.missingCogs > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[color-mix(in_oklab,var(--warning)_25%,transparent)] bg-warn-soft px-5 py-3 text-[13px] text-ink-2 sm:px-6">
            <TriangleAlert className="size-4 shrink-0 text-warn" strokeWidth={1.7} />
            <span className="min-w-0 flex-1">
              {missingCount} {missingCount === 1 ? 'product has' : 'products have'} no recorded cost. {money(c.uncostedSales)} of sales count at zero cost, so gross profit is likely about {money(f.missingCogs)} lower.
            </span>
            <Link to={sectionPath('costing')} className="shrink-0 text-ink underline decoration-line-strong underline-offset-4">
              Add costs
            </Link>
          </div>
        )}
      </section>

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <PerformancePanel series={f.series} through={f.through} loading={loading} defaultHidden={[]} />
        <FindingsPanel items={items} linkFor={linkFor} />
      </div>

      <section aria-label="Profitability breakdown" className={panel}>
        <div className="flex flex-col gap-3 border-b border-line-subtle p-4 sm:p-5 2xl:flex-row 2xl:items-center">
          <SegmentedControl
            label="Breakdown"
            value={view}
            onValueChange={(v) => set('view', v === 'products' ? undefined : v)}
            options={[
              { value: 'products', label: 'Products' },
              { value: 'collections', label: 'Collections' },
              { value: 'projects', label: 'Seasons' },
            ]}
          />
          {view === 'products' && (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center 2xl:ml-auto">
              <label className="relative block sm:w-56">
                <span className="sr-only">Search products</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.7} />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => set('q', e.target.value)}
                  placeholder="Search products"
                  className="h-10 w-full rounded-[10px] border border-line bg-panel pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-3 hover:border-line-strong focus-visible:border-ink"
                />
              </label>
              <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
                <SegmentedControl
                  label="Show"
                  value={filter}
                  onValueChange={(v) => set('show', v === 'all' ? undefined : v)}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'attention', label: 'Low or losing', accessory: attentionCount ? <span className="tabular text-[11.5px] text-warn">{attentionCount}</span> : undefined },
                    { value: 'missing', label: 'Missing cost', accessory: missingCount ? <span className="tabular text-[11.5px] text-warn">{missingCount}</span> : undefined },
                  ]}
                />
              </div>
              <DropdownMenu label={`Sort: ${SORTS.find((s) => s.id === sort)!.label}`} icon={<ArrowUpDown className="size-4" strokeWidth={1.6} />} items={SORTS.map((s) => ({ label: s.label, onSelect: () => set('sort', s.id === 'profit' ? undefined : s.id) }))} />
            </div>
          )}
        </div>

        {view === 'products' && (
          <>
            <div className="hidden grid-cols-[minmax(0,1fr)_52px_92px_84px_92px_92px_108px_14px] gap-4 px-5 pb-1 pt-3 text-[12px] text-ink-3 lg:grid">
              <span>Product</span>
              <span className="text-right">Units</span>
              <span className="text-right">Net revenue</span>
              <span className="text-right">COGS</span>
              <span className="text-right">Gross profit</span>
              <span>Margin</span>
              <span>Status</span>
              <span />
            </div>
            {rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                <p className="text-[14px] text-ink">{filter === 'attention' && !query ? 'No low or losing products' : filter === 'missing' && !query ? 'Every product has a cost' : 'No products match'}</p>
                <p className="text-[13px] text-ink-3">{query ? `Nothing found for “${query}”.` : 'Nothing fits this filter in this period.'}</p>
                <button
                  type="button"
                  onClick={() => {
                    set('q')
                    set('show')
                  }}
                  className="mt-2 text-[13px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink"
                >
                  Show all products
                </button>
              </div>
            ) : (
              <ul className="flex flex-col px-2 pb-2 lg:px-0 lg:pb-1">
                {rows.map((r) => {
                  const s = profitStatus(r)
                  const cogs = r.grossProfit === null ? null : r.revenue - r.grossProfit
                  return (
                    <li key={r.id} className="border-b border-line-subtle last:border-0 lg:border-0">
                      <Link
                        to={productLink(r.id)}
                        className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 rounded-[12px] px-3 py-3 transition-colors hover:bg-panel-muted lg:mx-2 lg:grid-cols-[minmax(0,1fr)_52px_92px_84px_92px_92px_108px_14px] lg:gap-4"
                      >
                        <span className="contents lg:flex lg:min-w-0 lg:items-center lg:gap-3.5">
                          <ProductThumb name={r.name} size={36} />
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] text-ink">{r.name}</span>
                            <span className="block truncate text-[12.5px] text-ink-3">{r.detail}</span>
                          </span>
                        </span>
                        <span className="lg:hidden">
                          <Badge size="sm" tone={PROFIT_STATUS[s].tone}>
                            {PROFIT_STATUS[s].label}
                          </Badge>
                        </span>
                        <span className="tabular hidden text-right text-[13.5px] text-ink-2 lg:block">{number(r.units)}</span>
                        <span className="tabular hidden text-right text-[13.5px] text-ink lg:block">{money(r.revenue)}</span>
                        <span className="tabular hidden text-right text-[13.5px] text-ink-2 lg:block">{cogs === null ? 'Not set' : money(cogs)}</span>
                        <span className={cn('tabular hidden text-right text-[13.5px] lg:block', r.grossProfit === null ? 'text-ink-3' : r.grossProfit < 0 ? 'text-bad' : 'text-ink')}>{r.grossProfit === null ? 'n/a' : money(r.grossProfit)}</span>
                        <span className="hidden lg:block">
                          <MarginBar margin={r.margin} />
                        </span>
                        <span className="hidden lg:block">
                          <Badge size="sm" tone={PROFIT_STATUS[s].tone}>
                            {PROFIT_STATUS[s].label}
                          </Badge>
                        </span>
                        <ChevronRight className="hidden size-4 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink lg:block" strokeWidth={1.7} />
                        <span className="col-span-3 grid grid-cols-3 gap-2 text-[12.5px] lg:hidden">
                          <span>
                            <span className="block text-ink-3">Revenue</span>
                            <span className="tabular text-ink">{money(r.revenue)}</span>
                          </span>
                          <span>
                            <span className="block text-ink-3">Gross profit</span>
                            <span className={cn('tabular', r.grossProfit === null ? 'text-ink-3' : 'text-ink')}>{r.grossProfit === null ? 'n/a' : money(r.grossProfit)}</span>
                          </span>
                          <span>
                            <span className="block text-ink-3">Margin</span>
                            <span className="tabular text-ink">{r.margin === null ? 'n/a' : `${r.margin.toFixed(1)}%`}</span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="border-t border-line-subtle px-5 py-3 text-[12px] text-ink-3">
              Gross profit only: operating costs are not spread over products. Each sale uses the cost of the batch in stock on its date.
            </p>
          </>
        )}

        {view === 'collections' && (
          <div className="thin-scroll overflow-x-auto px-2 pb-2 sm:px-3">
            <table className="w-full min-w-[620px] text-[13.5px]">
              <thead>
                <tr className="text-left text-[12px] text-ink-3">
                  <th className="px-3 py-3 font-normal">Collection</th>
                  <th className="px-3 py-3 text-right font-normal">Units</th>
                  <th className="px-3 py-3 text-right font-normal">Net revenue</th>
                  <th className="px-3 py-3 text-right font-normal">Gross profit</th>
                  <th className="px-3 py-3 font-normal">Margin</th>
                </tr>
              </thead>
              <tbody>
                {collectionRows(data, f.products)
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((r) => (
                    <tr key={r.id} className="border-t border-line-subtle">
                      <td className="px-3 py-3">
                        <span className="block text-ink">{r.name}</span>
                        <span className={cn('block text-[12px]', r.detail.includes('without cost') ? 'text-warn' : 'text-ink-3')}>{r.detail}</span>
                      </td>
                      <td className="tabular px-3 py-3 text-right text-ink-2">{number(r.units)}</td>
                      <td className="tabular px-3 py-3 text-right text-ink">{money(r.revenue)}</td>
                      <td className="tabular px-3 py-3 text-right text-ink">{r.grossProfit === null ? 'n/a' : money(r.grossProfit)}</td>
                      <td className="px-3 py-3">
                        <MarginBar margin={r.margin} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <p className="px-3 py-3 text-[12px] text-ink-3">Profit and margin cover only the products with a recorded cost.</p>
          </div>
        )}

        {view === 'projects' && (
          <div className="thin-scroll overflow-x-auto px-2 pb-2 sm:px-3">
            {projects.length === 0 ? (
              <p className="px-3 py-12 text-center text-[13.5px] text-ink-3">No seasons or projects yet.</p>
            ) : (
              <table className="w-full min-w-[820px] text-[13.5px]">
                <thead>
                  <tr className="text-left text-[12px] text-ink-3">
                    <th className="px-3 py-3 font-normal">Season or project</th>
                    <th className="px-3 py-3 text-right font-normal">Net sales</th>
                    <th className="px-3 py-3 text-right font-normal">COGS</th>
                    <th className="px-3 py-3 text-right font-normal">Gross profit</th>
                    <th className="px-3 py-3 text-right font-normal">Project expenses</th>
                    <th className="px-3 py-3 text-right font-normal">Est. profit</th>
                    <th className="px-3 py-3 text-right font-normal">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {[...projects]
                    .sort((a, b) => b.profit - a.profit)
                    .map((x) => {
                      const margin = x.netSales > 0 ? (x.profit / x.netSales) * 100 : null
                      return (
                        <tr key={x.project.id} onClick={() => navigate(`${sectionPath('seasons')}/${x.project.id}`)} className="cursor-pointer border-t border-line-subtle transition-colors hover:bg-panel-muted">
                          <td className="px-3 py-3">
                            <Link to={`${sectionPath('seasons')}/${x.project.id}`} className="flex items-center gap-2 text-ink" onClick={(e) => e.stopPropagation()}>
                              <span className="size-2 shrink-0 rounded-full" style={{ background: PROJECT_TYPE_STYLE[x.project.type].color }} aria-hidden />
                              {x.project.name}
                            </Link>
                            <span className="block pl-4 text-[12px] text-ink-3">
                              {PROJECT_STATUS[x.project.status].label}
                              {x.uncostedBatches > 0 && <span className="text-warn"> · costs missing</span>}
                              {x.pendingExpenses.length > 0 && ` · ${x.pendingExpenses.length} to review`}
                            </span>
                          </td>
                          <td className="tabular px-3 py-3 text-right text-ink">{money(x.netSales)}</td>
                          <td className="tabular px-3 py-3 text-right text-ink-2">{money(x.cogs)}</td>
                          <td className="tabular px-3 py-3 text-right text-ink">{money(x.grossProfit)}</td>
                          <td className="tabular px-3 py-3 text-right text-ink-2">{money(x.operatingExpenses)}</td>
                          <td className={cn('tabular px-3 py-3 text-right', x.netSales === 0 ? 'text-ink-3' : x.profit < 0 ? 'text-bad' : 'text-profit')}>{x.netSales === 0 ? 'No sales yet' : money(x.profit)}</td>
                          <td className="tabular px-3 py-3 text-right text-ink-2">{margin === null ? 'n/a' : `${margin.toFixed(1)}%`}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            )}
            <p className="px-3 py-3 text-[12px] text-ink-3">
              Since each project started, not limited to the dates above. Sales count only from a project’s own batches; expenses are the confirmed ones linked to it, counted once.
            </p>
          </div>
        )}
      </section>

      <p className="pb-6 text-[12px] text-ink-3">Sample data for {ws.brand.name}, in {data.currency}. Prices paid come from the simulated orders; costs come from Product costing batches.</p>
    </div>
  )
}
