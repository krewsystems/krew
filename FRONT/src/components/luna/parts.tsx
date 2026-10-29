import { IconInstagram, IconWhatsapp } from 'nucleo-social-media'
import type { Channel, IntentLevel, LunaCase, Sentiment } from '@/data/luna/types'
import { cn } from '@/lib/utils'
import { INTENT_LEVEL, OPPORTUNITY_STATUS, RISK_STATUS, SENTIMENT } from './labels'

const TINTS = ['--agent-luna', '--agent-tracker', '--agent-ivy', '--agent-store', '--agent-ads', '--agent-retention', '--sales']

function hash(s: string) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

function initials(name: string) {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/** Initials on a quiet tint taken from the agent palette, stable per customer. */
export function CustomerAvatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const tint = TINTS[hash(name) % TINTS.length]
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-medium', className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), background: `color-mix(in oklab, var(${tint}) 16%, var(--surface))`, color: `color-mix(in oklab, var(${tint}) 75%, var(--foreground))` }}
    >
      {initials(name)}
    </span>
  )
}

export function ChannelIcon({ channel, size = 14, className }: { channel: Channel; size?: number; className?: string }) {
  const Icon = channel === 'instagram' ? IconInstagram : IconWhatsapp
  return <Icon size={size} className={cn('shrink-0 text-ink-3', className)} aria-label={channel === 'instagram' ? 'Instagram' : 'WhatsApp'} />
}

export function SentimentTag({ sentiment, className }: { sentiment: Sentiment; className?: string }) {
  const s = SENTIMENT[sentiment]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[12.5px] text-ink-2', className)}>
      <span className={cn('size-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  )
}

/** Three small bars, like signal strength. */
export function IntentMeter({ level, showLabel = true }: { level: IntentLevel; showLabel?: boolean }) {
  const { label, bars } = INTENT_LEVEL[level]
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2" title={`${label} purchase intent`}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3].map((b) => (
          <span key={b} className={cn('w-[3px] rounded-full', b <= bars ? 'bg-[var(--agent-luna)]' : 'bg-line')} style={{ height: 4 + b * 3 }} />
        ))}
      </span>
      {showLabel ? label : <span className="sr-only">{label} intent</span>}
    </span>
  )
}

export function CaseStatus({ c, className }: { c: LunaCase; className?: string }) {
  const s = c.type === 'opportunity' ? OPPORTUNITY_STATUS[c.status] : RISK_STATUS[c.status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-ink-2', className)}>
      <span className={cn('size-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  )
}

/** High priority gets a thin red marker and red text; everything else stays ink. */
export function PriorityMark({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[12.5px]', priority === 'high' ? 'text-bad' : priority === 'medium' ? 'text-ink-2' : 'text-ink-3')}>
      <span className="flex gap-[2px]" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn('h-2.5 w-[3px] rounded-full', i < (priority === 'high' ? 3 : priority === 'medium' ? 2 : 1) ? (priority === 'high' ? 'bg-bad' : 'bg-ink-3') : 'bg-line')} />
        ))}
      </span>
      {priority === 'high' ? 'High' : priority === 'medium' ? 'Medium' : 'Low'}
    </span>
  )
}
