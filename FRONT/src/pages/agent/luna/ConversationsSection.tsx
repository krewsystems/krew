import { Search, X } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DropdownMenu } from '@/components/arc/dropdown-menu/dropdown-menu'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { TOPIC } from '@/components/luna/labels'
import { CaseStatus, ChannelIcon, CustomerAvatar, SentimentTag } from '@/components/luna/parts'
import { useLunaData, useLunaSheet } from '@/components/luna/use-luna'
import type { TopicId } from '@/data/luna/types'
import { dayGroup, shortAgo } from '@/lib/format'
import { casesFor, isActiveCase, lastActivity, lastMessage, matchesQuery, needsAttention, topicCounts, waitingHours } from '@/lib/luna'
import { cn } from '@/lib/utils'

type Show = 'all' | 'attention' | 'opportunities' | 'negative'

/** Read-only DM explorer: every conversation Luna read, with her analysis one click away. No composer by design. */
export function ConversationsSection() {
  const data = useLunaData()
  const sheet = useLunaSheet()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const show = (params.get('show') as Show) || 'all'
  const topic = params.get('topic') as TopicId | null
  const product = params.get('product')

  const set = (next: Record<string, string | undefined>) =>
    setParams((p) => {
      const out = new URLSearchParams(p)
      for (const [k, v] of Object.entries(next)) {
        if (v) out.set(k, v)
        else out.delete(k)
      }
      return out
    })

  const sorted = useMemo(() => [...data.conversations].sort((a, b) => lastActivity(b).localeCompare(lastActivity(a))), [data.conversations])
  const test = {
    attention: (id: string) => needsAttention(data.conversations.find((c) => c.id === id)!, data.risks),
    opportunities: (id: string) => data.opportunities.some((o) => o.conversationId === id),
    negative: (id: string) => data.conversations.find((c) => c.id === id)!.analysis.sentiment === 'negative',
  }
  const counts = { all: sorted.length, attention: sorted.filter((c) => test.attention(c.id)).length, opportunities: sorted.filter((c) => test.opportunities(c.id)).length, negative: sorted.filter((c) => test.negative(c.id)).length }

  const rows = sorted.filter((c) => {
    const customer = data.customer(c.customerId)
    if (show !== 'all' && !test[show](c.id)) return false
    if (topic && !c.analysis.topics.includes(topic)) return false
    if (product && !c.analysis.products.some((p) => p.productId === product)) return false
    return matchesQuery(c, customer.name, customer.identities.map((i) => i.handle).join(' '), q)
  })

  const topics = topicCounts(data.conversations)
  const productName = product ? data.products.find((p) => p.id === product)?.name : null

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h2 className="text-[22px] font-medium tracking-[-0.02em] text-ink">Conversations</h2>
        <p className="mt-1 max-w-2xl text-[13.5px] text-ink-2">Every Instagram DM thread Luna has read, with her analysis. This is not an inbox: replies stay in Instagram.</p>
      </header>

      <section aria-label="Conversations" className="rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]">
        <div className="flex flex-col gap-3 border-b border-line-subtle p-4 sm:p-5 xl:flex-row xl:items-center">
          <label className="relative block xl:w-64">
            <span className="sr-only">Search conversations</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.7} />
            <input
              type="search"
              value={q}
              onChange={(e) => set({ q: e.target.value || undefined })}
              placeholder="Search names, messages, summaries"
              className="h-10 w-full rounded-[10px] border border-line bg-panel pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-ink-3 hover:border-line-strong focus-visible:border-ink"
            />
          </label>
          <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
            <SegmentedControl
              label="Show"
              value={show}
              onValueChange={(v) => set({ show: v === 'all' ? undefined : v })}
              options={[
                { value: 'all', label: 'All', accessory: <span className="tabular text-[11.5px] text-ink-3">{counts.all}</span> },
                { value: 'attention', label: 'Needs attention', accessory: counts.attention ? <span className="tabular text-[11.5px] text-bad">{counts.attention}</span> : undefined },
                { value: 'opportunities', label: 'Opportunities', accessory: <span className="tabular text-[11.5px] text-ink-3">{counts.opportunities}</span> },
                { value: 'negative', label: 'Negative', accessory: <span className="tabular text-[11.5px] text-ink-3">{counts.negative}</span> },
              ]}
            />
          </div>
          <div className="xl:ml-auto">
            <DropdownMenu
              label={topic ? `Topic: ${TOPIC[topic]}` : 'All topics'}
              items={[{ label: 'All topics', onSelect: () => set({ topic: undefined }) }, ...topics.map((t) => ({ label: `${TOPIC[t.topic]} (${t.count})`, onSelect: () => set({ topic: t.topic }) }))]}
            />
          </div>
        </div>

        {(topic || productName) && (
          <div className="flex flex-wrap gap-2 px-5 pt-3">
            {topic && (
              <button type="button" onClick={() => set({ topic: undefined })} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[12.5px] text-ink-2 hover:border-line-strong hover:text-ink">
                Topic: {TOPIC[topic]} <X className="size-3.5" strokeWidth={1.7} />
              </button>
            )}
            {productName && (
              <button type="button" onClick={() => set({ product: undefined })} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[12.5px] text-ink-2 hover:border-line-strong hover:text-ink">
                Product: {productName} <X className="size-3.5" strokeWidth={1.7} />
              </button>
            )}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <p className="text-[14px] text-ink">No conversations match</p>
            <p className="text-[13px] text-ink-3">{q ? `Nothing found for “${q}”.` : 'Nothing fits these filters.'}</p>
            <button type="button" onClick={() => setParams({})} className="mt-2 text-[13px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
              Show all conversations
            </button>
          </div>
        ) : (
          <ul className="flex flex-col px-2 pb-2 pt-1 md:px-3">
            {rows.map((c, i) => {
              const customer = data.customer(c.customerId)
              const last = lastMessage(c)
              const attention = test.attention(c.id)
              const waiting = waitingHours(c)
              const cases = casesFor(c.id, data.cases).filter(isActiveCase)
              const g = dayGroup(lastActivity(c))
              const header = i === 0 || dayGroup(lastActivity(rows[i - 1])) !== g ? g : null
              return (
                <li key={c.id}>
                  {header && <p className="px-3 pb-1 pt-4 text-[12px] text-ink-3">{header}</p>}
                  <button type="button" onClick={() => sheet.open({ conversation: c.id })} className={cn('group relative flex w-full items-start gap-3.5 rounded-[12px] px-3 py-3 text-left transition-colors hover:bg-panel-muted', sheet.conversation === c.id && 'bg-panel-muted')}>
                    <span className="relative">
                      <CustomerAvatar name={customer.name} size={40} />
                      {attention && <span aria-label="Needs attention" className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-panel bg-bad" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] text-ink">{customer.name}</span>
                        <ChannelIcon channel={c.channel} size={12} />
                        <span className="hidden truncate text-[12.5px] text-ink-3 sm:inline">@{customer.identities[0].handle}</span>
                        <span className="ml-auto shrink-0 text-[12px] text-ink-3">{shortAgo(lastActivity(c))}</span>
                      </span>
                      <span dir="auto" className="mt-0.5 block truncate text-[13.5px] text-ink-2">
                        {last.from === 'brand' && <span className="text-ink-3">{last.author ?? 'You'}: </span>}
                        {last.text}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        {c.analysis.topics.slice(0, 2).map((t) => (
                          <span key={t} className="rounded-full border border-line px-2 py-0.5 text-[11.5px] text-ink-2">
                            {TOPIC[t]}
                          </span>
                        ))}
                        <SentimentTag sentiment={c.analysis.sentiment} className="text-[12px]" />
                        {attention && waiting > 12 && <span className="text-[12px] text-warn">No reply for {waiting >= 24 ? `${Math.floor(waiting / 24)}d` : `${Math.round(waiting)}h`}</span>}
                        {cases.map((k) => (
                          <span key={k.id} className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
                            {k.type === 'opportunity' ? 'Opportunity' : 'At risk'} · <CaseStatus c={k} className="text-[12px]" />
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
