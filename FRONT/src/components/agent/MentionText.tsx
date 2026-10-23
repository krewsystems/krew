import { Fragment, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useWorkspace } from '@/store/krew'
import { AgentAvatar } from './AgentAvatar'
import { resolveAgent } from './use-agent'

/** Renders prose where agent names become small identity chips, so messages read like a team talking. */
export function MentionText({ text, className }: { text: string; className?: string }) {
  const ws = useWorkspace()
  const parts = useMemo(() => {
    const names = ws.hires
      .map((h) => {
        const a = resolveAgent(h.agentId, ws.hires)
        // "Retention Agent" is often written as "Retention" in prose.
        return [a.displayName, a.displayName.replace(/ Agent$/, '')].map((n) => ({ n, id: h.agentId }))
      })
      .flat()
      .filter((x) => x.n.length > 2 && x.id !== 'manager')
      .sort((a, b) => b.n.length - a.n.length)
    if (!names.length) return [text]
    const re = new RegExp(`\\b(${names.map((x) => x.n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g')
    const out: (string | { id: string; label: string })[] = []
    let last = 0
    for (const m of text.matchAll(re)) {
      const hit = names.find((x) => x.n === m[0])!
      out.push(text.slice(last, m.index), { id: hit.id, label: m[0] })
      last = (m.index ?? 0) + m[0].length
    }
    out.push(text.slice(last))
    return out
  }, [text, ws.hires])

  return (
    <span className={className}>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <Link
            key={i}
            to={`/krew/${p.id}`}
            className="mx-0.5 inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full border border-line bg-panel pl-[2px] pr-2 align-[-5px] text-[0.92em] leading-none text-ink transition-colors hover:border-line-strong [&>span]:size-4! [&>span]:text-[9px]!"
          >
            <AgentAvatar agentId={p.id} size="xs" />
            {p.label}
          </Link>
        ),
      )}
    </span>
  )
}
