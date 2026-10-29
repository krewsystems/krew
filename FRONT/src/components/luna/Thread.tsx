import { Image, Link2, Reply } from 'lucide-react'
import { Fragment } from 'react'
import type { LunaConversation, LunaCustomer } from '@/data/luna/types'
import { clockTime } from '@/lib/format'
import { unansweredCount } from '@/lib/luna'
import { cn } from '@/lib/utils'
import { ChannelIcon, CustomerAvatar } from './parts'

const ATTACHMENT_ICON = { image: Image, shared_post: Link2, story_reply: Reply }

function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })
}

/** The DM thread exactly as it happened, read-only. Evidence messages are marked so a case can show why it exists. */
export function Thread({ conv, customer, evidence = [], awaitingReply = false }: { conv: LunaConversation; customer: LunaCustomer; evidence?: string[]; /** Only when an active at-risk case says the customer is waiting. */ awaitingReply?: boolean }) {
  const handle = customer.identities.find((i) => i.channel === conv.channel)?.handle
  const waiting = awaitingReply ? unansweredCount(conv) : 0
  return (
    <section aria-label="Conversation" className="flex min-w-0 flex-col rounded-[var(--radius-panel)] border border-line bg-panel shadow-[var(--shadow-resting)]">
      <header className="flex items-center gap-3 border-b border-line-subtle px-5 py-3.5">
        <CustomerAvatar name={customer.name} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] text-ink">{customer.name}</p>
          <p className="flex items-center gap-1.5 truncate text-[12.5px] text-ink-3">
            <ChannelIcon channel={conv.channel} size={13} />@{handle}
            {customer.city && ` · ${customer.city}`}
            {customer.ordersCount ? ` · ${customer.ordersCount} ${customer.ordersCount === 1 ? 'order' : 'orders'}` : ' · No orders yet'}
          </p>
        </div>
        <span className="hidden text-[12px] text-ink-3 sm:block">{conv.messages.length} messages</span>
      </header>

      <ol className="flex flex-col gap-2 px-4 py-5 sm:px-5">
        {conv.messages.map((m, i) => {
          const prev = conv.messages[i - 1]
          const newDay = !prev || dayLabel(prev.at) !== dayLabel(m.at)
          const mine = m.from === 'brand'
          const isEvidence = evidence.includes(m.id)
          const sameSender = prev && !newDay && prev.from === m.from
          const Attachment = m.attachment ? ATTACHMENT_ICON[m.attachment.kind] : null
          return (
            <Fragment key={m.id}>
              {newDay && (
                <li className="my-2 flex items-center gap-3 text-[11.5px] text-ink-3" aria-hidden>
                  <span className="h-px flex-1 bg-line-subtle" />
                  {dayLabel(m.at)}
                  <span className="h-px flex-1 bg-line-subtle" />
                </li>
              )}
              <li className={cn('flex max-w-[86%] flex-col gap-1', mine ? 'items-end self-end' : 'items-start self-start', sameSender ? 'mt-0' : 'mt-1.5')}>
                {!sameSender && <span className="px-1 text-[11.5px] text-ink-3">{mine ? `${m.author ?? 'Your team'} · your team` : customer.name.split(' ')[0]}</span>}
                {m.attachment && Attachment && (
                  <span className="inline-flex items-center gap-2 rounded-[12px] border border-dashed border-line-strong bg-panel-muted px-3 py-2 text-[12.5px] text-ink-2">
                    <Attachment className="size-3.5 text-ink-3" strokeWidth={1.7} />
                    {m.attachment.label}
                  </span>
                )}
                <p
                  dir="auto"
                  className={cn(
                    'whitespace-pre-wrap rounded-[16px] px-3.5 py-2 text-[14px] leading-relaxed',
                    mine ? 'rounded-br-[6px] bg-sunken text-ink-2' : 'rounded-bl-[6px] border border-line bg-panel text-ink',
                    isEvidence && 'border-[color-mix(in_oklab,var(--agent-luna)_55%,transparent)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--agent-luna)_14%,transparent)]',
                  )}
                >
                  {m.text}
                </p>
                <span className="flex items-center gap-1.5 px-1 text-[11px] text-ink-3">
                  {clockTime(m.at)}
                  {isEvidence && <span className="text-[color-mix(in_oklab,var(--agent-luna)_80%,var(--foreground))]">· Luna used this</span>}
                </span>
              </li>
            </Fragment>
          )
        })}
      </ol>

      <footer className="mt-auto border-t border-line-subtle px-5 py-3 text-[12.5px] text-ink-3">
        {waiting > 0 ? (
          <span className="text-warn">
            {waiting} {waiting === 1 ? 'message' : 'messages'} from {customer.name.split(' ')[0]} with no reply yet.{' '}
          </span>
        ) : null}
        Read-only. Replies happen in Instagram; Luna never messages customers.
      </footer>
    </section>
  )
}
