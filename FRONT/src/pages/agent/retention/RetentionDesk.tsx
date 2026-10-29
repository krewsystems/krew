import { ArrowRight, ArrowUpDown, ChevronDown, HeartHandshake, Inbox, Layers, Search, ShoppingBag, TrendingUp, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { DropdownMenu } from '@/components/arc/dropdown-menu/dropdown-menu'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { ISSUE } from '@/components/luna/labels'
import { ChannelIcon, CustomerAvatar } from '@/components/luna/parts'
import { KIND, OUTCOME } from '@/components/retention/labels'
import { KindIcon, KindTag, Worth } from '@/components/retention/parts'
import { useRetentionData, useRetentionSheet, type RetentionItem } from '@/components/retention/use-retention'
import { money, relativeTime } from '@/lib/format'
import type { Lane } from '@/lib/retention'
import { cn } from '@/lib/utils'
import { RetentionSheet } from './RetentionSheet'

type KindFilter = 'all' | 'recovery' | 'sales'
type Sort = 'priority' | 'value' | 'recent'

const RANK = { high: 0, medium: 1, low: 2 }
const LANES: { value: Lane; label: string }[] = [
  { value: 'ready', label: 'Ready now' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'sent', label: 'Sent' },
  { value: 'done', label: 'Done' },
]
const SORTS: { id: Sort; label: string }[] = [
  { id: 'priority', label: 'Priority' },
  { id: 'value', label: 'Value' },
  { id: 'recent', label: 'Most recent' },
]

const lastAt = (it: RetentionItem) => it.conv.messages.at(-1)!.at
const isRecovery = (it: RetentionItem) => KIND[it.rc.kind].group === 'recovery'
const isActive = (it: RetentionItem) => it.lane !== 'done'

/** Recovery before sales at the same priority: an unhappy customer outranks a possible sale. */
function byPriority(a: RetentionItem, b: RetentionItem) {
  return RANK[a.rc.priority] - RANK[b.rc.priority] || Number(!isRecovery(a)) - Number(!isRecovery(b)) || lastAt(b).localeCompare(lastAt(a))
}

function matches(it: RetentionItem, q: string) {
  if (!q) return true
  const text = [it.customer.name, it.customer.identities[0].handle, it.rc.reason, it.rc.action.label, KIND[it.rc.kind].label].join(' ').toLowerCase()
  return text.includes(q.toLowerCase())
}

/** A headline figure that is also a filter. */
function Tile({ icon: Icon, accent, label, value, sub, subTone, selected, onClick }: { icon: LucideIcon; accent: string; label: string; value: string; sub: string; subTone?: 'bad' | 'good'; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn('flex flex-col rounded-[var(--radius-panel)] border px-5 py-4 text-left transition-colors', selected ? 'border-ink bg-panel shadow-[var(--shadow-raised)]' : 'border-line bg-panel shadow-[var(--shadow-resting)] hover:border-line-strong')}
    >
      <span className="flex items-center gap-2.5">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: `color-mix(in oklab, ${accent} 14%, var(--surface))`, color: `color-mix(in oklab, ${accent} 85%, var(--foreground))` }}>
          <Icon className="size-4" strokeWidth={1.7} />
        </span>
        <span className="text-[13px] text-ink-2">{label}</span>
      </span>
      <span className="tabular mt-3 text-[28px] font-light leading-none tracking-[-0.025em] text-ink">{value}</span>
      <span className={cn('mt-1.5 text-[12.5px]', subTone === 'bad' ? 'text-[color-mix(in_oklab,var(--agent-retention)_85%,var(--foreground))]' : subTone === 'good' ? 'text-good' : 'text-ink-3')}>{sub}</span>
    </button>
  )
}

/** The single most useful follow-up, shown large with its message so it can be acted on at a glance. */
function UpNext({ it }: { it: RetentionItem }) {
  const sheet = useRetentionSheet()
  const k = KIND[it.rc.kind]
  return (
    <section aria-label="Start here" className="relative overflow-hidden rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-raised)]">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: `color-mix(in oklab, ${k.accent} 70%, transparent)` }} />
      <div className="grid gap-6 p-6 pl-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div className="min-w-0">
          <p className="text-[12.5px] text-ink-3">Start here</p>
          <div className="mt-3 flex items-center gap-3">
            <CustomerAvatar name={it.customer.name} size={44} />
            <div className="min-w-0">
              <p className="truncate text-[17px] font-medium tracking-[-0.01em] text-ink">{it.customer.name}</p>
              <p className="truncate text-[12.5px] text-ink-3">
                @{it.customer.identities[0].handle}
                {it.customer.city && ` · ${it.customer.city}`}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <KindTag kind={it.rc.kind} />
            <Worth priority={it.rc.priority} kind={it.rc.kind} />
            {it.value > 0 && <span className="tabular text-[12.5px] text-ink-2">{money(it.value)} {isRecovery(it) ? 'order affected' : 'possible'}</span>}
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-ink">{it.rc.reason}</p>
        </div>
        <div className="flex min-w-0 flex-col">
          <p className="text-[12.5px] text-ink-3">
            {it.rc.action.label} · {it.rc.timing.label.toLowerCase()}
          </p>
          <p dir="auto" className="mt-2 line-clamp-5 whitespace-pre-wrap rounded-[16px] rounded-br-[6px] bg-sunken px-4 py-3 text-[14px] leading-relaxed text-ink-2">
            {it.draftText}
          </p>
          <button type="button" onClick={() => sheet.open(it.rc.id)} className="group mt-4 inline-flex items-center gap-1.5 self-start rounded-[10px] bg-inverse px-3.5 py-2 text-[13.5px] text-ink-inverse transition-opacity hover:opacity-90">
            Review follow-up <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} />
          </button>
        </div>
      </div>
    </section>
  )
}

function StatusPill({ it }: { it: RetentionItem }) {
  const s =
    it.lane === 'ready'
      ? { label: 'Ready', dot: 'bg-good' }
      : it.lane === 'waiting'
        ? { label: 'Waiting', dot: 'bg-warn' }
        : it.lane === 'sent'
          ? { label: 'Sent', dot: 'bg-sales' }
          : it.rc.status === 'done' && it.rc.outcome
            ? { label: OUTCOME[it.rc.outcome.kind].label, dot: OUTCOME[it.rc.outcome.kind].tone === 'good' ? 'bg-good' : OUTCOME[it.rc.outcome.kind].tone === 'bad' ? 'bg-bad' : 'bg-line-strong' }
            : it.rc.status === 'dismissed'
              ? { label: 'Dismissed', dot: 'bg-line-strong' }
              : { label: it.readiness.short, dot: 'bg-line-strong' }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-2">
      <span className={cn('size-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  )
}

function When({ it }: { it: RetentionItem }) {
  if (it.lane === 'ready') return <span className="text-ink">{it.rc.timing.label}</span>
  if (it.lane === 'waiting') return <span className="text-warn">{it.readiness.short}</span>
  if (it.lane === 'sent') return <span className="text-ink-2">Sent {relativeTime(it.rc.sentAt!)}</span>
  return <span className="text-ink-3">{it.rc.outcome ? relativeTime(it.rc.outcome.at) : '–'}</span>
}

const COLS = 'md:grid-cols-[200px_minmax(0,1fr)_80px_92px_132px_150px]'

function Row({ it }: { it: RetentionItem }) {
  const sheet = useRetentionSheet()
  const urgent = isRecovery(it) && it.rc.priority === 'high' && isActive(it)
  const replied = it.lane === 'sent' && it.conv.messages.some((m) => m.from === 'customer' && m.at > it.rc.sentAt!)
  return (
    <button type="button" onClick={() => sheet.open(it.rc.id)} className={cn('relative grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2.5 rounded-[12px] px-3 py-3.5 text-left transition-colors hover:bg-panel-muted md:items-center', COLS)}>
      {urgent && <span aria-hidden className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-[var(--agent-retention)]" />}
      <span className="flex min-w-0 items-center gap-3">
        <CustomerAvatar name={it.customer.name} size={36} />
        <span className="min-w-0">
          <span className="block truncate text-[14px] text-ink">{it.customer.name}</span>
          <span className="flex items-center gap-1.5 truncate text-[12.5px] text-ink-3">
            <ChannelIcon channel={it.conv.channel} size={12} />@{it.customer.identities[0].handle}
          </span>
        </span>
      </span>
      <span className="md:hidden">
        <StatusPill it={it} />
      </span>
      <span className="col-span-2 flex min-w-0 items-start gap-3 md:col-span-1">
        <KindIcon kind={it.rc.kind} size={30} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 text-[13.5px] text-ink">
            {it.rc.action.label}
            {it.rc.status === 'prepared' && isActive(it) && <span className="text-[12px] text-sales">Message approved</span>}
            {replied && <span className="text-[12px] text-good">Replied</span>}
          </span>
          <span className="block truncate text-[12.5px] text-ink-3">{it.luna?.type === 'risk' ? `${ISSUE[it.luna.issue]} · ` : ''}{it.rc.reason}</span>
        </span>
      </span>
      <span className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] md:contents">
        <span className="tabular text-[13.5px] text-ink md:text-right">{it.value > 0 ? money(it.value) : <span className="text-ink-3">–</span>}</span>
        <Worth priority={it.rc.priority} kind={it.rc.kind} />
        <span className="text-[12.5px]">
          <When it={it} />
        </span>
      </span>
      <span className="hidden md:block">
        <StatusPill it={it} />
      </span>
    </button>
  )
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-sunken text-ink-3">
        <Inbox className="size-[18px]" strokeWidth={1.6} />
      </span>
      <p className="mt-1 text-[14px] text-ink">{title}</p>
      <p className="max-w-sm text-[13px] text-ink-3">{body}</p>
    </div>
  )
}

const EMPTY: Record<Lane, { title: string; body: string }> = {
  ready: { title: 'Nothing ready right now', body: 'Follow-ups appear here when Luna’s cases are resolved, stock lands or the timing is right. Check Waiting for what is coming.' },
  waiting: { title: 'Nothing waiting', body: 'Follow-ups that depend on a fix, a restock or a date wait here.' },
  sent: { title: 'Nothing sent yet', body: 'When you mark a follow-up as sent, it waits here until you record what happened.' },
  done: { title: 'Nothing finished yet', body: 'Outcomes and dismissed follow-ups collect here.' },
}

/** Retention's desk: follow-ups worth making, built only from Luna's DM findings. The most useful case rises to the top. */
export function RetentionDesk() {
  const data = useRetentionData()
  const [params, setParams] = useSearchParams()
  const [showExcluded, setShowExcluded] = useState(false)
  const kind = (params.get('kind') as KindFilter) || 'all'
  const lane = (params.get('lane') as Lane) || 'ready'
  const sort = (params.get('sort') as Sort) || 'priority'
  const q = params.get('q') ?? ''
  const set = (next: Record<string, string | undefined>) =>
    setParams((p) => {
      const out = new URLSearchParams(p)
      for (const [k, v] of Object.entries(next)) {
        if (v) out.set(k, v)
        else out.delete(k)
      }
      return out
    })

  const all = data.items
  const active = all.filter(isActive)
  const recovery = active.filter(isRecovery)
  const sales = active.filter((i) => !isRecovery(i))
  const ready = active.filter((i) => i.lane === 'ready')
  const outcomes = all.filter((i) => i.rc.status === 'done' && i.rc.outcome)
  const good = outcomes.filter((i) => OUTCOME[i.rc.outcome!.kind].tone === 'good')
  const bought = outcomes.filter((i) => i.rc.outcome!.kind === 'bought').reduce((s, i) => s + i.value, 0)
  const sum = (list: RetentionItem[]) => list.reduce((s, i) => s + i.value, 0)

  const ofKind = all.filter((i) => kind === 'all' || (kind === 'recovery' ? isRecovery(i) : !isRecovery(i))).filter((i) => matches(i, q))
  const rows = ofKind
    .filter((i) => i.lane === lane)
    .sort((a, b) => (sort === 'value' ? b.value - a.value : sort === 'recent' ? lastAt(b).localeCompare(lastAt(a)) : byPriority(a, b)))
  const top = [...ready].sort(byPriority)[0]
  const showTop = top && lane === 'ready' && !q && (kind === 'all' || (kind === 'recovery') === isRecovery(top))
  const tableRows = showTop ? rows.filter((r) => r.rc.id !== top.rc.id) : rows
  const recoveriesReady = ready.filter(isRecovery).length

  const headline = top
    ? `${ready.length} ${ready.length === 1 ? 'customer is' : 'customers are'} ready for a follow-up${recoveriesReady ? `, ${recoveriesReady} of them recovering from a bad experience` : ''}. Start with ${top.customer.name.split(' ')[0]}.`
    : active.length
      ? `Nothing is ready right now. ${active.length} follow-ups are waiting on Luna’s cases, stock or timing.`
      : 'Nothing needs a follow-up right now.'

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Today at the desk" className="flex gap-3.5">
        <AgentAvatar agentId="retention" size="md" />
        <div>
          <p className="text-[12.5px] text-ink-3">Follow-ups from your customer DMs</p>
          <p className="mt-1 max-w-3xl text-[19px] leading-snug tracking-[-0.015em] text-ink">{headline}</p>
        </div>
      </section>

      <div role="tablist" aria-label="Follow-up type" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon={Layers} accent="var(--foreground)" label="All follow-ups" value={`${active.length} open`} sub={`${ready.length} ready now · ${active.filter((i) => i.lane === 'sent').length} awaiting a reply`} selected={kind === 'all' && lane !== 'done'} onClick={() => set({ kind: undefined, lane: undefined })} />
        <Tile
          icon={HeartHandshake}
          accent="var(--agent-retention)"
          label="Recovery"
          value={money(sum(recovery))}
          sub={`${recovery.length} customers to win back · ${recovery.filter((i) => i.rc.priority === 'high').length} high`}
          subTone={recovery.some((i) => i.rc.priority === 'high') ? 'bad' : undefined}
          selected={kind === 'recovery'}
          onClick={() => set({ kind: kind === 'recovery' ? undefined : 'recovery', lane: undefined })}
        />
        <Tile icon={ShoppingBag} accent="var(--sales)" label="Sales follow-ups" value={money(sum(sales))} sub={`${sales.length} customers · ${sales.filter((i) => i.rc.priority === 'high').length} high intent`} selected={kind === 'sales'} onClick={() => set({ kind: kind === 'sales' ? undefined : 'sales', lane: undefined })} />
        <Tile
          icon={TrendingUp}
          accent="var(--success)"
          label="Results"
          value={`${good.length} won back`}
          sub={outcomes.length ? [bought > 0 && `${money(bought)} bought`, `${outcomes.length} ${outcomes.length === 1 ? 'outcome' : 'outcomes'} recorded`].filter(Boolean).join(' · ') : 'No outcomes recorded yet'}
          subTone={good.length ? 'good' : undefined}
          selected={kind === 'all' && lane === 'done'}
          onClick={() => set({ kind: undefined, lane: 'done' })}
        />
      </div>
      <p className="-mt-3 text-[12px] text-ink-3">Recovery shows the value of the orders that went wrong; sales shows possible order value. Both from list prices, not revenue.</p>

      {showTop && <UpNext it={top} />}

      <section aria-label="Follow-ups" className="rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]">
        <div className="flex flex-col gap-3 border-b border-line-subtle p-4 sm:p-5 xl:flex-row xl:items-center">
          <label className="relative block xl:w-60">
            <span className="sr-only">Search follow-ups</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.7} />
            <input
              type="search"
              value={q}
              onChange={(e) => set({ q: e.target.value || undefined })}
              placeholder="Search customer or reason"
              className="h-10 w-full rounded-[10px] border border-line bg-panel pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-3 hover:border-line-strong focus-visible:border-ink"
            />
          </label>
          <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
            <SegmentedControl
              label="Lane"
              value={lane}
              onValueChange={(v) => set({ lane: v === 'ready' ? undefined : v })}
              options={LANES.map((l) => ({ value: l.value, label: l.label, accessory: <span className="tabular text-[11.5px] text-ink-3">{ofKind.filter((i) => i.lane === l.value).length}</span> }))}
            />
          </div>
          <div className="xl:ml-auto">
            <DropdownMenu label={`Sort: ${SORTS.find((s) => s.id === sort)!.label}`} icon={<ArrowUpDown className="size-4" strokeWidth={1.6} />} items={SORTS.map((s) => ({ label: s.label, onSelect: () => set({ sort: s.id === 'priority' ? undefined : s.id }) }))} />
          </div>
        </div>

        {tableRows.length > 0 && (
          <div className={cn('hidden gap-4 px-6 pb-1 pt-3 text-[12px] text-ink-3 md:grid', COLS)}>
            <span>Customer</span>
            <span>Follow-up</span>
            <span className="text-right">Value</span>
            <span>Priority</span>
            <span>{lane === 'done' ? 'Recorded' : 'When'}</span>
            <span>Status</span>
          </div>
        )}

        {rows.length === 0 ? (
          q ? <Empty title="No follow-ups match" body={`Nothing found for “${q}”.`} /> : <Empty {...EMPTY[lane]} />
        ) : tableRows.length === 0 ? (
          <p className="px-6 py-8 text-center text-[13px] text-ink-3">That is the only follow-up here. It is shown above.</p>
        ) : (
          <ul className="flex flex-col px-2 pb-2 md:px-3">
            {tableRows.map((it) => (
              <li key={it.rc.id} className="border-b border-line-subtle last:border-0">
                <Row it={it} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[var(--radius-panel)] border border-line-subtle px-5 py-4">
        <button type="button" aria-expanded={showExcluded} onClick={() => setShowExcluded((v) => !v)} className="flex w-full items-center gap-3 text-left">
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] text-ink">Why some customers aren’t here</span>
            <span className="block text-[12.5px] text-ink-3">
              {data.notTaken.length} Luna {data.notTaken.length === 1 ? 'case' : 'cases'} and {data.routineCount} routine conversations did not become follow-ups.
            </span>
          </span>
          <ChevronDown className={cn('size-4 shrink-0 text-ink-3 transition-transform', showExcluded && 'rotate-180')} strokeWidth={1.7} />
        </button>
        {showExcluded && (
          <div className="mt-3 border-t border-line-subtle pt-3">
            <ul className="flex flex-col gap-2.5">
              {data.notTaken.map(({ c, reason }) => (
                <li key={c.id} className="flex items-start gap-3 text-[13px]">
                  <CustomerAvatar name={data.luna.customer(c.customerId).name} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="text-ink">{data.luna.customer(c.customerId).name}</span>
                    <span className="text-ink-3"> · {c.type === 'opportunity' ? c.title : ISSUE[c.issue]}</span>
                    <span className="block text-ink-2">{reason}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12.5px] text-ink-3">
              Routine conversations (questions that were answered, order updates, praise, restock requests without a personal ask) stay with Luna. Retention only takes a customer when a personal follow-up could change how things end.
            </p>
          </div>
        )}
      </section>

      <p className="text-[12px] text-ink-3">Sample follow-ups built on Luna’s sample conversations. Retention never sends anything: you approve the message, send it yourself, and record what happened.</p>
      <RetentionSheet />
    </div>
  )
}
