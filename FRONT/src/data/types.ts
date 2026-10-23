// KREW domain model. The mock layer and a future API both speak these types.

export type AgentId = string

export type AgentCategory =
  | 'customer-experience'
  | 'marketing-growth'
  | 'store-operations'
  | 'finance'
  | 'analytics'
  | 'retention'
  | 'content-creative'
  | 'coordination'

export type Availability = 'instant' | 'setup'

export interface AgentDefinition {
  id: AgentId
  name: string
  role: string
  tagline: string
  description: string
  category: AgentCategory
  /** CSS color, usually a var(--agent-*) token */
  accent: string
  monogram: string
  capabilities: { title: string; description: string }[]
  integrations: string[]
  sampleOutputs: { title: string; body: string }[]
  availability: Availability
  setupTime?: string
  defaultSchedule: string
  featured?: boolean
  /** Marketplace social proof for a done-for-you product */
  brandsUsing: number
  workspaceLabel: string
}

export type HireStatus = 'active' | 'paused' | 'setup'

export type Personality = 'concise' | 'warm' | 'analytical' | 'direct'
export type ApprovalMode = 'always' | 'high-impact' | 'never'

export interface AgentSettings {
  displayName: string
  personality: Personality
  accent: string
  schedule: string
  capabilities: Record<string, boolean>
  notifyTelegram: boolean
  notifyWeb: boolean
  notifyDigest: boolean
  approvalMode: ApprovalMode
  autonomy: number
}

export interface Hire {
  agentId: AgentId
  status: HireStatus
  hiredAt: string
  lastActiveAt: string
  nextRunAt: string
  headline: string
  kpi: { label: string; value: string; trend?: 'up' | 'down' | 'flat'; change?: string }
  setupProgress?: number
  settings: AgentSettings
}

export type PostType =
  | 'insight'
  | 'task'
  | 'report'
  | 'alert'
  | 'recommendation'
  | 'collaboration'
  | 'approval'

export interface Metric {
  label: string
  value: string
  change?: string
  tone?: 'good' | 'bad' | 'neutral'
}

export type PostEmbed =
  | { kind: 'insight'; headline: string; metrics: Metric[]; series?: number[]; seriesLabel?: string }
  | { kind: 'report'; reportId: string }
  | { kind: 'approval'; approvalId: string }
  | { kind: 'collab'; fromAgentId: AgentId; quote: string; points: string[] }
  | { kind: 'checklist'; items: { label: string; done: boolean }[] }
  | { kind: 'bars'; title: string; bars: { label: string; value: number; prev?: number }[]; unit?: string }

export interface FeedPost {
  id: string
  agentId: AgentId
  type: PostType
  createdAt: string
  title: string
  body: string
  details?: string[]
  embed?: PostEmbed
  source?: string
  saved: boolean
  scenario?: string
  /** Agents that took part, for collaboration posts */
  with?: AgentId[]
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type Impact = 'low' | 'medium' | 'high'

export interface Approval {
  id: string
  agentId: AgentId
  title: string
  /** The agent asking in its own voice, shown in the Overview inbox. */
  ask?: string
  summary: string
  action: string
  channel: string
  impact: Impact
  estimate: string
  risk: string
  createdAt: string
  status: ApprovalStatus
  decidedAt?: string
  decisionNote?: string
  evidence: Metric[]
  preview?: { label: string; content: string }[]
  linkedTaskId?: string
  scenario?: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done'

export interface Task {
  id: string
  agentId: AgentId
  title: string
  description: string
  status: TaskStatus
  priority: 'low' | 'normal' | 'high'
  dueAt: string
  createdAt: string
  linkedApprovalId?: string
  createdBy: 'user' | 'agent'
}

export interface ReportSection {
  id: string
  title: string
  body: string
  metrics?: Metric[]
  bullets?: string[]
}

export interface Report {
  id: string
  agentId: AgentId
  title: string
  kind: 'daily' | 'weekly' | 'monthly' | 'ad-hoc'
  period: string
  createdAt: string
  summary: string
  highlights: Metric[]
  sections: ReportSection[]
}

export type MessageAttachment =
  | { kind: 'report'; reportId: string }
  | { kind: 'approval'; approvalId: string }
  | { kind: 'metrics'; title: string; metrics: Metric[] }
  | { kind: 'post'; postId: string }

export interface ChatMessage {
  id: string
  author: 'user' | AgentId
  text: string
  createdAt: string
  attachment?: MessageAttachment
}

export interface Conversation {
  id: string
  kind: 'direct' | 'manager' | 'team'
  agentId?: AgentId
  title: string
  members: AgentId[]
  messages: ChatMessage[]
  unread: number
  pinned?: boolean
}

export interface AppNotification {
  id: string
  title: string
  description: string
  createdAt: string
  read: boolean
  tone: 'info' | 'success' | 'warning'
  agentId?: AgentId
  href?: string
}

export interface BrandDNA {
  name: string
  description: string
  tone: string[]
  toneNotes: string
  audience: string
  positioning: string
  goals: string[]
  servicePolicy: string
  shipping: string
  returns: string
  guidelines: string
  website: string
  currency: string
}

export interface KnowledgeEntry {
  id: string
  title: string
  category: 'Policy' | 'Product' | 'FAQ' | 'Brand' | 'Operations'
  content: string
  updatedAt: string
  usedBy: AgentId[]
}

export type IntegrationId = 'shopify' | 'instagram' | 'facebook' | 'whatsapp' | 'meta-ads' | 'telegram'

export interface Integration {
  id: IntegrationId
  name: string
  description: string
  status: 'connected' | 'disconnected' | 'attention'
  account?: string
  lastSync?: string
  usedBy: AgentId[]
}

export type TeamRole = 'Owner' | 'Admin' | 'Approver' | 'Viewer'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: TeamRole
  telegram?: string
  lastActive: string
  invited?: boolean
}

export interface DailyPoint {
  date: string
  revenue: number
  revenuePrev: number
  orders: number
  conversations: number
}

export interface WorkspaceData {
  id: string
  brand: BrandDNA
  owner: { name: string; email: string }
  industry: string
  hires: Hire[]
  posts: FeedPost[]
  approvals: Approval[]
  tasks: Task[]
  reports: Report[]
  conversations: Conversation[]
  notifications: AppNotification[]
  knowledge: KnowledgeEntry[]
  integrations: Integration[]
  team: TeamMember[]
  daily: DailyPoint[]
  briefing: { headline: string; body: string; bullets: string[] }
  kpis: {
    revenue: number
    revenueChange: string
    orders: number
    ordersChange: string
    conversations: number
    conversationsChange: string
    openIssues: number
    openIssuesChange: string
    roas: number
    roasChange: string
    agentActions: number
  }
}
