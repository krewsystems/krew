import { Bookmark, ChevronDown, Link2, MessageCircle, MoreHorizontal } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApprovalActions, ImpactBadge } from '@/components/approvals/ApprovalActions'
import { Sparkline } from '@/components/arc/sparkline/sparkline'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { useAgentResolver, useAgentView } from '@/components/agent/use-agent'
import { HatchedBars } from '@/components/common/HatchedBars'
import { ReportPreview } from '@/components/reports/ReportCard'
import type { FeedPost as Post, PostEmbed } from '@/data/types'
import { clockTime, relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useKrew, useWorkspace } from '@/store/krew'
import { toast } from '@/store/toasts'
import { POST_TYPES } from './post-meta'

export function MetricStrip({ metrics }: { metrics: { label: string; value: string; change?: string; tone?: 'good' | 'bad' | 'neutral' }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line-subtle bg-line-subtle sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]" style={{ ['--cols' as string]: Math.min(metrics.length, 4) }}>
      {metrics.map((m) => (
        <div key={m.label} className="min-w-0 bg-panel px-3.5 py-2.5">
          <dt className="truncate text-[11.5px] text-ink-3">{m.label}</dt>
          <dd className="tabular mt-0.5 flex items-baseline gap-1.5 text-[17px] tracking-[-0.01em] text-ink">
            {m.value}
            {m.change && <span className={cn('text-[11.5px]', m.tone === 'good' ? 'text-good' : m.tone === 'bad' ? 'text-bad' : 'text-ink-3')}>{m.change}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function ApprovalInline({ approvalId }: { approvalId: string }) {
  const ws = useWorkspace()
  const approval = ws.approvals.find((a) => a.id === approvalId)
  if (!approval) return null
  return (
    <div className={cn('rounded-[12px] border p-4', approval.status === 'pending' ? 'border-ink/15 bg-panel-muted' : 'border-line bg-panel-muted')}>
      <div className="flex flex-wrap items-center gap-2">
        <ImpactBadge impact={approval.impact} />
        <span className="text-[12px] text-ink-3">{approval.channel}</span>
      </div>
      <Link to={`/approvals/${approval.id}`} className="mt-2 block text-[14.5px] font-medium text-ink hover:underline hover:decoration-line-strong hover:underline-offset-4">
        {approval.title}
      </Link>
      <p className="mt-1 text-[13px] text-ink-2">{approval.estimate}</p>
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <ApprovalActions approval={approval} size="sm" />
        <Link to={`/approvals/${approval.id}`} className="text-[12.5px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
          Review details
        </Link>
      </div>
    </div>
  )
}

function Embed({ embed }: { embed: PostEmbed }) {
  const ws = useWorkspace()
  switch (embed.kind) {
    case 'insight':
      return (
        <div className="flex flex-col gap-3">
          <MetricStrip metrics={embed.metrics} />
          {embed.series && (
            <div className="rounded-[10px] border border-line-subtle bg-panel px-3.5 pb-1 pt-3 [&_figure]:w-full">
              <Sparkline label={embed.seriesLabel ?? embed.headline} data={embed.series} width={560} height={64} value={String(embed.series[embed.series.length - 1])} change={embed.seriesLabel} />
            </div>
          )}
        </div>
      )
    case 'report': {
      const report = ws.reports.find((r) => r.id === embed.reportId)
      return report ? <ReportPreview report={report} /> : null
    }
    case 'approval':
      return <ApprovalInline approvalId={embed.approvalId} />
    case 'collab':
      return <CollabEmbed embed={embed} />
    case 'checklist':
      return (
        <ul className="flex flex-col divide-y divide-line-subtle overflow-hidden rounded-[10px] border border-line-subtle bg-panel">
          {embed.items.map((i) => (
            <li key={i.label} className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px]">
              <span className={cn('inline-flex size-4 items-center justify-center rounded-full border', i.done ? 'border-ink bg-inverse text-ink-inverse' : 'border-line-strong')}>
                {i.done && (
                  <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
                    <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={i.done ? 'text-ink-2' : 'text-ink'}>{i.label}</span>
            </li>
          ))}
        </ul>
      )
    case 'bars':
      return (
        <div className="rounded-[10px] border border-line-subtle bg-panel px-4 pb-3 pt-3.5">
          <p className="mb-4 text-[12.5px] text-ink-2">{embed.title}</p>
          <HatchedBars bars={embed.bars} unit={embed.unit === '%' ? '%' : embed.unit} unitPosition={embed.unit === '%' ? 'suffix' : 'prefix'} height={110} legend={embed.bars.some((b) => b.prev !== undefined) ? ['Now', 'Before'] : undefined} />
        </div>
      )
  }
}

function CollabEmbed({ embed }: { embed: Extract<PostEmbed, { kind: 'collab' }> }) {
  const from = useAgentView(embed.fromAgentId)
  return (
    <div className="overflow-hidden rounded-[12px] border border-line-subtle bg-panel">
      <div className="flex gap-3 border-b border-line-subtle bg-panel-muted px-4 py-3">
        <AgentAvatar agentId={embed.fromAgentId} size="sm" />
        <div className="min-w-0">
          <p className="text-[12px] text-ink-3">{from.displayName} reported</p>
          <p className="mt-0.5 text-[13.5px] leading-snug text-ink-2">“{embed.quote}”</p>
        </div>
      </div>
      <ul className="flex flex-col gap-1.5 px-4 py-3">
        {embed.points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-[13px] text-ink">
            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface FeedPostProps {
  post: Post
  variant?: 'full' | 'compact'
  onOpen?: (post: Post) => void
}

export function FeedPost({ post, variant = 'full', onOpen }: FeedPostProps) {
  const agent = useAgentView(post.agentId)
  const resolve = useAgentResolver()
  const toggleSave = useKrew((s) => s.toggleSave)
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const type = POST_TYPES[post.type]
  const TypeIcon = type.icon
  const firstName = agent.displayName.replace(' Agent', '').replace('KREW ', '')

  if (variant === 'compact') {
    return (
      <button type="button" onClick={() => (onOpen ? onOpen(post) : navigate(`/feed#${post.id}`))} className="group flex w-full gap-3 rounded-[10px] px-2 py-2.5 text-left transition-colors hover:bg-sunken">
        <AgentAvatar agentId={post.agentId} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
            <span className="text-ink-2">{agent.displayName}</span>· {relativeTime(post.createdAt)}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[13.5px] leading-snug text-ink">{post.title}</p>
        </div>
        <TypeIcon className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.6} />
      </button>
    )
  }

  return (
    <article id={post.id} className="scroll-mt-24 rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]">
      <header className="flex items-start gap-3 px-5 pt-5">
        <Link to={`/krew/${post.agentId}`} className="shrink-0" aria-label={`Open ${agent.displayName}`}>
          <AgentAvatar agentId={post.agentId} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 text-[13.5px]">
            <Link to={`/krew/${post.agentId}`} className="font-medium text-ink hover:underline hover:underline-offset-4">
              {agent.displayName}
            </Link>
            {post.with && post.with.length > 0 && (
              <span className="text-ink-3">
                with{' '}
                {post.with.map((id, i) => (
                  <span key={id}>
                    <Link to={`/krew/${id}`} className="text-ink-2 hover:text-ink">
                      {resolve(id).displayName}
                    </Link>
                    {i < post.with!.length - 1 ? (i === post.with!.length - 2 ? ' and ' : ', ') : ''}
                  </span>
                ))}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-3" title={new Date(post.createdAt).toLocaleString()}>
            {agent.role} · {relativeTime(post.createdAt)} at {clockTime(post.createdAt)}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px]',
            post.type === 'alert' ? 'border-[color-mix(in_oklab,var(--warning)_35%,var(--border))] bg-warn-soft text-ink' : post.type === 'approval' ? 'border-ink bg-inverse text-ink-inverse' : 'border-line text-ink-2',
          )}
        >
          <TypeIcon className="size-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">{type.label}</span>
        </span>
      </header>

      <div className="px-5 pt-3.5">
        <h3 className="text-[16.5px] font-medium leading-snug tracking-[-0.015em] text-ink">{post.title}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{post.body}</p>
        {post.details && (
          <>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 40 }}
                  className="overflow-hidden"
                >
                  <ul className="mt-3 flex flex-col gap-1.5 border-l border-line pl-3.5">
                    {post.details.map((d) => (
                      <li key={d} className="text-[13.5px] text-ink-2">
                        {d}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
            <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-ink-2 hover:text-ink" aria-expanded={expanded}>
              {expanded ? 'Hide details' : `Show ${post.details.length} details`}
              <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} strokeWidth={1.75} />
            </button>
          </>
        )}
      </div>

      {post.embed && (
        <div className="px-5 pt-4">
          <Embed embed={post.embed} />
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-1 border-t border-line-subtle px-3 py-2">
        <button
          type="button"
          onClick={() => navigate(`/messages/${post.agentId}?post=${post.id}`)}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
        >
          <MessageCircle className="size-4" strokeWidth={1.6} />
          Ask {firstName}
        </button>
        <button
          type="button"
          onClick={() => {
            toggleSave(post.id)
            toast(post.saved ? 'Removed from saved' : 'Saved', post.saved ? undefined : 'Find it under Saved in the feed.')
          }}
          aria-pressed={post.saved}
          className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors hover:bg-sunken', post.saved ? 'text-ink' : 'text-ink-2 hover:text-ink')}
        >
          <Bookmark className={cn('size-4', post.saved && 'fill-current')} strokeWidth={1.6} />
          {post.saved ? 'Saved' : 'Save'}
        </button>
        {onOpen && (
          <button type="button" onClick={() => onOpen(post)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] text-ink-2 transition-colors hover:bg-sunken hover:text-ink">
            <MoreHorizontal className="size-4" strokeWidth={1.6} />
            Details
          </button>
        )}
        {post.source && (
          <span className="ml-auto hidden items-center gap-1.5 truncate px-2 text-[12px] text-ink-3 sm:inline-flex">
            <Link2 className="size-3.5 shrink-0" strokeWidth={1.6} />
            <span className="truncate">{post.source}</span>
          </span>
        )}
      </footer>
    </article>
  )
}
