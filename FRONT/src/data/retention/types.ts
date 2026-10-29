// Retention (V1) domain shapes. Draft API contract; see docs/RETENTION.md.
// V1 works only from customer DMs and Luna's findings. No order history, spend or lifetime value.
// Customers, conversations, messages and Luna cases are referenced by id, never copied.

import type { Channel, Language } from '@/data/luna/types'

/** Why a follow-up could help. Flexible on purpose: the reason text carries the specifics. */
export type FollowUpKind = 'recovery' | 'purchase_follow_up' | 'unfinished_conversation' | 're_engagement'

/**
 * A person's progress on the follow-up.
 * suggested: Retention prepared it, nobody has looked yet. prepared: a person approved the message.
 * sent: a person says it was sent (by hand, in Instagram, in V1). done: an outcome was recorded. dismissed: not worth it.
 */
export type RetentionStatus = 'suggested' | 'prepared' | 'sent' | 'done' | 'dismissed'

export type OutcomeKind = 'replied_positive' | 'bought' | 'issue_closed' | 'no_reply' | 'not_interested' | 'still_unhappy'

export type Priority = 'high' | 'medium' | 'low'

/** Something that has to happen before the follow-up makes sense. Readiness is derived from these and from Luna's case. */
export type WaitFor =
  | { kind: 'restock'; productId: string; variant?: string; expected: string }
  | { kind: 'date'; at: string; label: string }
  | { kind: 'event'; label: string }
  /** Don't follow up until the customer has been quiet this long. */
  | { kind: 'quiet'; hours: number }

/** A follow-up message Retention prepared. Mock text in V1; the agent writes it in production. */
export interface FollowUpDraft {
  channel: Channel
  language: Language
  text: string
  /** The facts from the conversation the message relies on, so a person can check it is right. */
  uses: string[]
  /** Who it would come from, matching the staff member who handled the thread. */
  signedAs?: string
}

export interface Outcome {
  kind: OutcomeKind
  at: string
  note?: string
  /** For "bought": the order that confirms it. It also converts Luna's opportunity. */
  orderRef?: string
}

export interface RetentionCase {
  id: string
  customerId: string
  conversationId: string
  /** The Luna opportunity or at-risk case it came from. Missing when it came from a conversation signal without a case. */
  lunaCaseId?: string
  /** Luna's own words for why the customer surfaced, for conversation-signal cases (cases carry their own). */
  lunaSignal?: string
  /** Message ids worth reading first. Defaults to the Luna case's evidence. */
  evidence?: string[]
  kind: FollowUpKind
  /** How much a follow-up matters, which is not the same as Luna's urgency of the issue. */
  priority: Priority
  /** Retention's reason, one or two sentences in plain words. */
  reason: string
  action: { label: string; detail: string }
  timing: { label: string; rationale: string }
  waitFor?: WaitFor[]
  productIds: string[]
  draft: FollowUpDraft
  status: RetentionStatus
  createdAt: string
  preparedAt?: string
  sentAt?: string
  /** The text that was actually sent, when it differs from the draft. */
  sentText?: string
  outcome?: Outcome
  dismissReason?: string
}

export interface RetentionEvent {
  id: string
  caseId: string
  at: string
  by: 'retention' | 'you'
  kind: 'suggested' | 'draft_edited' | 'prepared' | 'sent' | 'outcome' | 'dismissed' | 'reopened'
  note?: string
}

export interface RetentionDataset {
  cases: RetentionCase[]
  events: RetentionEvent[]
}
