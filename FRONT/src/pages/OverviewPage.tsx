import { ArrowRight, FileText, MessagesSquare, Newspaper, Package, ShieldAlert, TrendingUp, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart } from '@/components/arc/line-chart/line-chart'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { AgentCard } from '@/components/agent/AgentCard'
import { KpiTile } from '@/components/common/KpiTile'
import { ConversationMix } from '@/components/luna/ConversationMix'
import { Page, Panel } from '@/components/common/Panel'
import { FeedPost } from '@/components/feed/FeedPost'
import { ManagerNote } from '@/components/overview/ManagerNote'
import { TeamInbox } from '@/components/overview/TeamInbox'
import { ReportRow } from '@/components/reports/ReportCard'
import { greeting, longDate, money } from '@/lib/format'
import { useWorkspace } from '@/store/krew'

const RANGES = [
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
]

function RevenuePanel() {
  const ws = useWorkspace()
  const [range, setRange] = useState('30')
  const data = useMemo(() => {
    const n = Number(range)
    const slice = ws.daily.slice(-n)
    const step = Math.ceil(n / 6)
    return slice.map((d, i) => {
      const date = new Date(`${d.date}T00:00:00`)
      return {
        key: d.date,
        label: date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
        axisLabel: i % step === 0 ? date.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : undefined,
        values: { revenue: d.revenue, previous: d.revenuePrev },
      }
    })
  }, [ws.daily, range])
  const total = data.reduce((s, d) => s + d.values.revenue, 0)
  const prev = data.reduce((s, d) => s + d.values.previous, 0)
  const change = ((total - prev) / prev) * 100

  return (
    <Panel
      title="Revenue"
      icon={<TrendingUp />}
      description={
        <span>
          <span className="tabular text-ink">{money(total)}</span> over {range} days ·{' '}
          <span className={change >= 0 ? 'text-good' : 'text-bad'}>
            {change >= 0 ? '+' : ''}
            {change.toFixed(1)}%
          </span>{' '}
          vs previous period
        </span>
      }
      actions={<SegmentedControl label="Range" value={range} onValueChange={setRange} options={RANGES} />}
      className="lg:col-span-8"
    >
      <LineChart
        label="Revenue"
        data={data}
        unit="USD"
        height={232}
        formatValue={(v) => money(v)}
        formatTick={(v) => `$${Math.round(v / 1000)}K`}
        series={[
          { key: 'revenue', label: 'This period', area: true },
          { key: 'previous', label: 'Previous period', dashed: true, area: false },
        ]}
      />
      <p className="mt-2 text-[12px] text-ink-3">Simulated from Shopify orders · reconciled daily by Tracker</p>
    </Panel>
  )
}

export function OverviewPage() {
  const ws = useWorkspace()
  const k = ws.kpis
  const spark = ws.daily.slice(-14)
  const team = [...ws.hires].sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1))

  return (
    <Page wide>
      <div className="mb-7 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] text-ink-3">{longDate()}</p>
          <h1 className="mt-1 text-[28px] font-medium leading-tight tracking-[-0.025em] text-ink sm:text-[32px]">
            {greeting()}, {ws.owner.name}.
          </h1>
          <p className="mt-1.5 text-[14.5px] text-ink-2">
            Here’s what happened at {ws.brand.name}, what your Krew did, and what needs you.
          </p>
        </div>
        <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-3 sm:mt-0">
          <UsersRound className="size-4" strokeWidth={1.6} />
          {ws.hires.filter((h) => h.status === 'active').length} agents working · {k.agentActions} actions this week
        </p>
      </div>

      <div id="briefing" className="grid scroll-mt-24 items-start gap-4 lg:grid-cols-12">
        <ManagerNote className="lg:col-span-7" />
        <TeamInbox className="lg:col-span-5 lg:sticky lg:top-[84px]" />
      </div>

      <div id="performance" className="mt-4 grid scroll-mt-24 grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line shadow-[var(--shadow-resting)] sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Revenue · 7 days" value={k.revenue} prefix="$" change={k.revenueChange} tone="good" context="vs last week" icon={<TrendingUp />} spark={spark.map((d) => d.revenue)} />
        <KpiTile label="Orders · 7 days" value={k.orders} change={k.ordersChange} tone="good" context="vs last week" icon={<Package />} spark={spark.map((d) => d.orders)} />
        <KpiTile label="Customer conversations" value={k.conversations} change={k.conversationsChange} tone="neutral" context="read by Luna" icon={<MessagesSquare />} spark={spark.map((d) => d.conversations)} />
        <KpiTile label="Open customer issues" value={k.openIssues} change={k.openIssuesChange} tone={k.openIssuesChange.startsWith('+') ? 'bad' : 'good'} context={`Blended ROAS ${k.roas}`} icon={<ShieldAlert />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <RevenuePanel />
        <ConversationMix href="/krew/luna/workspace/insights" className="lg:col-span-4" />
      </div>

      <section id="team" className="mt-9 scroll-mt-24">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-medium tracking-[-0.015em] text-ink">Your AI team</h2>
            <p className="mt-0.5 text-[13.5px] text-ink-3">What each agent is working on right now.</p>
          </div>
          <Link to="/krew" className="inline-flex items-center gap-1 text-[13.5px] text-ink-2 hover:text-ink">
            Manage team <ArrowRight className="size-4" strokeWidth={1.6} />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {team.map((h) => (
            <AgentCard key={h.agentId} agentId={h.agentId} variant="compact" />
          ))}
        </div>
      </section>

      <div id="activity" className="mt-9 grid scroll-mt-24 gap-4 lg:grid-cols-12">
        <Panel title="Agent activity" icon={<Newspaper />} href="/feed" hrefLabel="Open the Agent Feed" className="lg:col-span-7" bodyClassName="px-3 pb-3">
          <div className="flex flex-col">
            {ws.posts.slice(0, 6).map((p) => (
              <FeedPost key={p.id} post={p} variant="compact" />
            ))}
          </div>
        </Panel>
        <Panel title="Recent reports" icon={<FileText />} href="/reports" hrefLabel="All reports" className="lg:col-span-5" bodyClassName="px-3 pb-3">
          <div className="flex flex-col">
            {[...ws.reports]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 6)
              .map((r) => (
                <ReportRow key={r.id} report={r} />
              ))}
          </div>
        </Panel>
      </div>
    </Page>
  )
}
