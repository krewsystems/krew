import { ArrowUp, ArrowUpRight, Check, CheckCheck, ChevronRight, Send } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { AgentPortrait } from '@/components/agent/AgentPortrait'
import { MentionText } from '@/components/agent/MentionText'
import { useAgentResolver } from '@/components/agent/use-agent'
import { BlurredText } from '@/components/ui/streaming-text'
import { ThinkingLoader } from '@/components/ui/ThinkingLoader'
import { getPersona } from '@/data/personas'
import { clockTime, relativeTime } from '@/lib/format'
import { composeReply } from '@/lib/responder'
import { cn } from '@/lib/utils'
import { useKrew, useWorkspace } from '@/store/krew'

const QUICK = ['Walk me through the delivery issue', 'What can wait until tomorrow?', 'Approve the low-risk ones for me']

interface Line {
  id: string
  from: 'user' | 'manager'
  text: string
}

/** The morning briefing as a personal note from the Manager, with a reply box that becomes a short thread. */
export function ManagerNote({ className }: { className?: string }) {
  const ws = useWorkspace()
  const resolve = useAgentResolver()
  const navigate = useNavigate()
  const sendMessage = useKrew((s) => s.sendMessage)
  const addAgentMessage = useKrew((s) => s.addAgentMessage)
  const decide = useKrew((s) => s.decideApproval)
  const manager = ws.hires.find((h) => h.agentId === 'manager')
  const persona = getPersona('manager')
  const [draft, setDraft] = useState('')
  const [thread, setThread] = useState<Line[]>([])
  const [typing, setTyping] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Today's asks: everything still pending, plus anything decided since the note was written.
  // The note goes out at 08:02 each morning (or as soon as the Manager is active, before that).
  const sentAt = useMemo(() => {
    const morning = new Date()
    morning.setHours(8, 2, 0, 0)
    return morning.getTime() < Date.now() ? morning.toISOString() : manager?.lastActiveAt ?? new Date().toISOString()
  }, [manager?.lastActiveAt])
  const asks = useMemo(
    () => {
      const rank = { high: 0, medium: 1, low: 2 }
      return ws.approvals
        .filter((a) => a.status === 'pending' || (a.decidedAt && a.decidedAt > sentAt))
        .sort((a, b) => rank[a.impact] - rank[b.impact] || b.createdAt.localeCompare(a.createdAt))
    },
    [ws.approvals, sentAt],
  )
  const done = asks.filter((a) => a.status !== 'pending').length

  const send = async (text: string) => {
    const body = text.trim()
    if (!body || typing) return
    setDraft('')
    setThread((t) => [...t, { id: `u${Date.now()}`, from: 'user', text: body }])
    sendMessage('manager', body)
    setTyping(true)
    await new Promise((r) => setTimeout(r, 1500))
    let answer: string
    // A delegated decision: the Manager approves the low-impact asks on your behalf.
    if (/approve the low.?risk/i.test(body)) {
      const low = ws.approvals.filter((a) => a.status === 'pending' && a.impact === 'low')
      low.forEach((a) => decide(a.id, 'approved', 'Approved by the Manager on your behalf'))
      answer = low.length ? `Done. I approved ${low.map((a) => a.title.toLowerCase()).join(' and ')}. I left the rest for you because they touch customers or budget.` : 'There’s nothing low-risk left. The remaining asks touch customers or budget, so they need you.'
    } else {
      answer = composeReply(ws, 'manager', body).text
    }
    addAgentMessage('manager', 'manager', answer)
    setThread((t) => [...t, { id: `m${Date.now()}`, from: 'manager', text: answer }])
    setTyping(false)
  }

  return (
    <article className={cn('flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]', className)} aria-label="Morning note from your KREW Manager">
      <header className="flex items-start gap-4 px-6 pt-6 sm:px-7">
        <AgentPortrait agentId="manager" size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Link to="/krew/manager" className="text-[15px] font-medium text-ink hover:underline hover:underline-offset-4">
              KREW Manager
            </Link>
            <span className="text-[13px] text-ink-3">to you</span>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-ink-3">
            {clockTime(sentAt)} · {relativeTime(sentAt)}
            <span className="inline-flex items-center gap-1 text-ink-2">
              · <Send className="size-3" strokeWidth={1.75} /> Also on Telegram
              <CheckCheck className="size-3.5 text-good" strokeWidth={1.75} aria-label="Read" />
            </span>
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-2 sm:inline">Morning note</span>
      </header>

      <div className="px-6 pt-5 sm:px-7 sm:pl-[96px]">
        <p className="text-[15px] text-ink-2">Morning {ws.owner.name},</p>
        <BlurredText key={ws.id} as="h2" text={ws.briefing.headline} className="mt-2 text-[24px] font-normal leading-[1.22] tracking-[-0.02em] text-ink sm:text-[26px]" staggerChildren={0.035} delayChildren={0.1} />
        <p className="mt-3 max-w-[66ch] text-[14.5px] leading-[1.95] text-ink-2">
          <MentionText text={ws.briefing.body} />
        </p>

        {asks.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[13px] text-ink">What I need from you today</p>
              <span className="flex items-center gap-2 text-[12px] text-ink-3">
                <span className="tabular">
                  {done} of {asks.length} done
                </span>
                <span className="h-1 w-16 overflow-hidden rounded-full bg-sunken">
                  <motion.span className="block h-full rounded-full bg-ink" initial={false} animate={{ width: `${(done / asks.length) * 100}%` }} />
                </span>
              </span>
            </div>
            <ol className="flex flex-col overflow-hidden rounded-[14px] border border-line">
              {asks.map((a) => {
                const decided = a.status !== 'pending'
                return (
                  <li key={a.id} className="border-b border-line-subtle last:border-0">
                    <Link to={`/approvals/${a.id}`} className={cn('group flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-panel-muted', decided && 'bg-panel-muted')}>
                      {decided ? (
                        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-inverse text-ink-inverse">
                          <Check className="size-3.5" strokeWidth={2} />
                        </span>
                      ) : (
                        <AgentAvatar agentId={a.agentId} size="sm" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-[13.5px]', decided ? 'text-ink-3 line-through decoration-line-strong' : 'text-ink')}>{a.title}</span>
                        <span className="block truncate text-[12px] text-ink-3">
                          {decided ? `${a.status === 'approved' ? 'Approved' : 'Rejected'} ${relativeTime(a.decidedAt!)}` : `${resolve(a.agentId).displayName} is waiting · ${a.impact} impact`}
                        </span>
                      </span>
                      {!decided && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-[12.5px] text-ink-2 group-hover:text-ink">
                          Review <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        <p className="mt-5 text-[14px] text-ink-2">
          {persona.signoff},
          <br />
          <span className="text-ink">Your KREW Manager</span>
        </p>
      </div>

      {/* Inline thread */}
      <AnimatePresence initial={false}>
        {(thread.length > 0 || typing) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
            <div className="mx-6 mt-5 flex flex-col gap-2.5 border-t border-line-subtle pt-5 sm:mx-7">
              {thread.map((l) => (
                <motion.div key={l.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-2.5', l.from === 'user' ? 'justify-end' : 'justify-start')}>
                  {l.from === 'manager' && <AgentAvatar agentId="manager" size="sm" />}
                  <p className={cn('max-w-[80%] rounded-[16px] px-3.5 py-2 text-[13.5px] leading-relaxed', l.from === 'user' ? 'rounded-br-[6px] bg-inverse text-ink-inverse' : 'rounded-bl-[6px] border border-line bg-panel-muted text-ink')}>{l.text}</p>
                </motion.div>
              ))}
              {typing && (
                <div className="flex items-center gap-2.5">
                  <AgentAvatar agentId="manager" size="sm" />
                  <ThinkingLoader phases={['Checking with the team', 'Writing']} interval={800} />
                </div>
              )}
              {thread.length > 0 && !typing && (
                <button type="button" onClick={() => navigate('/messages/manager')} className="inline-flex items-center gap-1 self-start pl-10 text-[12.5px] text-ink-2 hover:text-ink">
                  Continue in Messages <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto px-6 pb-6 pt-5 sm:px-7">
        {thread.length === 0 && (
          <div className="no-scrollbar mb-2.5 flex gap-1.5 overflow-x-auto">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => send(q)} className="shrink-0 rounded-full border border-line px-3 py-1 text-[12.5px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink">
                {q}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send(draft)
          }}
          className="flex items-center gap-2 rounded-[14px] border border-line bg-panel-muted py-1.5 pl-4 pr-1.5 transition-colors focus-within:border-line-strong"
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Reply to your Manager…"
            aria-label="Reply to your Manager"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
          />
          <button type="submit" disabled={!draft.trim() || typing} aria-label="Send reply" className="inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-inverse text-ink-inverse transition-opacity disabled:opacity-30">
            <ArrowUp className="size-4" strokeWidth={2} />
          </button>
        </form>
      </div>
    </article>
  )
}
