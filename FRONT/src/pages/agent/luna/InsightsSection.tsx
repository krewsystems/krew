import { ArrowRight, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Panel } from '@/components/common/Panel'
import { ConversationMix } from '@/components/luna/ConversationMix'
import { INSIGHT_KIND, SENTIMENT, TOPIC } from '@/components/luna/labels'
import { lunaPath } from '@/components/luna/sections'
import { useLunaData, useLunaSheet } from '@/components/luna/use-luna'
import type { LunaConversation, LunaInsight } from '@/data/luna/types'
import { inWindow, lastActivity, productMentions, SENTIMENT_ORDER, sentimentSplit, topicCounts } from '@/lib/luna'
import { cn } from '@/lib/utils'
import { ConversationRow, InsightIcon } from './LunaSheet'

function InsightCard({ insight }: { insight: LunaInsight }) {
  const sheet = useLunaSheet()
  const n = insight.conversationIds.length
  const change = insight.previousCount !== undefined ? n - insight.previousCount : null
  return (
    <button type="button" onClick={() => sheet.open({ insight: insight.id })} className="group flex flex-col rounded-[var(--radius-panel)] border border-line bg-panel p-5 text-left shadow-[var(--shadow-resting)] transition-colors hover:border-line-strong">
      <span className="flex items-center gap-3">
        <InsightIcon insight={insight} size={34} />
        <span className="flex-1 text-[12.5px] text-ink-3">{INSIGHT_KIND[insight.kind].label}</span>
        <span className="text-right">
          <span className="tabular block text-[22px] font-light leading-none tracking-[-0.02em] text-ink">{n}</span>
          {change !== null && <span className="tabular block text-[11.5px] text-ink-3">{change === 0 ? 'same as last week' : `${change > 0 ? '+' : ''}${change} on last week`}</span>}
        </span>
      </span>
      <span className="mt-3 block text-[14.5px] leading-snug text-ink">{insight.title}</span>
      <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-ink-3">{insight.detail}</span>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] text-ink-2 group-hover:text-ink">
        See {n} {n === 1 ? 'conversation' : 'conversations'} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} />
      </span>
    </button>
  )
}

function SentimentBar({ label, convs }: { label: string; convs: LunaConversation[] }) {
  const s = sentimentSplit(convs)
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-ink">{label}</span>
        <span className="tabular text-ink-3">{s.total} conversations</span>
      </div>
      <div className="mt-1.5 flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={SENTIMENT_ORDER.map((k) => `${s[k]} ${SENTIMENT[k].label.toLowerCase()}`).join(', ')}>
        {[...SENTIMENT_ORDER].reverse().map((k) => (s[k] ? <span key={k} className={cn('h-full first:rounded-l-full last:rounded-r-full', SENTIMENT[k].dot)} style={{ width: `${(s[k] / s.total) * 100}%` }} /> : null))}
      </div>
    </div>
  )
}

/** Patterns across conversations. Every number here is a count of conversations you can open. */
export function InsightsSection() {
  const data = useLunaData()
  const sheet = useLunaSheet()
  const [openQuestion, setOpenQuestion] = useState<string | null>(null)
  const insights = [...data.insights].sort((a, b) => Number(!!b.important) - Number(!!a.important) || b.conversationIds.length - a.conversationIds.length)
  const products = productMentions(data).slice(0, 6)
  const thisWeek = data.conversations.filter((c) => inWindow(lastActivity(c), 7, 0))
  const lastWeek = data.conversations.filter((c) => inWindow(lastActivity(c), 14, 7))
  const negNow = thisWeek.filter((c) => c.analysis.sentiment === 'negative')
  const negPrev = lastWeek.filter((c) => c.analysis.sentiment === 'negative').length
  const negTopic = topicCounts(negNow)[0]
  const maxMentions = products[0]?.conversationIds.length ?? 1

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-[22px] font-medium tracking-[-0.02em] text-ink">Insights</h2>
        <p className="mt-1 max-w-2xl text-[13.5px] text-ink-2">What keeps coming up across conversations. Open any insight to read the conversations behind it.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-12">
        <ConversationMix title="What your DMs are about" className="lg:col-span-5" />
        <Panel title="Most mentioned products" description="Mentions in the threads Luna read in detail this week" className="lg:col-span-7">
          <ul className="flex flex-col gap-3">
            {products.map((p) => (
              <li key={p.productId}>
                <Link to={lunaPath('conversations', `?product=${p.productId}`)} className="group block">
                  <span className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="truncate text-ink group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">{p.name}</span>
                    <span className="tabular shrink-0 text-ink-3">
                      {p.conversationIds.length}
                      {p.negative > 0 && <span className="text-bad"> · {p.negative} negative</span>}
                      {p.opportunities > 0 && <span> · {p.opportunities} open {p.opportunities === 1 ? 'sale' : 'sales'}</span>}
                    </span>
                  </span>
                  <span className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-sunken">
                    <span className="h-full rounded-full bg-[color-mix(in_oklab,var(--agent-luna)_70%,var(--surface))]" style={{ width: `${(p.conversationIds.length / maxMentions) * 100}%` }} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {insights.map((i) => (
          <InsightCard key={i.id} insight={i} />
        ))}
      </div>

      <div className="grid gap-4">
        <Panel title="Common questions" description="Asked before buying or after ordering">
          <ul className="-mx-2 flex flex-col">
            {data.questions.map((q) => {
              const open = openQuestion === q.id
              return (
                <li key={q.id} className="border-b border-line-subtle last:border-0">
                  <button type="button" aria-expanded={open} onClick={() => setOpenQuestion(open ? null : q.id)} className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left transition-colors hover:bg-panel-muted">
                    <span className="tabular w-6 shrink-0 text-[15px] font-light text-ink">{q.conversationIds.length}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] text-ink">{q.question}</span>
                      <span className={cn('block text-[12px]', q.answeredOnSite ? 'text-ink-3' : 'text-warn')}>{q.answeredOnSite ? 'Answered on your site' : 'Not answered on your site'}</span>
                    </span>
                    <ChevronDown className={cn('size-4 shrink-0 text-ink-3 transition-transform', open && 'rotate-180')} strokeWidth={1.7} />
                  </button>
                  {open && (
                    <ul className="pb-2">
                      {q.conversationIds.map((id) => {
                        const c = data.conversations.find((x) => x.id === id)
                        return c ? (
                          <li key={id}>
                            <ConversationRow conv={c} data={data} onOpen={() => sheet.open({ conversation: id })} />
                          </li>
                        ) : null
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      <Panel title="Sentiment" description="Conversations by tone, this week against last week">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div className="flex flex-col gap-4">
            <SentimentBar label="This week" convs={thisWeek} />
            <SentimentBar label="Last week" convs={lastWeek} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
              {[...SENTIMENT_ORDER].reverse().map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className={cn('size-2 rounded-full', SENTIMENT[k].dot)} />
                  {SENTIMENT[k].label}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-[12px] bg-panel-muted p-4">
            <p className="text-[13.5px] leading-relaxed text-ink">
              {negNow.length === negPrev
                ? `Negative conversations held steady at ${negNow.length}.`
                : `Negative conversations ${negNow.length > negPrev ? 'rose' : 'fell'} from ${negPrev} to ${negNow.length}.`}
              {negTopic && negNow.length > 0 && ` Most are about ${TOPIC[negTopic.topic].toLowerCase()}.`}
            </p>
            {negNow.length > 0 && (
              <Link to={lunaPath('conversations', '?show=negative')} className="group mt-2 inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
                Read them <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.7} />
              </Link>
            )}
          </div>
        </div>
      </Panel>
    </div>
  )
}
