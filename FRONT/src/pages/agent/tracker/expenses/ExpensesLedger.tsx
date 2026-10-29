import { ArrowUpDown, Paperclip, Plus, ReceiptText, Search, SlidersHorizontal, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/arc/button/button'
import { DropdownMenu } from '@/components/arc/dropdown-menu/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/arc/popover/popover'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { Select } from '@/components/arc/select/select'
import { fieldClass } from '@/components/tracker/costing/parts'
import { CLASS_LABEL, EXPENSE_SOURCE } from '@/components/tracker/expenses/labels'
import { PROJECT_TYPE_STYLE } from '@/components/tracker/projects/labels'
import { sectionPath } from '@/components/tracker/sections'
import { useTrackerData } from '@/components/tracker/use-tracker'
import type { Expense } from '@/data/tracker/types'
import { allCategories, categoryLabel, classify, filterExpenses, sortExpenses, summarizeExpenses, type ExpenseClass, type ExpenseFilters, type ExpenseRange, type ExpenseSort, type StatusFilter } from '@/lib/expenses'
import { money, moneyExact, shortDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type RangePreset = '30d' | '90d' | '12m' | 'all' | 'custom'
const RANGES: { value: Exclude<RangePreset, 'custom'>; label: string; sentence: string }[] = [
  { value: '30d', label: '30 days', sentence: 'in the last 30 days' },
  { value: '90d', label: '90 days', sentence: 'in the last 90 days' },
  { value: '12m', label: '12 months', sentence: 'in the last 12 months' },
  { value: 'all', label: 'All time', sentence: 'so far' },
]
const SORTS: { id: ExpenseSort; label: string }[] = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'amount-desc', label: 'Highest amount' },
  { id: 'amount-asc', label: 'Lowest amount' },
]
const CLASSES: ExpenseClass[] = ['operating', 'project', 'production', 'non_expense', 'unclassified']
const ANY = 'any'
const ISO = /^\d{4}-\d{2}-\d{2}$/

const localDay = (d: Date) => d.toLocaleDateString('en-CA')
function presetRange(p: RangePreset): ExpenseRange {
  const d = new Date()
  if (p === 'all' || p === 'custom') return {}
  if (p === '12m') d.setFullYear(d.getFullYear() - 1)
  else d.setDate(d.getDate() - (p === '30d' ? 29 : 89))
  return { from: localDay(d), to: localDay(new Date()) }
}

/** Ledger state lives in the URL, so a reload, a shared link or a link from the Summary opens the same view. */
function useLedgerParams() {
  const [params, setParams] = useSearchParams()
  const get = (k: string) => params.get(k) ?? undefined
  const from = get('from')
  const to = get('to')
  const custom = !!(from && ISO.test(from)) || !!(to && ISO.test(to))
  const preset: RangePreset = custom ? 'custom' : (RANGES.find((r) => r.value === get('range'))?.value ?? '30d')
  const range = custom ? { from: from && ISO.test(from) ? from : undefined, to: to && ISO.test(to) ? to : undefined } : presetRange(preset)
  const status = (['needs_review', 'confirmed', 'void'].includes(get('status') ?? '') ? get('status') : 'all') as StatusFilter
  const sort = (SORTS.find((s) => s.id === get('sort'))?.id ?? 'newest') as ExpenseSort
  const filters: ExpenseFilters = { ...range, query: get('q'), status, category: get('category'), project: get('project'), classification: CLASSES.find((c) => c === get('class')) }
  const set = (patch: Record<string, string | undefined>) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined || v === '') n.delete(k)
          else n.set(k, v)
        }
        return n
      },
      { replace: true },
    )
  return { filters, preset, range, sort, set }
}

function StatusMark({ status }: { status: Expense['status'] }) {
  if (status === 'needs_review') return <span className="inline-flex items-center rounded-full bg-warn-soft px-2 py-0.5 text-[12px] text-warn">To review</span>
  if (status === 'void') return <span className="text-[12.5px] text-ink-3">Void</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
      <span className="size-1.5 rounded-full bg-good" aria-hidden /> Confirmed
    </span>
  )
}

export function ExpensesLedger() {
  const { data } = useTrackerData()
  const navigate = useNavigate()
  const { filters, preset, range, sort, set } = useLedgerParams()
  const categories = allCategories(data.expenseCategories)
  const projectOf = (id?: string) => data.projects.find((p) => p.id === id)

  const summary = useMemo(() => summarizeExpenses(data.expenses, range), [data.expenses, range])
  const reviewAll = data.expenses.filter((e) => e.status === 'needs_review').length
  const rows = useMemo(() => sortExpenses(filterExpenses(data.expenses, filters, categories), sort), [data.expenses, filters, categories, sort])
  const statusCount = (s: StatusFilter) => filterExpenses(data.expenses, { ...filters, status: s }, categories).length
  const extra = [filters.category, filters.project, filters.classification, preset === 'custom' ? 'range' : undefined].filter(Boolean).length
  const sentence = preset === 'custom' ? `between ${range.from ? shortDate(range.from) : 'the start'} and ${range.to ? shortDate(range.to) : 'today'}` : RANGES.find((r) => r.value === preset)!.sentence
  const add = () => navigate(`${sectionPath('expenses')}/new`)
  const open = (e: Expense) => `${sectionPath('expenses')}/${e.id}`

  // Month groups only make sense when the list runs in date order.
  const groups = useMemo(() => {
    if (sort !== 'newest' && sort !== 'oldest') return [{ key: 'all', label: '', total: 0, rows }]
    const out: { key: string; label: string; total: number; rows: Expense[] }[] = []
    for (const e of rows) {
      const key = e.at.slice(0, 7)
      let g = out.at(-1)
      if (!g || g.key !== key) {
        g = { key, label: new Date(`${key}-01T00:00:00`).toLocaleDateString('en', { month: 'long', year: 'numeric' }), total: 0, rows: [] }
        out.push(g)
      }
      g.rows.push(e)
      if (e.status === 'confirmed' && e.treatment === 'operating') g.total += e.amount
    }
    return out
  }, [rows, sort])

  const clear = () => set({ q: undefined, status: undefined, category: undefined, project: undefined, class: undefined, from: undefined, to: undefined })
  const chips = [
    filters.category && { k: 'category', label: categoryLabel(filters.category, categories) },
    filters.project && { k: 'project', label: filters.project === 'none' ? 'No project' : (projectOf(filters.project)?.name ?? 'Project') },
    filters.classification && { k: 'class', label: CLASS_LABEL[filters.classification] },
    preset === 'custom' && { k: 'dates', label: sentence },
  ].filter(Boolean) as { k: string; label: string }[]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[24px] font-medium leading-tight tracking-[-0.025em] text-ink">Expenses</h2>
          <p className="mt-1.5 max-w-xl text-[13.5px] text-ink-3">
            {money(summary.total)} counted {sentence}
            {summary.counted ? `, across ${summary.counted} ${summary.counted === 1 ? 'entry' : 'entries'}` : ''}.{' '}
            {reviewAll > 0 ? `${reviewAll} ${reviewAll === 1 ? 'entry is' : 'entries are'} waiting for your review.` : 'Nothing is waiting for review.'}
          </p>
        </div>
        <Button size="sm" onClick={add} className="self-start sm:self-auto">
          <Plus className="size-4" strokeWidth={1.7} /> Add expense
        </Button>
      </header>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="no-scrollbar -mx-1 min-w-0 max-w-full overflow-x-auto px-1">
            <SegmentedControl label="Period" value={preset === 'custom' ? '' : preset} onValueChange={(v) => set({ range: v === '30d' ? undefined : v, from: undefined, to: undefined })} options={RANGES.map((r) => ({ value: r.value, label: r.label }))} />
          </div>
          {preset === 'custom' && <span className="shrink-0 text-[12.5px] text-ink-3">Custom dates</span>}
        </div>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line lg:grid-cols-4">
          <div className="bg-panel px-5 py-4">
            <dt className="text-[12.5px] text-ink-3">Total expenses</dt>
            <dd className="tabular mt-1 text-[20px] font-light tracking-[-0.02em] text-ink">{money(summary.total)}</dd>
            <dd className="mt-0.5 text-[12px] text-ink-3">Confirmed operating costs</dd>
          </div>
          <div className="bg-panel px-5 py-4">
            <dt className="text-[12.5px] text-ink-3">Project expenses</dt>
            <dd className="tabular mt-1 text-[20px] font-light tracking-[-0.02em] text-ink">{money(summary.project)}</dd>
            <dd className="mt-0.5 text-[12px] text-ink-3">Part of the total, linked to a season</dd>
          </div>
          <div className="bg-panel px-5 py-4">
            <dt className="text-[12.5px] text-ink-3">General operating</dt>
            <dd className="tabular mt-1 text-[20px] font-light tracking-[-0.02em] text-ink">{money(summary.general)}</dd>
            <dd className="mt-0.5 text-[12px] text-ink-3">Rent, software, team and the rest</dd>
          </div>
          <button type="button" onClick={() => set({ status: 'needs_review' })} className="bg-panel px-5 py-4 text-left transition-colors hover:bg-panel-muted" aria-label={`Show the ${summary.review.count} entries to review`}>
            <span className="block text-[12.5px] text-ink-3">Needs review</span>
            <span className={cn('tabular mt-1 block text-[20px] font-light tracking-[-0.02em]', summary.review.count ? 'text-warn' : 'text-ink')}>{summary.review.count}</span>
            <span className="mt-0.5 block text-[12px] text-ink-3">{summary.review.count ? `${money(summary.review.amount)} not counted yet` : 'All clear'}</span>
          </button>
        </dl>
        {(summary.production > 0 || summary.nonExpense > 0) && (
          <p className="text-[12px] text-ink-3">
            Also recorded, not counted as expenses:
            {summary.production > 0 && ` ${money(summary.production)} of production costs carried by batches`}
            {summary.production > 0 && summary.nonExpense > 0 && ' ·'}
            {summary.nonExpense > 0 && ` ${money(summary.nonExpense)} of supplier payments, deposits and transfers`}.
          </p>
        )}
      </div>

      <section aria-label="Expense ledger" className="rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]">
        <div className="flex flex-col gap-3 border-b border-line-subtle p-4 sm:p-5 xl:flex-row xl:items-center">
          <label className="relative block xl:w-64">
            <span className="sr-only">Search expenses</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.7} />
            <input
              type="search"
              value={filters.query ?? ''}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Search description, vendor or reference"
              className="h-10 w-full rounded-[10px] border border-line bg-panel pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-3 hover:border-line-strong focus-visible:border-ink"
            />
          </label>
          <div className="no-scrollbar -mx-1 min-w-0 overflow-x-auto px-1">
            <SegmentedControl
              label="Status"
              value={filters.status ?? 'all'}
              onValueChange={(v) => set({ status: v === 'all' ? undefined : v })}
              options={[
                { value: 'all', label: 'All' },
                { value: 'needs_review', label: 'To review', accessory: statusCount('needs_review') ? <span className="tabular text-[11.5px] text-warn">{statusCount('needs_review')}</span> : undefined },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'void', label: 'Void' },
              ]}
            />
          </div>
          <div className="flex items-center gap-2 xl:ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-line bg-panel px-3 text-[13.5px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink">
                  <SlidersHorizontal className="size-4" strokeWidth={1.6} /> Filters
                  {extra > 0 && <span className="tabular rounded-full bg-inverse px-1.5 text-[11.5px] text-ink-inverse">{extra}</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="flex w-[min(92vw,340px)] flex-col gap-4 p-4!">
                <Select label="Category" value={filters.category ?? ANY} onValueChange={(v) => set({ category: v === ANY ? undefined : v })} options={[{ value: ANY, label: 'Any category' }, ...categories.map((c) => ({ value: c.id, label: c.label }))]} />
                <Select label="Season or project" value={filters.project ?? ANY} onValueChange={(v) => set({ project: v === ANY ? undefined : v })} options={[{ value: ANY, label: 'Any' }, { value: 'none', label: 'No project' }, ...data.projects.map((p) => ({ value: p.id, label: p.name }))]} />
                <Select label="How it counts" value={filters.classification ?? ANY} onValueChange={(v) => set({ class: v === ANY ? undefined : v })} options={[{ value: ANY, label: 'Any' }, ...CLASSES.map((c) => ({ value: c, label: CLASS_LABEL[c] }))]} />
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-[13px] text-ink-2">From</span>
                    <input type="date" aria-label="From date" value={preset === 'custom' ? (range.from ?? '') : ''} max={range.to} onChange={(e) => set({ from: e.target.value || undefined, range: undefined })} className={cn(fieldClass, 'h-9 text-[13px]')} />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-[13px] text-ink-2">To</span>
                    <input type="date" aria-label="To date" value={preset === 'custom' ? (range.to ?? '') : ''} min={range.from} onChange={(e) => set({ to: e.target.value || undefined, range: undefined })} className={cn(fieldClass, 'h-9 text-[13px]')} />
                  </label>
                </div>
                {extra > 0 && (
                  <button type="button" onClick={() => set({ category: undefined, project: undefined, class: undefined, from: undefined, to: undefined })} className="self-start text-[13px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
                    Clear filters
                  </button>
                )}
              </PopoverContent>
            </Popover>
            <DropdownMenu label={`Sort: ${SORTS.find((s) => s.id === sort)!.label}`} icon={<ArrowUpDown className="size-4" strokeWidth={1.6} />} items={SORTS.map((s) => ({ label: s.label, onSelect: () => set({ sort: s.id === 'newest' ? undefined : s.id }) }))} />
          </div>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line-subtle px-4 py-3 sm:px-5">
            {chips.map((c) => (
              <button
                key={c.k}
                type="button"
                onClick={() => set(c.k === 'dates' ? { from: undefined, to: undefined } : { [c.k]: undefined })}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-line bg-panel-muted px-2.5 text-[12.5px] text-ink-2 hover:border-line-strong hover:text-ink"
                aria-label={`Remove filter ${c.label}`}
              >
                {c.label} <X className="size-3" strokeWidth={1.8} />
              </button>
            ))}
          </div>
        )}

        <div className="hidden grid-cols-[64px_minmax(0,1fr)_minmax(0,170px)_20px_96px_112px] gap-4 px-5 pb-1 pt-3 text-[12px] text-ink-3 md:grid">
          <span>Date</span>
          <span>Description</span>
          <span>Project</span>
          <span>
            <span className="sr-only">Receipt</span>
          </span>
          <span>Status</span>
          <span className="text-right">Amount</span>
        </div>

        {data.expenses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <ReceiptText className="size-6 text-ink-3" strokeWidth={1.5} />
            <p className="mt-2 text-[15px] text-ink">No expenses recorded yet</p>
            <p className="max-w-md text-[13.5px] text-ink-3">Add your first one by hand, or send a receipt to Tracker on Telegram. Anything Tracker prepares waits here for you to confirm.</p>
            <Button size="sm" className="mt-3" onClick={add}>
              Add the first expense
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <p className="text-[14px] text-ink">{filters.status === 'needs_review' && !filters.query && !extra ? 'Nothing to review' : 'No expenses match'}</p>
            <p className="max-w-sm text-[13px] text-ink-3">
              {filters.query
                ? `Nothing found for “${filters.query}” ${sentence}.`
                : filters.status === 'needs_review'
                  ? `Every entry ${sentence} is confirmed. New ones from Tracker, Telegram or chat will appear here.`
                  : filters.status === 'void'
                    ? `No voided entries ${sentence}.`
                    : `Nothing fits these filters ${sentence}.`}
            </p>
            <button type="button" onClick={clear} className="mt-2 text-[13px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
              Show all expenses
            </button>
          </div>
        ) : (
          <div className="pb-2">
            {groups.map((g) => (
              <div key={g.key}>
                {g.label && (
                  <div className="flex items-baseline justify-between gap-3 px-5 pb-1 pt-4 text-[12.5px]">
                    <span className="text-ink-2">{g.label}</span>
                    <span className="tabular text-ink-3">{g.total ? `${money(g.total)} counted` : ''}</span>
                  </div>
                )}
                <ul className="flex flex-col px-2 md:px-0">
                  {g.rows.map((e) => {
                    const project = projectOf(e.projectId)
                    const cls = classify(e)
                    const muted = e.status === 'void' || cls === 'production' || cls === 'non_expense'
                    const Source = EXPENSE_SOURCE[e.source]
                    const meta = [e.vendor, categoryLabel(e.category, categories), cls === 'production' || cls === 'non_expense' ? CLASS_LABEL[cls] : undefined].filter(Boolean).join(' · ')
                    return (
                      <li key={e.id} className="border-b border-line-subtle last:border-0 md:border-0">
                        <Link
                          to={open(e)}
                          className="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 rounded-[12px] px-3 py-3 transition-colors hover:bg-panel-muted md:mx-2 md:grid-cols-[64px_minmax(0,1fr)_minmax(0,170px)_20px_96px_112px] md:items-center md:gap-4"
                        >
                          <span className="tabular hidden text-[13px] text-ink-3 md:block">{shortDate(e.at)}</span>
                          <span className="min-w-0">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className={cn('truncate text-[14px]', e.status === 'void' ? 'text-ink-3 line-through decoration-1' : 'text-ink')}>{e.label}</span>
                              {e.source !== 'manual' && (
                                <span title={Source.label} className="inline-flex shrink-0 text-ink-3">
                                  <Source.icon className="size-3.5" strokeWidth={1.7} aria-label={Source.label} />
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-[12.5px] text-ink-3">
                              <span className="md:hidden">{shortDate(e.at)} · </span>
                              {meta}
                              <span className="sr-only"> · {Source.label}</span>
                            </span>
                          </span>
                          <span className={cn('tabular text-right text-[14px] md:order-last', muted ? 'text-ink-3' : 'text-ink', e.status === 'void' && 'line-through decoration-1')}>{moneyExact(e.amount)}</span>
                          <span className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 md:contents">
                            <span className="min-w-0 truncate text-[12.5px] text-ink-2 md:text-[13px]">
                              {project ? (
                                <span className="inline-flex max-w-full items-center gap-1.5">
                                  <span className="size-2 shrink-0 rounded-full" style={{ background: PROJECT_TYPE_STYLE[project.type].color }} aria-hidden />
                                  <span className="truncate">{project.name}</span>
                                </span>
                              ) : (
                                <span className="sr-only">No project</span>
                              )}
                            </span>
                            <span className="inline-flex text-ink-3" title={e.receipt ? 'Receipt attached' : 'No receipt'}>
                              {e.receipt ? <Paperclip className="size-3.5" strokeWidth={1.7} aria-label="Receipt attached" /> : <span className="sr-only">No receipt</span>}
                            </span>
                            <StatusMark status={e.status} />
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-[12px] text-ink-3">
        Sample data. The Summary still uses estimated operating expenses; confirmed entries here are not added on top of that estimate. Production costs count through their batch, and each entry counts once, with or without a project.
      </p>
    </div>
  )
}
