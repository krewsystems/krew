import { ArrowUpDown, Search, X } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DropdownMenu } from '@/components/arc/dropdown-menu/dropdown-menu'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { ISSUE } from '@/components/luna/labels'
import { CaseStatus, ChannelIcon, CustomerAvatar, IntentMeter, PriorityMark } from '@/components/luna/parts'
import { useLunaData, useLunaSheet, type LunaData } from '@/components/luna/use-luna'
import type { AtRiskCase, LunaCase, SalesOpportunity } from '@/data/luna/types'
import { money, relativeTime } from '@/lib/format'
import { isActiveRisk, isOpenOpportunity, waitingHours } from '@/lib/luna'
import { cn } from '@/lib/utils'

type View = 'opportunities' | 'attention'
const RANK = { high: 0, medium: 1, low: 2 }

const OPP_FILTERS = [
  { value: 'open', label: 'Open' },
  { value: 'new', label: 'New' },
  { value: 'followed_up', label: 'Followed up' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
]
const RISK_FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
]
const OPP_SORTS = [
  { id: 'intent', label: 'Intent' },
  { id: 'recent', label: 'Most recent' },
  { id: 'value', label: 'Possible value' },
]
const RISK_SORTS = [
  { id: 'priority', label: 'Priority' },
  { id: 'recent', label: 'Most recent' },
]

function matches(c: LunaCase, data: LunaData, q: string) {
  if (!q) return true
  const customer = data.customer(c.customerId)
  const products = c.productIds.map((id) => data.products.find((p) => p.id === id)?.name ?? '').join(' ')
  const text = [customer.name, customer.identities.map((i) => i.handle).join(' '), c.title, c.type === 'opportunity' ? `${c.explanation} ${c.productLabel ?? ''}` : `${c.summary} ${ISSUE[c.issue]}`, products].join(' ').toLowerCase()
  return text.includes(q.toLowerCase())
}

function CustomerCell({ c, data }: { c: LunaCase; data: LunaData }) {
  const customer = data.customer(c.customerId)
  const conv = data.conversations.find((x) => x.id === c.conversationId)!
  return (
    <span className="flex min-w-0 items-center gap-3">
      <CustomerAvatar name={customer.name} size={36} />
      <span className="min-w-0">
        <span className="block truncate text-[14px] text-ink">{customer.name}</span>
        <span className="flex items-center gap-1.5 truncate text-[12.5px] text-ink-3">
          <ChannelIcon channel={conv.channel} size={12} />@{customer.identities[0].handle}
        </span>
      </span>
    </span>
  )
}

function OpportunityRow({ o, data }: { o: SalesOpportunity; data: LunaData }) {
  const sheet = useLunaSheet()
  const product = o.productIds.map((id) => data.products.find((p) => p.id === id)?.name).filter(Boolean)[0]
  return (
    <button
      type="button"
      onClick={() => sheet.open({ case: o.id })}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2.5 rounded-[12px] px-3 py-3.5 text-left transition-colors hover:bg-panel-muted md:grid-cols-[200px_minmax(0,1fr)_92px_96px_104px] md:items-center"
    >
      <CustomerCell c={o} data={data} />
      <span className="md:hidden">
        <CaseStatus c={o} />
      </span>
      <span className="col-span-2 min-w-0 md:col-span-1">
        <span className="block truncate text-[13.5px] text-ink">{o.title}</span>
        <span className="block truncate text-[12.5px] text-ink-3">
          {[product, o.productLabel].filter(Boolean).join(' · ')}
          {o.estimatedValue !== undefined && ` · ${money(o.estimatedValue)}`}
          {o.orderMatch && isOpenOpportunity(o) && <span className="text-good"> · Possible order found</span>}
        </span>
      </span>
      <span className="flex items-center gap-4 md:contents">
        <IntentMeter level={o.intent} />
        <span className="text-[12.5px] text-ink-3">{relativeTime(o.lastActivityAt)}</span>
      </span>
      <span className="hidden md:block">
        <CaseStatus c={o} />
      </span>
    </button>
  )
}

function RiskRow({ r, data }: { r: AtRiskCase; data: LunaData }) {
  const sheet = useLunaSheet()
  const urgent = r.priority === 'high' && isActiveRisk(r)
  const conv = data.conversations.find((c) => c.id === r.conversationId)!
  const waiting = isActiveRisk(r) ? waitingHours(conv) : 0
  return (
    <button
      type="button"
      onClick={() => sheet.open({ case: r.id })}
      className="relative grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2.5 rounded-[12px] px-3 py-3.5 text-left transition-colors hover:bg-panel-muted md:grid-cols-[200px_minmax(0,1fr)_92px_96px_104px] md:items-center"
    >
      {urgent && <span aria-hidden className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-bad" />}
      <CustomerCell c={r} data={data} />
      <span className="md:hidden">
        <CaseStatus c={r} />
      </span>
      <span className="col-span-2 min-w-0 md:col-span-1">
        <span className="block truncate text-[13.5px] text-ink">
          {r.title}
          <span className="text-ink-3"> · {ISSUE[r.issue]}</span>
        </span>
        <span className="block truncate text-[12.5px] text-ink-3">
          {waiting > 12 && <span className="text-warn">Waiting {Math.round(waiting / 24) >= 1 ? `${Math.round(waiting / 24)}d` : `${Math.round(waiting)}h`} for a reply · </span>}
          {r.summary}
        </span>
      </span>
      <span className="flex items-center gap-4 md:contents">
        <PriorityMark priority={r.priority} />
        <span className="text-[12.5px] text-ink-3">{relativeTime(r.lastActivityAt)}</span>
      </span>
      <span className="hidden md:block">
        <CaseStatus c={r} />
      </span>
    </button>
  )
}

/** Customer cases, not messages: one opportunity or one at-risk case per conversation. */
export function CasesSection() {
  const data = useLunaData()
  const [params, setParams] = useSearchParams()
  const view: View = params.get('view') === 'attention' ? 'attention' : 'opportunities'
  const q = params.get('q') ?? ''
  const waitingOnly = view === 'attention' && params.get('show') === 'waiting'
  const status = params.get('status') ?? (view === 'opportunities' ? 'open' : 'active')
  const sort = params.get('sort') ?? (view === 'opportunities' ? 'intent' : 'priority')

  const set = (next: Record<string, string | undefined>) =>
    setParams((p) => {
      const out = new URLSearchParams(p)
      for (const [k, v] of Object.entries(next)) {
        if (v) out.set(k, v)
        else out.delete(k)
      }
      return out
    })

  const openOpps = data.opportunities.filter(isOpenOpportunity)
  const activeRisks = data.risks.filter(isActiveRisk)

  const opps = useMemo(() => {
    const list = data.opportunities.filter((o) => (status === 'open' ? isOpenOpportunity(o) : o.status === status)).filter((o) => matches(o, data, q))
    return list.sort((a, b) => (sort === 'value' ? (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0) : sort === 'recent' ? b.lastActivityAt.localeCompare(a.lastActivityAt) : RANK[a.intent] - RANK[b.intent] || b.lastActivityAt.localeCompare(a.lastActivityAt)))
  }, [data, status, q, sort])

  const risks = useMemo(() => {
    const list = data.risks
      .filter((r) => (status === 'active' ? isActiveRisk(r) : r.status === status))
      .filter((r) => !waitingOnly || waitingHours(data.conversations.find((c) => c.id === r.conversationId)!) > 12)
      .filter((r) => matches(r, data, q))
    return list.sort((a, b) => (sort === 'recent' ? b.lastActivityAt.localeCompare(a.lastActivityAt) : RANK[a.priority] - RANK[b.priority] || b.lastActivityAt.localeCompare(a.lastActivityAt)))
  }, [data, status, q, sort, waitingOnly])

  const filters = view === 'opportunities' ? OPP_FILTERS : RISK_FILTERS
  const sorts = view === 'opportunities' ? OPP_SORTS : RISK_SORTS
  const countFor = (v: string) =>
    view === 'opportunities' ? data.opportunities.filter((o) => (v === 'open' ? isOpenOpportunity(o) : o.status === v)).length : data.risks.filter((r) => (v === 'active' ? isActiveRisk(r) : r.status === v)).length
  const rows = view === 'opportunities' ? opps : risks

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h2 className="text-[22px] font-medium tracking-[-0.02em] text-ink">Opportunities and attention</h2>
        <p className="mt-1 max-w-2xl text-[13.5px] text-ink-2">
          Customers Luna found worth a follow-up, one case per conversation. Luna suggests; you decide the status. Nothing here contacts a customer.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2" role="tablist" aria-label="View">
        {(
          [
            { id: 'opportunities', label: 'Sales opportunities', value: `${openOpps.length} open`, sub: `${openOpps.filter((o) => o.intent === 'high').length} high intent · ${money(openOpps.reduce((s, o) => s + (o.estimatedValue ?? 0), 0))} possible` },
            { id: 'attention', label: 'At-risk customers', value: `${activeRisks.length} active`, sub: `${activeRisks.filter((r) => r.priority === 'high').length} high priority · ${activeRisks.filter((r) => r.status === 'in_progress').length} in progress`, urgent: activeRisks.some((r) => r.priority === 'high') },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={view === t.id}
            onClick={() => set({ view: t.id, status: undefined, sort: undefined, show: undefined })}
            className={cn('rounded-[var(--radius-panel)] border px-5 py-4 text-left transition-colors', view === t.id ? 'border-ink bg-panel shadow-[var(--shadow-raised)]' : 'border-line bg-panel-muted hover:border-line-strong')}
          >
            <span className="block text-[13px] text-ink-2">{t.label}</span>
            <span className="tabular mt-0.5 block text-[26px] font-light tracking-[-0.02em] text-ink">{t.value}</span>
            <span className={cn('block text-[12.5px]', 'urgent' in t && t.urgent ? 'text-bad' : 'text-ink-3')}>{t.sub}</span>
          </button>
        ))}
      </div>

      <section aria-label={view === 'opportunities' ? 'Sales opportunities' : 'At-risk customers'} className="rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]">
        <div className="flex flex-col gap-3 border-b border-line-subtle p-4 sm:p-5 2xl:flex-row 2xl:items-center">
          <label className="relative block 2xl:w-60">
            <span className="sr-only">Search cases</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.7} />
            <input
              type="search"
              value={q}
              onChange={(e) => set({ q: e.target.value || undefined })}
              placeholder="Search customer or product"
              className="h-10 w-full rounded-[10px] border border-line bg-panel pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-3 hover:border-line-strong focus-visible:border-ink"
            />
          </label>
          <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
            <SegmentedControl
              label="Status"
              value={status}
              onValueChange={(v) => set({ status: v === filters[0].value ? undefined : v })}
              options={filters.map((f) => ({ value: f.value, label: f.label, accessory: <span className="tabular text-[11.5px] text-ink-3">{countFor(f.value)}</span> }))}
            />
          </div>
          <div className="2xl:ml-auto">
            <DropdownMenu label={`Sort: ${sorts.find((s) => s.id === sort)?.label ?? sorts[0].label}`} icon={<ArrowUpDown className="size-4" strokeWidth={1.6} />} items={sorts.map((s) => ({ label: s.label, onSelect: () => set({ sort: s.id === sorts[0].id ? undefined : s.id }) }))} />
          </div>
        </div>

        {waitingOnly && (
          <div className="px-5 pt-3">
            <button type="button" onClick={() => set({ show: undefined })} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[12.5px] text-ink-2 hover:border-line-strong hover:text-ink">
              Waiting over 12 hours for a reply <X className="size-3.5" strokeWidth={1.7} />
            </button>
          </div>
        )}

        <div className="hidden grid-cols-[200px_minmax(0,1fr)_92px_96px_104px] gap-4 px-6 pb-1 pt-3 text-[12px] text-ink-3 md:grid">
          <span>Customer</span>
          <span>{view === 'opportunities' ? 'Opportunity' : 'Issue'}</span>
          <span>{view === 'opportunities' ? 'Intent' : 'Priority'}</span>
          <span>Last activity</span>
          <span>Status</span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <p className="text-[14px] text-ink">{q ? 'No cases match' : view === 'opportunities' ? 'No opportunities here' : 'No customers here'}</p>
            <p className="text-[13px] text-ink-3">{q ? `Nothing found for “${q}”.` : 'Try another status.'}</p>
          </div>
        ) : (
          <ul className="flex flex-col px-2 pb-2 md:px-3">
            {rows.map((c) => (
              <li key={c.id} className="border-b border-line-subtle last:border-0">
                {c.type === 'opportunity' ? <OpportunityRow o={c} data={data} /> : <RiskRow r={c} data={data} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
