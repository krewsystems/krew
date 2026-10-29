import { ArrowRight, CircleAlert, Sparkles, Tag } from 'lucide-react'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import type { LunaCase, LunaConversation, LunaProductRef } from '@/data/luna/types'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { INTENT, ISSUE, LANGUAGE, TOPIC } from './labels'
import { CaseStatus, IntentMeter, PriorityMark, SentimentTag } from './parts'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 py-2 text-[13px]">
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  )
}

const SIGNAL_TONE = { opportunity: 'text-[color-mix(in_oklab,var(--agent-luna)_80%,var(--foreground))]', issue: 'text-bad', restock: 'text-ink-2', sizing: 'text-ink-2', price_objection: 'text-ink-2', feedback: 'text-ink-2', question: 'text-ink-2' }

/** Luna's precomputed read of one conversation. */
export function Analysis({ conv, products, cases, onOpenCase, compact = false }: { conv: LunaConversation; products: LunaProductRef[]; cases: LunaCase[]; onOpenCase?: (id: string) => void; compact?: boolean }) {
  const a = conv.analysis
  return (
    <section aria-label="Luna’s analysis" className="rounded-[var(--radius-panel)] border border-line bg-panel shadow-[var(--shadow-resting)]">
      <header className="flex items-center gap-2.5 px-5 pt-4">
        <AgentAvatar agentId="luna" size="xs" />
        <h2 className="flex-1 text-[14px] font-medium text-ink">Luna’s read</h2>
        <span className="text-[11.5px] text-ink-3">Updated {relativeTime(a.analyzedAt)}</span>
      </header>
      <div className="px-5 pb-5 pt-3">
        <p dir="auto" className="text-[14px] leading-relaxed text-ink">
          {a.summary}
        </p>

        <dl className="mt-3 divide-y divide-line-subtle border-t border-line-subtle">
          <Row label="Intent">{INTENT[a.intent]}</Row>
          <Row label="Sentiment">
            <SentimentTag sentiment={a.sentiment} />
          </Row>
          {a.products.length > 0 && (
            <Row label="Products">
              <ul className="flex flex-col gap-0.5">
                {a.products.map((p) => (
                  <li key={p.productId + (p.variant ?? '')}>
                    {products.find((x) => x.id === p.productId)?.name ?? p.productId}
                    {p.variant && <span className="text-ink-3"> · {p.variant}</span>}
                  </li>
                ))}
              </ul>
            </Row>
          )}
          {!compact && (
            <Row label="Topics">
              <span className="flex flex-wrap gap-1">
                {a.topics.map((t) => (
                  <span key={t} className="rounded-full border border-line px-2 py-0.5 text-[12px] text-ink-2">
                    {TOPIC[t]}
                  </span>
                ))}
              </span>
            </Row>
          )}
          {!compact && <Row label="Language">{LANGUAGE[a.language]}</Row>}
        </dl>

        {a.signals.length > 0 && (
          <div className="mt-3">
            <p className="text-[12.5px] text-ink-3">What Luna noticed</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {a.signals.map((s) => (
                <li key={s.label} className={cn('flex items-start gap-2 text-[13px]', SIGNAL_TONE[s.kind])}>
                  {s.kind === 'issue' ? <CircleAlert className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.7} /> : s.kind === 'opportunity' ? <Sparkles className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.7} /> : <Tag className="mt-0.5 size-3.5 shrink-0 text-ink-3" strokeWidth={1.7} />}
                  <span className={s.kind === 'issue' || s.kind === 'opportunity' ? '' : 'text-ink-2'}>{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 rounded-[12px] bg-panel-muted px-3.5 py-3">
          <p className="text-[12.5px] text-ink-3">Suggested next step</p>
          <p className="mt-0.5 text-[13.5px] text-ink">{a.nextStep}</p>
        </div>

        {onOpenCase && (
          <div className="mt-4">
            <p className="text-[12.5px] text-ink-3">Linked case</p>
            {cases.length === 0 ? (
              <p className="mt-1 text-[13px] text-ink-2">None. Luna did not find a sales opportunity or a problem that needs follow-up here.</p>
            ) : (
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {cases.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => onOpenCase(c.id)} className="group flex w-full items-center gap-3 rounded-[12px] border border-line px-3.5 py-2.5 text-left transition-colors hover:border-line-strong">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] text-ink">{c.title}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
                          {c.type === 'opportunity' ? (
                            <>
                              Sales opportunity <IntentMeter level={c.intent} />
                            </>
                          ) : (
                            <>
                              {ISSUE[c.issue]} <PriorityMark priority={c.priority} />
                            </>
                          )}
                          <CaseStatus c={c} />
                        </span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" strokeWidth={1.6} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
