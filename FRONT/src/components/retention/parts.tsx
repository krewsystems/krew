import type { FollowUpKind, Priority } from '@/data/retention/types'
import { cn } from '@/lib/utils'
import { KIND } from './labels'

/** The case kind as a small tinted label. Recovery is warm, sales follow-ups are cool. */
export function KindTag({ kind, className }: { kind: FollowUpKind; className?: string }) {
  const k = KIND[kind]
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px]', className)} style={{ background: `color-mix(in oklab, ${k.accent} 12%, var(--surface))`, color: `color-mix(in oklab, ${k.accent} 80%, var(--foreground))` }}>
      <k.icon className="size-3.5" strokeWidth={1.7} />
      {k.label}
    </span>
  )
}

export function KindIcon({ kind, size = 40 }: { kind: FollowUpKind; size?: number }) {
  const k = KIND[kind]
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-[12px]" style={{ width: size, height: size, background: `color-mix(in oklab, ${k.accent} 14%, var(--surface))`, color: `color-mix(in oklab, ${k.accent} 85%, var(--foreground))` }}>
      <k.icon className="size-[18px]" strokeWidth={1.6} />
    </span>
  )
}

/** How much the follow-up matters, in the case's own accent. Never red: urgency of the issue is Luna's job. */
export function Worth({ priority, kind }: { priority: Priority; kind: FollowUpKind }) {
  const n = priority === 'high' ? 3 : priority === 'medium' ? 2 : 1
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2" title={`${priority} priority`}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((b) => (
          <span key={b} className="w-[3px] rounded-full" style={{ height: 4 + b * 3, background: b <= n ? KIND[kind].accent : 'var(--border)' }} />
        ))}
      </span>
      {priority === 'high' ? 'High' : priority === 'medium' ? 'Medium' : 'Low'}
    </span>
  )
}
