import { ArrowUpRight, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { useAgentView } from '@/components/agent/use-agent'
import type { Report } from '@/data/types'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const KIND: Record<Report['kind'], string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', 'ad-hoc': 'On request' }

/** Compact report preview used inside feed posts and chat messages: a document, not a card of stats. */
export function ReportPreview({ report, className }: { report: Report; className?: string }) {
  const agent = useAgentView(report.agentId)
  return (
    <Link
      to={`/reports/${report.id}`}
      className={cn(
        'group block overflow-hidden rounded-[12px] border border-line bg-panel-muted transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-[var(--shadow-raised)]',
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-line-subtle px-4 py-3">
        <span className="inline-flex size-8 items-center justify-center rounded-[8px] border border-line bg-panel text-ink-2">
          <FileText className="size-4" strokeWidth={1.6} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-ink">{report.title}</p>
          <p className="truncate text-[12px] text-ink-3">
            {KIND[report.kind]} · {report.period} · by {agent.displayName}
          </p>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" strokeWidth={1.75} />
      </div>
      <dl className="grid grid-cols-2 gap-px bg-line-subtle sm:grid-cols-4">
        {report.highlights.slice(0, 4).map((m) => (
          <div key={m.label} className="bg-panel-muted px-4 py-2.5">
            <dt className="truncate text-[11.5px] text-ink-3">{m.label}</dt>
            <dd className="tabular mt-0.5 flex items-baseline gap-1.5 text-[15px] text-ink">
              {m.value}
              {m.change && <span className={cn('text-[11.5px]', m.tone === 'good' ? 'text-good' : m.tone === 'bad' ? 'text-bad' : 'text-ink-3')}>{m.change}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </Link>
  )
}

/** Row used in report lists. */
export function ReportRow({ report }: { report: Report }) {
  const agent = useAgentView(report.agentId)
  return (
    <Link to={`/reports/${report.id}`} className="group flex items-center gap-3 rounded-[10px] px-2 py-2.5 transition-colors hover:bg-sunken">
      <AgentAvatar agentId={report.agentId} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] text-ink">{report.title}</p>
        <p className="truncate text-[12px] text-ink-3">
          {agent.displayName} · {report.period}
        </p>
      </div>
      <span className="shrink-0 text-[12px] text-ink-3">{relativeTime(report.createdAt)}</span>
    </Link>
  )
}

export { KIND as REPORT_KIND_LABEL }
