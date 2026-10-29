import { Info, Link2, Pencil, Plus, Search, TriangleAlert, Unlink, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/arc/button/button'
import { Select } from '@/components/arc/select/select'
import { Tooltip } from '@/components/arc/tooltip/tooltip'
import { BatchStatusBadge, fieldClass, MoneyInput } from '@/components/tracker/costing/parts'
import { PROJECT_STATUS } from '@/components/tracker/projects/labels'
import { sectionPath } from '@/components/tracker/sections'
import { useExpenseActions, useProjectActions } from '@/components/tracker/use-tracker'
import { uid } from '@/data/seed-utils'
import type { Expense, Project, ProjectStatus, TrackerDataset } from '@/data/tracker/types'
import { costBatch } from '@/lib/costing'
import { allCategories, atFromDate, categoryLabel, validateExpense } from '@/lib/expenses'
import { money, moneyExact, number, relativeTime, shortDate } from '@/lib/format'
import { projectFinancials } from '@/lib/projects'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toasts'

const today = () => new Date().toLocaleDateString('en-CA')
const stamp = () => new Date().toISOString()

const panel = 'rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]'

function Figure({ label, value, sign, tone = 'ink', hint }: { label: string; value: number; sign?: '−' | '='; tone?: 'ink' | 'profit' | 'bad'; hint?: string }) {
  return (
    <div className="relative min-w-0 bg-panel px-4 py-3.5 sm:px-5">
      {sign && <span className="absolute -left-[9px] top-1/2 z-10 hidden size-[18px] -translate-y-1/2 items-center justify-center rounded-full border border-line bg-panel text-[12px] text-ink-3 sm:flex">{sign}</span>}
      <p className="truncate text-[12.5px] text-ink-3">{label}</p>
      <p className={cn('tabular mt-1 text-[19px] font-light tracking-[-0.02em]', tone === 'profit' ? 'text-profit' : tone === 'bad' ? 'text-bad' : 'text-ink')}>{money(value)}</p>
      {hint && <p className="mt-0.5 truncate text-[12px] text-ink-3">{hint}</p>}
    </div>
  )
}

function Meter({ label, value, of, percent, tone, foot }: { label: string; value: number; of: number; percent: number; tone: 'sales' | 'ink' | 'warn'; foot: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="text-ink-2">{label}</span>
        <span className="tabular text-ink">
          {money(value)} <span className="text-ink-3">of {money(of)}</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken" role="meter" aria-label={label} aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn('h-full rounded-full transition-[width] duration-500', tone === 'sales' ? 'bg-sales' : tone === 'warn' ? 'bg-warn' : 'bg-ink')} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <p className="tabular mt-1.5 text-[12px] text-ink-3">{foot}</p>
    </div>
  )
}

/** A searchable list of records to pick from, shown inline under a section. */
function Picker<T extends { id: string }>({ items, empty, search, render, onPick, onClose, title }: { items: T[]; empty: string; search: (t: T) => string; render: (t: T) => React.ReactNode; onPick: (t: T) => void; onClose: () => void; title: string }) {
  const [q, setQ] = useState('')
  const shown = items.filter((t) => !q || search(t).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="mx-4 mb-4 rounded-[14px] border border-line bg-panel-muted p-3 sm:mx-5">
      <div className="flex items-center justify-between gap-2 px-1 pb-2">
        <p className="text-[13px] text-ink">{title}</p>
        <button type="button" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`} className="inline-flex size-7 items-center justify-center rounded-full text-ink-3 hover:bg-sunken hover:text-ink">
          <X className="size-4" strokeWidth={1.7} />
        </button>
      </div>
      {items.length > 4 && (
        <label className="relative mb-2 block">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.7} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className={cn(fieldClass, 'h-9 pl-9')} />
        </label>
      )}
      {shown.length === 0 ? (
        <p className="px-1 py-4 text-center text-[13px] text-ink-3">{items.length === 0 ? empty : 'Nothing matches.'}</p>
      ) : (
        <ul className="flex max-h-72 flex-col overflow-y-auto">
          {shown.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => onPick(t)} className="flex w-full items-center justify-between gap-3 rounded-[10px] px-2.5 py-2.5 text-left transition-colors hover:bg-panel">
                {render(t)}
                <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] text-ink-2">
                  <Plus className="size-3.5" strokeWidth={1.8} /> Add
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Quick project expense. Uses the same record, validation and action as the Expenses section, so it is one system. */
function AddExpenseForm({ project, data, onDone }: { project: Project; data: TrackerDataset; onDone: () => void }) {
  const actions = useExpenseActions()
  const [id] = useState(() => uid('exp'))
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState(Number.NaN)
  const [category, setCategory] = useState('content')
  const [date, setDate] = useState(today)
  const [tried, setTried] = useState(false)
  const errors = validateExpense({ label, amount, date, category, treatment: 'operating' }, { today: today(), batches: data.batches })
  const first = errors.label ?? errors.amount ?? errors.date
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setTried(true)
        if (first) return
        const at = atFromDate(date)
        const expense: Expense = { id, label: label.trim(), amount: Math.round(amount * 100) / 100, category, treatment: 'operating', status: 'confirmed', at, projectId: project.id, source: 'manual', createdAt: stamp() }
        actions.create(expense)
        toast('Expense added', `${expense.label}, ${money(expense.amount)}`)
        onDone()
      }}
      className="mx-4 mb-4 flex flex-col gap-3 rounded-[14px] border border-line bg-panel-muted p-4 sm:mx-5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] text-ink">New project expense</p>
        <Link to={`${sectionPath('expenses')}/new?forProject=${project.id}`} className="text-[12.5px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
          Full form with receipt
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
        <input aria-label="What was it" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="What was it, such as Photoshoot" aria-invalid={tried && !!errors.label} className={fieldClass} autoFocus />
        <MoneyInput aria-label="Amount" value={amount} onValue={setAmount} placeholder="0.00" aria-invalid={tried && !!errors.amount} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Category" value={category} onValueChange={setCategory} options={allCategories(data.expenseCategories).map((c) => ({ value: c.id, label: c.label }))} />
        <label className="flex flex-col gap-2">
          <span className="text-[13px] text-ink-2">Date</span>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} aria-invalid={tried && !!errors.date} className={fieldClass} />
        </label>
      </div>
      {tried && first && <p className="text-[12.5px] text-warn">{first}</p>}
      <p className="text-[12px] text-ink-3">Recorded once, as an operating expense of this project. It also appears in Expenses, and it is not added to any product’s unit cost.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Add expense
        </Button>
      </div>
    </form>
  )
}

export function ProjectDetail({ project, data }: { project: Project; data: TrackerDataset }) {
  const navigate = useNavigate()
  const actions = useProjectActions()
  const [picking, setPicking] = useState<'batch' | 'expense' | 'new-expense' | null>(null)
  const f = projectFinancials(project, data)
  const productOf = (productId: string) => data.products.find((p) => p.id === productId)
  const base = `${sectionPath('seasons')}/${project.id}`
  const events = data.projectEvents.filter((e) => e.projectId === project.id).sort((a, b) => b.at.localeCompare(a.at))
  const freeBatches = data.batches.filter((b) => !b.projectId && b.status !== 'revised')
  // Production costs reach projects through their batch, and money movements are not expenses, so neither can be linked here.
  const freeExpenses = data.expenses.filter((e) => !e.projectId && e.status !== 'void' && e.treatment !== 'production' && e.treatment !== 'non_expense')
  const categories = allCategories(data.expenseCategories)
  const soldShare = f.investment > 0 ? ((f.investment - f.inventoryValue) / f.investment) * 100 : 0

  const setStatus = (status: ProjectStatus) => {
    if (status === project.status) return
    actions.save({ ...project, status }, [{ kind: 'status_changed', text: `Status changed from ${PROJECT_STATUS[project.status].label} to ${PROJECT_STATUS[status].label}` }])
    toast(`Marked ${PROJECT_STATUS[status].label.toLowerCase()}`, project.name)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {project.description && <p className="max-w-2xl text-[14px] text-ink-2">{project.description}</p>}
          <p className="tabular mt-1 text-[13px] text-ink-3">
            {shortDate(project.startsAt)}
            {project.endsAt ? ` to ${shortDate(project.endsAt)}` : ', no end date'} · Amounts in {data.currency}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-44">
            <Select label="Status" value={project.status} onValueChange={(v) => setStatus(v as ProjectStatus)} options={(Object.keys(PROJECT_STATUS) as ProjectStatus[]).map((s) => ({ value: s, label: PROJECT_STATUS[s].label }))} />
          </div>
          <Button size="sm" variant="secondary" onClick={() => navigate(`${base}?edit=1`)} className="h-10!">
            <Pencil className="size-4" strokeWidth={1.6} /> Edit
          </Button>
        </div>
      </div>

      {/* Financial summary: what the project earned so far, as a short chain. */}
      <section aria-label="Financial summary" className={cn(panel, 'grain overflow-hidden')}>
        <div className="flex flex-col gap-4 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <p className="flex items-center gap-2 text-[14px] text-ink-2">
              <span className={cn('size-2 rounded-full', f.profit >= 0 ? 'bg-profit' : 'bg-bad')} aria-hidden />
              Estimated project profit
              <Tooltip content={<span className="block max-w-[260px]">Net sales from this project’s batches, less the cost of the units that sold, less project expenses. Unsold stock is not counted as a cost yet.</span>}>
                <button type="button" aria-label="How this is calculated" className="text-ink-3 hover:text-ink">
                  <Info className="size-3.5" strokeWidth={1.8} />
                </button>
              </Tooltip>
            </p>
            <p className={cn('tabular mt-2 text-[40px] font-light leading-none tracking-[-0.03em]', f.profit >= 0 ? 'text-ink' : 'text-bad')}>{money(f.profit)}</p>
            <p className="mt-2 text-[13px] text-ink-3">
              {f.unitsSold > 0 ? `${number(f.unitsSold)} units sold so far` : 'No sales attributed yet'}
              {f.grossMargin !== null && ` · ${f.grossMargin.toFixed(1)}% gross margin`}
            </p>
          </div>
          <span className="self-start rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-[12px] text-ink-2">Estimate</span>
        </div>
        {f.uncostedBatches > 0 && (
          <div className="mx-5 mt-4 flex gap-2.5 rounded-[12px] border border-[color-mix(in_oklab,var(--warning)_30%,transparent)] bg-warn-soft p-3 text-[13px] text-ink-2 sm:mx-6">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" strokeWidth={1.7} />
            <p>
              {f.uncostedBatches} {f.uncostedBatches === 1 ? 'batch has' : 'batches have'} no final cost.{' '}
              {f.uncostedSales > 0 ? `${money(f.uncostedSales)} of its sales count with no cost, so profit reads high. ` : ''}Finish it in Product costing.
            </p>
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
          <Figure label="Net sales" value={f.netSales} hint="from this project’s batches" />
          <Figure label="Cost of units sold" value={f.cogs} sign="−" hint={`${number(f.unitsSold)} units`} />
          <Figure label="Gross profit" value={f.grossProfit} sign="=" />
          <Figure label="Project expenses" value={f.operatingExpenses} sign="−" hint={`${f.expenses.length} ${f.expenses.length === 1 ? 'expense' : 'expenses'}`} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Production investment" className={cn(panel, 'p-5 sm:p-6')}>
          <h3 className="text-[15px] font-medium text-ink">Production investment</h3>
          <p className="mt-0.5 text-[13px] text-ink-3">What was spent making or buying this project’s batches. Only the sold part is a cost of sales.</p>
          <p className="tabular mt-4 text-[26px] font-light tracking-[-0.02em] text-ink">{money(f.investment)}</p>
          <div className="mt-3 flex h-2 w-full gap-[2px]" aria-hidden>
            {f.investment > 0 && (
              <>
                <span className="h-full rounded-[3px] bg-[var(--series-1)]" style={{ width: `${soldShare}%` }} />
                <span className="h-full flex-1 rounded-[3px] bg-[var(--series-3)]" />
              </>
            )}
            {f.investment === 0 && <span className="h-full flex-1 rounded-[3px] bg-sunken" />}
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <dt className="flex items-center gap-1.5 text-ink-3">
                <span className="size-2 rounded-[2px] bg-[var(--series-1)]" /> Sold, now cost of sales
              </dt>
              <dd className="tabular mt-0.5 text-ink">{money(f.investment - f.inventoryValue)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-ink-3">
                <span className="size-2 rounded-[2px] bg-[var(--series-3)]" /> Still in stock
              </dt>
              <dd className="tabular mt-0.5 text-ink">{money(f.inventoryValue)}</dd>
            </div>
          </dl>
        </section>

        <section aria-label="Budget and target" className={cn(panel, 'flex flex-col gap-5 p-5 sm:p-6')}>
          <h3 className="text-[15px] font-medium text-ink">Budget and target</h3>
          {project.budget ? (
            <Meter
              label="Spending"
              value={f.spending}
              of={project.budget}
              percent={f.budgetUsed ?? 0}
              tone={(f.budgetUsed ?? 0) > 100 ? 'warn' : 'ink'}
              foot={(f.budgetRemaining ?? 0) >= 0 ? `${money(f.budgetRemaining ?? 0)} left · production ${money(f.investment)} + expenses ${money(f.operatingExpenses)}` : `${money(-(f.budgetRemaining ?? 0))} over budget`}
            />
          ) : (
            <p className="text-[13px] text-ink-3">
              No budget set. Spending so far is {money(f.spending)}.{' '}
              <Link to={`${base}?edit=1`} className="text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
                Set a budget
              </Link>
            </p>
          )}
          {project.revenueTarget ? (
            <Meter label="Net sales" value={f.netSales} of={project.revenueTarget} percent={f.revenueProgress ?? 0} tone="sales" foot={`${Math.round(f.revenueProgress ?? 0)}% of the target`} />
          ) : (
            <p className="text-[13px] text-ink-3">
              No revenue target.{' '}
              <Link to={`${base}?edit=1`} className="text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
                Add one
              </Link>
            </p>
          )}
        </section>
      </div>

      <section aria-label="Batches" className={panel}>
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
          <div>
            <h3 className="text-[15px] font-medium text-ink">Products and batches</h3>
            <p className="mt-0.5 text-[13px] text-ink-3">Attaching or removing a batch never changes its cost.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setPicking(picking === 'batch' ? null : 'batch')}>
            <Link2 className="size-4" strokeWidth={1.6} /> Attach batches
          </Button>
        </header>
        <div className="pt-4">
          {picking === 'batch' && (
            <Picker
              title="Batches without a project"
              items={freeBatches}
              empty="Every batch already belongs to a project."
              search={(b) => `${b.label} ${productOf(b.productId)?.name ?? ''}`}
              onClose={() => setPicking(null)}
              onPick={(b) => {
                actions.attachBatch(project.id, b)
                toast('Batch attached', `${b.label} · ${productOf(b.productId)?.name ?? ''}`)
              }}
              render={(b) => {
                const c = costBatch(b)
                return (
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] text-ink">
                      {b.label} · {productOf(b.productId)?.name}
                    </span>
                    <span className="tabular block text-[12px] text-ink-3">
                      {shortDate(b.receivedAt)} · {number(c.totalQuantity)} units · {c.unitCost === null ? 'no cost yet' : `${moneyExact(c.unitCost)} per unit`}
                    </span>
                  </span>
                )
              }}
            />
          )}
          {f.batches.length === 0 ? (
            <div className="mx-5 mb-5 rounded-[14px] border border-dashed border-line-strong px-5 py-8 text-center sm:mx-6">
              <p className="text-[14px] text-ink">No batches in this project yet</p>
              <p className="mx-auto mt-1 max-w-md text-[13px] text-ink-3">Attach batches you already have, or choose this project when you create a batch in Product costing. Sales from those batches will count here.</p>
            </div>
          ) : (
            <div className="thin-scroll overflow-x-auto px-2 pb-3 sm:px-3">
              <table className="w-full min-w-[640px] text-[13.5px]">
                <thead>
                  <tr className="text-left text-[12px] text-ink-3">
                    <th className="px-3 py-2 font-normal">Batch</th>
                    <th className="px-3 py-2 text-right font-normal">Units</th>
                    <th className="px-3 py-2 text-right font-normal">Sold</th>
                    <th className="px-3 py-2 text-right font-normal">Unit cost</th>
                    <th className="px-3 py-2 text-right font-normal">Total cost</th>
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {f.batches.map((r) => {
                    const product = productOf(r.batch.productId)
                    return (
                      <tr key={r.batch.id} className="border-t border-line-subtle">
                        <td className="px-3 py-3">
                          <Link to={`${sectionPath('costing')}/${r.batch.productId}?batch=${r.batch.id}`} className="block min-w-0 hover:underline">
                            <span className="flex flex-wrap items-center gap-2 text-ink">
                              {r.batch.label} <BatchStatusBadge status={r.batch.status} />
                            </span>
                            <span className="block text-[12px] text-ink-3">{product?.name}</span>
                          </Link>
                        </td>
                        <td className="tabular px-3 py-3 text-right text-ink">{number(r.quantity)}</td>
                        <td className="tabular px-3 py-3 text-right text-ink-2">{number(r.unitsSold)}</td>
                        <td className={cn('tabular px-3 py-3 text-right', r.unitCost === null ? 'text-warn' : 'text-ink')}>{r.unitCost === null ? 'Not final' : moneyExact(r.unitCost)}</td>
                        <td className="tabular px-3 py-3 text-right text-ink">{r.totalCost === null ? 'n/a' : money(r.totalCost)}</td>
                        <td className="px-2 py-3 text-right">
                          <button
                            type="button"
                            aria-label={`Remove ${r.batch.label} from this project`}
                            title="Remove from project"
                            onClick={() => {
                              actions.detachBatch(project.id, r.batch)
                              toast('Batch removed from project', `${r.batch.label} keeps its cost of ${r.unitCost === null ? 'n/a' : moneyExact(r.unitCost)} per unit`)
                            }}
                            className="inline-flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                          >
                            <Unlink className="size-4" strokeWidth={1.6} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-label="Project expenses" className={panel}>
          <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
            <div>
              <h3 className="text-[15px] font-medium text-ink">Project expenses</h3>
              <p className="mt-0.5 text-[13px] text-ink-3">Shoots, ads, travel and other running costs. Kept out of product unit costs.</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setPicking(picking === 'expense' ? null : 'expense')}>
                <Link2 className="size-4" strokeWidth={1.6} /> Link existing
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setPicking(picking === 'new-expense' ? null : 'new-expense')}>
                <Plus className="size-4" strokeWidth={1.6} /> Add
              </Button>
            </div>
          </header>
          <div className="pt-4">
            {picking === 'expense' && (
              <Picker
                title="Expenses without a project"
                items={freeExpenses}
                empty="Every recorded expense already belongs to a project."
                search={(e) => `${e.label} ${e.vendor ?? ''}`}
                onClose={() => setPicking(null)}
                onPick={(e) => {
                  actions.linkExpense(project.id, e)
                  toast('Expense linked', `${e.label}, ${money(e.amount)}`)
                }}
                render={(e) => (
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] text-ink">
                      {e.label}
                      {e.vendor ? ` · ${e.vendor}` : ''}
                    </span>
                    <span className="tabular block text-[12px] text-ink-3">
                      {money(e.amount)} · {categoryLabel(e.category, categories)} · {shortDate(e.at)}
                      {e.status === 'needs_review' && ' · to review'}
                    </span>
                  </span>
                )}
              />
            )}
            {picking === 'new-expense' && <AddExpenseForm project={project} data={data} onDone={() => setPicking(null)} />}
            {f.expenses.length + f.pendingExpenses.length === 0 ? (
              <div className="mx-5 mb-5 rounded-[14px] border border-dashed border-line-strong px-5 py-8 text-center sm:mx-6">
                <p className="text-[14px] text-ink">No project expenses yet</p>
                <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-3">Add the costs of running this project, such as a photoshoot or launch ads, or link ones already recorded.</p>
              </div>
            ) : (
              <ul className="flex flex-col px-3 pb-3 sm:px-4">
                {[...f.expenses, ...f.pendingExpenses]
                  .sort((a, b) => b.at.localeCompare(a.at))
                  .map((e) => {
                    const pending = e.status === 'needs_review'
                    return (
                      <li key={e.id} className="group flex items-center gap-3 rounded-[10px] px-2 py-2.5 hover:bg-panel-muted">
                        <Link to={`${sectionPath('expenses')}/${e.id}`} className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-[13.5px] text-ink group-hover:underline">{e.label}</span>
                            {pending && <span className="shrink-0 rounded-full bg-warn-soft px-2 py-0.5 text-[11.5px] text-warn">To review · not counted</span>}
                          </span>
                          <span className="block truncate text-[12px] text-ink-3">{[e.vendor, categoryLabel(e.category, categories), shortDate(e.at)].filter(Boolean).join(' · ')}</span>
                        </Link>
                        <span className={cn('tabular shrink-0 text-[13.5px]', pending ? 'text-ink-3' : 'text-ink')}>{money(e.amount)}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${e.label} from this project`}
                          title="Remove from project"
                          onClick={() => {
                            actions.unlinkExpense(e)
                            toast('Expense removed from project', 'It stays recorded in Expenses and can be linked again')
                          }}
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                        >
                          <Unlink className="size-4" strokeWidth={1.6} />
                        </button>
                      </li>
                    )
                  })}
                <li className="mt-1 flex justify-between border-t border-line-subtle px-2 pt-3 text-[13.5px]">
                  <span className="text-ink-2">Total counted</span>
                  <span className="tabular text-ink">{money(f.operatingExpenses)}</span>
                </li>
                {f.pendingExpenses.length > 0 && (
                  <li className="px-2 pt-1 text-[12px] text-ink-3">
                    {money(f.pendingExpenses.reduce((t, e) => t + e.amount, 0))} more is waiting for review in Expenses and counts once confirmed.
                  </li>
                )}
              </ul>
            )}
          </div>
        </section>

        <section aria-label="Project history" className={cn(panel, 'p-5 sm:p-6')}>
          <h3 className="text-[15px] font-medium text-ink">History</h3>
          {events.length === 0 ? (
            <p className="mt-3 text-[13px] text-ink-3">Nothing recorded yet.</p>
          ) : (
            <ol className="mt-3 flex flex-col">
              {events.slice(0, 12).map((e, i) => (
                <li key={e.id} className="relative flex gap-3 pb-3.5 last:pb-0">
                  {i < Math.min(events.length, 12) - 1 && <span className="absolute left-[3.5px] top-3 h-full w-px bg-line" aria-hidden />}
                  <span className={cn('relative mt-1.5 size-2 shrink-0 rounded-full', e.kind === 'status_changed' || e.kind === 'created' ? 'bg-ink' : 'bg-line-strong')} />
                  <span className="min-w-0">
                    <span className="block text-[13px] text-ink">{e.text}</span>
                    <time dateTime={e.at} className="block text-[12px] text-ink-3">
                      {relativeTime(e.at)}
                    </time>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
