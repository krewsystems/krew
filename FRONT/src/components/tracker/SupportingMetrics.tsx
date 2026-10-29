import { change, type PeriodSummary } from '@/lib/finance'
import { money, number, signedPercent } from '@/lib/format'

interface Metric {
  label: string
  value: string
  delta: string
  context: string
}

/** The four figures that explain the headline, kept compact so they support it rather than compete with it. */
export function SupportingMetrics({ current: c, prior: p }: { current: PeriodSummary; prior: PeriodSummary }) {
  const marginDelta = c.grossMargin - p.grossMargin
  const metrics: Metric[] = [
    { label: 'Cost of goods sold', value: money(c.cogs), delta: signedPercent(change(c.cogs, p.cogs)), context: `${number(c.units)} units at recorded cost` },
    { label: 'Gross profit', value: money(c.grossProfit), delta: signedPercent(change(c.grossProfit, p.grossProfit)), context: 'Net sales less cost of goods' },
    { label: 'Gross margin', value: `${c.grossMargin.toFixed(1)}%`, delta: Math.abs(marginDelta) < 0.05 ? 'No change' : `${marginDelta > 0 ? '+' : ''}${marginDelta.toFixed(1)} pts`, context: 'Of net sales' },
    { label: 'Operating expenses', value: money(c.opex), delta: signedPercent(change(c.opex, p.opex)), context: `Estimated from sample rules · ${((c.opex / (c.netSales || 1)) * 100).toFixed(1)}% of net sales` },
  ]
  return (
    <section aria-label="Supporting figures" className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line lg:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="min-w-0 bg-panel px-5 py-4">
          <p className="text-[12.5px] text-ink-3">{m.label}</p>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="tabular text-[20px] font-light tracking-[-0.02em] text-ink">{m.value}</span>
            <span className="tabular text-[12px] text-ink-3">{m.delta}</span>
          </p>
          <p className="mt-1 text-[12px] leading-snug text-ink-3">{m.context}</p>
        </div>
      ))}
    </section>
  )
}
