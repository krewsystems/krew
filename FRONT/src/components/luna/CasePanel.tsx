import { Check, CircleCheck, PackageSearch, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/arc/button/button'
import { Timeline } from '@/components/arc/timeline/timeline'
import { fieldClass } from '@/components/tracker/costing/parts'
import type { CaseEvent, LunaCase, OpportunityStatus, RiskStatus } from '@/data/luna/types'
import { money, relativeTime } from '@/lib/format'
import { notTakenReason } from '@/lib/retention'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toasts'
import { CLOSE_REASONS, DISMISS_REASONS, ISSUE, OPPORTUNITY_STATUS, RETENTION_ICON, RISK_STATUS } from './labels'
import { CaseStatus, IntentMeter, PriorityMark } from './parts'
import { useRetentionData } from '@/components/retention/use-retention'
import { STATUS as RETENTION_STATUS } from '@/components/retention/labels'
import { Link } from 'react-router-dom'
import { useWorkspace } from '@/store/krew'
import { useCaseActions } from './use-luna'

type Step = null | 'convert' | 'close' | 'resolve' | 'dismiss'

function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          onClick={() => onChange(o)}
          className={cn('rounded-full border px-2.5 py-1 text-[12.5px] transition-colors', value === o ? 'border-ink bg-inverse text-ink-inverse' : 'border-line text-ink-2 hover:border-line-strong hover:text-ink')}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

/** The small form behind Converted, Closed, Resolved and Dismissed. Each asks only what makes the decision honest. */
function DecisionForm({ c, step, onDone, onCancel }: { c: LunaCase; step: Exclude<Step, null>; onDone: () => void; onCancel: () => void }) {
  const decide = useCaseActions()
  const match = c.type === 'opportunity' ? c.orderMatch : undefined
  const [orderRef, setOrderRef] = useState(step === 'convert' && match ? match.orderRef : '')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const copy = {
    convert: { title: 'Mark as converted', hint: 'Luna never marks a sale on her own. Add the order that confirms it, or a short note on how you know.', button: 'Mark converted' },
    close: { title: 'Close this opportunity', hint: 'Why is it not going ahead?', button: 'Close opportunity' },
    resolve: { title: 'Mark as resolved', hint: 'What was done? This note travels with the case if Retention follows up later.', button: 'Mark resolved' },
    dismiss: { title: 'Dismiss this case', hint: 'Why does it not need follow-up?', button: 'Dismiss case' },
  }[step]

  function submit() {
    if (step === 'convert' && !orderRef.trim() && !note.trim()) return setError('Add the order number or a short note.')
    if ((step === 'close' || step === 'dismiss') && !reason) return setError('Pick a reason.')
    const status = { convert: 'converted', close: 'closed', resolve: 'resolved', dismiss: 'dismissed' }[step] as OpportunityStatus | RiskStatus
    decide(c, { status, orderRef: orderRef.trim() || undefined, reason: reason || undefined, note: note.trim() || undefined })
    toast(`${c.type === 'opportunity' ? OPPORTUNITY_STATUS[status as OpportunityStatus].label : RISK_STATUS[status as RiskStatus].label}: ${c.title}`)
    onDone()
  }

  return (
    <div className="mt-4 rounded-[12px] border border-line bg-panel-muted p-4">
      <p className="text-[13.5px] font-medium text-ink">{copy.title}</p>
      <p className="mt-0.5 text-[12.5px] text-ink-3">{copy.hint}</p>
      <div className="mt-3 flex flex-col gap-3">
        {step === 'convert' && (
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] text-ink-2">Order number</span>
            <input value={orderRef} onChange={(e) => (setOrderRef(e.target.value), setError(''))} placeholder="For example SH-10512" className={fieldClass} />
          </label>
        )}
        {(step === 'close' || step === 'dismiss') && <Chips options={step === 'close' ? CLOSE_REASONS : DISMISS_REASONS} value={reason} onChange={(v) => (setReason(v), setError(''))} />}
        <label className="flex flex-col gap-1">
          <span className="text-[12.5px] text-ink-2">Note {step === 'convert' ? '' : '(optional)'}</span>
          <textarea value={note} onChange={(e) => (setNote(e.target.value), setError(''))} rows={2} className={cn(fieldClass, 'h-auto py-2')} placeholder={step === 'resolve' ? 'For example: sent two replacement mugs' : ''} />
        </label>
        {error && <p className="text-[12.5px] text-warn">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={submit}>
            {copy.button}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Where this case stands with Retention: the follow-up it became, or why it did not become one. */
function RetentionLine({ c }: { c: LunaCase }) {
  const ws = useWorkspace()
  const retention = useRetentionData()
  const hired = ws.hires.some((h) => h.agentId === 'retention' && h.status === 'active')
  const it = retention.items.find((i) => i.rc.lunaCaseId === c.id)
  const lane = it ? { ready: 'ready to send', waiting: 'waiting', sent: 'sent, waiting for a reply', done: 'done' }[it.lane] : null
  return (
    <div className="mt-5 flex gap-2.5 border-t border-line-subtle pt-4 text-[12.5px]">
      <RETENTION_ICON className={cn('mt-0.5 size-4 shrink-0', it ? 'text-[var(--agent-retention)]' : 'text-ink-3')} strokeWidth={1.6} />
      <p className="text-ink-3">
        {it ? (
          <>
            <span className="text-ink-2">Retention follow-up: {lane}.</span> {it.lane === 'waiting' ? it.readiness.reason : RETENTION_STATUS[it.rc.status].label + '.'}{' '}
            {hired && (
              <Link to={`/krew/retention/workspace?case=${it.rc.id}`} className="text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
                Open in Retention
              </Link>
            )}
          </>
        ) : (
          <>
            <span className="text-ink-2">No Retention follow-up.</span> {notTakenReason(c)}
          </>
        )}
      </p>
    </div>
  )
}

/** One case: what Luna found, why, and the person's decision. */
export function CasePanel({ c, events }: { c: LunaCase; events: CaseEvent[] }) {
  const decide = useCaseActions()
  const [step, setStep] = useState<Step>(null)
  const isOpp = c.type === 'opportunity'
  const active = isOpp ? c.status === 'new' || c.status === 'followed_up' : c.status === 'open' || c.status === 'in_progress'
  const history = events.filter((e) => e.caseId === c.id)
  const orderRef = c.type === 'opportunity' ? c.orderRef : undefined
  const decision = [orderRef && `Order ${orderRef}`, c.reason, c.note].filter((v, i, a): v is string => !!v && a.indexOf(v) === i)

  function quick(status: OpportunityStatus | RiskStatus, label: string) {
    decide(c, { status })
    toast(`${label}: ${c.title}`)
    setStep(null)
  }

  return (
    <section aria-label="Case" className={cn('rounded-[var(--radius-panel)] border bg-panel shadow-[var(--shadow-resting)]', !isOpp && c.priority === 'high' && active ? 'border-[color-mix(in_oklab,var(--danger)_35%,var(--border))]' : 'border-line')}>
      <div className="px-5 pb-5 pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-ink-3">{isOpp ? 'Sales opportunity' : ISSUE[c.issue]}</p>
          <CaseStatus c={c} />
        </div>
        <h2 className="mt-1 text-[17px] font-medium tracking-[-0.01em] text-ink">{c.title}</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{isOpp ? c.explanation : c.summary}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line-subtle pt-4 text-[13px]">
          <div>
            <dt className="text-[12px] text-ink-3">{isOpp ? 'Purchase intent' : 'Priority'}</dt>
            <dd className="mt-1">{isOpp ? <IntentMeter level={c.intent} /> : <PriorityMark priority={c.priority} />}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-ink-3">Last activity</dt>
            <dd className="mt-1 text-ink">{relativeTime(c.lastActivityAt)}</dd>
          </div>
          {isOpp && c.productLabel && (
            <div>
              <dt className="text-[12px] text-ink-3">Interested in</dt>
              <dd className="mt-1 text-ink">{c.productLabel}</dd>
            </div>
          )}
          {isOpp && c.estimatedValue !== undefined && (
            <div>
              <dt className="text-[12px] text-ink-3">Possible value</dt>
              <dd className="tabular mt-1 text-ink">{money(c.estimatedValue)}</dd>
            </div>
          )}
          {decision.length > 0 && !active && (
            <div className="col-span-2">
              <dt className="text-[12px] text-ink-3">Your decision</dt>
              <dd className="mt-1 text-ink">{decision.join(' · ')}</dd>
            </div>
          )}
        </dl>

        {isOpp && active && c.orderMatch && step !== 'convert' && (
          <div className="mt-4 flex gap-3 rounded-[12px] border border-[color-mix(in_oklab,var(--success)_30%,var(--border))] bg-good-soft p-3.5">
            <PackageSearch className="mt-0.5 size-4 shrink-0 text-good" strokeWidth={1.7} />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] text-ink">
                Possible order found: {c.orderMatch.orderRef} · {money(c.orderMatch.amount)}
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-2">{c.orderMatch.basis}. Confirm it before it counts as converted.</p>
              <button type="button" onClick={() => setStep('convert')} className="mt-2 text-[13px] text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                Review and confirm
              </button>
            </div>
          </div>
        )}

        {step ? (
          <DecisionForm key={step} c={c} step={step} onDone={() => setStep(null)} onCancel={() => setStep(null)} />
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {isOpp && c.status === 'new' && (
              <Button size="sm" onClick={() => quick('followed_up', 'Followed up')}>
                <Check className="size-4" strokeWidth={1.7} /> Mark followed up
              </Button>
            )}
            {isOpp && active && (
              <>
                <Button size="sm" variant={c.status === 'new' ? 'secondary' : 'primary'} onClick={() => setStep('convert')}>
                  Converted
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStep('close')}>
                  Close
                </Button>
              </>
            )}
            {!isOpp && c.status === 'open' && (
              <Button size="sm" onClick={() => quick('in_progress', 'In progress')}>
                Start working on it
              </Button>
            )}
            {!isOpp && active && (
              <>
                <Button size="sm" variant={c.status === 'open' ? 'secondary' : 'primary'} onClick={() => setStep('resolve')}>
                  <CircleCheck className="size-4" strokeWidth={1.7} /> Resolve
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStep('dismiss')}>
                  Dismiss
                </Button>
              </>
            )}
            {!active && (
              <Button size="sm" variant="secondary" onClick={() => quick(isOpp ? 'new' : 'open', 'Reopened')}>
                <RotateCcw className="size-4" strokeWidth={1.7} /> Reopen
              </Button>
            )}
          </div>
        )}

        <RetentionLine c={c} />
      </div>

      {history.length > 0 && (
        <div className="border-t border-line-subtle px-5 pb-4 pt-3">
          <p className="mb-2 text-[12.5px] text-ink-3">History</p>
          <Timeline
            label="Case history"
            now={Date.now()}
            timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
            events={[...history].reverse().map((e) => ({
              id: e.id,
              at: e.at,
              actor: e.by === 'luna' ? 'Luna' : 'You',
              title: e.kind === 'detected' ? (isOpp ? 'Found this opportunity' : 'Flagged this case') : `${label(c, e.from)} to ${label(c, e.to)}`,
              tone: e.to === 'converted' || e.to === 'resolved' ? ('success' as const) : ('neutral' as const),
              detail: e.note ? <p className="text-[12.5px] text-ink-2">{e.note}</p> : undefined,
            }))}
          />
        </div>
      )}
    </section>
  )
}

function label(c: LunaCase, s: CaseEvent['from']) {
  if (!s) return ''
  return c.type === 'opportunity' ? OPPORTUNITY_STATUS[s as OpportunityStatus]?.label ?? s : RISK_STATUS[s as RiskStatus]?.label ?? s
}
