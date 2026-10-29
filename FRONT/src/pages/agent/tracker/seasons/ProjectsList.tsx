import { ArrowUpDown, FolderKanban, Plus, Search, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/arc/badge/badge'
import { Button } from '@/components/arc/button/button'
import { DropdownMenu } from '@/components/arc/dropdown-menu/dropdown-menu'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { PROJECT_STATUS, PROJECT_TYPE, PROJECT_TYPE_STYLE } from '@/components/tracker/projects/labels'
import { sectionPath } from '@/components/tracker/sections'
import { useTrackerData } from '@/components/tracker/use-tracker'
import type { ProjectStatus } from '@/data/tracker/types'
import { money, shortDate } from '@/lib/format'
import { projectFinancials, type ProjectFinancials } from '@/lib/projects'
import { cn } from '@/lib/utils'

type Filter = 'all' | ProjectStatus
type Sort = 'start' | 'name' | 'profit' | 'spending'

const SORTS: { id: Sort; label: string }[] = [
  { id: 'start', label: 'Newest start' },
  { id: 'name', label: 'Name' },
  { id: 'profit', label: 'Highest profit' },
  { id: 'spending', label: 'Most spending' },
]

function compare(sort: Sort) {
  return (a: ProjectFinancials, b: ProjectFinancials) => {
    if (sort === 'name') return a.project.name.localeCompare(b.project.name)
    if (sort === 'profit') return b.profit - a.profit
    if (sort === 'spending') return b.spending - a.spending
    return b.project.startsAt.localeCompare(a.project.startsAt)
  }
}

/** A figure with a slim bar toward its target or budget, or a quiet note when none is set. */
function Progress({ label, value, of, percent, color, empty }: { label: string; value: number; of?: number; percent: number | null; color: string; empty: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
        <span className="text-ink-3">{label}</span>
        <span className="tabular truncate text-ink">
          {money(value, { compact: true })}
          {of ? <span className="text-ink-3"> / {money(of, { compact: true })}</span> : null}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
        {of ? <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, percent ?? 0)}%`, background: color }} /> : null}
      </div>
      {!of && <p className="mt-1 text-[11.5px] text-ink-3">{empty}</p>}
    </div>
  )
}

function ProjectCard({ f }: { f: ProjectFinancials }) {
  const p = f.project
  const status = PROJECT_STATUS[p.status]
  const style = PROJECT_TYPE_STYLE[p.type]
  const Icon = style.icon
  const over = (f.budgetUsed ?? 0) > 100
  return (
    <Link
      to={`${sectionPath('seasons')}/${p.id}`}
      className={cn(
        'group flex w-full flex-col overflow-hidden rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-raised)]',
        (p.status === 'archived' || p.status === 'completed') && 'opacity-90',
      )}
    >
      {/* Tinted band in the project type's colour. */}
      <div className="grain relative px-5 pb-4 pt-5" style={{ background: `color-mix(in oklab, ${style.color} 17%, var(--surface))` }}>
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[12.5px] text-ink-2">
            <span className="inline-flex size-8 items-center justify-center rounded-[10px]" style={{ background: `color-mix(in oklab, ${style.color} 30%, var(--surface))`, color: style.color }}>
              <Icon className="size-4" strokeWidth={1.7} />
            </span>
            {PROJECT_TYPE[p.type]}
          </span>
          <Badge size="sm" tone={status.tone}>
            {status.label}
          </Badge>
        </div>
        <h3 className="mt-4 truncate text-[17px] font-medium tracking-[-0.015em] text-ink">{p.name}</h3>
        <p className="tabular mt-0.5 truncate text-[12.5px] text-ink-3">
          {shortDate(p.startsAt)}
          {p.endsAt ? ` to ${shortDate(p.endsAt)}` : ', no end date'}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-5 pb-5 pt-4">
        <div>
          <p className="text-[12.5px] text-ink-3">Estimated profit</p>
          {f.netSales > 0 ? (
            <p className={cn('tabular mt-1 text-[26px] font-light leading-none tracking-[-0.025em]', f.profit >= 0 ? 'text-profit' : 'text-bad')}>{money(f.profit)}</p>
          ) : (
            <p className="mt-1 text-[17px] leading-tight text-ink-2">
              No sales yet <span className="tabular text-[13px] text-ink-3">· {money(f.spending)} spent</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Progress label="Net sales" value={f.netSales} of={p.revenueTarget} percent={f.revenueProgress} color="var(--sales)" empty="No target" />
          <Progress label="Spending" value={f.spending} of={p.budget} percent={f.budgetUsed} color={over ? 'var(--warning)' : 'var(--foreground)'} empty="No budget" />
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line-subtle pt-3.5 text-[12px] text-ink-3">
          <span className="tabular">
            {f.batches.length} {f.batches.length === 1 ? 'batch' : 'batches'}
          </span>
          <span aria-hidden>·</span>
          <span className="tabular">
            {f.expenses.length} {f.expenses.length === 1 ? 'expense' : 'expenses'}
          </span>
          {f.uncostedBatches > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-warn">
              <TriangleAlert className="size-3" strokeWidth={1.8} /> Costs missing
            </span>
          )}
          {over && f.uncostedBatches === 0 && <span className="ml-auto rounded-full bg-warn-soft px-2 py-0.5 text-warn">Over budget</span>}
        </div>
      </div>
    </Link>
  )
}

export function ProjectsList() {
  const { data } = useTrackerData()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('start')

  const all = useMemo(() => data.projects.map((p) => projectFinancials(p, data)), [data])
  const live = all.filter((f) => f.project.status !== 'archived')
  const count = (s: ProjectStatus) => all.filter((f) => f.project.status === s).length
  const rows = all
    .filter((f) => (filter === 'all' ? f.project.status !== 'archived' : f.project.status === filter))
    .filter((f) => !query || `${f.project.name} ${PROJECT_TYPE[f.project.type]} ${f.project.description ?? ''}`.toLowerCase().includes(query.toLowerCase()))
    .sort(compare(sort))
  const total = (k: 'netSales' | 'spending' | 'profit') => live.reduce((s, f) => s + f[k], 0)
  const create = () => navigate(`${sectionPath('seasons')}/new`)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[24px] font-medium leading-tight tracking-[-0.025em] text-ink">Seasons and projects</h2>
          <p className="mt-1.5 max-w-xl text-[13.5px] text-ink-3">Group batches, expenses and sales around a season, a launch or a campaign to see what it really earned. Optional: products and batches work without one.</p>
        </div>
        <Button size="sm" onClick={create} className="self-start sm:self-auto">
          <Plus className="size-4" strokeWidth={1.7} /> New project
        </Button>
      </header>

      {all.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-surface)] border border-dashed border-line-strong bg-panel px-6 py-16 text-center">
          <FolderKanban className="size-6 text-ink-3" strokeWidth={1.5} />
          <p className="mt-2 text-[15px] text-ink">No seasons or projects yet</p>
          <p className="max-w-md text-[13.5px] text-ink-3">Create one for a collection, a launch or a campaign, then attach its batches and expenses. Tracker shows what it earned after the cost of what sold.</p>
          <Button size="sm" className="mt-3" onClick={create}>
            Create the first project
          </Button>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line sm:grid-cols-4">
            {[
              { label: 'Active projects', value: String(count('active')) },
              { label: 'Net sales attributed', value: money(total('netSales')) },
              { label: 'Spending', value: money(total('spending')) },
              { label: 'Estimated profit', value: money(total('profit')), tone: total('profit') >= 0 ? 'text-profit' : 'text-bad' },
            ].map((s) => (
              <div key={s.label} className="bg-panel px-5 py-4">
                <dt className="text-[12.5px] text-ink-3">{s.label}</dt>
                <dd className={cn('tabular mt-1 text-[20px] font-light tracking-[-0.02em]', s.tone ?? 'text-ink')}>{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap items-center gap-3">
            <label className="relative block w-full sm:w-56">
              <span className="sr-only">Search projects</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.7} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects"
                className="h-10 w-full rounded-[10px] border border-line bg-panel pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-3 hover:border-line-strong focus-visible:border-ink"
              />
            </label>
            <div className="no-scrollbar -mx-1 min-w-0 max-w-full overflow-x-auto px-1">
              <SegmentedControl
                label="Status"
                value={filter}
                onValueChange={(v) => setFilter(v as Filter)}
                options={[
                  { value: 'all', label: 'All' },
                  ...(['planning', 'active', 'completed', 'archived'] as ProjectStatus[]).map((s) => ({
                    value: s,
                    label: PROJECT_STATUS[s].label,
                    accessory: count(s) ? <span className="tabular text-[11.5px] text-ink-3">{count(s)}</span> : undefined,
                  })),
                ]}
              />
            </div>
            <div className="sm:ml-auto">
              <DropdownMenu label={`Sort: ${SORTS.find((s) => s.id === sort)!.label}`} icon={<ArrowUpDown className="size-4" strokeWidth={1.6} />} items={SORTS.map((s) => ({ label: s.label, onSelect: () => setSort(s.id) }))} />
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-[var(--radius-surface)] border border-line bg-panel px-6 py-14 text-center">
              <p className="text-[14px] text-ink">No projects match</p>
              <p className="text-[13px] text-ink-3">{query ? `Nothing found for “${query}”.` : filter === 'archived' ? 'Nothing is archived.' : 'Nothing has this status right now.'}</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setFilter('all')
                }}
                className="mt-2 text-[13px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink"
              >
                Show all projects
              </button>
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" aria-label="Projects">
              {rows.map((f) => (
                <li key={f.project.id} className="flex">
                  <ProjectCard f={f} />
                </li>
              ))}
              {filter === 'all' && !query && (
                <li className="flex">
                  <button
                    type="button"
                    onClick={create}
                    className="flex min-h-[260px] w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-surface)] border border-dashed border-line-strong text-ink-3 transition-colors hover:border-ink hover:text-ink"
                  >
                    <span className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-panel">
                      <Plus className="size-5" strokeWidth={1.6} />
                    </span>
                    <span className="text-[14px]">New project</span>
                    <span className="max-w-[220px] text-center text-[12.5px]">A season, a launch or a campaign</span>
                  </button>
                </li>
              )}
            </ul>
          )}
          <p className="text-[12px] text-ink-3">Sales count toward a project only when they come out of its own batches. Profit is estimated: the cost of units sold, then project expenses. Unsold stock stays as inventory.</p>
        </>
      )}
    </div>
  )
}
