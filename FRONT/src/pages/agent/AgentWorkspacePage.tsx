import { CalendarClock, Clock, MessageCircle, Pause, Play, Settings2 } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/arc/breadcrumb/breadcrumb'
import { Button } from '@/components/arc/button/button'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { Timeline } from '@/components/arc/timeline/timeline'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { AgentSettingsForm } from '@/components/agent/AgentSettingsForm'
import { AgentStatus } from '@/components/agent/AgentStatus'
import { useAgentView } from '@/components/agent/use-agent'
import { Page, Panel } from '@/components/common/Panel'
import { FeedPost } from '@/components/feed/FeedPost'
import { POST_TYPES } from '@/components/feed/post-meta'
import { ReportPreview } from '@/components/reports/ReportCard'
import { SlidingPanel } from '@/components/ui/sliding-panel'
import { moduleData } from '@/data/modules'
import type { Metric, WorkspaceData } from '@/data/types'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useKrew, useWorkspace } from '@/store/krew'
import { toast } from '@/store/toasts'
import { AgentModule } from './modules'
import { STATUS_LABEL, TasksBoard } from './TasksBoard'

type Tab = 'overview' | 'workspace' | 'tasks' | 'reports' | 'history' | 'settings'
const TABS: Tab[] = ['overview', 'workspace', 'tasks', 'reports', 'history', 'settings']

function agentStats(agentId: string, ws: WorkspaceData): Metric[] {
  const d = moduleData(ws.id)
  const hire = ws.hires.find((h) => h.agentId === agentId)
  const tasksOpen = ws.tasks.filter((t) => t.agentId === agentId && t.status !== 'done').length
  const posts = ws.posts.filter((p) => p.agentId === agentId).length
  const head: Metric = hire ? { label: hire.kpi.label, value: hire.kpi.value, change: hire.kpi.change, tone: hire.kpi.trend === 'up' ? 'good' : hire.kpi.trend === 'down' ? 'bad' : 'neutral' } : { label: 'Status', value: '·' }
  switch (agentId) {
    case 'luna':
      return [head, { label: 'Sentiment score', value: String(d.luna.sentiment), change: '+3', tone: 'good' }, { label: 'Open complaints', value: String(ws.kpis.openIssues), change: ws.kpis.openIssuesChange, tone: ws.kpis.openIssuesChange.startsWith('+') ? 'bad' : 'good' }, { label: 'Insights this week', value: String(posts) }]
    case 'tracker':
      return [head, { label: 'Revenue, 7 days', value: `$${(ws.kpis.revenue / 1000).toFixed(1)}K`, change: ws.kpis.revenueChange, tone: 'good' }, { label: 'Reports delivered', value: String(ws.reports.filter((r) => r.agentId === 'tracker').length) }, { label: 'Open tasks', value: String(tasksOpen) }]
    case 'ads':
      return [head, { label: 'Spend, 7 days', value: ws.id === 'noor' ? '$5.3K' : '$21.6K' }, { label: 'Ad sets watched', value: String(d.ads.campaigns.length) }, { label: 'Waiting for you', value: String(ws.approvals.filter((a) => a.agentId === 'ads' && a.status === 'pending').length) }]
    case 'retention':
      return [head, { label: 'At-risk customers', value: '312', change: '-4%', tone: 'good' }, { label: 'Campaigns drafted', value: String(d.retention.drafts.length) }, { label: 'Waiting for you', value: String(ws.approvals.filter((a) => a.agentId === 'retention' && a.status === 'pending').length) }]
    default:
      return [head, { label: 'Updates posted', value: String(posts) }, { label: 'Open tasks', value: String(tasksOpen) }, { label: 'Reports', value: String(ws.reports.filter((r) => r.agentId === agentId).length) }]
  }
}

export function AgentWorkspacePage() {
  const { agentId = '', tab } = useParams()
  const navigate = useNavigate()
  const ws = useWorkspace()
  const agent = useAgentView(agentId)
  const setStatus = useKrew((s) => s.setHireStatus)
  const hire = agent.hire
  const active: Tab = TABS.includes(tab as Tab) ? (tab as Tab) : 'overview'
  const prevIndex = useRef(TABS.indexOf(active))
  const direction = TABS.indexOf(active) >= prevIndex.current ? 1 : -1
  prevIndex.current = TABS.indexOf(active)

  const posts = useMemo(() => ws.posts.filter((p) => p.agentId === agentId || p.with?.includes(agentId)), [ws.posts, agentId])
  const reports = ws.reports.filter((r) => r.agentId === agentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const approvals = ws.approvals.filter((a) => a.agentId === agentId)
  const tasks = ws.tasks.filter((t) => t.agentId === agentId)

  if (!hire) {
    return (
      <Page>
        <div className="mt-16">
          <EmptyState
            title={`${agent.name} isn’t on your team`}
            description="Hire this agent from the marketplace to open their workspace."
            action={<Button onClick={() => navigate(`/marketplace/${agentId}`)}>View in marketplace</Button>}
          />
        </div>
      </Page>
    )
  }

  const stats = agentStats(agentId, ws)

  return (
    <Page wide>
      <div className="mb-5">
        <Breadcrumb items={[{ label: 'My Krew', href: '/krew' }, { label: agent.displayName }]} />
      </div>

      <header className="relative overflow-hidden rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]">
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: `color-mix(in oklab, ${agent.color} 55%, transparent)` }} aria-hidden />
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-5">
            <AgentAvatar agentId={agentId} size="xl" showStatus />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-[26px] font-medium tracking-[-0.025em] text-ink">{agent.displayName}</h1>
                <AgentStatus status={hire.status} />
              </div>
              <p className="mt-0.5 text-[14px] text-ink-2">
                {agent.role} · {agent.tagline}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink-3">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" strokeWidth={1.6} /> Last active {relativeTime(hire.lastActiveAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" strokeWidth={1.6} /> {hire.status === 'paused' ? 'Paused' : `Next report ${relativeTime(hire.nextRunAt)}`} · {hire.settings.schedule}
                </span>
                <span>On the team since {new Date(hire.hiredAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => navigate(`/messages/${agentId}`)} disabled={hire.status === 'setup'}>
              <MessageCircle className="size-4" strokeWidth={1.6} /> Message
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/krew/${agentId}/settings`)}>
              <Settings2 className="size-4" strokeWidth={1.6} /> Configure
            </Button>
            {hire.status !== 'setup' && agentId !== 'manager' && (
              <Button
                variant="ghost"
                onClick={() => {
                  const next = hire.status === 'paused' ? 'active' : 'paused'
                  setStatus(agentId, next)
                  toast(next === 'paused' ? `${agent.displayName} paused` : `${agent.displayName} resumed`)
                }}
              >
                {hire.status === 'paused' ? <Play className="size-4" strokeWidth={1.6} /> : <Pause className="size-4" strokeWidth={1.6} />}
                {hire.status === 'paused' ? 'Resume' : 'Pause'}
              </Button>
            )}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px border-t border-line bg-line lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-panel px-6 py-4">
              <dt className="truncate text-[12.5px] text-ink-3">{s.label}</dt>
              <dd className="tabular mt-1 flex items-baseline gap-2 text-[22px] font-light tracking-[-0.02em] text-ink">
                {s.value}
                {s.change && <span className={cn('text-[12px] font-normal', s.tone === 'good' ? 'text-good' : s.tone === 'bad' ? 'text-bad' : 'text-ink-3')}>{s.change}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <SlidingPanel flow activeKey={active} direction={direction} className="mt-6">
        {active === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-4 lg:col-span-8">
              {posts.length === 0 ? (
                <Panel title="Latest updates">
                  <p className="py-6 text-center text-[13.5px] text-ink-3">{agent.displayName} hasn’t posted yet. The first update arrives after the first run.</p>
                </Panel>
              ) : (
                posts.slice(0, 2).map((p) => <FeedPost key={p.id} post={p} />)
              )}
              {posts.length > 2 && (
                <Link to="/feed" className="self-start text-[13px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
                  See all {posts.length} updates in the feed
                </Link>
              )}
            </div>
            <div className="flex flex-col gap-4 lg:col-span-4">
              <Panel title="Responsibilities">
                <ul className="flex flex-col gap-3">
                  {agent.capabilities.map((c) => (
                    <li key={c.title} className={cn(hire.settings.capabilities[c.title] === false && 'opacity-50')}>
                      <p className="text-[13.5px] text-ink">{c.title}</p>
                      <p className="text-[12.5px] text-ink-3">{c.description}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Open tasks" href={`/krew/${agentId}/tasks`} bodyClassName="px-3 pb-3">
                {tasks.filter((t) => t.status !== 'done').length === 0 ? (
                  <p className="px-2 pb-2 text-[13px] text-ink-3">No open tasks.</p>
                ) : (
                  <ul>
                    {tasks
                      .filter((t) => t.status !== 'done')
                      .map((t) => (
                        <li key={t.id} className="flex items-center gap-2 rounded-[10px] px-2 py-2 text-[13px]">
                          <span className={cn('size-1.5 shrink-0 rounded-full', t.status === 'waiting' ? 'bg-warn' : t.status === 'in_progress' ? 'bg-ink' : 'bg-line-strong')} />
                          <span className="flex-1 truncate text-ink">{t.title}</span>
                          <span className="shrink-0 text-[11.5px] text-ink-3">{STATUS_LABEL[t.status]}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </Panel>
              <Panel title="Connected to">
                <div className="flex flex-wrap gap-1.5">
                  {agent.integrations.map((i) => (
                    <span key={i} className="rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-2">
                      {i}
                    </span>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        )}
        {active === 'workspace' && <AgentModule agentId={agentId} />}
        {active === 'tasks' && <TasksBoard agentId={agentId} />}
        {active === 'reports' &&
          (reports.length === 0 ? (
            <div className="rounded-[var(--radius-surface)] border border-line bg-panel py-10">
              <EmptyState title="No reports yet" description={`${agent.displayName}’s first report arrives ${hire.settings.schedule.toLowerCase()}.`} />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {reports.map((r) => (
                <ReportPreview key={r.id} report={r} />
              ))}
            </div>
          ))}
        {active === 'history' && (
          <Panel title="Activity history" description="Updates, decisions and completed work">
            <Timeline
              label={`${agent.displayName} history`}
              now={Date.now()}
              timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
              events={[
                ...posts.map((p) => ({ id: p.id, at: p.createdAt, title: p.title, meta: POST_TYPES[p.type].label, detail: <p className="text-[13px] text-ink-2">{p.body}</p> })),
                ...approvals
                  .filter((a) => a.decidedAt)
                  .map((a) => ({ id: `d-${a.id}`, at: a.decidedAt!, actor: 'You', title: `${a.status} “${a.title}”`, tone: a.status === 'approved' ? ('success' as const) : ('neutral' as const), detail: a.decisionNote ? <p className="text-[13px] text-ink-2">“{a.decisionNote}”</p> : undefined })),
                ...tasks.filter((t) => t.status === 'done').map((t) => ({ id: `t-${t.id}`, at: t.dueAt, title: `Completed: ${t.title}`, tone: 'success' as const })),
                { id: 'hired', at: hire.hiredAt, title: `${agent.displayName} joined the team` },
              ]}
            />
          </Panel>
        )}
        {active === 'settings' && (
          <div className="rounded-[var(--radius-surface)] border border-line bg-panel px-6 pb-6 shadow-[var(--shadow-resting)]">
            <AgentSettingsForm agentId={agentId} />
          </div>
        )}
      </SlidingPanel>
    </Page>
  )
}
