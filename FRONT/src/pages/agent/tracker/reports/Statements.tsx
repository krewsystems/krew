import { ArrowRight, Info, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PerformancePanel } from '@/components/tracker/PerformancePanel'
import { PeriodPicker } from '@/components/tracker/PeriodPicker'
import { PROJECT_TYPE_STYLE } from '@/components/tracker/projects/labels'
import { sectionPath } from '@/components/tracker/sections'
import { useOverviewFigures, usePeriod, useTrackerData } from '@/components/tracker/use-tracker'
import type { ExpenseCategory } from '@/data/tracker/types'
import { allCategories, categoryLabel, expensesByCategory, summarizeExpenses } from '@/lib/expenses'
import { change, collectionRows, type PeriodSummary } from '@/lib/finance'
import { money, number, shortDate, signedPercent } from '@/lib/format'
import { projectFinancials } from '@/lib/projects'
import { cn } from '@/lib/utils'
import { STATEMENTS, type StatementId } from './statement-list'

const panel = 'rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]'
const pctOf = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1)}%` : 'n/a')

type Line = { label: string; current: number; previous: number; kind?: 'sub' | 'total' | 'result'; sign?: '−' | '=' }

function StatementTable({ lines, base }: { lines: Line[]; base: { current: number; previous: number } }) {
  return (
    <div className="thin-scroll overflow-x-auto">
      <table className="w-full min-w-[620px] text-[13.5px]">
        <thead>
          <tr className="text-left text-[12px] text-ink-3">
            <th className="px-5 py-3 font-normal sm:px-6" />
            <th className="px-3 py-3 text-right font-normal">This period</th>
            <th className="px-3 py-3 text-right font-normal">% of net sales</th>
            <th className="px-3 py-3 text-right font-normal">Previous</th>
            <th className="px-5 py-3 text-right font-normal sm:px-6">Change</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const strong = l.kind === 'total' || l.kind === 'result'
            const negative = l.kind === 'result' && l.current < 0
            return (
              <tr key={l.label} className={cn('border-t', strong ? 'border-line' : 'border-line-subtle', l.kind === 'result' && 'bg-panel-muted')}>
                <td className={cn('px-5 py-2.5 sm:px-6', l.kind === 'sub' ? 'pl-9 text-ink-2 sm:pl-10' : 'text-ink', strong && 'font-medium')}>
                  {l.sign && <span className="mr-2 inline-block w-3 text-ink-3">{l.sign}</span>}
                  {l.label}
                </td>
                <td className={cn('tabular px-3 py-2.5 text-right', strong ? 'text-ink' : 'text-ink-2', negative && 'text-bad', strong && 'font-medium')}>{money(l.current)}</td>
                <td className="tabular px-3 py-2.5 text-right text-ink-3">{pctOf(l.current, base.current)}</td>
                <td className="tabular px-3 py-2.5 text-right text-ink-3">{money(l.previous)}</td>
                {/* Cost lines are negative; their change compares sizes, so a rising cost reads as an increase. */}
                <td className="tabular px-5 py-2.5 text-right text-ink-3 sm:px-6">{signedPercent(l.current <= 0 && l.previous <= 0 ? change(-l.current, -l.previous) : change(l.current, l.previous))}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ProfitAndLoss({ c, p, labels }: { c: PeriodSummary; p: PeriodSummary; labels: Map<string, string> }) {
  const cats = (Object.keys(c.opexByCategory) as ExpenseCategory[]).filter((k) => c.opexByCategory[k] > 0 || p.opexByCategory[k] > 0).sort((a, b) => c.opexByCategory[b] - c.opexByCategory[a])
  const lines: Line[] = [
    { label: 'Gross sales', current: c.grossSales, previous: p.grossSales, kind: 'sub' },
    { label: 'Discounts', current: -c.discounts, previous: -p.discounts, kind: 'sub' },
    { label: 'Refunds', current: -c.refunds, previous: -p.refunds, kind: 'sub' },
    { label: 'Net sales', current: c.netSales, previous: p.netSales, kind: 'total' },
    { label: 'Cost of goods sold', current: -c.cogs, previous: -p.cogs, sign: '−' },
    { label: 'Gross profit', current: c.grossProfit, previous: p.grossProfit, kind: 'total', sign: '=' },
    ...cats.map((k) => ({ label: labels.get(k) ?? k, current: -c.opexByCategory[k], previous: -p.opexByCategory[k], kind: 'sub' as const })),
    { label: 'Operating costs, estimated', current: -c.opex, previous: -p.opex, kind: 'total', sign: '−' },
    { label: 'Net profit, estimated', current: c.netProfit, previous: p.netProfit, kind: 'result', sign: '=' },
  ]
  return <StatementTable lines={lines} base={{ current: c.netSales, previous: p.netSales }} />
}

/** One live statement for the selected period. Built from the same calculations as the Finance screens, so they always agree. */
export function StatementView({ id }: { id: StatementId }) {
  const { data, costs, loading } = useTrackerData()
  const period = usePeriod(data.ledger)
  const f = useOverviewFigures(data, costs, period.period)
  const range = period.period
  const categories = allCategories(data.expenseCategories)
  const def = STATEMENTS.find((s) => s.id === id)!

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[14px] text-ink-2">{def.description}</p>
          <p className="tabular mt-1 text-[13px] text-ink-3">
            {id === 'seasons' ? 'Since each project started' : `${shortDate(range.from)} to ${shortDate(range.to)}`} · live from your records · amounts in {data.currency}
          </p>
        </div>
        {id !== 'seasons' && <PeriodPicker key={`${range.from}:${range.to}`} state={period} />}
      </div>

      {id === 'pnl' && (
        <>
          <PerformancePanel series={f.series} through={f.through} loading={loading} defaultHidden={[]} />
          <section aria-label="Profit and loss statement" className={cn(panel, 'overflow-hidden')}>
            <header className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5 sm:px-6">
              <h3 className="text-[15px] font-medium text-ink">Statement</h3>
              <span className="rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-[12px] text-ink-2">{f.finalized >= 1 ? 'Final' : f.finalized > 0 ? `Final through ${shortDate(f.through)}` : 'Estimate'}</span>
            </header>
            <div className="pt-3">
              <ProfitAndLoss c={f.current} p={f.prior} labels={new Map(data.expenseRules.map((r) => [r.category, r.label]))} />
            </div>
          </section>
          {f.missingCogs > 0 && (
            <p className="flex gap-2 text-[12.5px] text-ink-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" strokeWidth={1.7} />
              {money(f.current.uncostedSales)} of sales have no recorded cost, so cost of goods reads about {money(f.missingCogs)} low.{' '}
              <Link to={sectionPath('costing')} className="underline decoration-line-strong underline-offset-4">
                Add costs
              </Link>
            </p>
          )}
          <p className="flex gap-1.5 text-[12px] text-ink-3">
            <Info className="mt-px size-3.5 shrink-0" strokeWidth={1.6} />
            Operating costs are still estimated from sample rules, not from confirmed expenses; the expense statement lists those. Each sale is costed at the batch in stock on its date.
          </p>
        </>
      )}

      {id === 'expenses' && <ExpenseStatement data={data} range={range} categoryName={(c) => categoryLabel(c, categories)} />}

      {id === 'margins' && (
        <section aria-label="Product margins" className={cn(panel, 'overflow-hidden')}>
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[680px] text-[13.5px]">
              <thead>
                <tr className="text-left text-[12px] text-ink-3">
                  <th className="px-5 py-3 font-normal sm:px-6">Collection and product</th>
                  <th className="px-3 py-3 text-right font-normal">Units</th>
                  <th className="px-3 py-3 text-right font-normal">Net revenue</th>
                  <th className="px-3 py-3 text-right font-normal">COGS</th>
                  <th className="px-3 py-3 text-right font-normal">Gross profit</th>
                  <th className="px-5 py-3 text-right font-normal sm:px-6">Margin</th>
                </tr>
              </thead>
              <tbody>
                {collectionRows(data, f.products).map((col) => (
                  <MarginGroup key={col.id} col={col} products={f.products.filter((r) => data.products.find((p) => p.id === r.id)?.collectionId === col.id)} />
                ))}
                <tr className="border-t border-line bg-panel-muted font-medium">
                  <td className="px-5 py-3 text-ink sm:px-6">All products</td>
                  <td className="tabular px-3 py-3 text-right text-ink">{number(f.current.units)}</td>
                  <td className="tabular px-3 py-3 text-right text-ink">{money(f.current.netSales)}</td>
                  <td className="tabular px-3 py-3 text-right text-ink">{money(f.current.cogs)}</td>
                  <td className="tabular px-3 py-3 text-right text-ink">{money(f.current.grossProfit)}</td>
                  <td className="tabular px-5 py-3 text-right text-ink sm:px-6">{f.current.grossMargin.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="border-t border-line-subtle px-5 py-3 text-[12px] text-ink-3 sm:px-6">Products without a recorded cost show n/a and count at zero cost in the totals. Collection margins cover only costed products.</p>
        </section>
      )}

      {id === 'seasons' && <SeasonsStatement data={data} />}
    </div>
  )
}

function MarginGroup({ col, products }: { col: ReturnType<typeof collectionRows>[number]; products: ReturnType<typeof collectionRows> }) {
  const cell = (v: number | null) => (v === null ? 'n/a' : money(v))
  return (
    <>
      <tr className="border-t border-line">
        <td className="px-5 py-2.5 font-medium text-ink sm:px-6">{col.name}</td>
        <td className="tabular px-3 py-2.5 text-right text-ink">{number(col.units)}</td>
        <td className="tabular px-3 py-2.5 text-right text-ink">{money(col.revenue)}</td>
        <td className="tabular px-3 py-2.5 text-right text-ink-2">{col.grossProfit === null ? 'n/a' : money(col.revenue - products.filter((p) => p.grossProfit === null).reduce((s, p) => s + p.revenue, 0) - col.grossProfit)}</td>
        <td className="tabular px-3 py-2.5 text-right text-ink">{cell(col.grossProfit)}</td>
        <td className="tabular px-5 py-2.5 text-right text-ink sm:px-6">{col.margin === null ? 'n/a' : `${col.margin.toFixed(1)}%`}</td>
      </tr>
      {products.map((r) => (
        <tr key={r.id} className="border-t border-line-subtle">
          <td className="px-5 py-2 pl-9 sm:px-6 sm:pl-10">
            <Link to={`${sectionPath('profitability')}/${r.id}`} className="text-ink-2 hover:text-ink hover:underline">
              {r.name}
            </Link>
          </td>
          <td className="tabular px-3 py-2 text-right text-ink-3">{number(r.units)}</td>
          <td className="tabular px-3 py-2 text-right text-ink-2">{money(r.revenue)}</td>
          <td className={cn('tabular px-3 py-2 text-right', r.grossProfit === null ? 'text-warn' : 'text-ink-3')}>{r.grossProfit === null ? 'No cost' : money(r.revenue - r.grossProfit)}</td>
          <td className="tabular px-3 py-2 text-right text-ink-2">{cell(r.grossProfit)}</td>
          <td className={cn('tabular px-5 py-2 text-right sm:px-6', r.margin !== null && r.margin < 0 ? 'text-bad' : 'text-ink-2')}>{r.margin === null ? 'n/a' : `${r.margin.toFixed(1)}%`}</td>
        </tr>
      ))}
    </>
  )
}

function ExpenseStatement({ data, range, categoryName }: { data: ReturnType<typeof useTrackerData>['data']; range: { from: string; to: string }; categoryName: (c?: string) => string }) {
  const groups = expensesByCategory(data.expenses, range)
  const s = summarizeExpenses(data.expenses, range)
  const top = groups[0]?.total ?? 0
  return (
    <>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line sm:grid-cols-4">
        {[
          { label: 'Confirmed expenses', value: money(s.total) },
          { label: 'Linked to projects', value: money(s.project) },
          { label: 'General operating', value: money(s.general) },
          { label: 'Waiting for review', value: `${s.review.count} · ${money(s.review.amount)}`, warn: s.review.count > 0 },
        ].map((x) => (
          <div key={x.label} className="bg-panel px-5 py-4">
            <dt className="text-[12.5px] text-ink-3">{x.label}</dt>
            <dd className={cn('tabular mt-1 text-[19px] font-light tracking-[-0.02em]', x.warn ? 'text-warn' : 'text-ink')}>{x.value}</dd>
          </div>
        ))}
      </dl>
      <section aria-label="Expenses by category" className={cn(panel, 'overflow-hidden')}>
        {groups.length === 0 ? (
          <p className="px-6 py-12 text-center text-[13.5px] text-ink-3">No confirmed expenses in this period.</p>
        ) : (
          <ul className="flex flex-col p-5 sm:p-6">
            {groups.map((g) => (
              <li key={g.category ?? 'none'} className="grid grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] items-center gap-4 py-2.5 text-[13.5px]">
                <span className="min-w-0">
                  <span className="block truncate text-ink">{categoryName(g.category)}</span>
                  <span className="block text-[12px] text-ink-3">
                    {g.count} {g.count === 1 ? 'entry' : 'entries'}
                    {g.project > 0 && ` · ${money(g.project)} in projects`}
                  </span>
                </span>
                <span className="flex h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
                  <span className="h-full bg-[var(--agent-ads)]" style={{ width: `${((g.total - g.project) / top) * 100}%` }} />
                  <span className="h-full bg-[color-mix(in_oklab,var(--agent-ads)_45%,transparent)]" style={{ width: `${(g.project / top) * 100}%` }} />
                </span>
                <span className="tabular w-28 text-right text-ink">
                  {money(g.total)} <span className="text-[12px] text-ink-3">{pctOf(g.total, s.total)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle px-5 py-3 text-[12px] text-ink-3 sm:px-6">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-[2px] bg-[var(--agent-ads)]" /> General
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-[2px] bg-[color-mix(in_oklab,var(--agent-ads)_45%,transparent)]" /> In projects
            </span>
          </span>
          <Link to={sectionPath('expenses')} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
            Open the ledger <ArrowRight className="size-3.5" strokeWidth={1.6} />
          </Link>
        </div>
      </section>
      {(s.production > 0 || s.nonExpense > 0) && (
        <p className="text-[12px] text-ink-3">
          Not in this statement: {s.production > 0 && `${money(s.production)} of production costs, carried by batches`}
          {s.production > 0 && s.nonExpense > 0 && ' and '}
          {s.nonExpense > 0 && `${money(s.nonExpense)} of supplier payments and transfers`}. Entries in review count once confirmed.
        </p>
      )}
    </>
  )
}

function SeasonsStatement({ data }: { data: ReturnType<typeof useTrackerData>['data'] }) {
  const rows = data.projects.filter((p) => p.status !== 'archived').map((p) => projectFinancials(p, data))
  const sum = (k: 'netSales' | 'cogs' | 'grossProfit' | 'operatingExpenses' | 'profit') => rows.reduce((s, r) => s + r[k], 0)
  return (
    <section aria-label="Seasons and projects statement" className={cn(panel, 'overflow-hidden')}>
      <div className="thin-scroll overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13.5px]">
          <thead>
            <tr className="text-left text-[12px] text-ink-3">
              <th className="px-5 py-3 font-normal sm:px-6">Season or project</th>
              <th className="px-3 py-3 text-right font-normal">Net sales</th>
              <th className="px-3 py-3 text-right font-normal">COGS</th>
              <th className="px-3 py-3 text-right font-normal">Gross profit</th>
              <th className="px-3 py-3 text-right font-normal">Project expenses</th>
              <th className="px-5 py-3 text-right font-normal sm:px-6">Est. profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.project.id} className="border-t border-line-subtle">
                <td className="px-5 py-3 sm:px-6">
                  <Link to={`${sectionPath('seasons')}/${r.project.id}`} className="flex items-center gap-2 text-ink hover:underline">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: PROJECT_TYPE_STYLE[r.project.type].color }} aria-hidden />
                    {r.project.name}
                  </Link>
                </td>
                <td className="tabular px-3 py-3 text-right text-ink">{money(r.netSales)}</td>
                <td className="tabular px-3 py-3 text-right text-ink-2">{money(r.cogs)}</td>
                <td className="tabular px-3 py-3 text-right text-ink">{money(r.grossProfit)}</td>
                <td className="tabular px-3 py-3 text-right text-ink-2">{money(r.operatingExpenses)}</td>
                <td className={cn('tabular px-5 py-3 text-right sm:px-6', r.netSales === 0 ? 'text-ink-3' : r.profit < 0 ? 'text-bad' : 'text-profit')}>{r.netSales === 0 ? 'No sales yet' : money(r.profit)}</td>
              </tr>
            ))}
            <tr className="border-t border-line bg-panel-muted font-medium">
              <td className="px-5 py-3 text-ink sm:px-6">All projects</td>
              {(['netSales', 'cogs', 'grossProfit', 'operatingExpenses'] as const).map((k) => (
                <td key={k} className="tabular px-3 py-3 text-right text-ink">
                  {money(sum(k))}
                </td>
              ))}
              <td className="tabular px-5 py-3 text-right text-ink sm:px-6">{money(sum('profit'))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="border-t border-line-subtle px-5 py-3 text-[12px] text-ink-3 sm:px-6">Sales count only from each project’s own batches; expenses are the confirmed ones linked to it, each counted once. Sales outside projects are not here.</p>
    </section>
  )
}
