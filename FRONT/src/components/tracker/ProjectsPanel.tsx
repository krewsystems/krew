import { ArrowUpRight, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/arc/badge/badge'
import type { TrackerDataset } from '@/data/tracker/types'
import { money, shortDate } from '@/lib/format'
import { projectFinancials, type ProjectFinancials } from '@/lib/projects'
import { cn } from '@/lib/utils'
import { PROJECT_STATUS, PROJECT_TYPE, STATUS_ORDER } from './projects/labels'
import { sectionPath } from './sections'

function Meter({ label, value, of, percent, tone }: { label: string; value: number; of: number; percent: number; tone: 'sales' | 'ink' | 'warn' }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="text-ink-2">{label}</span>
        <span className="tabular text-ink">
          {money(value, { compact: true })} <span className="text-ink-3">of {money(of, { compact: true })}</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken" role="meter" aria-label={label} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn('h-full rounded-full transition-[width] duration-500', tone === 'sales' ? 'bg-sales' : tone === 'warn' ? 'bg-warn' : 'bg-ink')} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
    </div>
  )
}

function Featured({ f }: { f: ProjectFinancials }) {
  const p = f.project
  const status = PROJECT_STATUS[p.status]
  return (
    <Link to={`${sectionPath('seasons')}/${p.id}`} className="flex h-full flex-col gap-5 rounded-[14px] border border-line-subtle bg-panel-muted p-5 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-ink">{p.name}</p>
          <p className="tabular mt-0.5 text-[12.5px] text-ink-3">
            {PROJECT_TYPE[p.type]} · {shortDate(p.startsAt)}
            {p.endsAt ? ` to ${shortDate(p.endsAt)}` : ''} · {f.batches.length} {f.batches.length === 1 ? 'batch' : 'batches'}
          </p>
        </div>
        <Badge size="sm" tone={status.tone}>
          {status.label}
        </Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {p.revenueTarget ? <Meter label="Net sales" value={f.netSales} of={p.revenueTarget} percent={f.revenueProgress ?? 0} tone="sales" /> : <p className="text-[13px] text-ink-2">Net sales {money(f.netSales, { compact: true })}</p>}
        {p.budget ? <Meter label="Spending" value={f.spending} of={p.budget} percent={f.budgetUsed ?? 0} tone={(f.budgetUsed ?? 0) > 100 ? 'warn' : 'ink'} /> : <p className="text-[13px] text-ink-2">Spending {money(f.spending, { compact: true })}</p>}
      </div>
      <p className="text-[12.5px] text-ink-3">
        Estimated profit so far <span className={cn('tabular', f.profit >= 0 ? 'text-profit' : 'text-bad')}>{money(f.profit)}</span>, after the cost of units sold and {money(f.operatingExpenses, { compact: true })} of project expenses.
      </p>
      {f.uncostedBatches > 0 && (
        <p className="-mt-2 flex items-center gap-1.5 text-[12.5px] text-warn">
          <TriangleAlert className="size-3.5 shrink-0" strokeWidth={1.7} />
          {f.uncostedBatches} {f.uncostedBatches === 1 ? 'batch has' : 'batches have'} no final cost, so profit reads high.
        </p>
      )}
    </Link>
  )
}

/** The live project gets the detail; the rest are one line each. */
export function ProjectsPanel({ data, className }: { data: TrackerDataset; className?: string }) {
  const all = data.projects
    .filter((p) => p.status !== 'archived')
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
    .map((p) => projectFinancials(p, data))
  const featured = all.filter((f) => f.project.status === 'active')
  const others = all.filter((f) => f.project.status !== 'active')

  return (
    <section aria-label="Seasons and projects" className={cn('rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]', className)}>
      <header className="flex items-start justify-between gap-3 px-6 pt-5 sm:px-7">
        <div>
          <h2 className="text-[15px] font-medium tracking-[-0.01em] text-ink">Seasons and projects</h2>
          <p className="mt-0.5 text-[13px] text-ink-3">Optional groupings of batches, expenses and revenue</p>
        </div>
        <Link to={sectionPath('seasons')} className="inline-flex shrink-0 items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
          All projects <ArrowUpRight className="size-3.5" strokeWidth={1.7} />
        </Link>
      </header>
      {all.length === 0 ? (
        <p className="px-6 py-10 text-center text-[13.5px] text-ink-3">No seasons or projects yet. Use them to group a collection’s batches and costs.</p>
      ) : (
        <div className="grid gap-5 p-4 pt-4 sm:p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            {featured.length === 0 ? <p className="rounded-[14px] bg-panel-muted p-5 text-[13.5px] text-ink-3">No project is active right now.</p> : featured.map((f) => <Featured key={f.project.id} f={f} />)}
          </div>
          {others.length > 0 && (
            <ul className="flex flex-col divide-y divide-line-subtle">
              {others.map((f) => {
                const p = f.project
                const done = p.status === 'completed'
                return (
                  <li key={p.id}>
                    <Link to={`${sectionPath('seasons')}/${p.id}`} className="flex items-center justify-between gap-4 rounded-[10px] px-1 py-3.5 transition-colors hover:bg-panel-muted">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] text-ink">{p.name}</p>
                        <p className="tabular mt-0.5 text-[12.5px] text-ink-3">
                          {PROJECT_STATUS[p.status].label} · {done ? `ended ${p.endsAt ? shortDate(p.endsAt) : ''}` : `starts ${shortDate(p.startsAt)}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={cn('tabular text-[14px]', done ? (f.profit >= 0 ? 'text-profit' : 'text-bad') : 'text-ink')}>{money(done ? f.profit : (p.budget ?? f.spending), { compact: true })}</p>
                        <p className="text-[12px] text-ink-3">{done ? 'estimated profit' : p.budget ? 'budget' : 'spent so far'}</p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
