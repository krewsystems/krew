import { ArrowRight, CalendarClock, MessageCircle, Pause, Play, Settings2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/arc/button/button'
import { Dialog, DialogContent } from '@/components/arc/dialog/dialog'
import { DropdownMenu } from '@/components/arc/dropdown-menu/dropdown-menu'
import { Progress } from '@/components/arc/progress/progress'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useKrew } from '@/store/krew'
import { toast } from '@/store/toasts'
import { AgentAvatar } from './AgentAvatar'
import { AgentStatus } from './AgentStatus'
import { useAgentView } from './use-agent'

export function AgentCard({ agentId, variant = 'full' }: { agentId: string; variant?: 'full' | 'compact' }) {
  const agent = useAgentView(agentId)
  const hire = agent.hire
  const navigate = useNavigate()
  const setStatus = useKrew((s) => s.setHireStatus)
  const removeHire = useKrew((s) => s.removeHire)
  const [confirmRemove, setConfirmRemove] = useState(false)
  if (!hire) return null
  const isSetup = hire.status === 'setup'
  const muted = hire.status === 'paused'

  if (variant === 'compact') {
    return (
      <Link
        to={`/krew/${agentId}`}
        className={cn(
          'group flex min-w-0 flex-col rounded-[var(--radius-panel)] border border-line bg-panel p-4 shadow-[var(--shadow-resting)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-raised)]',
          muted && 'bg-panel-muted',
        )}
      >
        <div className="flex items-center gap-3">
          <AgentAvatar agentId={agentId} size="md" showStatus />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-ink">{agent.displayName}</p>
            <p className="truncate text-[12px] text-ink-3">{agent.role}</p>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 min-h-[2.6em] text-[13px] leading-snug text-ink-2">{hire.headline}</p>
        <div className="mt-3 flex items-end justify-between gap-2 border-t border-line-subtle pt-3">
          <div className="min-w-0">
            <p className="truncate text-[11.5px] text-ink-3">{hire.kpi.label}</p>
            <p className="tabular mt-0.5 text-[17px] tracking-[-0.01em] text-ink">
              {hire.kpi.value}
              {hire.kpi.change && <span className={cn('ml-1.5 text-[11.5px]', hire.kpi.trend === 'up' ? 'text-good' : hire.kpi.trend === 'down' ? 'text-bad' : 'text-ink-3')}>{hire.kpi.change}</span>}
            </p>
          </div>
          <ArrowRight className="mb-1 size-4 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" strokeWidth={1.75} />
        </div>
      </Link>
    )
  }

  return (
    <article className={cn('flex min-w-0 flex-col rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]', muted && 'bg-panel-muted')}>
      <div className="flex items-start gap-4 p-5 pb-4">
        <AgentAvatar agentId={agentId} size="lg" showStatus />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link to={`/krew/${agentId}`} className="truncate text-[16px] font-medium tracking-[-0.015em] text-ink hover:underline hover:underline-offset-4">
              {agent.displayName}
            </Link>
            <AgentStatus status={hire.status} />
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-3">
            <span className="size-1.5 rounded-full" style={{ background: agent.color }} />
            {agent.role}
          </p>
        </div>
      </div>

      <div className="px-5">
        {isSetup ? (
          <div className="rounded-[12px] border border-dashed border-line-strong bg-panel-muted p-3.5">
            <p className="text-[13px] text-ink-2">{hire.headline}</p>
            <Progress className="mt-3" label="Setup progress" value={hire.setupProgress ?? 10} showValue />
          </div>
        ) : (
          <>
            <p className="text-[12px] text-ink-3">Latest</p>
            <p className="mt-1 line-clamp-2 min-h-[2.8em] text-[13.5px] leading-snug text-ink">{hire.headline}</p>
          </>
        )}
      </div>

      <dl className="mx-5 mt-4 grid grid-cols-2 gap-3 border-t border-line-subtle pt-4">
        <div className="min-w-0">
          <dt className="truncate text-[11.5px] text-ink-3">{hire.kpi.label}</dt>
          <dd className="tabular mt-0.5 truncate text-[18px] tracking-[-0.01em] text-ink">
            {hire.kpi.value}
            {hire.kpi.change && <span className={cn('ml-1.5 text-[11.5px]', hire.kpi.trend === 'up' ? 'text-good' : hire.kpi.trend === 'down' ? 'text-bad' : 'text-ink-3')}>{hire.kpi.change}</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1 truncate text-[11.5px] text-ink-3">
            <CalendarClock className="size-3" strokeWidth={1.75} /> {hire.status === 'paused' ? 'Paused' : 'Next run'}
          </dt>
          <dd className="mt-1 truncate text-[13px] text-ink-2">{hire.status === 'paused' ? `since ${relativeTime(hire.lastActiveAt)}` : relativeTime(hire.nextRunAt)}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap items-center gap-2 p-5 pt-5">
        <Button variant="secondary" size="sm" disabled={isSetup} aria-label={`Message ${agent.displayName}`} title="Message" onClick={() => navigate(`/messages/${agentId}`)}>
          <MessageCircle className="size-4" strokeWidth={1.6} />
        </Button>
        <Button variant="primary" size="sm" onClick={() => navigate(`/krew/${agentId}`)}>
          Workspace
        </Button>
        <div className="ml-auto">
          <DropdownMenu
            label="Manage"
            items={[
              { label: 'Agent settings', icon: <Settings2 size={15} />, onSelect: () => navigate(`/krew/${agentId}/settings`) },
              hire.status === 'paused'
                ? { label: 'Resume agent', icon: <Play size={15} />, onSelect: () => { setStatus(agentId, 'active'); toast(`${agent.displayName} resumed`) } }
                : { label: 'Pause agent', icon: <Pause size={15} />, disabled: isSetup, onSelect: () => { setStatus(agentId, 'paused'); toast(`${agent.displayName} paused`, 'Scheduled work is on hold until you resume.') } },
              { label: 'Remove from team', icon: <Trash2 size={15} />, destructive: true, separatorBefore: true, disabled: agentId === 'manager', onSelect: () => setConfirmRemove(true) },
            ]}
          />
        </div>
      </div>

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent title={`Remove ${agent.displayName}?`} description="Their reports and history stay in your workspace. You can hire them again from the marketplace.">
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmRemove(false)}>
              Keep on team
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                removeHire(agentId)
                setConfirmRemove(false)
                toast(`${agent.displayName} removed from your team`)
              }}
            >
              Remove agent
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  )
}
