import { HeartHandshake, MessageCircleMore, ShoppingBag, Sparkles, type LucideIcon } from 'lucide-react'
import type { FollowUpKind, OutcomeKind, RetentionStatus } from '@/data/retention/types'

/** Recovery reads warm (Retention's rose); sales follow-ups read cool (the sales blue). Colour marks the job, not alarm. */
export const KIND: Record<FollowUpKind, { label: string; short: string; icon: LucideIcon; accent: string; group: 'recovery' | 'sales' }> = {
  recovery: { label: 'Recovery', short: 'Recovery', icon: HeartHandshake, accent: 'var(--agent-retention)', group: 'recovery' },
  purchase_follow_up: { label: 'Purchase follow-up', short: 'Purchase', icon: ShoppingBag, accent: 'var(--sales)', group: 'sales' },
  unfinished_conversation: { label: 'Unfinished conversation', short: 'Unfinished', icon: MessageCircleMore, accent: 'var(--sales)', group: 'sales' },
  re_engagement: { label: 'Re-engagement', short: 'Re-engage', icon: Sparkles, accent: 'var(--agent-luna)', group: 'sales' },
}

export const STATUS: Record<RetentionStatus, { label: string; dot: string }> = {
  suggested: { label: 'New', dot: 'bg-[var(--agent-retention)]' },
  prepared: { label: 'Follow-up prepared', dot: 'bg-sales' },
  sent: { label: 'Sent, waiting for reply', dot: 'bg-warn' },
  done: { label: 'Done', dot: 'bg-good' },
  dismissed: { label: 'Dismissed', dot: 'bg-line-strong' },
}

export const OUTCOME: Record<OutcomeKind, { label: string; tone: 'good' | 'neutral' | 'bad'; forKinds: 'all' | 'sales' | 'recovery' }> = {
  replied_positive: { label: 'Replied warmly', tone: 'good', forKinds: 'all' },
  bought: { label: 'Bought', tone: 'good', forKinds: 'sales' },
  issue_closed: { label: 'Happy, issue closed', tone: 'good', forKinds: 'recovery' },
  no_reply: { label: 'No reply', tone: 'neutral', forKinds: 'all' },
  not_interested: { label: 'Not interested', tone: 'neutral', forKinds: 'sales' },
  still_unhappy: { label: 'Still unhappy', tone: 'bad', forKinds: 'recovery' },
}

export const DISMISS_REASONS = ['Not worth a message', 'Already handled', 'Too soon', 'Customer asked for no contact', 'No offer to make']
