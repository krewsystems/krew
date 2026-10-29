import { ArrowRight, Info, TriangleAlert } from 'lucide-react'
import { AnimatedCounter } from '@/components/arc/animated-counter/animated-counter'
import { Tooltip } from '@/components/arc/tooltip/tooltip'
import { change, type PeriodSummary, type SeriesPoint } from '@/lib/finance'
import { money, shortDate, signedPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

function Delta({ value, suffix }: { value: number | null; suffix: string }) {
  const tone = value === null || Math.abs(value) < 0.05 ? 'neutral' : value > 0 ? 'good' : 'bad'
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-3">
      <span className={cn('tabular rounded-full px-2 py-0.5 text-[12.5px]', tone === 'good' ? 'bg-good-soft text-good' : tone === 'bad' ? 'bg-bad-soft text-bad' : 'bg-sunken text-ink-2')}>{signedPercent(value)}</span>
      {suffix}
    </span>
  )
}

function SalesLine({ points }: { points: SeriesPoint[] }) {
  if (points.length < 2) return null
  // A 3-point moving average keeps the shape of the trend without day-to-day jitter.
  const values = points.map((_, i) => {
    const near = points.slice(Math.max(0, i - 1), i + 2)
    return near.reduce((s, p) => s + p.netSales, 0) / near.length
  })
  const max = Math.max(...values)
  const min = Math.min(...values)
  const xy = values.map((v, i) => [(i / (values.length - 1)) * 100, 34 - ((v - min) / (max - min || 1)) * 30] as const)
  const line = xy.map(([x, y]) => `${x},${y}`).join(' ')
  return (
    <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="h-12 w-full text-sales" aria-hidden>
      <polygon points={`0,36 ${line} 100,36`} fill="currentColor" opacity="0.08" />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

interface ProfitHeroProps {
  current: PeriodSummary
  prior: PeriodSummary
  series: SeriesPoint[]
  /** Likely cost of sales with no recorded cost. */
  missingCogs: number
  missingProducts: number
  finalized: number
  through: string
  onReviewCosts: () => void
  className?: string
}

/** The two numbers an owner reads first: what the business kept, and what it sold. */
export function ProfitHero({ current: c, prior: p, series, missingCogs, missingProducts, finalized, through, onReviewCosts, className }: ProfitHeroProps) {
  const loss = c.netProfit < 0
  const low = c.netProfit - missingCogs
  const final = finalized >= 1
  const estimateNote = final
    ? `This period is in closed months. Books are final through ${shortDate(through)}.`
    : `Built from the costs and expenses recorded so far. It becomes final once the month is closed and reconciled. Books are final through ${shortDate(through)}.`

  return (
    <section aria-label="Profit and sales" className={cn('grain flex flex-col overflow-hidden rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]', className)}>
      <div className="px-6 pb-6 pt-5 sm:px-7">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[14px] text-ink-2">
            <span className={cn('size-2 rounded-full', loss ? 'bg-bad' : 'bg-profit')} aria-hidden />
            {loss ? 'Net loss' : 'Net profit'}
          </p>
          <Tooltip content={<span className="block max-w-[260px]">{estimateNote}</span>}>
            <button type="button" className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-[12px] text-ink-2">
              {final ? 'Final' : 'Estimate'}
              <Info className="size-3" strokeWidth={1.8} />
            </button>
          </Tooltip>
        </div>
        <div className={cn('tabular mt-3 [--text-3xl:2.75rem] sm:[--text-3xl:3.5rem] [&_*]:font-light! [&_*]:tracking-[-0.03em]', loss ? 'text-bad' : 'text-ink')}>
          <AnimatedCounter value={Math.abs(c.netProfit)} prefix={loss ? '-$' : '$'} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Delta value={change(c.netProfit, p.netProfit)} suffix="vs previous period" />
          <span className="text-[13px] text-ink-3">
            <span className="tabular text-ink-2">{c.netMargin.toFixed(1)}%</span> of net sales
          </span>
        </div>

        {missingCogs > 0 && (
          <div className="mt-5 flex gap-3 rounded-[12px] border border-[color-mix(in_oklab,var(--warning)_30%,transparent)] bg-warn-soft p-3.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" strokeWidth={1.7} />
            <div className="min-w-0 text-[13px] leading-relaxed">
              <p className="text-ink">
                Likely <span className="tabular font-medium">{money(low)}</span> to <span className="tabular font-medium">{money(c.netProfit)}</span>
              </p>
              <p className="mt-0.5 text-ink-2">
                {missingProducts} {missingProducts === 1 ? 'product' : 'products'} sold {money(c.uncostedSales)} with no recorded cost. If they cost what your other products do, profit is about {money(missingCogs)} lower.
              </p>
              <button type="button" onClick={onReviewCosts} className="mt-2 inline-flex items-center gap-1 text-[13px] text-ink underline decoration-[color-mix(in_oklab,var(--warning)_55%,transparent)] underline-offset-4 hover:decoration-current">
                See which products <ArrowRight className="size-3.5" strokeWidth={1.7} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 border-t border-line px-6 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-end sm:px-7">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13.5px] text-ink-2">
            <span className="size-2 rounded-full bg-sales" aria-hidden />
            Net sales
          </p>
          <p className="tabular mt-1.5 text-[30px] font-light leading-none tracking-[-0.025em] text-ink">{money(c.netSales)}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Delta value={change(c.netSales, p.netSales)} suffix="" />
            <span className="text-[12.5px] text-ink-3">after {money(c.discounts + c.refunds, { compact: true })} discounts and refunds</span>
          </div>
        </div>
        <SalesLine points={series} />
      </div>

      <CostStructure summary={c} />
    </section>
  )
}

/** One bar of net sales split into cost of goods, operating expenses and what is left. */
function CostStructure({ summary: s }: { summary: PeriodSummary }) {
  const scale = Math.max(s.netSales, s.cogs + s.opex) || 1
  const parts = [
    { key: 'cogs', label: 'Cost of goods', value: s.cogs, className: 'bg-[var(--series-1)]', swatch: 'bg-[var(--series-1)]' },
    { key: 'opex', label: 'Operating costs', value: s.opex, className: 'bg-[var(--series-2)]', swatch: 'bg-[var(--series-2)]' },
    { key: 'net', label: 'Kept as profit', value: Math.max(0, s.netProfit), className: 'hatch-estimate text-profit', swatch: 'hatch-estimate text-profit' },
  ]
  return (
    <div className="mt-auto border-t border-line bg-panel-muted/60 px-6 py-4 sm:px-7">
      <p className="text-[12.5px] text-ink-3">Of every dollar of net sales</p>
      <div className="mt-2.5 flex h-2 w-full gap-[2px]" role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / (s.netSales || 1)) * 100)} cents`).join(', ')}>
        {parts.map((p) => (p.value > 0 ? <span key={p.key} className={cn('h-full rounded-[3px] transition-[width] duration-500', p.className)} style={{ width: `${(p.value / scale) * 100}%` }} /> : null))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-ink-2">
        {parts.map((p) => (
          <li key={p.key} className="inline-flex items-center gap-1.5">
            <span className={cn('size-2 rounded-[2px]', p.swatch)} />
            {p.label}
            <span className="tabular text-ink-3">{Math.round((p.value / (s.netSales || 1)) * 100)}¢</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
