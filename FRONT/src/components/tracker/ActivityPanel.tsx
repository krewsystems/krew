import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { ActivityEntry } from '@/data/tracker/types'
import { money, relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ACTIVITY_KIND, SOURCE_LABEL } from './labels'

export function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const kind = ACTIVITY_KIND[entry.kind]
  const Icon = kind.icon
  return (
    <li className="flex gap-3 rounded-[10px] px-3 py-2.5">
      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-ink-2">
        <Icon className="size-4" strokeWidth={1.6} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-[13.5px] text-ink">{entry.title}</p>
          {entry.amount !== undefined && <span className="tabular shrink-0 text-[13.5px] text-ink">{money(entry.amount)}</span>}
        </div>
        <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-2">{entry.detail}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
          <span>{kind.label}</span>
          <span aria-hidden>·</span>
          <span>{SOURCE_LABEL[entry.source]}</span>
          <span aria-hidden>·</span>
          <time dateTime={entry.at}>{relativeTime(entry.at)}</time>
        </p>
      </div>
    </li>
  )
}

const LATEST = 2

/** Entries waiting for the owner come first; the rest is a short, expandable log. */
export function ActivityPanel({ entries, className }: { entries: ActivityEntry[]; className?: string }) {
  const [expanded, setExpanded] = useState(false)
  const sorted = [...entries].sort((a, b) => b.at.localeCompare(a.at))
  const waiting = sorted.filter((e) => e.needsReview)
  const rest = sorted.filter((e) => !e.needsReview)
  const shown = expanded ? rest : rest.slice(0, LATEST)

  return (
    <section aria-label="Recent activity" className={cn('flex flex-col rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]', className)}>
      <header className="px-6 pt-5 sm:px-7">
        <h2 className="text-[15px] font-medium tracking-[-0.01em] text-ink">Recent activity</h2>
        <p className="mt-0.5 text-[13px] text-ink-3">Batches, costs, expenses and payments</p>
      </header>
      {sorted.length === 0 ? (
        <p className="px-6 py-10 text-center text-[13.5px] text-ink-3">No financial activity recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-4 px-3 pb-4 pt-4">
          {waiting.length > 0 && (
            <div className="rounded-[14px] bg-warn-soft px-1 pb-1 pt-3">
              <p className="px-3 text-[12.5px] text-warn">Waiting for your confirmation · {waiting.length}</p>
              <ul className="mt-1 flex flex-col">
                {waiting.map((e) => (
                  <ActivityRow key={e.id} entry={e} />
                ))}
              </ul>
            </div>
          )}
          <ul className="flex flex-col">
            {shown.map((e) => (
              <ActivityRow key={e.id} entry={e} />
            ))}
          </ul>
          {rest.length > LATEST && (
            <button type="button" onClick={() => setExpanded((x) => !x)} aria-expanded={expanded} className="mx-3 inline-flex items-center gap-1 self-start text-[13px] text-ink-2 hover:text-ink">
              {expanded ? 'Show less' : `${rest.length - LATEST} earlier entries`}
              <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} strokeWidth={1.7} />
            </button>
          )}
        </div>
      )}
    </section>
  )
}
