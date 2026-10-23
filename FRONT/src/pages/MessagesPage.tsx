import { ArrowLeft, ArrowUpRight, Paperclip, Pin, Send, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChatComposer } from '@/components/arc/chat-thread/chat-thread'
import { SearchField } from '@/components/arc/search-field/search-field'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { AgentStatus } from '@/components/agent/AgentStatus'
import { useAgentResolver } from '@/components/agent/use-agent'
import { ApprovalInline, FeedPost, MetricStrip } from '@/components/feed/FeedPost'
import { ReportPreview } from '@/components/reports/ReportCard'
import { ThinkingLoader } from '@/components/ui/ThinkingLoader'
import type { ChatMessage, Conversation, MessageAttachment } from '@/data/types'
import { clockTime, dayGroup, shortAgo } from '@/lib/format'
import { composeReply } from '@/lib/responder'
import { cn } from '@/lib/utils'
import { useKrew, useWorkspace } from '@/store/krew'

const SUGGESTIONS: Record<string, string[]> = {
  manager: ['What needs my approval?', 'Summarise today for me', 'Send me the weekly review'],
  team: ['What is everyone working on?', 'What needs my approval?'],
  luna: ['What are customers complaining about?', 'How is sentiment this week?', 'Top questions this week'],
  tracker: ['How was revenue yesterday?', 'Where are costs rising?', 'Send me your latest report'],
  ivy: ['What is the next opportunity?', 'Send me your latest report'],
  store: ['Which products are low on stock?', 'What needs my approval?'],
  ads: ['How are campaigns doing?', 'What needs my approval?'],
  retention: ['Show me today’s segments', 'What needs my approval?'],
}

function ConversationAvatar({ convo }: { convo: Conversation }) {
  if (convo.kind === 'team') {
    return (
      <span className="relative inline-flex size-9 shrink-0">
        {convo.members.slice(1, 4).map((m, i) => (
          <span key={m} className="absolute" style={{ left: i * 7, top: i % 2 ? 9 : 0, zIndex: 3 - i }}>
            <AgentAvatar agentId={m} size="xs" ring />
          </span>
        ))}
      </span>
    )
  }
  return <AgentAvatar agentId={convo.agentId ?? 'manager'} size="md" showStatus />
}

function Attachment({ attachment }: { attachment: MessageAttachment }) {
  const ws = useWorkspace()
  switch (attachment.kind) {
    case 'report': {
      const r = ws.reports.find((x) => x.id === attachment.reportId)
      return r ? <ReportPreview report={r} /> : null
    }
    case 'approval':
      return <ApprovalInline approvalId={attachment.approvalId} />
    case 'metrics':
      return (
        <div>
          <p className="mb-1.5 text-[12px] text-ink-3">{attachment.title}</p>
          <MetricStrip metrics={attachment.metrics} />
        </div>
      )
    case 'post': {
      const p = ws.posts.find((x) => x.id === attachment.postId)
      return p ? (
        <div className="rounded-[12px] border border-[color-mix(in_oklab,var(--text-inverse)_20%,transparent)] bg-[color-mix(in_oklab,var(--text-inverse)_8%,transparent)] px-3 py-2 text-[12.5px] text-ink-inverse-2">
          Re: {p.title}
        </div>
      ) : null
    }
  }
}

function Bubble({ message, showAuthor }: { message: ChatMessage; showAuthor: boolean }) {
  const resolve = useAgentResolver()
  const mine = message.author === 'user'
  const rich = message.attachment && message.attachment.kind !== 'post'
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} className={cn('flex gap-2.5', mine ? 'justify-end' : 'justify-start')}>
      {!mine && <div className="w-8 shrink-0">{showAuthor && <AgentAvatar agentId={message.author} size="sm" />}</div>}
      <div className={cn('flex max-w-[min(560px,82%)] flex-col gap-1', mine ? 'items-end' : 'items-start')}>
        {showAuthor && !mine && <span className="px-1 text-[12px] text-ink-3">{resolve(message.author).displayName}</span>}
        <div
          className={cn(
            'rounded-[18px] px-3.5 py-2.5 text-[14px] leading-relaxed',
            mine ? 'rounded-br-[6px] bg-inverse text-ink-inverse' : 'rounded-bl-[6px] border border-line bg-panel text-ink',
            rich && 'w-full',
          )}
        >
          {message.attachment?.kind === 'post' && (
            <div className="mb-2">
              <Attachment attachment={message.attachment} />
            </div>
          )}
          <p className="whitespace-pre-wrap">{message.text}</p>
          {rich && (
            <div className="mt-3 min-w-[min(420px,64vw)]">
              <Attachment attachment={message.attachment!} />
            </div>
          )}
        </div>
        <span className="px-1 text-[11px] text-ink-3">{clockTime(message.createdAt)}</span>
      </div>
    </motion.div>
  )
}

export function MessagesPage() {
  const ws = useWorkspace()
  const resolve = useAgentResolver()
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const [params, setParams] = useSearchParams()
  const contextPostId = params.get('post') ?? undefined
  const show = params.get('show') ?? 'all'
  const ensureConversation = useKrew((s) => s.ensureConversation)
  const sendMessage = useKrew((s) => s.sendMessage)
  const addAgentMessage = useKrew((s) => s.addAgentMessage)
  const markRead = useKrew((s) => s.markConversationRead)
  const [query, setQuery] = useState('')
  const [typing, setTyping] = useState<{ convo: string; author: string; phases: string[] } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Opening a conversation for an agent you haven't messaged yet creates it.
  useEffect(() => {
    if (conversationId && !ws.conversations.some((c) => c.id === conversationId) && ws.hires.some((h) => h.agentId === conversationId)) {
      ensureConversation(conversationId)
    }
  }, [conversationId, ws.conversations, ws.hires, ensureConversation])

  const active = ws.conversations.find((c) => c.id === conversationId)
  const desktopActive = active ?? ws.conversations.find((c) => c.id === 'manager')

  useEffect(() => {
    if (desktopActive && desktopActive.unread > 0) markRead(desktopActive.id)
  }, [desktopActive, markRead])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [desktopActive?.messages.length, typing, desktopActive?.id])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...ws.conversations]
      .filter((c) => (show === 'all' || (show === 'team' ? c.kind === 'team' : c.kind !== 'team')) && (!q || c.title.toLowerCase().includes(q) || c.messages.some((m) => m.text.toLowerCase().includes(q))))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.messages.at(-1)?.createdAt ?? '').localeCompare(a.messages.at(-1)?.createdAt ?? ''))
  }, [ws.conversations, query, show])

  const contextPost = contextPostId ? ws.posts.find((p) => p.id === contextPostId) : undefined

  const respond = async (convo: Conversation, text: string, postId?: string) => {
    const responder = convo.kind === 'team' ? 'manager' : convo.agentId ?? 'manager'
    const reply = composeReply(ws, responder, text, postId)
    setTyping({ convo: convo.id, author: reply.author, phases: reply.phases })
    await new Promise((r) => setTimeout(r, 1100 + reply.phases.length * 650))
    addAgentMessage(convo.id, reply.author, reply.text, reply.attachment)
    setTyping(null)
    if (convo.kind === 'team') {
      const second = ws.hires.find((h) => h.status === 'active' && h.agentId !== 'manager' && text.toLowerCase().includes(resolve(h.agentId).displayName.toLowerCase().split(' ')[0]))
      if (second) {
        const r2 = composeReply(ws, second.agentId, text)
        setTyping({ convo: convo.id, author: second.agentId, phases: r2.phases })
        await new Promise((r) => setTimeout(r, 1400))
        addAgentMessage(convo.id, r2.author, r2.text, r2.attachment)
        setTyping(null)
      }
    }
  }

  const send = (text: string, files: File[] = []) => {
    if (!desktopActive) return
    const body = [text, ...files.map((f) => `Attached ${f.name}`)].filter(Boolean).join('\n')
    if (!body) return
    sendMessage(desktopActive.id, body, contextPost ? { kind: 'post', postId: contextPost.id } : undefined)
    const postId = contextPost?.id
    if (contextPost) setParams({}, { replace: true })
    void respond(desktopActive, text || 'I attached a file', postId)
  }

  const head = desktopActive
  const headAgent = head?.agentId ? resolve(head.agentId) : undefined
  const hireStatus = headAgent?.hire?.status
  const suggestions = SUGGESTIONS[head?.kind === 'team' ? 'team' : head?.agentId ?? 'manager'] ?? SUGGESTIONS.manager

  return (
    <div className="flex h-[calc(100dvh-68px)] min-h-[520px] overflow-hidden">
      {/* Conversation list */}
      <aside className={cn('w-full shrink-0 flex-col border-r border-line bg-panel-muted md:flex md:w-[300px] lg:w-[320px]', active ? 'hidden' : 'flex')}>
        <div className="px-4 pb-3 pt-5">
          <h1 className="text-[20px] font-medium tracking-[-0.02em] text-ink">Messages</h1>
          <p className="mt-0.5 text-[12.5px] text-ink-3">Also on Telegram · same conversations</p>
          <div className="mt-3 [&_label]:sr-only">
            <SearchField label="Search conversations" placeholder="Search conversations" value={query} onValueChange={setQuery} />
          </div>
        </div>
        <ul className="thin-scroll flex-1 overflow-y-auto px-2 pb-24 md:pb-4">
          {list.map((c) => {
            const last = c.messages.at(-1)
            const isActive = c.id === desktopActive?.id
            return (
              <li key={c.id}>
                <Link
                  to={`/messages/${c.id}`}
                  className={cn('flex items-center gap-3 rounded-[12px] px-2.5 py-2.5 transition-colors', isActive ? 'bg-panel shadow-[var(--shadow-resting)] ring-1 ring-line' : 'hover:bg-sunken')}
                >
                  <ConversationAvatar convo={c} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium text-ink">{c.kind === 'direct' && c.agentId ? resolve(c.agentId).displayName : c.title}</span>
                      {c.pinned && <Pin className="size-3 shrink-0 text-ink-3" strokeWidth={1.75} />}
                      <span className="ml-auto shrink-0 text-[11.5px] text-ink-3">{last ? shortAgo(last.createdAt) : ''}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className={cn('truncate text-[12.5px]', c.unread ? 'text-ink' : 'text-ink-3')}>
                        {typing?.convo === c.id ? 'Typing…' : last ? `${last.author === 'user' ? 'You: ' : ''}${last.text}` : 'Say hello'}
                      </span>
                      {c.unread > 0 && !isActive && <span className="tabular ml-auto shrink-0 rounded-full bg-inverse px-1.5 text-[11px] leading-[18px] text-ink-inverse">{c.unread}</span>}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </aside>

      {/* Thread */}
      <section className={cn('min-w-0 flex-1 flex-col bg-canvas', active ? 'flex' : 'hidden md:flex')} aria-label="Conversation">
        {head && (
          <>
            <header className="flex h-[68px] shrink-0 items-center gap-3 border-b border-line bg-panel px-4 sm:px-5">
              <button type="button" onClick={() => navigate('/messages')} className="-ml-1 inline-flex size-9 items-center justify-center rounded-full text-ink-2 hover:bg-sunken md:hidden" aria-label="Back to conversations">
                <ArrowLeft className="size-[18px]" strokeWidth={1.75} />
              </button>
              <ConversationAvatar convo={head} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-medium text-ink">{headAgent ? headAgent.displayName : head.title}</p>
                <p className="truncate text-[12.5px] text-ink-3">
                  {head.kind === 'team' ? `${head.members.length} agents · the Manager answers for the team` : headAgent ? `${headAgent.role} · replies in seconds` : ''}
                </p>
              </div>
              {hireStatus && <AgentStatus status={hireStatus} className="hidden sm:inline-flex" />}
              {headAgent && (
                <Link to={`/krew/${headAgent.id}`} className="hidden h-8 items-center gap-1 rounded-full border border-line px-3 text-[12.5px] text-ink-2 hover:border-line-strong hover:text-ink sm:inline-flex">
                  Workspace <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                </Link>
              )}
            </header>

            <div ref={scrollRef} className="thin-scroll flex-1 overflow-y-auto">
              <div className="mx-auto flex max-w-[860px] flex-col gap-3 px-4 py-6 sm:px-6">
                {head.messages.length === 0 && (
                  <div className="mx-auto my-10 max-w-sm text-center">
                    <ConversationAvatar convo={head} />
                    <p className="mt-3 text-[15px] font-medium text-ink">Start a conversation</p>
                    <p className="mt-1 text-[13.5px] text-ink-2">Ask for a report, a number, or what needs your attention.</p>
                  </div>
                )}
                {head.messages.map((m, i) => {
                  const prev = head.messages[i - 1]
                  const newDay = !prev || dayGroup(prev.createdAt) !== dayGroup(m.createdAt)
                  const showAuthor = newDay || !prev || prev.author !== m.author
                  return (
                    <Fragment key={m.id}>
                      {newDay && (
                        <div className="my-2 flex items-center gap-3 text-[11.5px] text-ink-3">
                          <span className="h-px flex-1 bg-line" />
                          {dayGroup(m.createdAt)}
                          <span className="h-px flex-1 bg-line" />
                        </div>
                      )}
                      <Bubble message={m} showAuthor={showAuthor} />
                    </Fragment>
                  )
                })}
                <AnimatePresence>
                  {typing?.convo === head.id && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5">
                      <AgentAvatar agentId={typing.author} size="sm" />
                      <ThinkingLoader phases={typing.phases} interval={900} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="shrink-0 border-t border-line bg-panel pb-20 md:pb-0">
              <div className="mx-auto max-w-[860px] px-3 pt-3 sm:px-5">
                {contextPost ? (
                  <div className="mb-2 flex items-center gap-2 rounded-[12px] border border-line bg-panel-muted px-3 py-2">
                    <span className="text-[12px] text-ink-3">Asking about</span>
                    <span className="truncate text-[13px] text-ink">{contextPost.title}</span>
                    <button type="button" onClick={() => setParams({}, { replace: true })} className="ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-sunken hover:text-ink" aria-label="Remove context">
                      <X className="size-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                ) : (
                  <div className="no-scrollbar mb-1 flex gap-1.5 overflow-x-auto">
                    {suggestions.map((s) => (
                      <button key={s} type="button" onClick={() => send(s)} disabled={!!typing} className="shrink-0 rounded-full border border-line bg-panel px-3 py-1 text-[12.5px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mx-auto max-w-[860px] [&>div]:border-t-0">
                <ChatComposer
                  placeholder={hireStatus === 'setup' ? 'This agent is still being set up' : `Message ${headAgent ? headAgent.displayName : head.title}`}
                  disabled={hireStatus === 'setup' || !!typing}
                  onSend={(draft) => send(draft.text, draft.files)}
                />
              </div>
            </div>
          </>
        )}
      </section>

      {/* Context */}
      {head && (
        <aside className="hidden w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-line bg-panel-muted p-5 2xl:flex">
          {headAgent ? (
            <>
              <div className="flex flex-col items-center text-center">
                <AgentAvatar agentId={headAgent.id} size="xl" showStatus />
                <p className="mt-3 text-[15px] font-medium text-ink">{headAgent.displayName}</p>
                <p className="text-[12.5px] text-ink-3">{headAgent.role}</p>
                <p className="mt-3 text-[13px] leading-snug text-ink-2">{headAgent.tagline}</p>
              </div>
              <div>
                <p className="mb-2 text-[12px] text-ink-3">Recent from {headAgent.displayName.split(' ')[0]}</p>
                <div className="flex flex-col">
                  {ws.posts
                    .filter((p) => p.agentId === headAgent.id)
                    .slice(0, 3)
                    .map((p) => (
                      <FeedPost key={p.id} post={p} variant="compact" />
                    ))}
                </div>
              </div>
            </>
          ) : (
            <div>
              <p className="mb-3 text-[12px] text-ink-3">In this room</p>
              <ul className="flex flex-col gap-2">
                {head.members.map((m) => (
                  <li key={m} className="flex items-center gap-2.5">
                    <AgentAvatar agentId={m} size="sm" showStatus />
                    <span className="text-[13px] text-ink">{resolve(m).displayName}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-auto rounded-[12px] border border-line bg-panel p-3.5 text-[12.5px] text-ink-2">
            <p className="flex items-center gap-1.5 font-medium text-ink">
              <Send className="size-3.5" strokeWidth={1.75} /> Same thread on Telegram
            </p>
            <p className="mt-1">Messages here and on Telegram share one history. Attachments <Paperclip className="inline size-3" /> stay in your workspace.</p>
          </div>
        </aside>
      )}
    </div>
  )
}
