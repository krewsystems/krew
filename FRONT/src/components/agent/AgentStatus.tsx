import type { HireStatus } from '@/data/types'
import { cn } from '@/lib/utils'

const LABEL: Record<HireStatus, string> = { active: 'Active', paused: 'Paused', setup: 'Setting up' }

export function AgentStatus({ status, className, pulse = true }: { status: HireStatus; className?: string; pulse?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[12.5px] text-ink-2', className)}>
      <span className="relative flex size-1.5">
        {status === 'active' && pulse && <span className="absolute inset-0 animate-ping rounded-full bg-good opacity-40" />}
        <span
          className={cn(
            'relative size-1.5 rounded-full',
            status === 'active' ? 'bg-good' : status === 'setup' ? 'bg-warn' : 'bg-line-strong',
          )}
        />
      </span>
      {LABEL[status]}
    </span>
  )
}
