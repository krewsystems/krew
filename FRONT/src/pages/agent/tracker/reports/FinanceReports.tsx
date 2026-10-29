import { ArrowUpRight, CalendarClock, FileText, MessageCircle, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { REPORT_KIND_LABEL } from '@/components/reports/ReportCard'
import { REPORT_TOPIC_LABEL } from '@/components/reports/labels'
import { ProductSheet } from '@/components/tracker/costing/ProductSheet'
import { sectionPath } from '@/components/tracker/sections'
import { useOverviewFigures, usePeriod, useTrackerData } from '@/components/tracker/use-tracker'
import type { Report, ReportTopic } from '@/data/types'
import { allCategories, categoryLabel, expensesByCategory, summarizeExpenses } from '@/lib/expenses'
import { money, relativeTime, shortDate } from '@/lib/format'
import { profitStatus } from '@/lib/profitability'
import { projectFinancials } from '@/lib/projects'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/krew'
import { STATEMENTS, type StatementId } from './statement-list'
import { StatementView } from './Statements'

/** One accent per report topic, from the existing palette, so a document's subject reads at a glance. */
const TOPIC_COLOR: Record<ReportTopic, string> = {
  performance: 'var(--profit)',
  profitability: 'var(--sales)',
  expenses: 'var(--agent-ads)',
  projects: 'var(--agent-store)',
  costs: 'var(--warning)',
}

type Delivery = 'all' | 'scheduled' | 'requested'

/** A report drawn as a document: a page with its subject, its key figures and a hint of the text, so it reads as a file to open. */
function ReportDocument({ report }: { report: Report }) {
  const color = report.topic ? TOPIC_COLOR[report.topic] : 'var(--text-muted)'
  return (
    <Link
      to={`/reports/${report.id}`}
      state={{ from: sectionPath('reports') }}
      className="group relative flex h-full min-h-[340px] flex-col overflow-hidden rounded-[6px_18px_6px_6px] border border-line bg-panel p-5 shadow-[var(--shadow-resting)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-line-strong hover:shadow-[var(--shadow-raised)]"
    >
      {/* Folded corner. */}
      <span aria-hidden className="absolute right-0 top-0 size-6 rounded-bl-[8px] border-b border-l border-line bg-panel-muted" />
      <span className="flex items-center gap-2 text-[11.5px] text-ink-3">
        <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
        <span className="truncate">{report.topic ? REPORT_TOPIC_LABEL[report.topic] : 'Report'}</span>
      </span>
      <h3 className="mt-3 line-clamp-2 text-[16px] font-medium leading-snug tracking-[-0.015em] text-ink">{report.title}</h3>
      <p className="mt-1 text-[12px] text-ink-3">{report.period}</p>

      <dl className="mt-4 flex flex-col gap-2 border-t border-line-subtle pt-3">
        {report.highlights.slice(0, 3).map((m) => (
          <div key={m.label} className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <dt className="truncate text-ink-3">{m.label}</dt>
            <dd className="tabular shrink-0 text-ink">
              {m.value}
              {m.change && <span className={cn('ml-1.5 text-[11px]', m.tone === 'good' ? 'text-good' : m.tone === 'bad' ? 'text-bad' : 'text-ink-3')}>{m.change}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 line-clamp-3 text-[12px] leading-relaxed text-ink-2">{report.summary}</p>
      {/* A hint of the pages behind it. */}
      <span aria-hidden className="mt-3 flex flex-col gap-1.5">
        <span className="h-1 w-full rounded-full bg-sunken" />
        <span className="h-1 w-4/5 rounded-full bg-sunken" />
        <span className="h-1 w-3/5 rounded-full bg-sunken" />
      </span>

      <span className="mt-auto flex items-center justify-between gap-2 pt-4 text-[11.5px] text-ink-3">
        <span className="rounded-full border border-line px-2 py-0.5">{report.kind === 'ad-hoc' ? 'You asked' : REPORT_KIND_LABEL[report.kind]}</span>
        <span className="tabular">
          {shortDate(report.createdAt)} · {report.sections.length} {report.sections.length === 1 ? 'section' : 'sections'}
        </span>
      </span>
    </Link>
  )
}

/** A quiet trend line for a card, drawn from the statement's own series. */
function Trend({ values }: { values: number[] }) {
  const w = 96
  const h = 32
  const min = Math.min(...values)
  const span = Math.max(...values) - min || 1
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0 overflow-visible">
      <polyline points={points} fill="none" stroke="var(--profit)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/** A live statement's card: what it covers and its headline figure for the selected period. */
function StatementCard({ id, figure, hint, warn, trend, to }: { id: StatementId; figure: string; hint: string; warn?: boolean; trend?: number[]; to: string }) {
  const def = STATEMENTS.find((s) => s.id === id)!
  const Icon = def.icon
  return (
    <Link to={to} className="group flex w-full flex-col overflow-hidden rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-raised)]">
      <div className="grain flex items-center justify-between gap-3 px-5 pb-3 pt-4" style={{ background: `color-mix(in oklab, ${def.color} 13%, var(--surface))` }}>
        <span className="inline-flex size-8 items-center justify-center rounded-[10px]" style={{ background: `color-mix(in oklab, ${def.color} 26%, var(--surface))`, color: def.color }}>
          <Icon className="size-4" strokeWidth={1.7} />
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-2">
          <span className="size-1.5 rounded-full bg-good" aria-hidden /> Live
        </span>
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
        <h3 className="text-[15px] font-medium tracking-[-0.01em] text-ink">{def.title}</h3>
        <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-3">{def.description}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div className="min-w-0">
            <p className="tabular text-[22px] font-light leading-none tracking-[-0.02em] text-ink">{figure}</p>
            <p className={cn('mt-1.5 truncate text-[12px]', warn ? 'text-warn' : 'text-ink-3')}>{hint}</p>
          </div>
          {trend && trend.length > 1 && <Trend values={trend} />}
        </div>
      </div>
    </Link>
  )
}

/**
 * Finance → Reports, in two parts:
 * - Statements: always available, built live from the records for the chosen period (P&L, expenses, margins, seasons).
 * - Reports from Tracker: documents the agent prepared on its schedule or on request. They are the shared KREW reports,
 *   opened in the shared viewer; nothing is copied.
 */
export function FinanceReports() {
  const ws = useWorkspace()
  const { itemId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { data, costs } = useTrackerData()
  const period = usePeriod(data.ledger)
  const f = useOverviewFigures(data, costs, period.period)
  const [query, setQuery] = useState('')
  const [delivery, setDelivery] = useState<Delivery>('all')
  const hire = ws.hires.find((h) => h.agentId === 'tracker')

  const reports = useMemo(() => ws.reports.filter((r) => r.agentId === 'tracker').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [ws.reports])
  const scheduled = reports.filter((r) => r.kind !== 'ad-hoc')
  const docs = reports.filter((r) => (delivery === 'all' || (delivery === 'scheduled' ? r.kind !== 'ad-hoc' : r.kind === 'ad-hoc')) && (!query || `${r.title} ${r.summary} ${r.period}`.toLowerCase().includes(query.toLowerCase())))

  // Headline figures for the statement cards, from the same calculations the statements use.
  const expenses = summarizeExpenses(data.expenses, period.period)
  const topCategory = expensesByCategory(data.expenses, period.period)[0]
  const healthy = f.products.filter((r) => profitStatus(r) === 'healthy').length
  const missing = f.products.filter((r) => profitStatus(r) === 'missing').length
  const projects = data.projects.filter((p) => p.status !== 'archived').map((p) => projectFinancials(p, data))
  const projectProfit = projects.reduce((s, p) => s + p.profit, 0)
  const statementLink = (id: StatementId) => `${sectionPath('reports')}/${id}${location.search}`

  const openStatement = STATEMENTS.find((s) => s.id === itemId)
  const [lastStatement, setLastStatement] = useState(openStatement)
  if (openStatement && openStatement !== lastStatement) setLastStatement(openStatement)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[24px] font-medium leading-tight tracking-[-0.025em] text-ink">Reports</h2>
          <p className="mt-1.5 max-w-xl text-[13.5px] text-ink-3">Statements you can open any time, and the reports Tracker prepares for you.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
          <Link to="/messages/tracker" className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink">
            <MessageCircle className="size-4" strokeWidth={1.6} /> Ask Tracker for a report
          </Link>
          <Link to="/reports" className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
            All agents’ reports <ArrowUpRight className="size-3.5" strokeWidth={1.7} />
          </Link>
        </div>
      </header>

      <section aria-label="Statements" className="flex flex-col gap-4">
        <div>
          <h3 className="text-[16px] font-medium tracking-[-0.01em] text-ink">Statements</h3>
          <p className="mt-0.5 text-[13px] text-ink-3">
            Always available, built live from your records. {f.length} days to {shortDate(period.period.to)}; change the period inside a statement.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <li className="flex">
            <StatementCard id="pnl" to={statementLink('pnl')} figure={money(f.current.netProfit)} hint={`Net profit, estimated · ${f.current.netMargin.toFixed(1)}% of net sales`} trend={f.series.map((x) => x.netProfit)} />
          </li>
          <li className="flex">
            <StatementCard
              id="expenses"
              to={statementLink('expenses')}
              figure={money(expenses.total)}
              hint={expenses.review.count ? `${expenses.review.count} entries still to review` : topCategory ? `Largest: ${categoryLabel(topCategory.category, allCategories(data.expenseCategories))}` : 'No confirmed expenses'}
              warn={expenses.review.count > 0}
            />
          </li>
          <li className="flex">
            <StatementCard id="margins" to={statementLink('margins')} figure={`${f.current.grossMargin.toFixed(1)}%`} hint={missing ? `${healthy} healthy · ${missing} without cost` : `${healthy} of ${f.products.length} products healthy`} warn={missing > 0} />
          </li>
          <li className="flex">
            <StatementCard id="seasons" to={statementLink('seasons')} figure={money(projectProfit)} hint={`Estimated profit across ${projects.length} projects`} />
          </li>
        </ul>
      </section>

      <section aria-label="Reports from Tracker" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-[16px] font-medium tracking-[-0.01em] text-ink">From Tracker</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-3">
              Prepared on its schedule or because you asked. The same reports are shared in chat.
              {hire && hire.status !== 'paused' && (
                <span className="inline-flex items-center gap-1 text-ink-2">
                  <CalendarClock className="size-3.5" strokeWidth={1.6} /> Next {relativeTime(hire.nextRunAt).toLowerCase()}
                </span>
              )}
            </p>
          </div>
          {reports.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block sm:w-52">
                <span className="sr-only">Search reports</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.7} />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search reports"
                  className="h-10 w-full rounded-[10px] border border-line bg-panel pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-3 hover:border-line-strong focus-visible:border-ink"
                />
              </label>
              <SegmentedControl
                label="Delivery"
                value={delivery}
                onValueChange={(v) => setDelivery(v as Delivery)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'scheduled', label: 'Scheduled', accessory: <span className="tabular text-[11.5px] text-ink-3">{scheduled.length}</span> },
                  { value: 'requested', label: 'You asked', accessory: <span className="tabular text-[11.5px] text-ink-3">{reports.length - scheduled.length}</span> },
                ]}
              />
            </div>
          )}
        </div>

        {reports.length === 0 ? (
          <div className="rounded-[var(--radius-surface)] border border-dashed border-line-strong bg-panel py-12">
            <EmptyState icon={<FileText size={24} />} title="No reports from Tracker yet" description={hire ? `The first one arrives ${hire.settings.schedule.toLowerCase()}. You can also ask for one in chat.` : 'Hire Tracker to receive financial reports.'} />
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[var(--radius-surface)] border border-line bg-panel px-6 py-12 text-center">
            <p className="text-[14px] text-ink">No reports match</p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setDelivery('all')
              }}
              className="text-[13px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink"
            >
              Show all reports
            </button>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {docs.map((r) => (
              <li key={r.id} className="flex">
                <div className="w-full">
                  <ReportDocument report={r} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[12px] text-ink-3">Sample data. Statements always match the Finance screens; reports are snapshots from the day Tracker wrote them. Downloads and sharing work from the report itself.</p>

      {lastStatement && (
        <ProductSheet
          open={!!openStatement}
          onClose={() => navigate(`${sectionPath('reports')}${location.search}`)}
          viewKey={itemId ?? ''}
          thumb={
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-line" style={{ background: `color-mix(in oklab, ${lastStatement.color} 16%, var(--surface))`, color: lastStatement.color }}>
              <lastStatement.icon className="size-[18px]" strokeWidth={1.6} />
            </span>
          }
          name={lastStatement.title}
          meta={`Statement · live · ${ws.brand.name}`}
        >
          <StatementView id={lastStatement.id} />
        </ProductSheet>
      )}
    </div>
  )
}
