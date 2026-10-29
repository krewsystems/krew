import { ArrowRight, MessageSquareWarning, ShoppingBag } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { BarChart } from '@/components/arc/bar-chart/bar-chart'
import { Panel } from '@/components/common/Panel'
import { INSIGHT_KIND, ISSUE, SENTIMENT, TOPIC } from '@/components/luna/labels'
import { CustomerAvatar, IntentMeter, PriorityMark } from '@/components/luna/parts'
import { lunaPath } from '@/components/luna/sections'
import { useLunaData, useLunaSheet, type LunaData } from '@/components/luna/use-luna'
import type { LunaCase } from '@/data/luna/types'
import { conversationMix } from '@/data/luna/volume'
import { money, number, relativeTime } from '@/lib/format'
import { inWindow, isActiveRisk, isOpenOpportunity, lastActivity, messageActivity, pulseStats, SENTIMENT_ORDER, sentimentLabel, topicCounts, waitingHours } from '@/lib/luna'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/krew'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

interface Finding {
  id: string
  count: number
  title: string
  detail: string
  accent: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  linkLabel: string
  to?: string
  onOpen?: () => void
}

/** What the owner needs to know this week: waiting customers, Luna's important insights, and buyers who stopped short. */
function useFindings(data: LunaData): Finding[] {
  const sheet = useLunaSheet()
  const waiting = data.risks.filter((r) => isActiveRisk(r)).filter((r) => waitingHours(data.conversations.find((c) => c.id === r.conversationId)!) > 12)
  const stalled = data.opportunities.filter((o) => o.status === 'new' && o.intent !== 'low')
  const out: Finding[] = []
  if (waiting.length)
    out.push({
      id: 'waiting',
      count: waiting.length,
      title: `${waiting.length} ${waiting.length === 1 ? 'customer has' : 'customers have'} had no reply for over 12 hours`,
      detail: waiting.map((r) => `${data.customer(r.customerId).name.split(' ')[0]}: ${r.title.toLowerCase()}`).join(' · '),
      accent: 'var(--danger)',
      icon: MessageSquareWarning,
      linkLabel: 'See who is waiting',
      to: lunaPath('cases', '?view=attention&show=waiting'),
    })
  for (const i of data.insights.filter((x) => x.important))
    out.push({ id: i.id, count: i.conversationIds.length, title: i.title, detail: i.detail, accent: INSIGHT_KIND[i.kind].accent, icon: INSIGHT_KIND[i.kind].icon, linkLabel: `See ${i.conversationIds.length} ${i.conversationIds.length === 1 ? 'conversation' : 'conversations'}`, onOpen: () => sheet.open({ insight: i.id }) })
  if (stalled.length)
    out.push({
      id: 'stalled',
      count: stalled.length,
      title: `${stalled.length} interested ${stalled.length === 1 ? 'buyer hasn’t' : 'buyers haven’t'} completed a purchase`,
      detail: `${money(stalled.reduce((s, o) => s + (o.estimatedValue ?? 0), 0))} in possible orders. Nobody has followed up yet.`,
      accent: 'var(--agent-luna)',
      icon: ShoppingBag,
      linkLabel: 'See the opportunities',
      to: lunaPath('cases', '?view=opportunities&status=new'),
    })
  return out
}

function FindingCard({ f, wide }: { f: Finding; wide: boolean }) {
  const body = (
    <>
      <span className="flex items-start gap-3.5">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px]" style={{ background: `color-mix(in oklab, ${f.accent} 13%, var(--surface))`, color: `color-mix(in oklab, ${f.accent} 85%, var(--foreground))` }}>
          <f.icon className="size-[18px]" strokeWidth={1.6} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug text-ink">{f.title}</span>
          <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-ink-3">{f.detail}</span>
        </span>
      </span>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-ink-2 group-hover:text-ink">
        {f.linkLabel} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} />
      </span>
    </>
  )
  const cls = cn('group flex flex-col justify-between rounded-[var(--radius-panel)] border border-line bg-panel p-5 text-left shadow-[var(--shadow-resting)] transition-colors hover:border-line-strong', wide && 'sm:col-span-2')
  return f.to ? (
    <Link to={f.to} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={f.onOpen} className={cls}>
      {body}
    </button>
  )
}

function CaseLine({ c, data }: { c: LunaCase; data: LunaData }) {
  const sheet = useLunaSheet()
  const customer = data.customer(c.customerId)
  return (
    <button type="button" onClick={() => sheet.open({ case: c.id })} className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors hover:bg-panel-muted">
      <CustomerAvatar name={customer.name} size={32} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] text-ink">{customer.name}</span>
        <span className="block truncate text-[12.5px] text-ink-3">{c.type === 'risk' ? `${ISSUE[c.issue]} · ${c.title}` : `${c.title}${c.estimatedValue ? ` · ${money(c.estimatedValue)}` : ''}`}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        {c.type === 'risk' ? <PriorityMark priority={c.priority} /> : <IntentMeter level={c.intent} />}
        <span className="text-[11.5px] text-ink-3">{relativeTime(c.lastActivityAt)}</span>
      </span>
    </button>
  )
}

/** Overview of Luna's workspace: what is happening in customer DMs, led by what the owner should know. */
export function PulseSection() {
  const data = useLunaData()
  const findings = useFindings(data)
  const stats = useMemo(() => pulseStats(data), [data])
  const ws = useWorkspace()
  const week = conversationMix(ws.id, 7)
  const weekChange = week.previousTotal ? Math.round(((week.total - week.previousTotal) / week.previousTotal) * 100) : null
  const activity = useMemo(() => messageActivity(data.conversations, 14), [data.conversations])
  const topics = useMemo(() => topicCounts(data.conversations.filter((c) => inWindow(lastActivity(c), 7, 0))).slice(0, 6), [data.conversations])
  const waitingOn = data.risks.filter(isActiveRisk).sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.lastActivityAt.localeCompare(a.lastActivityAt))
  const ready = data.opportunities.filter(isOpenOpportunity).sort((a, b) => PRIORITY_RANK[a.intent] - PRIORITY_RANK[b.intent] || b.lastActivityAt.localeCompare(a.lastActivityAt))
  const split = stats.sentiment.split
  const sentimentDelta = stats.sentiment.score !== null && stats.sentiment.prev !== null ? stats.sentiment.score - stats.sentiment.prev : null

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="This week in your DMs" className="overflow-hidden rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]">
        <div className="flex gap-4 px-6 pb-6 pt-5">
          <AgentAvatar agentId="luna" size="md" />
          <div className="min-w-0">
            <p className="text-[12.5px] text-ink-3">This week in your Instagram DMs</p>
            <p className="mt-1.5 max-w-3xl text-[19px] leading-snug tracking-[-0.015em] text-ink">{data.headline}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-line bg-line lg:grid-cols-4">
          <Link to={lunaPath('conversations')} className="bg-panel px-6 py-4 transition-colors hover:bg-panel-muted">
            <p className="text-[12.5px] text-ink-3">Conversations analyzed</p>
            <p className="tabular mt-1 text-[26px] font-light tracking-[-0.02em] text-ink">{number(week.total)}</p>
            <p className="text-[12px] text-ink-3">{weekChange === null ? 'Last 7 days' : `${weekChange >= 0 ? '+' : ''}${weekChange}% on last week`}</p>
          </Link>
          <Link to={lunaPath('cases', '?view=opportunities')} className="bg-panel px-6 py-4 transition-colors hover:bg-panel-muted">
            <p className="text-[12.5px] text-ink-3">Sales opportunities</p>
            <p className="tabular mt-1 text-[26px] font-light tracking-[-0.02em] text-ink">{stats.openOpportunities}</p>
            <p className="text-[12px] text-ink-3">
              {stats.highIntent} high intent · {money(stats.pipelineValue)} possible
            </p>
          </Link>
          <Link to={lunaPath('cases', '?view=attention')} className="bg-panel px-6 py-4 transition-colors hover:bg-panel-muted">
            <p className="text-[12.5px] text-ink-3">Customers needing attention</p>
            <p className="tabular mt-1 text-[26px] font-light tracking-[-0.02em] text-ink">{stats.attention}</p>
            <p className={cn('text-[12px]', stats.attentionHigh ? 'text-bad' : 'text-ink-3')}>{stats.attentionHigh ? `${stats.attentionHigh} high priority` : 'None urgent'}</p>
          </Link>
          <Link to={lunaPath('insights')} className="bg-panel px-6 py-4 transition-colors hover:bg-panel-muted">
            <p className="text-[12.5px] text-ink-3">Overall sentiment</p>
            <p className="mt-1 text-[20px] leading-[39px] tracking-[-0.015em] text-ink">{sentimentLabel(stats.sentiment.score)}</p>
            <p className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-3">
              <span className="flex h-1.5 w-20 overflow-hidden rounded-full bg-sunken" aria-hidden>
                {[...SENTIMENT_ORDER].reverse().map((s) => (
                  <span key={s} className={SENTIMENT[s].dot} style={{ width: `${split.total ? (split[s] / split.total) * 100 : 0}%` }} />
                ))}
              </span>
              {sentimentDelta !== null && (sentimentDelta === 0 ? 'Steady' : `${sentimentDelta > 0 ? 'Up' : 'Down'} ${Math.abs(sentimentDelta)} pts`)}
            </p>
          </Link>
        </div>
      </section>

      <section aria-labelledby="pulse-findings">
        <h2 id="pulse-findings" className="mb-3 text-[15px] font-medium tracking-[-0.01em] text-ink">
          What you need to know
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {findings.map((f, i) => (
            <FindingCard key={f.id} f={f} wide={findings.length % 2 === 1 && i === findings.length - 1} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Waiting on you" description="Customers with an open problem" href={lunaPath('cases', '?view=attention')} hrefLabel="All at-risk customers" bodyClassName="px-2 pb-2 pt-2">
          {waitingOn.length === 0 ? <p className="px-3 py-6 text-center text-[13px] text-ink-3">Nobody is waiting. Nice.</p> : waitingOn.slice(0, 4).map((c) => <CaseLine key={c.id} c={c} data={data} />)}
        </Panel>
        <Panel title="Ready to buy" description="Purchase intent with no order yet" href={lunaPath('cases', '?view=opportunities')} hrefLabel="All opportunities" bodyClassName="px-2 pb-2 pt-2">
          {ready.length === 0 ? <p className="px-3 py-6 text-center text-[13px] text-ink-3">No open opportunities.</p> : ready.slice(0, 4).map((c) => <CaseLine key={c.id} c={c} data={data} />)}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Panel title="Conversation activity" description="Customer messages per day, last 14 days" className="lg:col-span-7">
          <BarChart
            data={activity.map((d) => ({ key: d.date.toISOString().slice(0, 10), label: d.date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }), axisLabel: d.date.toLocaleDateString('en', { weekday: 'narrow' }), value: d.customer }))}
            label="Customer messages"
            period="Last 14 days"
            unit="messages"
            height={170}
            averageLabel="Daily average"
          />
        </Panel>
        <Panel title="Top topics" description="Share of this week’s conversations" href={lunaPath('insights')} hrefLabel="Insights" className="lg:col-span-5">
          <ul className="flex flex-col gap-2.5">
            {topics.map((t) => (
              <li key={t.topic}>
                <Link to={lunaPath('conversations', `?topic=${t.topic}`)} className="group block">
                  <span className="flex items-baseline justify-between text-[13px]">
                    <span className="text-ink group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">{TOPIC[t.topic]}</span>
                    <span className="tabular text-ink-3">{t.count}</span>
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-sunken">
                    <span className="block h-full rounded-full bg-[color-mix(in_oklab,var(--agent-luna)_70%,var(--surface))]" style={{ width: `${(t.count / stats.analyzed) * 100}%` }} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
