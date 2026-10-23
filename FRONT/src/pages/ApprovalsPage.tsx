import { ArrowLeft, CircleCheckBig, Clock3, MessageCircle, ShieldCheck, Zap } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/arc/button/button'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { SortableDataTable } from '@/components/arc/sortable-data-table/sortable-data-table'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { useAgentResolver } from '@/components/agent/use-agent'
import { ApprovalActions, DecisionBadge, ImpactBadge } from '@/components/approvals/ApprovalActions'
import { Page, PageHeader } from '@/components/common/Panel'
import { FeedPost, MetricStrip } from '@/components/feed/FeedPost'
import type { Approval } from '@/data/types'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/krew'

function ApprovalListItem({ approval, active }: { approval: Approval; active: boolean }) {
  const resolve = useAgentResolver()
  return (
    <Link
      to={`/approvals/${approval.id}`}
      className={cn(
        'block rounded-[14px] border p-4 transition-[border-color,box-shadow,background-color]',
        active ? 'border-ink/25 bg-panel shadow-[var(--shadow-raised)]' : 'border-line bg-panel hover:border-line-strong',
      )}
    >
      <div className="flex items-center gap-2.5">
        <AgentAvatar agentId={approval.agentId} size="sm" />
        <span className="truncate text-[12.5px] text-ink-2">{resolve(approval.agentId).displayName}</span>
        <span className="ml-auto shrink-0 text-[12px] text-ink-3">{relativeTime(approval.createdAt)}</span>
      </div>
      <p className="mt-2.5 text-[14px] font-medium leading-snug text-ink">{approval.title}</p>
      <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{approval.estimate}</p>
      <div className="mt-3 flex items-center gap-2">
        <ImpactBadge impact={approval.impact} />
        <span className="truncate text-[12px] text-ink-3">{approval.channel}</span>
      </div>
    </Link>
  )
}

function ApprovalDetail({ approval }: { approval: Approval }) {
  const ws = useWorkspace()
  const resolve = useAgentResolver()
  const navigate = useNavigate()
  const agent = resolve(approval.agentId)
  const task = ws.tasks.find((t) => t.id === approval.linkedTaskId || t.linkedApprovalId === approval.id)
  const related = ws.posts.filter((p) => (approval.scenario && p.scenario === approval.scenario) || (p.embed?.kind === 'approval' && p.embed.approvalId === approval.id)).slice(0, 5)

  return (
    <motion.article key={approval.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 38 }} className="flex min-w-0 flex-col rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]">
      <div className="border-b border-line-subtle p-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <AgentAvatar agentId={approval.agentId} size="sm" />
          <span className="text-[13px] text-ink-2">
            Requested by <Link to={`/krew/${approval.agentId}`} className="text-ink hover:underline hover:underline-offset-4">{agent.displayName}</Link> · {relativeTime(approval.createdAt)}
          </span>
          <span className="ml-auto">
            <DecisionBadge approval={approval} />
          </span>
        </div>
        <h2 className="mt-4 text-[22px] font-medium leading-tight tracking-[-0.02em] text-ink">{approval.title}</h2>
        <p className="mt-2 max-w-[68ch] text-[14.5px] leading-relaxed text-ink-2">{approval.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ImpactBadge impact={approval.impact} />
          <span className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-2">{approval.channel}</span>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-6">
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-[13px] font-medium text-ink">
            <Zap className="size-4 text-ink-3" strokeWidth={1.6} /> What happens if you approve
          </h3>
          <p className="rounded-[12px] border border-line bg-panel-muted px-4 py-3 text-[14px] text-ink">{approval.action}</p>
        </section>

        {approval.preview && (
          <section>
            <h3 className="mb-2 text-[13px] font-medium text-ink">Preview</h3>
            <div className="flex flex-col gap-2">
              {approval.preview.map((p) => (
                <div key={p.label} className="rounded-[12px] border border-line-subtle bg-panel-muted p-3.5">
                  <p className="text-[12px] text-ink-3">{p.label}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{p.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {approval.evidence.length > 0 && (
          <section>
            <h3 className="mb-2 text-[13px] font-medium text-ink">Why {agent.displayName.replace(' Agent', '')} recommends it</h3>
            <MetricStrip metrics={approval.evidence} />
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[12px] border border-line-subtle p-4">
            <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
              <CircleCheckBig className="size-3.5" strokeWidth={1.75} /> Expected result
            </p>
            <p className="mt-1.5 text-[13.5px] text-ink">{approval.estimate}</p>
          </div>
          <div className="rounded-[12px] border border-line-subtle p-4">
            <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
              <ShieldCheck className="size-3.5" strokeWidth={1.75} /> Risk
            </p>
            <p className="mt-1.5 text-[13.5px] text-ink">{approval.risk}</p>
          </div>
        </section>

        {task && (
          <section className="flex items-center gap-3 rounded-[12px] border border-line-subtle px-4 py-3">
            <Clock3 className="size-4 text-ink-3" strokeWidth={1.6} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] text-ink">{task.title}</p>
              <p className="text-[12px] text-ink-3">Linked task · {task.status === 'waiting' ? 'Waiting for your decision' : task.status === 'done' ? 'Done' : task.status === 'in_progress' ? 'In progress' : 'To do'}</p>
            </div>
            <Link to={`/krew/${task.agentId}/tasks`} className="text-[12.5px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
              View
            </Link>
          </section>
        )}

        {approval.decisionNote && (
          <section className="rounded-[12px] border border-line bg-panel-muted px-4 py-3">
            <p className="text-[12px] text-ink-3">Your note</p>
            <p className="mt-1 text-[13.5px] text-ink">“{approval.decisionNote}”</p>
          </section>
        )}

        {related.length > 0 && (
          <section>
            <h3 className="mb-1 text-[13px] font-medium text-ink">Related activity</h3>
            <div className="-mx-2 flex flex-col">
              {related.map((p) => (
                <FeedPost key={p.id} post={p} variant="compact" onOpen={() => navigate(`/feed#${p.id}`)} />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-wrap items-center gap-3 rounded-b-[var(--radius-surface)] border-t border-line bg-panel/95 px-6 py-4 backdrop-blur">
        <ApprovalActions approval={approval} />
        <Button variant="ghost" className="ml-auto" onClick={() => navigate(`/messages/${approval.agentId}`)}>
          <MessageCircle className="size-4" strokeWidth={1.6} />
          Ask a question
        </Button>
      </div>
    </motion.article>
  )
}

export function ApprovalsPage() {
  const ws = useWorkspace()
  const resolve = useAgentResolver()
  const navigate = useNavigate()
  const { approvalId } = useParams()
  const pending = ws.approvals.filter((a) => a.status === 'pending')
  const history = ws.approvals.filter((a) => a.status !== 'pending').sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''))
  const routed = ws.approvals.find((a) => a.id === approvalId)
  const [params] = useSearchParams()
  const view: 'pending' | 'history' = params.get('view') === 'history' || (routed && routed.status !== 'pending' && !params.get('view')) ? 'history' : 'pending'
  const setView = (v: 'pending' | 'history') => navigate(v === 'history' ? '/approvals?view=history' : '/approvals')

  const selected = routed ?? (view === 'pending' ? pending[0] : undefined)

  return (
    <Page wide>
      <PageHeader
        title="Approvals"
        description="Nothing that touches your store, ads or customers happens without you. Review what your agents propose."
      />

      {view === 'pending' ? (
        pending.length === 0 && !routed ? (
          <div className="rounded-[var(--radius-surface)] border border-line bg-panel py-12">
            <EmptyState icon={<ShieldCheck size={24} />} title="All decisions made" description="Your agents will post here when something needs your approval. You’ll also get a Telegram message." action={<Button variant="secondary" onClick={() => setView('history')}>See history</Button>} />
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className={cn('flex flex-col gap-3', approvalId && 'hidden lg:flex')}>
              <AnimatePresence initial={false}>
                {pending.map((a) => (
                  <motion.div key={a.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0, marginTop: -12 }}>
                    <ApprovalListItem approval={a} active={a.id === selected?.id} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {pending.length === 0 && <p className="rounded-[14px] border border-dashed border-line-strong p-4 text-[13px] text-ink-3">No more decisions waiting.</p>}
            </div>
            <div className={cn('min-w-0', !approvalId && 'hidden lg:block')}>
              {approvalId && (
                <button type="button" onClick={() => navigate('/approvals')} className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink lg:hidden">
                  <ArrowLeft className="size-4" strokeWidth={1.75} /> All approvals
                </button>
              )}
              {selected && <ApprovalDetail approval={selected} />}
            </div>
          </div>
        )
      ) : routed ? (
        <div className="mx-auto max-w-3xl">
          <button type="button" onClick={() => navigate('/approvals')} className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
            <ArrowLeft className="size-4" strokeWidth={1.75} /> Decision history
          </button>
          <ApprovalDetail approval={routed} />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-surface)] border border-line bg-panel p-2 shadow-[var(--shadow-resting)]">
          <SortableDataTable
            caption="Decision history"
            rowKey="id"
            rows={history.map((a) => ({
              id: a.id,
              title: a.title,
              agent: resolve(a.agentId).displayName,
              decision: a.status === 'approved' ? 'Approved' : 'Rejected',
              impact: a.impact,
              decided: a.decidedAt ?? '',
              note: a.decisionNote ?? '',
            }))}
            defaultSort={{ key: 'decided', direction: 'desc' }}
            itemName={{ one: 'decision', other: 'decisions' }}
            columns={[
              {
                key: 'title',
                label: 'Proposal',
                render: (v, row) => (
                  <Link to={`/approvals/${row.id}`} className="text-ink hover:underline hover:underline-offset-4">
                    {String(v)}
                  </Link>
                ),
              },
              { key: 'agent', label: 'Agent' },
              { key: 'decision', label: 'Decision', render: (v) => <span className={v === 'Approved' ? 'text-good' : 'text-ink-2'}>{String(v)}</span> },
              { key: 'impact', label: 'Impact', render: (v) => <span className="capitalize">{String(v)}</span> },
              { key: 'decided', label: 'Decided', render: (v) => relativeTime(String(v)) },
              { key: 'note', label: 'Note', sortable: false, render: (v) => <span className="text-ink-3">{String(v) || '·'}</span> },
            ]}
          />
        </div>
      )}
    </Page>
  )
}
