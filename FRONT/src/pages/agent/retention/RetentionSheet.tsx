import { ArrowUpRight, Check, ChevronDown, Clock, Copy, Hourglass, RotateCcw, Send, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { Button } from '@/components/arc/button/button'
import { Timeline } from '@/components/arc/timeline/timeline'
import { ISSUE, OPPORTUNITY_STATUS, RISK_STATUS } from '@/components/luna/labels'
import { CaseStatus, CustomerAvatar } from '@/components/luna/parts'
import { Thread } from '@/components/luna/Thread'
import { DISMISS_REASONS, KIND, OUTCOME, STATUS } from '@/components/retention/labels'
import { KindTag, Worth } from '@/components/retention/parts'
import { useRetentionActions, useRetentionData, useRetentionSheet, type RetentionData, type RetentionItem } from '@/components/retention/use-retention'
import { fieldClass } from '@/components/tracker/costing/parts'
import { useSheetGuard } from '@/components/tracker/costing/sheet-guard'
import { ProductSheet } from '@/components/tracker/costing/ProductSheet'
import type { OpportunityStatus, RiskStatus } from '@/data/luna/types'
import type { OutcomeKind } from '@/data/retention/types'
import { clockTime, relativeTime } from '@/lib/format'
import { channelWindow } from '@/lib/retention'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toasts'

function Section({ title, children, className, aside }: { title: string; children: React.ReactNode; className?: string; aside?: React.ReactNode }) {
  return (
    <section className={cn('rounded-[var(--radius-panel)] border border-line bg-panel shadow-[var(--shadow-resting)]', className)}>
      <header className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 className="text-[14px] font-medium text-ink">{title}</h2>
        {aside}
      </header>
      <div className="px-5 pb-5 pt-3">{children}</div>
    </section>
  )
}

/** Who, why, and where it came from in Luna. */
function WhyPanel({ it }: { it: RetentionItem }) {
  const l = it.luna
  const lunaHref = l ? `/krew/luna/workspace/cases?case=${l.id}` : `/krew/luna/workspace/conversations?conversation=${it.conv.id}`
  return (
    <Section title="Why this customer" aside={<Worth priority={it.rc.priority} kind={it.rc.kind} />}>
      <KindTag kind={it.rc.kind} />
      <p className="mt-3 text-[16px] leading-relaxed tracking-[-0.005em] text-ink">{it.rc.reason}</p>
      <div className="mt-4 rounded-[12px] border border-line-subtle bg-panel-muted p-3.5">
        <div className="flex items-center gap-2 text-[12.5px] text-ink-3">
          <AgentAvatar agentId="luna" size="xs" />
          <span className="flex-1">{l ? (l.type === 'opportunity' ? 'From Luna · sales opportunity' : `From Luna · ${ISSUE[l.issue].toLowerCase()}`) : 'From Luna · conversation signal'}</span>
          {l && <CaseStatus c={l} className="text-[12px]" />}
        </div>
        <p className="mt-2 text-[13.5px] text-ink">{l ? l.title : 'No case opened'}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{l ? (l.type === 'opportunity' ? l.explanation : l.summary) : it.rc.lunaSignal}</p>
        <Link to={lunaHref} className="group mt-2 inline-flex items-center gap-1 text-[12.5px] text-ink-2 hover:text-ink">
          Open in Luna <ArrowUpRight className="size-3.5" strokeWidth={1.7} />
        </Link>
      </div>
    </Section>
  )
}

/** Key messages first, then the story so far; the full thread one click away. */
function HappenedPanel({ it, data }: { it: RetentionItem; data: RetentionData }) {
  const [showThread, setShowThread] = useState(false)
  const evidenceIds = it.rc.evidence ?? it.luna?.evidence ?? []
  const evidence = it.conv.messages.filter((m) => evidenceIds.includes(m.id))
  const first = it.conv.messages[0]
  const lunaEvents = it.luna ? data.luna.events.filter((e) => e.caseId === it.luna!.id) : []
  const label = (s: string | undefined) => (!s || !it.luna ? '' : it.luna.type === 'opportunity' ? OPPORTUNITY_STATUS[s as OpportunityStatus]?.label : RISK_STATUS[s as RiskStatus]?.label)
  const events = [
    { id: 'start', at: first.at, actor: it.customer.name.split(' ')[0], title: 'Started the conversation', detail: <p dir="auto" className="line-clamp-2 text-[12.5px] text-ink-2">{first.text}</p> },
    ...lunaEvents.map((e) => ({ id: e.id, at: e.at, actor: e.by === 'luna' ? 'Luna' : 'You', title: e.kind === 'detected' ? 'Flagged it' : `${label(e.from)} to ${label(e.to)} in Luna`, detail: e.note ? <p className="text-[12.5px] text-ink-2">{e.note}</p> : undefined, tone: e.to === 'resolved' || e.to === 'converted' ? ('success' as const) : ('neutral' as const) })),
    ...data.events
      .filter((e) => e.caseId === it.rc.id)
      .map((e) => ({
        id: e.id,
        at: e.at,
        actor: e.by === 'retention' ? 'Retention' : 'You',
        title: { suggested: 'Suggested a follow-up', draft_edited: 'Edited the message', prepared: 'Approved the message', sent: 'Sent the follow-up', outcome: 'Recorded the outcome', dismissed: 'Dismissed it', reopened: 'Reopened it' }[e.kind],
        detail: e.note ? <p className="text-[12.5px] text-ink-2">{e.note}</p> : undefined,
        tone: e.kind === 'outcome' || e.kind === 'sent' ? ('success' as const) : ('neutral' as const),
      })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <Section title="What happened">
      {evidence.length > 0 && (
        <ol className="mb-5 flex flex-col gap-2">
          {evidence.map((m) => (
            <li key={m.id} className={cn('flex max-w-[92%] flex-col gap-0.5', m.from === 'brand' ? 'items-end self-end' : 'items-start self-start')}>
              <p dir="auto" className={cn('rounded-[14px] px-3 py-2 text-[13.5px] leading-relaxed', m.from === 'brand' ? 'bg-sunken text-ink-2' : 'border border-line bg-panel text-ink')}>
                {m.text}
              </p>
              <span className="px-1 text-[11px] text-ink-3">
                {m.from === 'brand' ? (m.author ?? 'Your team') : it.customer.name.split(' ')[0]} · {relativeTime(m.at)}, {clockTime(m.at)}
              </span>
            </li>
          ))}
        </ol>
      )}
      <Timeline label="Case story" now={Date.now()} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} events={events} />
      <button type="button" aria-expanded={showThread} onClick={() => setShowThread((v) => !v)} className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
        {showThread ? 'Hide' : 'Read'} the full conversation ({it.conv.messages.length} messages)
        <ChevronDown className={cn('size-4 transition-transform', showThread && 'rotate-180')} strokeWidth={1.7} />
      </button>
      {showThread && (
        <div className="mt-3">
          <Thread conv={it.conv} customer={it.customer} evidence={evidenceIds} />
        </div>
      )}
    </Section>
  )
}

function Chips({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} className={cn('rounded-full border px-2.5 py-1 text-[12.5px] transition-colors', value === o.value ? 'border-ink bg-inverse text-ink-inverse' : 'border-line text-ink-2 hover:border-line-strong hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** What to do, when, and the message itself. Every button records a person's decision; none of them contacts the customer. */
function ActPanel({ it }: { it: RetentionItem }) {
  const act = useRetentionActions()
  const { setDirty } = useSheetGuard()
  const [text, setTextState] = useState(it.draftText)
  const [mode, setMode] = useState<null | 'dismiss' | 'outcome'>(null)
  const [reason, setReason] = useState('')
  const [outcome, setOutcome] = useState<OutcomeKind | ''>('')
  const [orderRef, setOrderRef] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const setText = (t: string) => {
    setTextState(t)
    setDirty(t !== it.draftText)
  }
  const editable = it.rc.status === 'suggested' || it.rc.status === 'prepared'
  const changed = text !== it.draftText
  const ready = it.readiness.state === 'ready'
  const win = channelWindow(it.conv)
  const handle = it.customer.identities[0].handle
  const group = KIND[it.rc.kind].group
  const replied = it.rc.sentAt ? it.conv.messages.find((m) => m.from === 'customer' && m.at > it.rc.sentAt!) : undefined
  const done = (msg: string) => {
    setDirty(false)
    setMode(null)
    toast(msg)
  }

  function submitOutcome() {
    if (!outcome) return setError('Pick what happened.')
    if (outcome === 'bought' && !orderRef.trim()) return setError('Add the order number. A purchase needs evidence.')
    act.recordOutcome(it, { kind: outcome, orderRef: orderRef.trim() || undefined, note: note.trim() || undefined })
    done(`Outcome recorded for ${it.customer.name}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <Section title="What to do">
        <div
          className={cn(
            'flex items-start gap-2.5 rounded-[12px] px-3.5 py-3 text-[13px]',
            it.lane === 'done' ? 'bg-panel-muted text-ink-2' : ready ? 'bg-good-soft text-ink' : 'bg-warn-soft text-ink',
          )}
        >
          {it.lane === 'done' ? <Check className="mt-0.5 size-4 shrink-0 text-good" strokeWidth={1.7} /> : ready ? <Clock className="mt-0.5 size-4 shrink-0 text-good" strokeWidth={1.7} /> : <Hourglass className="mt-0.5 size-4 shrink-0 text-warn" strokeWidth={1.7} />}
          <span>{it.rc.status === 'sent' ? `Sent ${relativeTime(it.rc.sentAt!)}. ${replied ? `${it.customer.name.split(' ')[0]} replied ${relativeTime(replied.at)}.` : 'No reply yet.'}` : it.rc.status === 'done' ? `Done: ${OUTCOME[it.rc.outcome!.kind].label.toLowerCase()}.` : it.rc.status === 'dismissed' ? `Dismissed: ${it.rc.dismissReason?.toLowerCase()}.` : it.readiness.reason}</span>
        </div>
        <p className="mt-4 text-[15px] text-ink">{it.rc.action.label}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{it.rc.action.detail}</p>
        <dl className="mt-4 grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-2 border-t border-line-subtle pt-3 text-[13px]">
          <dt className="text-ink-3">When</dt>
          <dd className="text-ink">
            {it.rc.timing.label}
            <span className="block text-[12.5px] text-ink-3">{it.rc.timing.rationale}</span>
          </dd>
          <dt className="text-ink-3">Channel</dt>
          <dd className="text-ink">
            Instagram DM to @{handle}
            {editable && <span className="block text-[12.5px] text-ink-3">{win.text}</span>}
          </dd>
        </dl>
      </Section>

      <Section title={it.rc.status === 'sent' || it.rc.status === 'done' ? 'Message that was sent' : 'Follow-up message'} aside={it.edited && editable ? <span className="text-[12px] text-ink-3">Edited by you</span> : <span className="text-[12px] text-ink-3">{STATUS[it.rc.status].label}</span>}>
        {editable ? (
          <textarea dir="auto" value={text} onChange={(e) => setText(e.target.value)} rows={6} aria-label="Follow-up message" className={cn(fieldClass, 'h-auto resize-y py-2.5 leading-relaxed')} />
        ) : (
          <p dir="auto" className="whitespace-pre-wrap rounded-[14px] bg-sunken px-3.5 py-2.5 text-[14px] leading-relaxed text-ink-2">
            {it.rc.sentText ?? it.draftText}
          </p>
        )}
        <div className="mt-3">
          <p className="text-[12px] text-ink-3">Based on</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {it.rc.draft.uses.map((u) => (
              <li key={u} className="rounded-full border border-line px-2 py-0.5 text-[12px] text-ink-2">
                {u}
              </li>
            ))}
          </ul>
        </div>

        {mode === 'dismiss' && (
          <div className="mt-4 rounded-[12px] border border-line bg-panel-muted p-4">
            <p className="text-[13.5px] text-ink">Why dismiss this follow-up?</p>
            <div className="mt-2.5">
              <Chips options={DISMISS_REASONS.map((r) => ({ value: r, label: r }))} value={reason} onChange={(v) => (setReason(v), setError(''))} />
            </div>
            {error && <p className="mt-2 text-[12.5px] text-warn">{error}</p>}
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => (reason ? (act.dismiss(it, reason), done(`Dismissed ${it.customer.name}`)) : setError('Pick a reason.'))}>
                Dismiss
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {mode === 'outcome' && (
          <div className="mt-4 rounded-[12px] border border-line bg-panel-muted p-4">
            <p className="text-[13.5px] text-ink">What happened after the message?</p>
            {replied && (
              <p dir="auto" className="mt-1 text-[12.5px] text-ink-3">
                Latest reply: “{replied.text}”
              </p>
            )}
            <div className="mt-2.5">
              <Chips
                options={(Object.keys(OUTCOME) as OutcomeKind[]).filter((k) => OUTCOME[k].forKinds === 'all' || OUTCOME[k].forKinds === group).map((k) => ({ value: k, label: OUTCOME[k].label }))}
                value={outcome}
                onChange={(v) => (setOutcome(v as OutcomeKind), setError(''))}
              />
            </div>
            {outcome === 'bought' && (
              <label className="mt-3 flex flex-col gap-1">
                <span className="text-[12.5px] text-ink-2">Order number</span>
                <input value={orderRef} onChange={(e) => (setOrderRef(e.target.value), setError(''))} placeholder="For example SH-10530" className={fieldClass} />
                <span className="text-[12px] text-ink-3">This also marks Luna’s opportunity as converted.</span>
              </label>
            )}
            <label className="mt-3 flex flex-col gap-1">
              <span className="text-[12.5px] text-ink-2">Note (optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
            </label>
            {error && <p className="mt-2 text-[12.5px] text-warn">{error}</p>}
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={submitOutcome}>
                Save outcome
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {it.rc.status === 'done' && it.rc.outcome && (
          <div className="mt-4 rounded-[12px] border border-line-subtle p-3.5 text-[13px]">
            <p className={cn(OUTCOME[it.rc.outcome.kind].tone === 'good' ? 'text-good' : OUTCOME[it.rc.outcome.kind].tone === 'bad' ? 'text-bad' : 'text-ink-2')}>{OUTCOME[it.rc.outcome.kind].label}</p>
            {(it.rc.outcome.note || it.rc.outcome.orderRef) && <p className="mt-0.5 text-ink-2">{[it.rc.outcome.orderRef && `Order ${it.rc.outcome.orderRef}`, it.rc.outcome.note].filter(Boolean).join(' · ')}</p>}
            <p className="mt-0.5 text-[12px] text-ink-3">Recorded {relativeTime(it.rc.outcome.at)}</p>
          </div>
        )}

        {!mode && (
          <div className="mt-4 flex flex-wrap gap-2">
            {it.rc.status === 'suggested' && it.lane !== 'done' && (
              <Button size="sm" onClick={() => (act.prepare(it, text), done(`Message approved for ${it.customer.name}`))}>
                <Check className="size-4" strokeWidth={1.7} /> Approve message
              </Button>
            )}
            {it.rc.status === 'prepared' && it.lane !== 'done' && (
              <>
                {changed && (
                  <Button size="sm" variant="secondary" onClick={() => (act.saveDraft(it, text), done('Message saved'))}>
                    Save changes
                  </Button>
                )}
                <Button size="sm" disabled={!ready} onClick={() => (act.markSent(it, text), done(`Marked as sent to ${it.customer.name}`))}>
                  <Send className="size-4" strokeWidth={1.7} /> I sent it
                </Button>
              </>
            )}
            {editable && it.lane !== 'done' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard?.writeText(text)
                  toast('Message copied')
                }}
              >
                <Copy className="size-4" strokeWidth={1.7} /> Copy
              </Button>
            )}
            {editable && it.edited && (
              <Button size="sm" variant="ghost" onClick={() => (act.resetDraft(it), setText(it.rc.draft.text), done('Back to Retention’s draft'))}>
                <Undo2 className="size-4" strokeWidth={1.7} /> Retention’s draft
              </Button>
            )}
            {it.rc.status === 'sent' && (
              <Button size="sm" onClick={() => setMode('outcome')}>
                Record outcome
              </Button>
            )}
            {(editable || it.rc.status === 'sent') && it.lane !== 'done' && (
              <Button size="sm" variant="ghost" onClick={() => setMode('dismiss')}>
                Dismiss
              </Button>
            )}
            {(it.rc.status === 'done' || it.rc.status === 'dismissed') && (
              <Button size="sm" variant="secondary" onClick={() => (act.reopen(it), done('Reopened'))}>
                <RotateCcw className="size-4" strokeWidth={1.7} /> Reopen
              </Button>
            )}
          </div>
        )}
        {it.rc.status === 'prepared' && !ready && it.lane !== 'done' && <p className="mt-2 text-[12.5px] text-ink-3">“I sent it” unlocks once the follow-up is ready.</p>}
        {editable && it.lane !== 'done' && <p className="mt-3 border-t border-line-subtle pt-3 text-[12px] text-ink-3">KREW does not send messages yet. Copy it, send it from Instagram, then mark it sent.</p>}
      </Section>
    </div>
  )
}

export function RetentionSheet() {
  const data = useRetentionData()
  const sheet = useRetentionSheet()
  const it = sheet.caseId ? data.items.find((i) => i.rc.id === sheet.caseId) : undefined
  if (!it) return null
  return (
    <ProductSheet
      open
      onClose={() => sheet.open(null)}
      viewKey={it.rc.id}
      thumb={<CustomerAvatar name={it.customer.name} size={40} />}
      name={it.customer.name}
      meta={
        <span className="inline-flex items-center gap-1.5">
          @{it.customer.identities[0].handle}
          {it.customer.city && ` · ${it.customer.city}`} · {KIND[it.rc.kind].label}
        </span>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <WhyPanel it={it} />
          <HappenedPanel it={it} data={data} />
        </div>
        <div className="lg:sticky lg:top-0">
          <ActPanel key={`${it.rc.id}:${it.rc.status}`} it={it} />
        </div>
      </div>
    </ProductSheet>
  )
}

