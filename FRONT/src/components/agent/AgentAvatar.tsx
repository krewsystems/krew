import type { CSSProperties } from 'react'
import { agentFace } from '@/data/photos'
import { cn } from '@/lib/utils'
import { useAgentView } from './use-agent'

const SIZES = {
  xs: { box: 20, font: 10, dot: 6 },
  sm: { box: 28, font: 12, dot: 8 },
  md: { box: 36, font: 14, dot: 9 },
  lg: { box: 48, font: 18, dot: 11 },
  xl: { box: 72, font: 26, dot: 14 },
} as const

interface AgentAvatarProps {
  agentId: string
  size?: keyof typeof SIZES
  showStatus?: boolean
  className?: string
  ring?: boolean
}

/**
 * Temporary agent identity: a soft disc tinted by the agent's accent with a monogram.
 * The 3D characters will replace the inner mark later without changing the API.
 */
export function AgentAvatar({ agentId, size = 'md', showStatus = false, className, ring = false }: AgentAvatarProps) {
  const agent = useAgentView(agentId)
  const s = SIZES[size]
  const isManager = agentId === 'manager'
  const status = agent.hire?.status
  const photo = agentFace(agentId)
  const style = {
    width: s.box,
    height: s.box,
    fontSize: s.font,
    '--a': agent.color,
  } as CSSProperties

  return (
    <span
      className={cn('relative inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium', className)}
      style={style}
      role="img"
      aria-label={agent.displayName}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: isManager
            ? 'var(--surface-inverse)'
            : 'color-mix(in oklab, var(--a) 16%, var(--surface))',
          boxShadow: ring
            ? '0 0 0 2px var(--surface), 0 0 0 3px color-mix(in oklab, var(--a) 45%, transparent)'
            : 'inset 0 0 0 1px color-mix(in oklab, var(--a) 22%, transparent)',
        }}
      />
      {photo ? (
        <img src={photo} alt="" draggable={false} className="relative size-full rounded-full object-cover" loading="lazy" decoding="async" />
      ) : isManager ? (
        <svg aria-hidden viewBox="0 0 24 24" className="relative" style={{ width: s.box * 0.46, height: s.box * 0.46 }}>
          <circle cx="12" cy="12" r="9" fill="none" stroke="var(--text-inverse)" strokeWidth="1.6" strokeDasharray="2.2 2.6" />
          <circle cx="12" cy="12" r="3.2" fill="var(--text-inverse)" />
        </svg>
      ) : (
        <span aria-hidden className="relative tracking-tight" style={{ color: 'color-mix(in oklab, var(--a) 62%, var(--foreground))' }}>
          {agent.monogram}
        </span>
      )}
      {showStatus && status && (
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: s.dot,
            height: s.dot,
            right: size === 'xl' ? 3 : -1,
            bottom: size === 'xl' ? 3 : -1,
            boxShadow: '0 0 0 2px var(--surface)',
            background: status === 'active' ? 'var(--success)' : status === 'setup' ? 'var(--warning)' : 'var(--border-strong)',
          }}
        />
      )}
    </span>
  )
}
