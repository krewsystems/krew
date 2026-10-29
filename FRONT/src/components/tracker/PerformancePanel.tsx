import { useMemo, useState } from 'react'
import { LineChart, type LineChartDatum } from '@/components/arc/line-chart/line-chart'
import type { SeriesPoint } from '@/lib/finance'
import { money, shortDate } from '@/lib/format'
import { cn } from '@/lib/utils'

interface PerformancePanelProps {
  series: SeriesPoint[]
  through: string
  loading: boolean
  /** Series hidden at first. Gross profit starts hidden on the Summary. */
  defaultHidden?: string[]
  className?: string
}

/** Sales lead in the cool accent, profit follows in green; gross profit is one toggle away. */
const SERIES = [
  { key: 'netSales', label: 'Net sales', color: 'var(--sales)', area: true },
  { key: 'netProfit', label: 'Net profit, estimated', color: 'var(--profit)', area: false },
  { key: 'grossProfit', label: 'Gross profit', color: 'var(--series-2)', dashed: true, area: false },
]
const DOT: Record<string, string> = { netSales: 'bg-sales', netProfit: 'bg-profit', grossProfit: 'bg-[var(--series-2)]' }

export function PerformancePanel({ series: points, through, loading, defaultHidden = ['grossProfit'], className }: PerformancePanelProps) {
  const weekly = points.length > 0 && points[0].date !== points[0].end
  const [active, setActive] = useState<number | null>(null)
  const [hidden, setHidden] = useState<string[]>(defaultHidden)

  const data: LineChartDatum[] = useMemo(() => {
    const step = Math.max(1, Math.ceil(points.length / 6))
    return points.map((p, i) => ({
      key: p.date,
      label: weekly ? `Week of ${shortDate(p.date)}` : new Date(`${p.date}T00:00:00`).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
      axisLabel: (points.length - 1 - i) % step === 0 ? shortDate(p.date) : undefined,
      values: { netSales: Math.round(p.netSales), grossProfit: Math.round(p.grossProfit), netProfit: Math.round(p.netProfit) },
    }))
  }, [points, weekly])

  const focus = active !== null ? points[active] : null
  const totals = focus ?? points.reduce((t, p) => ({ ...t, netSales: t.netSales + p.netSales, grossProfit: t.grossProfit + p.grossProfit, netProfit: t.netProfit + p.netProfit }), { date: '', end: '', netSales: 0, grossProfit: 0, netProfit: 0 })
  const readout = SERIES.filter((s) => !hidden.includes(s.key))
  const lastDay = points.at(-1)?.end ?? ''
  const firstDay = points[0]?.date ?? ''

  return (
    <section aria-label="Financial performance" className={cn('rounded-[var(--radius-surface)] border border-line bg-panel px-6 pb-5 pt-5 shadow-[var(--shadow-resting)] sm:px-7', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[15px] font-medium tracking-[-0.01em] text-ink">Financial performance</h2>
          <p className="mt-0.5 text-[13px] text-ink-3">{weekly ? 'Weekly totals' : 'Daily totals'} · {focus ? (weekly ? `week of ${shortDate(focus.date)}` : shortDate(focus.date)) : 'whole period'}</p>
        </div>
        <dl className="flex flex-wrap gap-x-7 gap-y-2" aria-live="polite">
          {readout.map((s) => {
            const value = totals[s.key as 'netSales' | 'netProfit' | 'grossProfit']
            return (
              <div key={s.key}>
                <dt className="flex items-center gap-1.5 text-[12px] text-ink-3">
                  <span className={cn('size-1.5 rounded-full', DOT[s.key])} aria-hidden />
                  {s.label.replace(', estimated', '')}
                </dt>
                <dd className={cn('tabular mt-0.5 text-[19px] font-light tracking-[-0.02em]', s.key === 'netProfit' && value < 0 ? 'text-bad' : 'text-ink')}>{money(Math.round(value))}</dd>
              </div>
            )
          })}
        </dl>
      </div>
      <div className="mt-5">
        <LineChart
          label="Financial performance"
          data={data}
          series={SERIES}
          hiddenSeries={hidden}
          onHiddenSeriesChange={setHidden}
          height={230}
          loading={loading}
          formatValue={(v) => money(v)}
          formatTick={(v) => (Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}K` : `$${Math.round(v)}`)}
          onActiveChange={(i) => setActive(i)}
          emptyLabel="No sales recorded in this period"
        />
      </div>
      <p className="mt-3 text-[12px] text-ink-3">
        {firstDay > through
          ? `Every day shown is an estimate until the month closes.`
          : lastDay > through
            ? `Final through ${shortDate(through)}. Later days are estimates until the month closes.`
            : `Every day shown falls in closed months, so these figures are final.`}
      </p>
    </section>
  )
}
