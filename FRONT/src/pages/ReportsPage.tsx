import { CalendarClock, Download, FileText, MessageCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/arc/breadcrumb/breadcrumb'
import { Button } from '@/components/arc/button/button'
import { ChipGroup } from '@/components/arc/chip-group/chip-group'
import { CopyButton } from '@/components/arc/copy-button/copy-button'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { useAgentResolver } from '@/components/agent/use-agent'
import { Page, PageHeader, Panel } from '@/components/common/Panel'
import { MetricStrip } from '@/components/feed/FeedPost'
import { REPORT_KIND_LABEL, ReportPreview } from '@/components/reports/ReportCard'
import { AnimatedBook } from '@/components/ui/animated-book'
import { DocsToc } from '@/components/ui/table-of-content'
import type { Report } from '@/data/types'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/krew'
import { toast } from '@/store/toasts'

/** A report summary drawn as the book's inner page, so the cover opens onto the actual report. */
function reportPage(report: Report, brand: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const lines = report.highlights
    .slice(0, 3)
    .map((h, i) => `<text x="36" y="${210 + i * 52}" font-size="13" fill="#737373">${esc(h.label)}</text><text x="36" y="${232 + i * 52}" font-size="20" fill="#171717">${esc(h.value)}</text>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" font-family="Helvetica Neue, Helvetica, Arial"><rect width="300" height="400" fill="#fafafa"/><text x="36" y="64" font-size="12" fill="#737373">${esc(brand)}</text><text x="36" y="104" font-size="22" fill="#171717">${esc(report.title)}</text><text x="36" y="128" font-size="12" fill="#737373">${esc(report.period)}</text><line x1="36" y1="160" x2="264" y2="160" stroke="#e5e5e5"/>${lines}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function ReportsPage() {
  const ws = useWorkspace()
  const resolve = useAgentResolver()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const kind = params.get('kind') ?? 'all'
  const [agents, setAgents] = useState<string[]>([])
  const sorted = useMemo(() => [...ws.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [ws.reports])
  const featured = sorted.find((r) => r.agentId === 'manager') ?? sorted[0]
  const list = sorted.filter((r) => (kind === 'all' || r.kind === kind) && (agents.length === 0 || agents.includes(r.agentId)))
  const authors = [...new Set(ws.reports.map((r) => r.agentId))]
  const upcoming = ws.hires.filter((h) => h.status === 'active').sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt))

  return (
    <Page wide>
      <PageHeader title="Reports" description="Every scheduled and on-request report your agents produced, in one library." />

      {featured && (
        <div className="mb-8 grid gap-4 lg:grid-cols-12">
          <section className="flex flex-col items-center gap-6 rounded-[var(--radius-surface)] border border-line bg-panel p-6 shadow-[var(--shadow-resting)] sm:flex-row lg:col-span-7">
            <AnimatedBook className="w-36 shrink-0" aria-label={`Preview ${featured.title}`} coverImage={reportPage(featured, ws.brand.name)} coverImageAlt={featured.summary} pageCount={5} onClick={() => navigate(`/reports/${featured.id}`)} />
            <div className="min-w-0">
              <p className="text-[12.5px] text-ink-3">
                Latest from {resolve(featured.agentId).displayName} · {relativeTime(featured.createdAt)}
              </p>
              <h2 className="mt-1.5 text-[21px] font-medium tracking-[-0.02em] text-ink">{featured.title}</h2>
              <p className="mt-1 text-[13px] text-ink-3">{featured.period}</p>
              <p className="mt-3 max-w-[48ch] text-[14px] leading-relaxed text-ink-2">{featured.summary}</p>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => navigate(`/reports/${featured.id}`)}>Read report</Button>
                <Button variant="ghost" onClick={() => navigate(`/messages/${featured.agentId}`)}>
                  Ask about it
                </Button>
              </div>
            </div>
          </section>
          <Panel title="Coming up" icon={<CalendarClock />} description="Next scheduled reports" className="lg:col-span-5" bodyClassName="px-3 pb-3">
            <ul>
              {upcoming.slice(0, 5).map((h) => (
                <li key={h.agentId} className="flex items-center gap-3 rounded-[10px] px-2 py-2">
                  <AgentAvatar agentId={h.agentId} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] text-ink">{resolve(h.agentId).displayName}</p>
                    <p className="truncate text-[12px] text-ink-3">{h.settings.schedule}</p>
                  </div>
                  <span className="shrink-0 text-[12px] text-ink-2">{relativeTime(h.nextRunAt)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
        <ChipGroup label="Filter by agent" value={agents} onValueChange={setAgents} options={authors.map((a) => ({ value: a, label: resolve(a).displayName }))} />
      </div>

      {list.length === 0 ? (
        <div className="rounded-[var(--radius-surface)] border border-line bg-panel py-10">
          <EmptyState icon={<FileText size={24} />} title="No reports match" description="Try another type or clear the agent filter." action={<Button variant="secondary" onClick={() => { navigate('/reports'); setAgents([]) }}>Clear filters</Button>} />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((r) => (
            <ReportPreview key={r.id} report={r} />
          ))}
        </div>
      )}
    </Page>
  )
}

export function ReportDetailPage() {
  const { reportId } = useParams()
  const ws = useWorkspace()
  const resolve = useAgentResolver()
  const navigate = useNavigate()
  const report = ws.reports.find((r) => r.id === reportId)
  // Opened from Finance → Reports: the breadcrumb leads back there instead of the library.
  const from = (useLocation().state as { from?: string } | null)?.from
  const back = from ? { label: 'Finance reports', href: from } : { label: 'Reports', href: '/reports' }

  if (!report) {
    return (
      <Page>
        <div className="mt-16">
          <EmptyState icon={<FileText size={24} />} title="Report not found" description="It may belong to another brand workspace." action={<Button variant="secondary" onClick={() => navigate('/reports')}>All reports</Button>} />
        </div>
      </Page>
    )
  }
  const agent = resolve(report.agentId)

  return (
    <Page wide>
      <div className="mb-5">
        <Breadcrumb items={[back, { label: report.title }]} />
      </div>
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_240px]">
        <article className="min-w-0 rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]">
          <header className="border-b border-line-subtle p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-ink-2">
              <AgentAvatar agentId={report.agentId} size="sm" />
              {agent.displayName} · {REPORT_KIND_LABEL[report.kind]} report · generated {relativeTime(report.createdAt)}
            </div>
            <h1 className="mt-4 text-[30px] font-medium leading-tight tracking-[-0.025em] text-ink">{report.title}</h1>
            <p className="mt-1 text-[14px] text-ink-3">
              {ws.brand.name} · {report.period}
            </p>
            <p className="mt-4 max-w-[64ch] text-[15.5px] leading-relaxed text-ink-2">{report.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigate(`/messages/${report.agentId}`)}>
                <MessageCircle className="size-4" strokeWidth={1.6} /> Ask {agent.displayName.replace(' Agent', '')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toast('PDF export is simulated', 'In production the report downloads as a branded PDF.')}>
                <Download className="size-4" strokeWidth={1.6} /> Download PDF
              </Button>
              <CopyButton value={window.location.href} label="Copy link" />
            </div>
          </header>
          <div className="p-6 sm:p-8">
            <h2 id="highlights" data-toc="2" className="sr-only">
              Highlights
            </h2>
            <MetricStrip metrics={report.highlights} />
            <div className="mt-8 flex flex-col gap-9">
              {report.sections.map((s) => (
                <section key={s.id}>
                  <h2 id={s.id} data-toc="2" className="scroll-mt-24 text-[18px] font-medium tracking-[-0.015em] text-ink">
                    {s.title}
                  </h2>
                  <p className="mt-2 max-w-[70ch] text-[14.5px] leading-relaxed text-ink-2">{s.body}</p>
                  {s.metrics && (
                    <div className="mt-4 max-w-xl">
                      <MetricStrip metrics={s.metrics} />
                    </div>
                  )}
                  {s.bullets && (
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex gap-2.5 text-[14px] text-ink-2">
                          <span className="mt-2 size-1 shrink-0 rounded-full bg-ink" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
            <p className={cn('mt-10 border-t border-line-subtle pt-4 text-[12px] text-ink-3')}>Prepared by {agent.displayName} from simulated store data. Figures will reconcile with your live sources after onboarding.</p>
          </div>
        </article>
        <aside className="hidden xl:block">
          <div className="sticky top-24">
            <DocsToc />
          </div>
        </aside>
      </div>
    </Page>
  )
}
