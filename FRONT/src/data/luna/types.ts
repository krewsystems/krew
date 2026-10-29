// Luna (customer intelligence) domain shapes. Draft API contract; see docs/LUNA.md.
// Luna reads customer DMs and produces analysis, cases and insights. She never replies to customers.

/** Where a conversation happens. Only Instagram is connected in this prototype. */
export type Channel = 'instagram' | 'whatsapp'

export type Sentiment = 'positive' | 'neutral' | 'mixed' | 'negative'

/** Language Luna detected for a message or conversation. `mixed` covers Arabic and English in one thread, and Arabizi. */
export type Language = 'ar-EG' | 'ar' | 'en' | 'mixed'

/** Luna's fixed topic taxonomy. A conversation can carry several. */
export type TopicId = 'availability' | 'sizing' | 'delivery' | 'pricing' | 'product_question' | 'order_status' | 'damaged' | 'wrong_item' | 'product_quality' | 'praise' | 'payment'

/** What the customer is mainly trying to do in the conversation. */
export type CustomerIntent = 'buy' | 'ask_before_buying' | 'restock' | 'track_order' | 'complain' | 'return_or_exchange' | 'give_feedback'

/** A person who messaged the brand. One customer can be reached on several channels. */
export interface LunaCustomer {
  id: string
  name: string
  /** Platform identities, joined to one customer. Instagram-scoped ids today; WhatsApp numbers later. */
  identities: { channel: Channel; externalId: string; handle: string }[]
  /** Matched Shopify customer, when Luna (or a person) linked one. Needed to confirm conversions and for Retention. */
  shopifyCustomerId?: string
  ordersCount?: number
  city?: string
  firstSeenAt: string
}

export interface LunaMessage {
  id: string
  from: 'customer' | 'brand'
  /** Staff member who replied, for brand messages. */
  author?: string
  text: string
  at: string
  /** Attachments as Instagram delivers them: photos, shared posts, story replies. Shown as placeholders. */
  attachment?: { kind: 'image' | 'shared_post' | 'story_reply'; label: string }
}

/** Something Luna noticed inside one conversation. */
export interface Signal {
  kind: 'opportunity' | 'issue' | 'restock' | 'sizing' | 'price_objection' | 'feedback' | 'question'
  label: string
}

/** Luna's precomputed read of one conversation. Rewritten whenever new messages arrive. */
export interface ConversationAnalysis {
  analyzedAt: string
  summary: string
  intent: CustomerIntent
  topics: TopicId[]
  /** Products mentioned, by Shopify product id (shared with Tracker's catalogue). */
  products: { productId: string; variant?: string }[]
  sentiment: Sentiment
  language: Language
  signals: Signal[]
  nextStep: string
}

export interface LunaConversation {
  id: string
  customerId: string
  channel: Channel
  /** The platform's thread id, used to fetch new messages and to deep link. */
  externalThreadId: string
  messages: LunaMessage[]
  analysis: ConversationAnalysis
}

// ---------------------------------------------------------------------------
// Cases: what a person follows up on. One open case per conversation and kind, never one per message.

export type IntentLevel = 'high' | 'medium' | 'low'
export type OpportunityStatus = 'new' | 'followed_up' | 'converted' | 'closed'
export type RiskStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed'
export type Priority = 'high' | 'medium' | 'low'
export type RiskIssue = 'delivery' | 'unanswered' | 'damaged' | 'wrong_item' | 'repeated_dissatisfaction' | 'product_quality'

/** Evidence that an order followed the conversation. Luna can find one; only a person can mark the opportunity converted. */
export interface OrderMatch {
  orderRef: string
  amount: number
  placedAt: string
  /** How Luna matched it. */
  basis: string
}

export interface CaseEvent {
  id: string
  caseId: string
  at: string
  by: 'luna' | 'you'
  kind: 'detected' | 'updated_by_luna' | 'status_changed'
  from?: OpportunityStatus | RiskStatus
  to?: OpportunityStatus | RiskStatus
  note?: string
}

export interface SalesOpportunity {
  id: string
  type: 'opportunity'
  customerId: string
  conversationId: string
  productIds: string[]
  /** Product as the customer described it, such as "King, Clay". */
  productLabel?: string
  title: string
  explanation: string
  intent: IntentLevel
  /** Message ids that support the opportunity. */
  evidence: string[]
  status: OpportunityStatus
  detectedAt: string
  lastActivityAt: string
  estimatedValue?: number
  orderMatch?: OrderMatch
  /** Set by a person when marking converted or closed. */
  orderRef?: string
  reason?: string
  note?: string
  statusChangedAt?: string
}

export interface AtRiskCase {
  id: string
  type: 'risk'
  customerId: string
  conversationId: string
  productIds: string[]
  issue: RiskIssue
  title: string
  summary: string
  priority: Priority
  evidence: string[]
  status: RiskStatus
  detectedAt: string
  lastActivityAt: string
  /** Customer messages with no brand reply since. */
  unansweredCount?: number
  reason?: string
  note?: string
  statusChangedAt?: string
}

export type LunaCase = SalesOpportunity | AtRiskCase

// ---------------------------------------------------------------------------
// Insights: patterns across conversations. Every insight names the conversations behind it.

export type InsightKind = 'restock' | 'sizing' | 'delivery' | 'price' | 'damage' | 'feedback' | 'praise' | 'sentiment'

export interface LunaInsight {
  id: string
  kind: InsightKind
  title: string
  detail: string
  productId?: string
  /** The supporting conversations. Counts shown in the UI are this list's length. */
  conversationIds: string[]
  /** Comparable count for the previous 7 days, from Luna's history. */
  previousCount?: number
  /** Worth the owner's attention now. Shown on the Pulse. */
  important?: boolean
  suggestedAction: string
  /** Agent that could act on it, if any (Store Agent for product pages, Retention later). */
  relevantAgent?: string
}

/** A common question, with the conversations that asked it. */
export interface CommonQuestion {
  id: string
  question: string
  conversationIds: string[]
  answeredOnSite: boolean
}

export interface LunaProductRef {
  id: string
  name: string
  /** List price, same catalogue as Tracker. Used for possible values, never as revenue. */
  price: number
  /** Variants the brand marks as out of stock, for restock signals. */
  outOfStock?: string[]
}

export interface LunaDataset {
  /** Luna's one-line read of the week, shown on the Pulse. */
  headline: string
  lastScanAt: string
  instagramAccount: string
  products: LunaProductRef[]
  customers: LunaCustomer[]
  conversations: LunaConversation[]
  opportunities: SalesOpportunity[]
  risks: AtRiskCase[]
  insights: LunaInsight[]
  questions: CommonQuestion[]
  events: CaseEvent[]
}
