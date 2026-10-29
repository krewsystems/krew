import { ArrowRight, CircleDot, FlaskConical, MessageCircle, Package, Sparkles, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/arc/badge/badge'
import { BarChart } from '@/components/arc/bar-chart/bar-chart'
import { Button } from '@/components/arc/button/button'
import { Drawer, DrawerContent } from '@/components/arc/drawer/drawer'
import { Gauge } from '@/components/arc/gauge/gauge'
import { Progress } from '@/components/arc/progress/progress'
import { SortableDataTable } from '@/components/arc/sortable-data-table/sortable-data-table'
import { Sparkline } from '@/components/arc/sparkline/sparkline'
import { Stepper } from '@/components/arc/stepper/stepper'
import { Timeline } from '@/components/arc/timeline/timeline'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { useAgentResolver } from '@/components/agent/use-agent'
import { DecisionBadge } from '@/components/approvals/ApprovalActions'
import { HatchedBars } from '@/components/common/HatchedBars'
import { Panel } from '@/components/common/Panel'
import { getAgent } from '@/data/agents'
import { moduleData } from '@/data/modules'
import { ahead, D } from '@/data/seed-utils'
import { money, relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useKrew, useWorkspace } from '@/store/krew'
import { toast } from '@/store/toasts'
import { TrackerWorkspace } from './tracker/TrackerWorkspace'

function useModule() {
  const ws = useWorkspace()
  return { ws, data: moduleData(ws.id) }
}

function SimNote({ children = 'Simulated data · connected sources go live during onboarding' }: { children?: string }) {
  return (
    <p className="mt-4 flex items-center gap-1.5 text-[12px] text-ink-3">
      <FlaskConical className="size-3.5" strokeWidth={1.6} />
      {children}
    </p>
  )
}

function Spark({ data, className }: { data: number[]; className?: string }) {
  const max = Math.max(...data, 0.01)
  const min = Math.min(...data)
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${22 - ((v - min) / (max - min || 1)) * 18 - 2}`).join(' ')
  return (
    <svg viewBox="0 0 100 22" preserveAspectRatio="none" className={cn('h-5 w-16 text-ink', className)} aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

/* ---------------- Luna ---------------- */
export function LunaModule() {
  const { data } = useModule()
  const l = data.luna
  const [open, setOpen] = useState<(typeof l.conversations)[number] | null>(null)
  const navigate = useNavigate()
  const trend = l.complaintTrend.map((v, i) => {
    const d = new Date(Date.now() - (l.complaintTrend.length - 1 - i) * 86_400_000)
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }), axisLabel: d.toLocaleDateString('en', { weekday: 'narrow' }), value: v }
  })

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title="Customer sentiment" description="0 to 100 · from every conversation this week" className="lg:col-span-4">
        <div className="flex justify-center py-2">
          <Gauge label="Sentiment score" value={l.sentiment} detail="Up 3 points on last week" thresholds={[{ from: 0, tone: 'danger', label: 'Unhappy' }, { from: 50, tone: 'warning', label: 'Mixed' }, { from: 70, tone: 'accent', label: 'Healthy' }]} />
        </div>
      </Panel>
      <Panel title="Conversation categories" description="This week against last week" className="lg:col-span-8">
        <HatchedBars bars={l.topics} legend={['This week', 'Last week']} height={170} unit="" />
      </Panel>
      <Panel title="Complaints per day" description="Last 14 days" className="lg:col-span-6">
        <BarChart data={trend} label="Complaints" period="Last 14 days" unit="complaints" height={170} averageLabel="Daily average" />
      </Panel>
      <Panel title="Complaints by product" description="Classified by Luna" className="lg:col-span-6" bodyClassName="overflow-x-auto px-2 pb-3">
        <SortableDataTable
          caption="Complaints by product"
          rowKey="id"
          rows={l.complaints}
          defaultSort={{ key: 'count', direction: 'desc' }}
          columns={[
            { key: 'product', label: 'Product' },
            { key: 'topic', label: 'Topic' },
            { key: 'count', label: 'Count', numeric: true },
            { key: 'change', label: 'Change', sortable: false, render: (v) => <span className={String(v).startsWith('+') ? 'text-bad' : String(v).startsWith('-') ? 'text-good' : 'text-ink-3'}>{String(v)}</span> },
          ]}
        />
      </Panel>
      <Panel title="Example conversations" description="Read-only. Luna monitors and reports, she does not reply to customers." className="lg:col-span-12" bodyClassName="px-3 pb-3">
        <ul className="grid gap-2 md:grid-cols-2">
          {l.conversations.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setOpen(c)} className="flex w-full items-start gap-3 rounded-[12px] border border-line-subtle bg-panel-muted p-3.5 text-left transition-colors hover:border-line-strong">
                <span className={cn('mt-1 size-2 shrink-0 rounded-full', c.sentiment === 'negative' ? 'bg-bad' : c.sentiment === 'positive' ? 'bg-good' : 'bg-line-strong')} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13px] text-ink">
                    {c.customer}
                    <span className="text-[12px] text-ink-3">· {c.channel} · {relativeTime(new Date(Date.now() - c.at * 60_000).toISOString())}</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">“{c.lines[0].text}”</p>
                </div>
                <Badge size="sm">{c.topic}</Badge>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      <Drawer open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (
          <DrawerContent title={`${open.customer} · ${open.channel}`} description={`${open.topic} · ${open.sentiment} sentiment`}>
            <div className="flex flex-col gap-3">
              {open.lines.map((line, i) => (
                <div key={i} className={cn('max-w-[85%] rounded-[16px] px-3.5 py-2.5 text-[13.5px]', line.from === 'customer' ? 'self-start border border-line bg-panel text-ink' : 'self-end bg-sunken text-ink-2')}>
                  <p className="mb-0.5 text-[11px] text-ink-3">{line.from === 'customer' ? open.customer : 'Your support team'}</p>
                  {line.text}
                </div>
              ))}
              <div className="mt-4 rounded-[12px] border border-line bg-panel-muted p-4">
                <p className="flex items-center gap-2 text-[12.5px] text-ink-3">
                  <AgentAvatar agentId="luna" size="xs" /> Luna’s read
                </p>
                <p className="mt-2 text-[13.5px] text-ink">
                  {open.sentiment === 'negative'
                    ? 'Frustrated, time sensitive. Linked to the courier delay pattern. Included in the recovery segment.'
                    : open.sentiment === 'positive'
                      ? 'Delighted. Mentions packaging. Counted toward this week’s praise themes.'
                      : 'Pre-purchase question that the product page should answer. Shared with Store Agent.'}
                </p>
              </div>
              <Button variant="secondary" onClick={() => navigate('/messages/luna')}>
                <MessageCircle className="size-4" strokeWidth={1.6} /> Ask Luna about this
              </Button>
            </div>
          </DrawerContent>
        )}
      </Drawer>
    </div>
  )
}

/* ---------------- Ivy ---------------- */
export function IvyModule() {
  const { data } = useModule()
  const addTask = useKrew((s) => s.addTask)
  const navigate = useNavigate()
  const [planned, setPlanned] = useState<string[]>([])
  const v = data.ivy
  if (v.opportunities.length === 0) return <GenericModule agentId="ivy" />
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title="Opportunities" description="Ranked by expected monthly impact" className="lg:col-span-8" bodyClassName="px-3 pb-3">
        <ol className="flex flex-col gap-2">
          {v.opportunities.map((o, i) => (
            <li key={o.id} className="rounded-[12px] border border-line-subtle bg-panel p-4 transition-colors hover:border-line-strong">
              <div className="flex items-start gap-3">
                <span className="tabular mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-line text-[12px] text-ink-2">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14.5px] font-medium text-ink">{o.title}</p>
                    <Badge size="sm" tone={o.status === 'Adopted' ? 'success' : o.status === 'Testing' ? 'info' : 'neutral'}>
                      {planned.includes(o.id) ? 'Test planned' : o.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-2">{o.why}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-ink-3">
                    <span>
                      Impact <span className="tabular text-ink">{o.impact}</span>
                    </span>
                    <span>
                      Confidence <span className="text-ink">{o.confidence}</span>
                    </span>
                    <span>
                      Effort <span className="text-ink">{o.effort}</span>
                    </span>
                    {o.status === 'Proposed' && !planned.includes(o.id) && (
                      <span className="ml-auto flex gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            addTask({ agentId: 'ivy', title: `Plan a test: ${o.title}`, description: o.why, status: 'todo', priority: 'normal', dueAt: ahead(3 * D), createdBy: 'user' })
                            setPlanned((p) => [...p, o.id])
                            toast('Test added to Ivy’s tasks', o.title)
                          }}
                        >
                          Plan a test
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => navigate('/messages/ivy')}>
                          Discuss
                        </Button>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
      <div className="flex flex-col gap-4 lg:col-span-4">
        <Panel title="Repeat rate by channel" description="12 months">
          <HatchedBars bars={v.channels} unit="%" unitPosition="suffix" height={140} />
        </Panel>
        <Panel title="Signals Ivy is watching" icon={<TrendingUp />}>
          <ul className="flex flex-col gap-2.5">
            {v.signals.map((s) => (
              <li key={s} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
                <CircleDot className="mt-0.5 size-3.5 shrink-0 text-ink-3" strokeWidth={1.75} />
                {s}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

/* ---------------- Store ---------------- */
export function StoreModule() {
  const { ws, data } = useModule()
  const s = data.store
  if (s.changes.length === 0) return <GenericModule agentId="store" />
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title="Proposed store changes" description="Staged in Shopify. Nothing publishes until you approve." className="lg:col-span-7" bodyClassName="px-3 pb-3">
        <ul className="flex flex-col gap-2">
          {s.changes.map((c) => {
            const approval = ws.approvals.find((a) => a.id === c.approvalId)
            return (
              <li key={c.id} className="overflow-hidden rounded-[12px] border border-line-subtle">
                <div className="flex items-center gap-2 border-b border-line-subtle bg-panel-muted px-4 py-2.5">
                  <Package className="size-4 text-ink-3" strokeWidth={1.6} />
                  <span className="truncate text-[13.5px] text-ink">{c.product}</span>
                  <span className="text-[12px] text-ink-3">· {c.field}</span>
                  <span className="ml-auto">{approval && <DecisionBadge approval={approval} />}</span>
                </div>
                <div className="grid gap-px bg-line-subtle sm:grid-cols-2">
                  <div className="bg-panel p-3.5">
                    <p className="text-[11.5px] text-ink-3">Now</p>
                    <p className="mt-1 text-[13px] text-ink-3 line-through decoration-line-strong">{c.before}</p>
                  </div>
                  <div className="bg-panel p-3.5">
                    <p className="text-[11.5px] text-ink-3">Proposed</p>
                    <p className="mt-1 text-[13px] text-ink">{c.after}</p>
                  </div>
                </div>
                {approval?.status === 'pending' && (
                  <Link to={`/approvals/${approval.id}`} className="flex items-center justify-end gap-1 border-t border-line-subtle px-4 py-2 text-[12.5px] text-ink-2 hover:text-ink">
                    Review and approve <ArrowRight className="size-3.5" strokeWidth={1.75} />
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </Panel>
      <Panel title="Product health" description="Stock cover, content quality and conversion" className="lg:col-span-5" bodyClassName="px-0 pb-2">
        <ul>
          {s.health.map((h) => (
            <li key={h.id} className="border-b border-line-subtle px-5 py-3 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13.5px] text-ink">{h.product}</span>
                <span className={cn('tabular shrink-0 text-[12.5px]', h.stockDays < 15 ? 'text-bad' : 'text-ink-3')}>{h.stockDays} days of stock</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Progress className="flex-1" label={`Content score ${h.contentScore}`} value={h.contentScore} />
                <span className="tabular w-16 shrink-0 text-right text-[12px] text-ink-3">{h.conversion}% CR</span>
              </div>
              {h.issue && <p className="mt-1.5 text-[12px] text-ink-2">{h.issue}</p>}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

/* ---------------- Ads ---------------- */
export function AdsModule() {
  const { ws, data } = useModule()
  const a = data.ads
  const pending = ws.approvals.filter((x) => x.agentId === 'ads')
  const totalSpend = a.campaigns.reduce((s, c) => s + c.spend, 0)
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title="Campaigns" description={`Meta Ads · last 7 days · ${money(totalSpend)} spend`} className="lg:col-span-12" bodyClassName="overflow-x-auto px-2 pb-3">
        <SortableDataTable
          caption="Campaigns"
          rowKey="id"
          rows={a.campaigns}
          defaultSort={{ key: 'spend', direction: 'desc' }}
          itemName={{ one: 'ad set', other: 'ad sets' }}
          columns={[
            { key: 'name', label: 'Ad set', width: '32%' },
            { key: 'status', label: 'Status', render: (v) => <Badge size="sm" tone={v === 'Active' ? 'success' : v === 'Learning' ? 'info' : 'neutral'}>{String(v)}</Badge> },
            { key: 'spend', label: 'Spend', numeric: true, render: (v) => money(Number(v)) },
            { key: 'roas', label: 'ROAS', numeric: true, render: (v) => (Number(v) ? Number(v).toFixed(1) : '·') },
            { key: 'cpa', label: 'CPA', numeric: true, render: (v) => (Number(v) ? `$${v}` : '·') },
            { key: 'frequency', label: 'Freq.', numeric: true, render: (v) => <span className={Number(v) > 3 ? 'text-bad' : ''}>{Number(v) ? Number(v).toFixed(1) : '·'}</span> },
            { key: 'trend', label: 'ROAS, 7d', sortable: false, render: (v) => <Spark data={v as number[]} /> },
          ]}
        />
      </Panel>
      <Panel title="Blended ROAS" description="Last 14 days" className="lg:col-span-5">
        <Sparkline label="Blended ROAS" data={a.roas} value={String(a.roas[a.roas.length - 1])} change={a.roas[a.roas.length - 1] < a.roas[0] ? 'Trending down' : 'Trending up'} tone={a.roas[a.roas.length - 1] < a.roas[0] ? 'danger' : 'success'} width={420} height={90} />
      </Panel>
      <Panel title="Recommendations" icon={<Sparkles />} className="lg:col-span-7" bodyClassName="px-3 pb-3">
        <ul className="flex flex-col">
          {pending.map((p) => (
            <li key={p.id}>
              <Link to={`/approvals/${p.id}`} className="flex items-center gap-3 rounded-[10px] px-2 py-2.5 hover:bg-sunken">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] text-ink">{p.title}</p>
                  <p className="text-[12.5px] text-ink-3">{p.estimate}</p>
                </div>
                <DecisionBadge approval={p} />
              </Link>
            </li>
          ))}
          <li className="flex items-center gap-3 px-2 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] text-ink">Rotate “Clay at dusk” into retargeting</p>
              <p className="text-[12.5px] text-ink-3">Creative fatigue on Linen morning · in tasks</p>
            </div>
            <Badge size="sm">Planned</Badge>
          </li>
        </ul>
      </Panel>
    </div>
  )
}

/* ---------------- Retention ---------------- */
export function RetentionModule() {
  const { ws, data } = useModule()
  const r = data.retention
  if (r.segments.length === 0) return <GenericModule agentId="retention" />
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="grid gap-3 sm:grid-cols-2 lg:col-span-12 xl:grid-cols-4">
        {r.segments.map((s) => (
          <div key={s.id} className={cn('rounded-[var(--radius-panel)] border bg-panel p-5 shadow-[var(--shadow-resting)]', s.tone === 'bad' ? 'border-[color-mix(in_oklab,var(--danger)_30%,var(--border))]' : 'border-line')}>
            <p className="text-[13px] text-ink-2">{s.name}</p>
            <p className="tabular mt-2 text-[28px] font-light tracking-[-0.02em] text-ink">{s.size.toLocaleString()}</p>
            <p className="mt-1 text-[12.5px] text-ink-3">
              {s.value} · <span className={s.tone === 'bad' ? 'text-bad' : s.tone === 'good' ? 'text-good' : ''}>{s.trend}</span>
            </p>
            <p className="mt-3 border-t border-line-subtle pt-3 text-[12.5px] leading-snug text-ink-2">{s.description}</p>
          </div>
        ))}
      </div>
      <Panel title="Campaign drafts" description="Written in your brand voice. Nothing reaches a customer without your approval." className="lg:col-span-12" bodyClassName="px-3 pb-3">
        <ul className="flex flex-col">
          {r.drafts.map((d) => {
            const approval = ws.approvals.find((a) => a.id === d.approvalId)
            const status = approval ? (approval.status === 'approved' ? 'Scheduled' : approval.status === 'rejected' ? 'Draft' : d.status) : d.status
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-[10px] px-2 py-3 hover:bg-sunken">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] text-ink">{d.name}</p>
                  <p className="text-[12.5px] text-ink-3">
                    {d.audience} · {d.channel}
                    {d.result && ` · ${d.result}`}
                  </p>
                </div>
                <Badge size="sm" tone={status === 'Sent' ? 'success' : status === 'Waiting for approval' ? 'warning' : status === 'Scheduled' ? 'info' : 'neutral'}>
                  {status}
                </Badge>
                {approval?.status === 'pending' && (
                  <Link to={`/approvals/${approval.id}`} className="text-[12.5px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
                    Review
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </Panel>
    </div>
  )
}

/* ---------------- Manager ---------------- */
export function ManagerModule() {
  const ws = useWorkspace()
  const resolve = useAgentResolver()
  const collab = ws.posts.filter((p) => p.type === 'collaboration' || (p.with && p.with.length > 0))
  const load = ws.hires
    .filter((h) => h.agentId !== 'manager' && h.status === 'active')
    .map((h) => ({ label: resolve(h.agentId).displayName.replace(' Agent', ''), value: ws.posts.filter((p) => p.agentId === h.agentId).length * 7 + ws.tasks.filter((t) => t.agentId === h.agentId).length * 4 }))
  const decided = ws.approvals.filter((a) => a.status !== 'pending')
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title="Hand-offs between agents" description="How work moved across your team" className="lg:col-span-7">
        <Timeline
          label="Hand-offs"
          now={Date.now()}
          timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
          maxHeight={380}
          events={collab.map((p) => ({
            id: p.id,
            at: p.createdAt,
            actor: resolve(p.agentId).displayName,
            title: `${p.with?.length ? `with ${p.with.map((w) => resolve(w).displayName).join(', ')}: ` : ''}${p.title.charAt(0).toLowerCase()}${p.title.slice(1)}`,
          }))}
        />
      </Panel>
      <div className="flex flex-col gap-4 lg:col-span-5">
        <Panel title="Team workload" description="Actions this week">
          <HatchedBars bars={load} height={140} />
        </Panel>
        <Panel title="Your decisions" description="Last 7 days">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Approved', value: decided.filter((d) => d.status === 'approved').length },
              { label: 'Rejected', value: decided.filter((d) => d.status === 'rejected').length },
              { label: 'Waiting', value: ws.approvals.filter((a) => a.status === 'pending').length },
            ].map((s) => (
              <div key={s.label} className="rounded-[12px] border border-line-subtle py-3">
                <p className="tabular text-[22px] font-light text-ink">{s.value}</p>
                <p className="text-[12px] text-ink-3">{s.label}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

/* ---------------- Generic (newly hired / marketplace agents) ---------------- */
export function GenericModule({ agentId }: { agentId: string }) {
  const ws = useWorkspace()
  const agent = getAgent(agentId)
  const hire = ws.hires.find((h) => h.agentId === agentId)
  if (hire?.status === 'setup') {
    const progress = hire.setupProgress ?? 10
    const current = progress < 30 ? 1 : progress < 70 ? 2 : 3
    return (
      <div className="grid gap-4 lg:grid-cols-12">
        <Panel title="Setting up" description={`The KREW team is preparing ${agent.name} for ${ws.brand.name}. Expected ${agent.setupTime ?? 'soon'}.`} className="lg:col-span-7">
          <Stepper
            orientation="vertical"
            current={current}
            label="Setup progress"
            steps={[
              { id: 'req', label: 'Hiring request received', description: 'Your account manager confirmed the scope.' },
              { id: 'access', label: 'Integration access', description: `Connecting ${agent.integrations.join(', ')}.` },
              { id: 'calibrate', label: 'Calibration on your data', description: 'Learning your catalog, history and Brand DNA.' },
              { id: 'live', label: 'First report', description: `Then ${agent.defaultSchedule.toLowerCase()}.` },
            ]}
          />
        </Panel>
        <Panel title="What you’ll get" className="lg:col-span-5">
          <SampleOutputs agentId={agentId} />
        </Panel>
      </div>
    )
  }
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title="What this agent does" className="lg:col-span-6">
        <ul className="flex flex-col gap-3">
          {agent.capabilities.map((c) => (
            <li key={c.title}>
              <p className="text-[13.5px] text-ink">{c.title}</p>
              <p className="text-[12.5px] text-ink-3">{c.description}</p>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Example outputs" className="lg:col-span-6">
        <SampleOutputs agentId={agentId} />
      </Panel>
      <div className="lg:col-span-12">
        <SimNote>{`${agent.name}’s workspace fills in after the first scheduled run (${agent.defaultSchedule.toLowerCase()}).`}</SimNote>
      </div>
    </div>
  )
}

function SampleOutputs({ agentId }: { agentId: string }) {
  const agent = getAgent(agentId)
  return (
    <ul className="flex flex-col gap-2">
      {agent.sampleOutputs.map((o) => (
        <li key={o.title} className="rounded-[12px] border border-line-subtle bg-panel-muted p-3.5">
          <p className="text-[12px] text-ink-3">{o.title}</p>
          <p className="mt-1 text-[13.5px] text-ink">{o.body}</p>
        </li>
      ))}
    </ul>
  )
}

export function AgentModule({ agentId }: { agentId: string }) {
  const ws = useWorkspace()
  const hire = ws.hires.find((h) => h.agentId === agentId)
  if (hire?.status === 'setup') return <GenericModule agentId={agentId} />
  switch (agentId) {
    case 'luna':
      return <LunaModule />
    case 'tracker':
      return <TrackerWorkspace />
    case 'ivy':
      return <IvyModule />
    case 'store':
      return <StoreModule />
    case 'ads':
      return <AdsModule />
    case 'retention':
      return <RetentionModule />
    case 'manager':
      return <ManagerModule />
    default:
      return <GenericModule agentId={agentId} />
  }
}
