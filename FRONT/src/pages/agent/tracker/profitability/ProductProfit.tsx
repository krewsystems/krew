import { ArrowRight, Info, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/arc/badge/badge'
import { LineChart, type LineChartDatum } from '@/components/arc/line-chart/line-chart'
import { BatchStatusBadge } from '@/components/tracker/costing/parts'
import { UnitEconomicsPanel } from '@/components/tracker/costing/UnitEconomicsPanel'
import { PROFIT_STATUS } from '@/components/tracker/labels'
import { sectionPath } from '@/components/tracker/sections'
import { useOverviewFigures, usePeriod, useTrackerData } from '@/components/tracker/use-tracker'
import type { Product } from '@/data/tracker/types'
import { costBatch, currentBatch } from '@/lib/costing'
import { money, moneyExact, number, shortDate } from '@/lib/format'
import { batchCostHistory, findings, productSeries, profitStatus } from '@/lib/profitability'
import { cn } from '@/lib/utils'

const panel = 'rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]'
const SERIES = [
  { key: 'revenue', label: 'Net revenue', color: 'var(--sales)', area: true },
  { key: 'cogs', label: 'Cost of goods sold', color: 'var(--series-2)', dashed: true, area: false },
  { key: 'grossProfit', label: 'Gross profit', color: 'var(--profit)', area: false },
]

/** One product's profitability for the selected period, with the batch history that explains it. */
export function ProductProfit({ product }: { product: Product }) {
  const { data, costs, loading } = useTrackerData()
  const period = usePeriod(data.ledger)
  const f = useOverviewFigures(data, costs, period.period)
  const row = f.products.find((r) => r.id === product.id)
  const status = row ? profitStatus(row) : 'missing'
  const cogs = row?.grossProfit == null ? null : row.revenue - row.grossProfit
  const points = useMemo(() => productSeries(f.days, product, costs), [f.days, product, costs])
  const history = batchCostHistory(product, data)
  const current = currentBatch(data.batches, product.id)
  const notes = findings(f.products, data, []).filter((x) => x.target.id === product.id)
  const [hidden, setHidden] = useState<string[]>([])
  const weekly = points.length > 0 && points[0].date !== points[0].end
  const uncostedUnits = points.reduce((s, x) => s + x.uncostedUnits, 0)
  const costingLink = `${sectionPath('costing')}/${product.id}`

  const chart: LineChartDatum[] = useMemo(() => {
    const step = Math.max(1, Math.ceil(points.length / 6))
    return points.map((p, i) => ({
      key: p.date,
      label: weekly ? `Week of ${shortDate(p.date)}` : shortDate(p.date),
      axisLabel: (points.length - 1 - i) % step === 0 ? shortDate(p.date) : undefined,
      values: { revenue: Math.round(p.revenue), cogs: Math.round(p.cogs), grossProfit: Math.round(p.grossProfit) },
    }))
  }, [points, weekly])

  const figures = [
    { label: 'Units sold', value: number(row?.units ?? 0) },
    { label: 'Net revenue', value: money(row?.revenue ?? 0) },
    { label: 'Cost of goods sold', value: cogs === null ? 'Not set' : money(cogs), muted: cogs === null },
    { label: 'Gross profit', value: row?.grossProfit == null ? 'n/a' : money(row.grossProfit), bad: (row?.grossProfit ?? 0) < 0 },
    { label: 'Gross margin', value: row?.margin == null ? 'n/a' : `${row.margin.toFixed(1)}%`, bad: (row?.margin ?? 0) < 0 },
  ]

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="tabular text-[13px] text-ink-3">
          {shortDate(period.period.from)} to {shortDate(period.period.to)} · list price {moneyExact(product.price)} · amounts in {data.currency}
        </p>
        <div className="flex items-center gap-3">
          <Badge tone={PROFIT_STATUS[status].tone}>{PROFIT_STATUS[status].label}</Badge>
          <Link to={costingLink} className="inline-flex items-center gap-1 text-[13px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
            Open in Product costing <ArrowRight className="size-3.5" strokeWidth={1.6} />
          </Link>
        </div>
      </div>

      {status === 'missing' && (
        <div className="flex gap-2.5 rounded-[12px] border border-[color-mix(in_oklab,var(--warning)_30%,transparent)] bg-warn-soft p-3.5 text-[13px] text-ink-2">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" strokeWidth={1.7} />
          <p>
            No finalized batch with costs, so {number(row?.units ?? 0)} units sold in this period count at zero cost and profit here is not known.{' '}
            <Link to={costingLink} className="text-ink underline decoration-line-strong underline-offset-4">
              Add the cost in Product costing
            </Link>
          </p>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line sm:grid-cols-5">
        {figures.map((x) => (
          <div key={x.label} className="bg-panel px-4 py-3.5">
            <dt className="text-[12.5px] text-ink-3">{x.label}</dt>
            <dd className={cn('tabular mt-1 text-[19px] font-light tracking-[-0.02em]', x.bad ? 'text-bad' : x.muted ? 'text-ink-3' : 'text-ink')}>{x.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-label="Profit over time" className={cn(panel, 'px-5 pb-4 pt-5 sm:px-6')}>
        <h3 className="text-[15px] font-medium text-ink">Sales and cost over time</h3>
        <p className="mt-0.5 text-[13px] text-ink-3">{weekly ? 'Weekly' : 'Daily'} totals. Each day’s units are costed at the batch in stock that day.</p>
        <div className="mt-4">
          <LineChart
            label="Product sales, cost and gross profit"
            data={chart}
            series={SERIES}
            hiddenSeries={hidden}
            onHiddenSeriesChange={setHidden}
            height={210}
            loading={loading}
            formatValue={(v) => money(v)}
            formatTick={(v) => (Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}K` : `$${Math.round(v)}`)}
            emptyLabel="No sales in this period"
          />
        </div>
        {uncostedUnits > 0 && status !== 'missing' && <p className="mt-2 text-[12px] text-warn">{number(uncostedUnits)} units in this period have no cost and are left out of the cost line.</p>}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section aria-label="Batch costs" className={panel}>
          <header className="px-5 pt-5 sm:px-6">
            <h3 className="text-[15px] font-medium text-ink">Batch costs and margin</h3>
            <p className="mt-0.5 text-[13px] text-ink-3">Each batch keeps its own cost. Margin shown at today’s list price, to compare batches.</p>
          </header>
          {history.length === 0 ? (
            <p className="mx-5 my-5 rounded-[12px] border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-ink-3 sm:mx-6">No batches recorded for this product yet.</p>
          ) : (
            <div className="thin-scroll overflow-x-auto px-2 pb-3 pt-3 sm:px-3">
              <table className="w-full min-w-[520px] text-[13.5px]">
                <thead>
                  <tr className="text-left text-[12px] text-ink-3">
                    <th className="px-3 py-2 font-normal">Batch</th>
                    <th className="px-3 py-2 text-right font-normal">Unit cost</th>
                    <th className="px-3 py-2 text-right font-normal">Margin</th>
                    <th className="px-3 py-2 text-right font-normal">Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((h) => (
                    <tr key={h.batch.id} className="border-t border-line-subtle">
                      <td className="px-3 py-3">
                        <Link to={`${costingLink}?batch=${h.batch.id}`} className="flex flex-wrap items-center gap-2 text-ink hover:underline">
                          {h.batch.label} <BatchStatusBadge status={h.batch.status} />
                        </Link>
                        <span className="block text-[12px] text-ink-3">
                          {shortDate(h.batch.receivedAt)}
                          {h.batch.supplier ? ` · ${h.batch.supplier}` : ''}
                        </span>
                      </td>
                      <td className="tabular px-3 py-3 text-right">
                        <span className={h.unitCost === null ? 'text-warn' : 'text-ink'}>{h.unitCost === null ? 'Not final' : moneyExact(h.unitCost)}</span>
                        {h.costChange !== null && Math.abs(h.costChange) >= 0.005 && (
                          <span className={cn('block text-[12px]', h.costChange > 0 ? 'text-warn' : 'text-profit')}>
                            {h.costChange > 0 ? '+' : ''}
                            {(h.costChange * 100).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="tabular px-3 py-3 text-right">
                        <span className="text-ink">{h.margin === null ? 'n/a' : `${h.margin.toFixed(1)}%`}</span>
                        {h.marginChange !== null && Math.abs(h.marginChange) >= 0.05 && (
                          <span className={cn('block text-[12px]', h.marginChange < 0 ? 'text-warn' : 'text-profit')}>
                            {h.marginChange > 0 ? '+' : ''}
                            {h.marginChange.toFixed(1)} pts
                          </span>
                        )}
                      </td>
                      <td className="tabular px-3 py-3 text-right text-ink-2">{number(h.unitsSold)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-6">
          {notes.length > 0 && (
            <section aria-label="Observations" className={cn(panel, 'p-5')}>
              <h3 className="text-[15px] font-medium text-ink">Observations</h3>
              <ul className="mt-3 flex flex-col gap-3">
                {notes.map((n) => (
                  <li key={n.id} className="flex gap-2.5 text-[13px]">
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.tone === 'bad' ? 'bg-bad' : 'bg-warn')} aria-hidden />
                    <span>
                      <span className="block text-ink">{n.title}</span>
                      <span className="block text-ink-2">{n.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <UnitEconomicsPanel product={product} costing={current ? costBatch(current) : undefined} title="Cost breakdown" subtitle={current ? `Current batch ${current.label}` : 'No finalized batch yet'} />
        </div>
      </div>

      <p className="flex gap-1.5 text-[12px] text-ink-3">
        <Info className="mt-px size-3.5 shrink-0" strokeWidth={1.6} />
        Gross profit only. Ads, rent and other operating costs are not assigned to single products; project expenses appear in Seasons. Batch costs per sale are a prototype rule until the backend applies its cost-flow method.
      </p>
    </div>
  )
}
