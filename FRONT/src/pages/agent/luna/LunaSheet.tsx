import { Analysis } from '@/components/luna/Analysis'
import { CasePanel } from '@/components/luna/CasePanel'
import { INSIGHT_KIND, ISSUE } from '@/components/luna/labels'
import { CaseStatus, ChannelIcon, CustomerAvatar, SentimentTag } from '@/components/luna/parts'
import { Thread } from '@/components/luna/Thread'
import { useLunaData, useLunaSheet, type LunaData } from '@/components/luna/use-luna'
import { ProductSheet } from '@/components/tracker/costing/ProductSheet'
import type { LunaConversation, LunaInsight } from '@/data/luna/types'
import { relativeTime } from '@/lib/format'
import { casesFor, lastActivity, lastMessage, needsAttention } from '@/lib/luna'
import { cn } from '@/lib/utils'

export function InsightIcon({ insight, size = 40 }: { insight: LunaInsight; size?: number }) {
  const k = INSIGHT_KIND[insight.kind]
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-[12px]" style={{ width: size, height: size, background: `color-mix(in oklab, ${k.accent} 14%, var(--surface))`, color: `color-mix(in oklab, ${k.accent} 85%, var(--foreground))` }}>
      <k.icon className="size-[18px]" strokeWidth={1.6} />
    </span>
  )
}

/** A compact row for a conversation in a list: who, what they last said, and how they feel. */
export function ConversationRow({ conv, data, onOpen, showSummary = false }: { conv: LunaConversation; data: LunaData; onOpen: () => void; showSummary?: boolean }) {
  const customer = data.customer(conv.customerId)
  const last = lastMessage(conv)
  const cases = casesFor(conv.id, data.cases)
  return (
    <button type="button" onClick={onOpen} className="group flex w-full items-start gap-3 rounded-[12px] px-3 py-3 text-left transition-colors hover:bg-panel-muted">
      <CustomerAvatar name={customer.name} size={34} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13.5px] text-ink">{customer.name}</span>
          <ChannelIcon channel={conv.channel} size={12} />
          <span className="ml-auto shrink-0 text-[12px] text-ink-3">{relativeTime(lastActivity(conv))}</span>
        </span>
        <span dir="auto" className="mt-0.5 block truncate text-[13px] text-ink-2">
          {showSummary ? conv.analysis.summary : `${last.from === 'brand' ? 'You: ' : ''}${last.text}`}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <SentimentTag sentiment={conv.analysis.sentiment} className="text-[12px]" />
          {cases.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
              {c.type === 'opportunity' ? 'Opportunity' : ISSUE[c.issue]} · <CaseStatus c={c} className="text-[12px]" />
            </span>
          ))}
        </span>
      </span>
    </button>
  )
}

function ConversationBody({ conv, data, evidence, onOpenCase }: { conv: LunaConversation; data: LunaData; evidence?: string[]; onOpenCase?: (id: string) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <Thread conv={conv} customer={data.customer(conv.customerId)} evidence={evidence} awaitingReply={needsAttention(conv, data.risks)} />
      <div className="lg:sticky lg:top-0">
        <Analysis conv={conv} products={data.products} cases={casesFor(conv.id, data.cases)} onOpenCase={onOpenCase} />
      </div>
    </div>
  )
}

function InsightBody({ insight, data, onOpenConversation }: { insight: LunaInsight; data: LunaData; onOpenConversation: (id: string) => void }) {
  const convs = insight.conversationIds.map((id) => data.conversations.find((c) => c.id === id)).filter((c): c is LunaConversation => !!c)
  const change = insight.previousCount !== undefined ? convs.length - insight.previousCount : null
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <section aria-label="Supporting conversations" className="rounded-[var(--radius-panel)] border border-line bg-panel shadow-[var(--shadow-resting)]">
        <header className="px-5 pt-4">
          <h2 className="text-[14.5px] font-medium text-ink">
            {convs.length} supporting {convs.length === 1 ? 'conversation' : 'conversations'}
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-3">Open one to read the thread and Luna’s read.</p>
        </header>
        <ul className="flex flex-col px-2 pb-2 pt-2">
          {convs.map((c) => (
            <li key={c.id} className="border-b border-line-subtle last:border-0">
              <ConversationRow conv={c} data={data} onOpen={() => onOpenConversation(c.id)} showSummary />
            </li>
          ))}
        </ul>
      </section>
      <aside className="flex flex-col gap-4">
        <section className="rounded-[var(--radius-panel)] border border-line bg-panel p-5 shadow-[var(--shadow-resting)]">
          <p className="text-[12.5px] text-ink-3">{INSIGHT_KIND[insight.kind].label}</p>
          <p className="tabular mt-1 text-[34px] font-light leading-none tracking-[-0.03em] text-ink">{convs.length}</p>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {convs.length === 1 ? 'conversation' : 'conversations'} this week
            {change !== null && <span className={cn(change > 0 ? 'text-ink-2' : 'text-ink-3')}> · {change === 0 ? 'same as' : `${change > 0 ? '+' : ''}${change} on`} last week</span>}
          </p>
          <p className="mt-4 text-[13.5px] leading-relaxed text-ink-2">{insight.detail}</p>
        </section>
        <section className="rounded-[var(--radius-panel)] border border-line bg-panel p-5 shadow-[var(--shadow-resting)]">
          <p className="text-[12.5px] text-ink-3">What you could do</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink">{insight.suggestedAction}</p>
          {insight.relevantAgent && <p className="mt-2 text-[12.5px] text-ink-3">Luna can share this with {insight.relevantAgent === 'store' ? 'Store Agent' : insight.relevantAgent === 'ivy' ? 'Ivy' : insight.relevantAgent} when you ask her in chat.</p>}
        </section>
      </aside>
    </div>
  )
}

/** One focused sheet for every Luna record. Which record is open lives in the URL (see useLunaSheet). */
export function LunaSheet() {
  const data = useLunaData()
  const sheet = useLunaSheet()
  const insight = sheet.insight ? data.insights.find((i) => i.id === sheet.insight) : undefined
  const theCase = sheet.case ? data.cases.find((c) => c.id === sheet.case) : undefined
  const conv = sheet.conversation ? data.conversations.find((c) => c.id === sheet.conversation) : theCase ? data.conversations.find((c) => c.id === theCase.conversationId) : undefined
  const open = !!(insight || theCase || conv)
  if (!open) return null

  const customer = conv ? data.customer(conv.customerId) : undefined
  const handle = customer && conv ? customer.identities.find((i) => i.channel === conv.channel)?.handle : undefined

  // Insight, possibly with one of its conversations open.
  if (insight) {
    return (
      <ProductSheet
        open
        onClose={sheet.close}
        viewKey={`${insight.id}:${conv?.id ?? ''}`}
        thumb={<InsightIcon insight={insight} />}
        name={insight.title}
        meta={`${INSIGHT_KIND[insight.kind].label} · ${insight.conversationIds.length} conversations`}
        trail={conv && customer ? [{ label: customer.name, onClick: () => sheet.open({ insight: insight.id }) }] : []}
      >
        {conv ? <ConversationBody conv={conv} data={data} onOpenCase={(id) => sheet.open({ case: id })} /> : <InsightBody insight={insight} data={data} onOpenConversation={(id) => sheet.open({ insight: insight.id, conversation: id })} />}
      </ProductSheet>
    )
  }

  if (theCase && conv && customer) {
    return (
      <ProductSheet open onClose={sheet.close} viewKey={theCase.id} thumb={<CustomerAvatar name={customer.name} size={40} />} name={customer.name} meta={`@${handle} · ${theCase.type === 'opportunity' ? 'Sales opportunity' : ISSUE[theCase.issue]}`}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
          <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
            <Thread conv={conv} customer={customer} evidence={theCase.evidence} awaitingReply={needsAttention(conv, data.risks)} />
          </div>
          <div className="order-1 flex flex-col gap-4 lg:order-2">
            <CasePanel key={theCase.id} c={theCase} events={data.events} />
            <Analysis conv={conv} products={data.products} cases={casesFor(conv.id, data.cases).filter((c) => c.id !== theCase.id)} compact />
          </div>
        </div>
      </ProductSheet>
    )
  }

  if (conv && customer) {
    return (
      <ProductSheet open onClose={sheet.close} viewKey={conv.id} thumb={<CustomerAvatar name={customer.name} size={40} />} name={customer.name} meta={`@${handle} · Instagram DM · last message ${relativeTime(lastActivity(conv))}`}>
        <ConversationBody conv={conv} data={data} onOpenCase={(id) => sheet.open({ case: id })} />
      </ProductSheet>
    )
  }
  return null
}
