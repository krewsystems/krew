import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getAgent } from '@/data/agents'
import { seedNoor } from '@/data/seed-noor'
import { seedSahra } from '@/data/seed-sahra'
import { ahead, D, defaultSettings, uid } from '@/data/seed-utils'
import type {
  AgentSettings,
  ApprovalStatus,
  BrandDNA,
  ChatMessage,
  FeedPost,
  HireStatus,
  IntegrationId,
  KnowledgeEntry,
  MessageAttachment,
  Task,
  TeamMember,
  TeamRole,
  WorkspaceData,
} from '@/data/types'

export type ThemePref = 'light' | 'dark' | 'system'

export const WORKSPACE_LIST = [
  { id: 'sahra', name: 'Sahra Home', industry: 'Home & ceramics', initials: 'SH' },
  { id: 'noor', name: 'Noor Skin', industry: 'Skincare', initials: 'NS' },
] as const

function seedAll(): Record<string, WorkspaceData> {
  const now = Date.now()
  return { sahra: seedSahra(now), noor: seedNoor(now) }
}

interface KrewState {
  activeWorkspaceId: string
  workspaces: Record<string, WorkspaceData>
  sidebarCollapsed: boolean
  theme: ThemePref
  seededAt: string

  setWorkspace: (id: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: ThemePref) => void
  resetDemo: () => void

  hireAgent: (agentId: string) => void
  setHireStatus: (agentId: string, status: HireStatus) => void
  removeHire: (agentId: string) => void
  updateAgentSettings: (agentId: string, patch: Partial<AgentSettings>) => void

  decideApproval: (id: string, status: Exclude<ApprovalStatus, 'pending'>, note?: string) => void
  toggleSave: (postId: string) => void

  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => string
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void

  sendMessage: (conversationId: string, text: string, attachment?: MessageAttachment) => void
  addAgentMessage: (conversationId: string, author: string, text: string, attachment?: MessageAttachment) => void
  markConversationRead: (conversationId: string) => void
  ensureConversation: (agentId: string) => string

  setNotificationRead: (id: string, read: boolean) => void
  markAllNotificationsRead: () => void
  dismissNotification: (id: string) => void

  updateBrand: (patch: Partial<BrandDNA>) => void
  upsertKnowledge: (entry: Omit<KnowledgeEntry, 'id' | 'updatedAt'> & { id?: string }) => void
  deleteKnowledge: (id: string) => void

  setIntegrationStatus: (id: IntegrationId, status: 'connected' | 'disconnected') => void

  inviteMember: (member: { name: string; email: string; role: TeamRole }) => void
  updateMemberRole: (id: string, role: TeamRole) => void
  removeMember: (id: string) => void
}

const nowIso = () => new Date().toISOString()

export const useKrew = create<KrewState>()(
  persist(
    (set, get) => {
      /** Apply a mutation to the active workspace only. */
      const mutate = (fn: (ws: WorkspaceData) => WorkspaceData) =>
        set((state) => {
          const id = state.activeWorkspaceId
          return { workspaces: { ...state.workspaces, [id]: fn(state.workspaces[id]) } }
        })

      const postFrom = (agentId: string, partial: Omit<FeedPost, 'id' | 'agentId' | 'createdAt' | 'saved'>): FeedPost => ({
        id: uid('post'),
        agentId,
        createdAt: nowIso(),
        saved: false,
        ...partial,
      })

      const appendMessage = (ws: WorkspaceData, conversationId: string, message: ChatMessage, unread = 0): WorkspaceData => ({
        ...ws,
        conversations: ws.conversations.map((c) =>
          c.id === conversationId ? { ...c, messages: [...c.messages, message], unread: c.unread + unread } : c,
        ),
      })

      return {
        activeWorkspaceId: 'sahra',
        workspaces: seedAll(),
        sidebarCollapsed: false,
        theme: 'light',
        seededAt: nowIso(),

        setWorkspace: (id) => set({ activeWorkspaceId: id }),
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        setTheme: (theme) => set({ theme }),
        resetDemo: () => set({ workspaces: seedAll(), activeWorkspaceId: 'sahra', seededAt: nowIso() }),

        hireAgent: (agentId) =>
          mutate((ws) => {
            if (ws.hires.some((h) => h.agentId === agentId)) return ws
            const agent = getAgent(agentId)
            const instant = agent.availability === 'instant'
            const now = nowIso()
            const welcome = postFrom(instant ? agentId : 'manager', {
              type: 'task',
              title: instant ? `${agent.name} joined your team` : `${agent.name} is being set up`,
              body: instant
                ? `Hi, I’m ${agent.name}. I’ve read your Brand DNA and connected to ${agent.integrations.slice(0, 2).join(' and ')}. My first ${agent.role.toLowerCase()} report arrives ${agent.defaultSchedule.toLowerCase()}.`
                : `Our team is configuring ${agent.name} for ${ws.brand.name}. Expected setup time is ${agent.setupTime}. I’ll let you know as soon as it’s ready.`,
              embed: {
                kind: 'checklist',
                items: instant
                  ? [
                      { label: 'Read Brand DNA and knowledge base', done: true },
                      { label: `Connected to ${agent.integrations[0]}`, done: true },
                      { label: 'First report scheduled', done: true },
                    ]
                  : [
                      { label: 'Hiring request received', done: true },
                      { label: 'Integration access confirmed', done: false },
                      { label: 'Calibrated on your data', done: false },
                    ],
              },
            })
            return {
              ...ws,
              hires: [
                ...ws.hires,
                {
                  agentId,
                  status: instant ? 'active' : 'setup',
                  hiredAt: now,
                  lastActiveAt: now,
                  nextRunAt: ahead(instant ? 18 * 60 : 3 * D),
                  headline: instant ? 'Just joined. Learning your store.' : 'Our team is preparing this agent for your store.',
                  kpi: instant ? { label: 'Days on the team', value: '0' } : { label: 'Setup progress', value: '10%' },
                  setupProgress: instant ? undefined : 10,
                  settings: defaultSettings(agentId),
                },
              ],
              posts: [welcome, ...ws.posts],
              notifications: [
                {
                  id: uid('ntf'),
                  title: instant ? `${agent.name} joined your team` : `${agent.name} setup started`,
                  description: instant ? 'Open the workspace to meet them.' : `Expected in ${agent.setupTime}.`,
                  createdAt: now,
                  read: false,
                  tone: 'success',
                  agentId,
                  href: `/krew/${agentId}`,
                },
                ...ws.notifications,
              ],
              conversations: ws.conversations.some((c) => c.id === agentId)
                ? ws.conversations
                : [
                    ...ws.conversations,
                    {
                      id: agentId,
                      kind: 'direct',
                      agentId,
                      title: agent.name,
                      members: [agentId],
                      unread: instant ? 1 : 0,
                      messages: instant
                        ? [{ id: uid('msg'), author: agentId, text: `Hi ${ws.owner.name}, I’m ${agent.name}. ${agent.tagline} Ask me anything to get started.`, createdAt: now }]
                        : [],
                    },
                  ],
            }
          }),

        setHireStatus: (agentId, status) =>
          mutate((ws) => ({
            ...ws,
            hires: ws.hires.map((h) =>
              h.agentId === agentId
                ? {
                    ...h,
                    status,
                    headline: status === 'paused' ? 'Paused. Scheduled work is on hold.' : status === 'active' ? 'Back at work. Catching up on what changed.' : h.headline,
                    lastActiveAt: nowIso(),
                  }
                : h,
            ),
          })),

        removeHire: (agentId) =>
          mutate((ws) => ({
            ...ws,
            hires: ws.hires.filter((h) => h.agentId !== agentId),
          })),

        updateAgentSettings: (agentId, patch) =>
          mutate((ws) => ({
            ...ws,
            hires: ws.hires.map((h) => (h.agentId === agentId ? { ...h, settings: { ...h.settings, ...patch } } : h)),
          })),

        decideApproval: (id, status, note) =>
          mutate((ws) => {
            const approval = ws.approvals.find((a) => a.id === id)
            if (!approval || approval.status !== 'pending') return ws
            const agent = getAgent(approval.agentId)
            const now = nowIso()
            const approved = status === 'approved'
            const outcome = postFrom(approval.agentId, {
              type: 'task',
              title: approved ? `Approved and done: ${lowerFirst(approval.title)}` : `Stood down: ${lowerFirst(approval.title)}`,
              body: approved
                ? `${ws.owner.name} approved this ${timeOfDay()}. ${executionLine(approval.channel)} I’ll report back on the result.`
                : `${ws.owner.name} rejected this proposal${note ? `: “${note}”` : '.'} I’ve noted the feedback and won’t repeat this action without a new plan.`,
              embed: approved
                ? {
                    kind: 'checklist',
                    items: [
                      { label: 'Approval recorded', done: true },
                      { label: `Executed on ${approval.channel}`, done: true },
                      { label: 'Result check scheduled', done: false },
                    ],
                  }
                : undefined,
              scenario: approval.scenario,
            })
            let next: WorkspaceData = {
              ...ws,
              approvals: ws.approvals.map((a) => (a.id === id ? { ...a, status, decidedAt: now, decisionNote: note } : a)),
              tasks: ws.tasks.map((t) =>
                t.id === approval.linkedTaskId || t.linkedApprovalId === id
                  ? { ...t, status: approved ? 'done' : 'todo', description: approved ? t.description : `${t.description} Rejected${note ? `: ${note}` : ''}.` }
                  : t,
              ),
              hires: ws.hires.map((h) =>
                h.agentId === approval.agentId
                  ? { ...h, lastActiveAt: now, headline: approved ? `Executed: ${lowerFirst(approval.title)}.` : `Revising after your feedback on ${lowerFirst(approval.title)}.` }
                  : h,
              ),
              posts: [outcome, ...ws.posts],
              notifications: [
                {
                  id: uid('ntf'),
                  title: approved ? `Approved: ${approval.title}` : `Rejected: ${approval.title}`,
                  description: approved ? `${agent.name} carried it out.` : `${agent.name} will revise the plan.`,
                  createdAt: now,
                  read: true,
                  tone: approved ? 'success' : 'info',
                  agentId: approval.agentId,
                  href: `/approvals/${id}`,
                },
                ...ws.notifications,
              ],
            }
            const convoId = ws.conversations.some((c) => c.id === approval.agentId) ? approval.agentId : 'manager'
            next = appendMessage(next, convoId, {
              id: uid('msg'),
              author: approval.agentId,
              text: approved ? `Thanks. ${executionLine(approval.channel)}` : `Understood. I’ve stood this down${note ? ` and noted: “${note}”` : ''}.`,
              createdAt: now,
            })
            return next
          }),

        toggleSave: (postId) =>
          mutate((ws) => ({ ...ws, posts: ws.posts.map((p) => (p.id === postId ? { ...p, saved: !p.saved } : p)) })),

        addTask: (task) => {
          const id = uid('tsk')
          mutate((ws) => ({ ...ws, tasks: [{ ...task, id, createdAt: nowIso() }, ...ws.tasks] }))
          return id
        },
        updateTask: (id, patch) => mutate((ws) => ({ ...ws, tasks: ws.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
        deleteTask: (id) => mutate((ws) => ({ ...ws, tasks: ws.tasks.filter((t) => t.id !== id) })),

        sendMessage: (conversationId, text, attachment) =>
          mutate((ws) => appendMessage(ws, conversationId, { id: uid('msg'), author: 'user', text, createdAt: nowIso(), attachment })),
        addAgentMessage: (conversationId, author, text, attachment) =>
          mutate((ws) => appendMessage(ws, conversationId, { id: uid('msg'), author, text, createdAt: nowIso(), attachment }, 0)),
        markConversationRead: (conversationId) =>
          mutate((ws) => ({ ...ws, conversations: ws.conversations.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)) })),
        ensureConversation: (agentId) => {
          const ws = get().workspaces[get().activeWorkspaceId]
          if (ws.conversations.some((c) => c.id === agentId)) return agentId
          const agent = getAgent(agentId)
          mutate((w) => ({
            ...w,
            conversations: [...w.conversations, { id: agentId, kind: 'direct', agentId, title: agent.name, members: [agentId], unread: 0, messages: [] }],
          }))
          return agentId
        },

        setNotificationRead: (id, read) =>
          mutate((ws) => ({ ...ws, notifications: ws.notifications.map((n) => (n.id === id ? { ...n, read } : n)) })),
        markAllNotificationsRead: () => mutate((ws) => ({ ...ws, notifications: ws.notifications.map((n) => ({ ...n, read: true })) })),
        dismissNotification: (id) => mutate((ws) => ({ ...ws, notifications: ws.notifications.filter((n) => n.id !== id) })),

        updateBrand: (patch) => mutate((ws) => ({ ...ws, brand: { ...ws.brand, ...patch } })),
        upsertKnowledge: (entry) =>
          mutate((ws) => {
            const updatedAt = nowIso()
            if (entry.id && ws.knowledge.some((k) => k.id === entry.id)) {
              return { ...ws, knowledge: ws.knowledge.map((k) => (k.id === entry.id ? { ...k, ...entry, id: k.id, updatedAt } : k)) }
            }
            return { ...ws, knowledge: [{ ...entry, id: uid('kb'), updatedAt }, ...ws.knowledge] }
          }),
        deleteKnowledge: (id) => mutate((ws) => ({ ...ws, knowledge: ws.knowledge.filter((k) => k.id !== id) })),

        setIntegrationStatus: (id, status) =>
          mutate((ws) => ({
            ...ws,
            integrations: ws.integrations.map((i) =>
              i.id === id
                ? {
                    ...i,
                    status,
                    lastSync: status === 'connected' ? nowIso() : i.lastSync,
                    account: status === 'connected' ? i.account ?? defaultAccount(id, ws.brand.name) : i.account,
                  }
                : i,
            ),
          })),

        inviteMember: (member) =>
          mutate((ws) => ({
            ...ws,
            team: [...ws.team, { id: uid('usr'), ...member, lastActive: nowIso(), invited: true } satisfies TeamMember],
          })),
        updateMemberRole: (id, role) => mutate((ws) => ({ ...ws, team: ws.team.map((m) => (m.id === id ? { ...m, role } : m)) })),
        removeMember: (id) => mutate((ws) => ({ ...ws, team: ws.team.filter((m) => m.id !== id) })),
      }
    },
    {
      name: 'krew-demo',
      // Bump when the seed shape changes; older saves are reseeded so new demo content appears.
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as Partial<KrewState>
        if (version < 2) return { ...state, workspaces: seedAll(), seededAt: nowIso() } as KrewState
        // Version 3 added Tracker's finance reports and report topics. Merge them in without reseeding, so demo edits stay.
        if (version < 3 && state.workspaces) {
          const seed = seedAll()
          for (const [id, w] of Object.entries(state.workspaces)) {
            const fresh = seed[id]?.reports ?? []
            const have = new Set(w.reports.map((r) => r.id))
            w.reports = [...w.reports.map((r) => ({ ...r, topic: r.topic ?? fresh.find((f) => f.id === r.id)?.topic })), ...fresh.filter((r) => !have.has(r.id))]
          }
        }
        return state as KrewState
      },
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

/** The active workspace's data. */
export function useWorkspace(): WorkspaceData {
  return useKrew((s) => s.workspaces[s.activeWorkspaceId])
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1)
}

function timeOfDay() {
  const h = new Date().getHours()
  return h < 12 ? 'this morning' : h < 18 ? 'this afternoon' : 'this evening'
}

function executionLine(channel: string) {
  if (channel.includes('WhatsApp')) return 'Messages are queued on WhatsApp for 16:00 with email fallback.'
  if (channel.includes('Meta')) return 'Budgets were updated on Meta Ads a moment ago.'
  if (channel.includes('Shopify')) return 'Changes are live on Shopify.'
  return 'It’s done.'
}

function defaultAccount(id: IntegrationId, brand: string) {
  const slug = brand.toLowerCase().replace(/\s+/g, '')
  switch (id) {
    case 'telegram':
      return `@${brand.replace(/\s+/g, '')}KrewBot`
    case 'facebook':
      return brand
    case 'instagram':
      return `@${slug}`
    default:
      return `${slug}`
  }
}
