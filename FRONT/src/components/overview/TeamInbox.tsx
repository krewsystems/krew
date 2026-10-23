import { ArrowUpRight, Check, MessageCircle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/arc/button/button'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { useAgentResolver } from '@/components/agent/use-agent'
import { ImpactBadge } from '@/components/approvals/ApprovalActions'
import type { Approval, FeedPost } from '@/data/types'
import { shortAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useKrew, useWorkspace } from '@/store/krew'
import { toast } from '@/store/toasts'

type Item = { kind: 'ask'; at: string; approval: Approval } | { kind: 'heads-up'; at: string; post: FeedPost }

function firstSentences(text: string, n = 2) {
  const parts = text.match(/[^.!?]+[.!?]+/g) ?? [text]
  return parts.slice(0, n).join('').trim()
}

function AskMessage({ approval }: { approval: Approval }) {
  const ws = useWorkspace()
  const resolve = useAgentResolver()
  const decide = useKrew((s) => s.decideApproval)
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const agent = resolve(approval.agentId)
  const decided = approval.status !== 'pending'
  // After a decision, the agent's own reply (written by the store) appears under the ask.
  const convo = ws.conversations.find((c) => c.id === approval.agentId) ?? ws.conversations.find((c) => c.id === 'manager')
  const followUp = decided ? [...(convo?.messages ?? [])].reverse().find((m) => m.author === approval.agentId && approval.decidedAt && m.createdAt >= approval.decidedAt) : undefined

  return (
    <>
      <div className="max-w-full rounded-[18px] rounded-tl-[6px] border border-line-subtle bg-panel-muted px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink">
        {approval.ask ?? `Can I go ahead with this: ${approval.title.charAt(0).toLowerCase()}${approval.title.slice(1)}?`}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-1">
        <ImpactBadge impact={approval.impact} />
        <span className="text-[12px] text-ink-3">{approval.channel}</span>
      </div>
      <AnimatePresence initial={false} mode="popLayout">
        {decided ? (
          <motion.div key="done" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 self-end rounded-[16px] rounded-br-[6px] bg-inverse px-3 py-1.5 text-[13px] text-ink-inverse">
              {approval.status === 'approved' ? <Check className="size-3.5" strokeWidth={2} /> : <X className="size-3.5" strokeWidth={2} />}
              {approval.status === 'approved' ? 'Approved' : 'Not this time'}
            </div>
            {followUp && (
              <div className="flex items-start gap-2">
                <AgentAvatar agentId={approval.agentId} size="xs" className="mt-1" />
                <p className="rounded-[16px] rounded-tl-[6px] border border-line-subtle bg-panel-muted px-3 py-1.5 text-[13px] text-ink-2">{followUp.text}</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="actions" exit={{ opacity: 0 }} className="mt-3 flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              loading={busy}
              onClick={() => {
                setBusy(true)
                setTimeout(() => {
                  decide(approval.id, 'approved')
                  setBusy(false)
                  toast('Approved', `${agent.displayName} is on it.`)
                }, 700)
              }}
            >
              {approval.status === 'pending' ? 'Yes, go ahead' : 'Approved'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/approvals/${approval.id}`)}>
              See details
            </Button>
            <Button size="sm" variant="ghost" aria-label={`Reply to ${agent.displayName}`} onClick={() => navigate(`/messages/${approval.agentId}`)}>
              <MessageCircle className="size-4" strokeWidth={1.6} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function HeadsUp({ post }: { post: FeedPost }) {
  const resolve = useAgentResolver()
  const navigate = useNavigate()
  const name = resolve(post.agentId).displayName
  return (
    <>
      <div className="rounded-[18px] rounded-tl-[6px] border border-line-subtle bg-panel-muted px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink">
        <span className="mb-1 inline-flex items-center gap-1.5 text-[11.5px] text-warn">
          <span className="size-1.5 rounded-full bg-warn" /> Heads up
        </span>
        <p>{firstSentences(post.body)}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => navigate(`/messages/${post.agentId}?post=${post.id}`)}>
          Ask {name}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => navigate(`/feed#${post.id}`)}>
          View in feed
        </Button>
      </div>
    </>
  )
}

/** "Needs your attention" as messages from teammates: each agent asks in their own voice and you answer inline. */
export function TeamInbox({ className }: { className?: string }) {
  const ws = useWorkspace()
  const resolve = useAgentResolver()
  const [sessionStart] = useState(() => new Date().toISOString())

  const items = useMemo<Item[]>(() => {
    const asks: Item[] = ws.approvals
      .filter((a) => a.status === 'pending' || (a.decidedAt && a.decidedAt >= sessionStart))
      .map((a) => ({ kind: 'ask', at: a.createdAt, approval: a }))
    const alerts: Item[] = ws.posts
      .filter((p) => p.type === 'alert' && Date.now() - new Date(p.createdAt).getTime() < 2 * 86_400_000)
      .map((p) => ({ kind: 'heads-up', at: p.createdAt, post: p }))
    return [...asks, ...alerts].sort((a, b) => b.at.localeCompare(a.at))
  }, [ws.approvals, ws.posts, sessionStart])

  const waiting = ws.approvals.filter((a) => a.status === 'pending').length

  return (
    <section className={cn('flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]', className)} aria-label="Messages waiting on you">
      <header className="flex items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
        <div>
          <h2 className="text-[15px] font-medium tracking-[-0.01em] text-ink">Waiting on you</h2>
          <p className="text-[12.5px] text-ink-3">{waiting ? `${waiting} teammates need a decision` : 'Nobody is waiting on you'}</p>
        </div>
        <div className="flex items-center -space-x-1.5">
          {[...new Set(items.map((i) => (i.kind === 'ask' ? i.approval.agentId : i.post.agentId)))].slice(0, 5).map((id) => (
            <AgentAvatar key={id} agentId={id} size="sm" ring />
          ))}
        </div>
      </header>

      <ul className="thin-scroll flex max-h-[720px] flex-1 flex-col overflow-y-auto">
        {items.length === 0 && (
          <li className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-sunken text-ink-2">
              <Check className="size-5" strokeWidth={1.75} />
            </span>
            <p className="text-[14px] text-ink">You’re all caught up</p>
            <p className="max-w-[28ch] text-[13px] text-ink-3">Your team will message you here and on Telegram when they need you.</p>
          </li>
        )}
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const agentId = item.kind === 'ask' ? item.approval.agentId : item.post.agentId
            const agent = resolve(agentId)
            const unread = item.kind === 'ask' && item.approval.status === 'pending'
            return (
              <motion.li key={item.kind === 'ask' ? item.approval.id : item.post.id} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-line-subtle px-5 py-4 last:border-0">
                <div className="flex gap-3">
                  <Link to={`/krew/${agentId}`} className="shrink-0" aria-label={`Open ${agent.displayName}`}>
                    <AgentAvatar agentId={agentId} size="md" showStatus />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-baseline gap-2">
                      <span className="truncate text-[13.5px] font-medium text-ink">{agent.displayName}</span>
                      <span className="truncate text-[12px] text-ink-3">{agent.role}</span>
                      <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[11.5px] text-ink-3">
                        {shortAgo(item.at)}
                        {unread && <span className="size-1.5 rounded-full bg-ink" aria-label="Unread" />}
                      </span>
                    </div>
                    {item.kind === 'ask' ? <AskMessage approval={item.approval} /> : <HeadsUp post={item.post} />}
                  </div>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>

      <Link to="/messages" className="flex items-center justify-center gap-1 border-t border-line-subtle py-3 text-[13px] text-ink-2 transition-colors hover:bg-panel-muted hover:text-ink">
        Open all messages <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
      </Link>
    </section>
  )
}
