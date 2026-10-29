import { CircleDollarSign, HeartHandshake, MessageCircleQuestion, PackageOpen, PackageX, Ruler, Smile, TrendingDown, Truck, type LucideIcon } from 'lucide-react'
import type { CustomerIntent, InsightKind, IntentLevel, Language, OpportunityStatus, Priority, RiskIssue, RiskStatus, Sentiment, TopicId } from '@/data/luna/types'

export const TOPIC: Record<TopicId, string> = {
  availability: 'Availability',
  sizing: 'Sizing',
  delivery: 'Delivery',
  pricing: 'Pricing',
  product_question: 'Product question',
  order_status: 'Order status',
  damaged: 'Damaged',
  wrong_item: 'Wrong item',
  product_quality: 'Product quality',
  praise: 'Praise',
  payment: 'Payment',
}

export const INTENT: Record<CustomerIntent, string> = {
  buy: 'Ready to buy',
  ask_before_buying: 'Asking before buying',
  restock: 'Waiting for a restock',
  track_order: 'Tracking an order',
  complain: 'Complaint',
  return_or_exchange: 'Return or exchange',
  give_feedback: 'Feedback',
}

export const LANGUAGE: Record<Language, string> = {
  'ar-EG': 'Egyptian Arabic',
  ar: 'Arabic',
  en: 'English',
  mixed: 'Arabic and English',
}

/** Sentiment uses a dot, never a filled surface. */
export const SENTIMENT: Record<Sentiment, { label: string; dot: string; text: string }> = {
  positive: { label: 'Positive', dot: 'bg-good', text: 'text-good' },
  neutral: { label: 'Neutral', dot: 'bg-line-strong', text: 'text-ink-3' },
  mixed: { label: 'Mixed', dot: 'bg-warn', text: 'text-warn' },
  negative: { label: 'Negative', dot: 'bg-bad', text: 'text-bad' },
}

export const INTENT_LEVEL: Record<IntentLevel, { label: string; bars: number }> = {
  high: { label: 'High', bars: 3 },
  medium: { label: 'Medium', bars: 2 },
  low: { label: 'Low', bars: 1 },
}

export const PRIORITY: Record<Priority, { label: string; tone: 'danger' | 'warning' | 'neutral' }> = {
  high: { label: 'High', tone: 'danger' },
  medium: { label: 'Medium', tone: 'warning' },
  low: { label: 'Low', tone: 'neutral' },
}

export const OPPORTUNITY_STATUS: Record<OpportunityStatus, { label: string; dot: string }> = {
  new: { label: 'New', dot: 'bg-[var(--agent-luna)]' },
  followed_up: { label: 'Followed up', dot: 'bg-sales' },
  converted: { label: 'Converted', dot: 'bg-good' },
  closed: { label: 'Closed', dot: 'bg-line-strong' },
}

export const RISK_STATUS: Record<RiskStatus, { label: string; dot: string }> = {
  open: { label: 'Open', dot: 'bg-bad' },
  in_progress: { label: 'In progress', dot: 'bg-warn' },
  resolved: { label: 'Resolved', dot: 'bg-good' },
  dismissed: { label: 'Dismissed', dot: 'bg-line-strong' },
}

export const ISSUE: Record<RiskIssue, string> = {
  delivery: 'Delivery problem',
  unanswered: 'Unanswered messages',
  damaged: 'Damaged order',
  wrong_item: 'Wrong item',
  repeated_dissatisfaction: 'Repeated dissatisfaction',
  product_quality: 'Product problem',
}

export const INSIGHT_KIND: Record<InsightKind, { label: string; icon: LucideIcon; accent: string }> = {
  restock: { label: 'Restock demand', icon: PackageOpen, accent: 'var(--agent-luna)' },
  sizing: { label: 'Sizing confusion', icon: Ruler, accent: 'var(--sales)' },
  delivery: { label: 'Delivery', icon: Truck, accent: 'var(--danger)' },
  price: { label: 'Price objections', icon: CircleDollarSign, accent: 'var(--agent-store)' },
  damage: { label: 'Damaged in transit', icon: PackageX, accent: 'var(--agent-ads)' },
  feedback: { label: 'Product feedback', icon: MessageCircleQuestion, accent: 'var(--agent-ivy)' },
  praise: { label: 'Praise', icon: Smile, accent: 'var(--success)' },
  sentiment: { label: 'Sentiment', icon: TrendingDown, accent: 'var(--warning)' },
}

export const RETENTION_ICON = HeartHandshake

/** Reasons offered when closing an opportunity or dismissing a case. */
export const CLOSE_REASONS = ['Not interested', 'Bought elsewhere', 'Out of stock', 'Price', 'No reply', 'Asked not to be contacted']
export const DISMISS_REASONS = ['Not a real issue', 'Customer is happy', 'Handled elsewhere', 'Duplicate']
