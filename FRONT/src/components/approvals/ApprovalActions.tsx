import { useState } from 'react'
import { ActionButton } from '@/components/arc/action-button/action-button'
import { Badge } from '@/components/arc/badge/badge'
import { Button } from '@/components/arc/button/button'
import { Dialog, DialogContent } from '@/components/arc/dialog/dialog'
import { Textarea } from '@/components/arc/textarea/textarea'
import type { Approval, Impact } from '@/data/types'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useKrew } from '@/store/krew'
import { toast } from '@/store/toasts'
import { Check, X } from 'lucide-react'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const QUICK_REASONS = ['Too broad', 'Wrong timing', 'Discount too high', 'I’ll handle this myself']

export function ImpactBadge({ impact }: { impact: Impact }) {
  return (
    <Badge size="sm" tone={impact === 'high' ? 'warning' : impact === 'medium' ? 'info' : 'neutral'}>
      {impact === 'high' ? 'High impact' : impact === 'medium' ? 'Medium impact' : 'Low impact'}
    </Badge>
  )
}

export function DecisionBadge({ approval }: { approval: Approval }) {
  if (approval.status === 'pending') return <Badge size="sm" tone="warning">Waiting for you</Badge>
  return (
    <Badge size="sm" tone={approval.status === 'approved' ? 'success' : 'neutral'} icon={approval.status === 'approved' ? <Check size={12} /> : <X size={12} />}>
      {approval.status === 'approved' ? 'Approved' : 'Rejected'}
    </Badge>
  )
}

/** Approve and reject controls. Approve morphs in place; reject asks for a reason the agent learns from. */
export function ApprovalActions({ approval, size = 'md', className, onDecided }: { approval: Approval; size?: 'sm' | 'md'; className?: string; onDecided?: (status: 'approved' | 'rejected') => void }) {
  const decide = useKrew((s) => s.decideApproval)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  if (approval.status !== 'pending') {
    return (
      <div className={cn('flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3', className)}>
        <DecisionBadge approval={approval} />
        {approval.decidedAt && <span>{relativeTime(approval.decidedAt)}</span>}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <ActionButton
        label="Approve"
        pendingLabel="Approving"
        successLabel="Approved"
        resetAfterMs={0}
        className={size === 'sm' ? 'min-h-[var(--control-height-sm)]! px-3.5! text-[13px]!' : undefined}
        onAction={async () => {
          await wait(750)
          decide(approval.id, 'approved')
          onDecided?.('approved')
          toast('Approved', `${approval.title}. The agent posted the result to your feed.`)
        }}
      />
      <Button variant="secondary" size={size} onClick={() => setRejectOpen(true)}>
        Reject
      </Button>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent title="Reject this proposal?" description="Tell the agent why. It uses your reason to plan better next time.">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[12.5px] transition-colors',
                    reason === r ? 'border-ink bg-inverse text-ink-inverse' : 'border-line text-ink-2 hover:border-line-strong hover:text-ink',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <Textarea label="Reason (optional)" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: limit it to repeat customers" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  decide(approval.id, 'rejected', reason.trim() || undefined)
                  setRejectOpen(false)
                  onDecided?.('rejected')
                  toast('Proposal rejected', 'The agent stood it down and noted your feedback.')
                }}
              >
                Reject proposal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
