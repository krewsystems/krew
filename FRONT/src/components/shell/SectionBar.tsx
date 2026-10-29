import {
  BadgeCheck,
  BarChart3,
  Bookmark,
  Bot,
  BookOpen,
  ChevronDown,
  CircleDashed,
  CirclePause,
  CirclePlay,
  Clock3,
  CreditCard,
  FileText,
  Fingerprint,
  History,
  LayoutGrid,
  ListChecks,
  MessageCircle,
  MessagesSquare,
  Newspaper,
  Plus,
  PlugZap,
  Settings2,
  Sparkles,
  Store,
  Sun,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, matchPath, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/arc/popover/popover'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { resolveAgent } from '@/components/agent/use-agent'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/krew'

export interface SectionTab {
  id: string
  label: string
  icon: LucideIcon
  /** Path, "?query" or "#anchor" */
  to: string
  count?: number
}

interface SectionConfig {
  title: ReactNode
  tabs: SectionTab[]
  active?: string
  action?: ReactNode
}

function ActionButton({ to, icon: Icon, children }: { to: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[13px] text-ink transition-colors hover:bg-panel">
      <Icon className="size-4 text-ink-2" strokeWidth={1.6} />
      <span className="hidden sm:inline">{children}</span>
    </Link>
  )
}

/** "Switch agent ▾" / "New message ▾": a list of hired agents in a popover. */
function AgentPicker({ label, icon: Icon, hrefFor }: { label: string; icon: LucideIcon; hrefFor: (id: string) => string }) {
  const ws = useWorkspace()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn('inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[13px] text-ink transition-colors hover:bg-panel', open && 'bg-panel')}>
          <Icon className="size-4 text-ink-2" strokeWidth={1.6} />
          <span className="hidden sm:inline">{label}</span>
          <ChevronDown className={cn('size-3.5 text-ink-3 transition-transform', open && 'rotate-180')} strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[240px] p-1.5!">
        <ul className="flex flex-col">
          {ws.hires.map((h) => {
            const a = resolveAgent(h.agentId, ws.hires)
            return (
              <li key={h.agentId}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    navigate(hrefFor(h.agentId))
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-sunken"
                >
                  <AgentAvatar agentId={h.agentId} size="sm" showStatus />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-ink">{a.displayName}</span>
                    <span className="block truncate text-[11.5px] text-ink-3">{a.role}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

const OVERVIEW_ANCHORS = ['briefing', 'performance', 'team', 'activity']

/** Tracks which Overview section is in view so the matching tab lights up. */
function useScrollSpy(ids: string[], enabled: boolean) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    if (!enabled) return
    const onScroll = () => {
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < 160) current = id
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids[ids.length - 1]
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [ids, enabled])
  return active
}

function useSectionConfig(): SectionConfig | null {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const ws = useWorkspace()
  const spy = useScrollSpy(OVERVIEW_ANCHORS, pathname === '/')
  const pending = ws.approvals.filter((a) => a.status === 'pending').length

  if (pathname === '/') {
    return {
      title: 'Overview',
      active: spy,
      tabs: [
        { id: 'briefing', label: 'Briefing', icon: Sun, to: '#briefing', count: pending || undefined },
        { id: 'performance', label: 'Performance', icon: BarChart3, to: '#performance' },
        { id: 'team', label: 'Team', icon: UsersRound, to: '#team' },
        { id: 'activity', label: 'Activity', icon: Newspaper, to: '#activity' },
      ],
      action: <ActionButton to="/messages/manager" icon={MessageCircle}>Ask the Manager</ActionButton>,
    }
  }

  const agentMatch = matchPath('/krew/:agentId/:tab?/*', pathname)
  if (agentMatch?.params.agentId) {
    const id = agentMatch.params.agentId
    const a = resolveAgent(id, ws.hires)
    if (!a.hire) return { title: a.name, tabs: [] }
    const base = `/krew/${id}`
    const open = ws.tasks.filter((t) => t.agentId === id && t.status !== 'done').length
    return {
      title: (
        <span className="flex items-center gap-2">
          <AgentAvatar agentId={id} size="xs" />
          {a.displayName}
        </span>
      ),
      active: agentMatch.params.tab ?? 'overview',
      tabs: [
        { id: 'overview', label: 'Overview', icon: LayoutGrid, to: base },
        { id: 'workspace', label: a.workspaceLabel, icon: Sparkles, to: `${base}/workspace` },
        { id: 'tasks', label: 'Tasks', icon: ListChecks, to: `${base}/tasks`, count: open || undefined },
        { id: 'reports', label: 'Reports', icon: FileText, to: `${base}/reports` },
        { id: 'history', label: 'History', icon: History, to: `${base}/history` },
        { id: 'settings', label: 'Settings', icon: Settings2, to: `${base}/settings` },
      ],
      action: <AgentPicker label="Switch agent" icon={UsersRound} hrefFor={(next) => `/krew/${next}${agentMatch.params.tab ? `/${agentMatch.params.tab}` : ''}`} />,
    }
  }

  if (pathname === '/krew') {
    const count = (s: string) => ws.hires.filter((h) => h.status === s).length
    return {
      title: 'My Krew',
      active: params.get('status') ?? 'all',
      tabs: [
        { id: 'all', label: 'Everyone', icon: UsersRound, to: '?', count: ws.hires.length },
        { id: 'active', label: 'Working', icon: CirclePlay, to: '?status=active', count: count('active') },
        { id: 'paused', label: 'Paused', icon: CirclePause, to: '?status=paused', count: count('paused') || undefined },
        { id: 'setup', label: 'Setting up', icon: CircleDashed, to: '?status=setup', count: count('setup') || undefined },
      ],
      action: <ActionButton to="/marketplace" icon={Plus}>Hire an agent</ActionButton>,
    }
  }

  if (pathname === '/feed') {
    return {
      title: 'Agent Feed',
      active: params.get('view') ?? 'all',
      tabs: [
        { id: 'all', label: 'All updates', icon: Newspaper, to: '?' },
        { id: 'needs', label: 'Needs you', icon: BadgeCheck, to: '?view=needs', count: pending || undefined },
        { id: 'saved', label: 'Saved', icon: Bookmark, to: '?view=saved', count: ws.posts.filter((p) => p.saved).length || undefined },
      ],
      action: <ActionButton to="/messages/team" icon={MessagesSquare}>Team room</ActionButton>,
    }
  }

  if (pathname.startsWith('/messages')) {
    const unread = (kind: string) => ws.conversations.filter((c) => (kind === 'all' || (kind === 'team' ? c.kind === 'team' : c.kind !== 'team')) && c.unread > 0).length
    return {
      title: 'Messages',
      active: params.get('show') ?? 'all',
      tabs: [
        { id: 'all', label: 'All chats', icon: MessagesSquare, to: '?', count: unread('all') || undefined },
        { id: 'agents', label: 'Agents', icon: UserRound, to: '?show=agents', count: unread('agents') || undefined },
        { id: 'team', label: 'Team rooms', icon: UsersRound, to: '?show=team', count: unread('team') || undefined },
      ],
      action: <AgentPicker label="New message" icon={Plus} hrefFor={(id) => `/messages/${id}`} />,
    }
  }

  if (pathname.startsWith('/approvals')) {
    return {
      title: 'Approvals',
      active: params.get('view') ?? 'pending',
      tabs: [
        { id: 'pending', label: 'Waiting', icon: Clock3, to: '/approvals', count: pending },
        { id: 'history', label: 'History', icon: History, to: '/approvals?view=history', count: ws.approvals.length - pending },
      ],
      action: <ActionButton to="/settings/agents" icon={Settings2}>Approval rules</ActionButton>,
    }
  }

  if (pathname.startsWith('/reports')) {
    const detail = pathname !== '/reports'
    return {
      title: 'Reports',
      active: detail ? undefined : params.get('kind') ?? 'all',
      tabs: [
        { id: 'all', label: 'Library', icon: FileText, to: '/reports' },
        { id: 'daily', label: 'Daily', icon: Sun, to: '/reports?kind=daily' },
        { id: 'weekly', label: 'Weekly', icon: BarChart3, to: '/reports?kind=weekly' },
        { id: 'monthly', label: 'Monthly', icon: History, to: '/reports?kind=monthly' },
      ],
    }
  }

  if (pathname.startsWith('/marketplace')) {
    return {
      title: 'Marketplace',
      active: params.get('show') ?? 'all',
      tabs: [
        { id: 'all', label: 'All roles', icon: Store, to: '/marketplace' },
        { id: 'instant', label: 'Ready today', icon: CirclePlay, to: '/marketplace?show=instant' },
        { id: 'setup', label: 'Needs setup', icon: CircleDashed, to: '/marketplace?show=setup' },
      ],
      action: <ActionButton to="/krew" icon={UsersRound}>{`${ws.hires.length} on your team`}</ActionButton>,
    }
  }

  if (pathname.startsWith('/settings')) {
    return {
      title: 'Settings',
      active: pathname.split('/')[2] ?? 'brand',
      tabs: [
        { id: 'brand', label: 'Brand DNA', icon: Fingerprint, to: '/settings/brand' },
        { id: 'knowledge', label: 'Knowledge', icon: BookOpen, to: '/settings/knowledge' },
        { id: 'integrations', label: 'Integrations', icon: PlugZap, to: '/settings/integrations' },
        { id: 'agents', label: 'Agents', icon: Bot, to: '/settings/agents' },
        { id: 'team', label: 'Team', icon: UsersRound, to: '/settings/team' },
        { id: 'plan', label: 'Plan', icon: CreditCard, to: '/settings/plan' },
      ],
    }
  }
  return null
}

/** Floating section bar: where you are, the views inside it, and one contextual action. */
export function SectionBar() {
  const config = useSectionConfig()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  if (!config) return <div className="flex-1" />

  const go = (to: string) => {
    if (to.startsWith('#')) {
      const el = document.getElementById(to.slice(1))
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: 'smooth' })
      return
    }
    if (to.startsWith('?')) navigate(`${pathname}${to === '?' ? '' : to}`)
    else navigate(to)
  }

  return (
    <nav aria-label="Section" className="flex h-12 min-w-0 flex-1 items-center gap-1 rounded-[14px] border border-line bg-panel-muted p-1 shadow-[var(--shadow-resting)]">
      <span className="hidden shrink-0 items-center whitespace-nowrap pl-2.5 pr-2 text-[13.5px] font-medium text-ink md:flex">{config.title}</span>
      {config.tabs.length > 0 && <span className="mx-1 hidden h-5 w-px shrink-0 bg-line md:block" aria-hidden />}
      <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {config.tabs.map((t) => {
          const Icon = t.icon
          const active = config.active === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.to)}
              aria-current={active ? 'page' : undefined}
              className={cn('relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-[13px] transition-colors', active ? 'text-ink' : 'text-ink-2 hover:text-ink')}
            >
              {active && (
                <motion.span
                  layoutId="section-tab"
                  className="absolute inset-0 rounded-[10px] border border-line bg-panel shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                  transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                />
              )}
              <Icon className={cn('relative size-4', active ? 'text-ink' : 'text-ink-3')} strokeWidth={1.6} />
              <span className="relative">{t.label}</span>
              {t.count !== undefined && <span className={cn('tabular relative text-[11.5px]', active ? 'text-ink-2' : 'text-ink-3')}>{t.count}</span>}
            </button>
          )
        })}
      </div>
      {config.action && <div className="ml-auto flex shrink-0 items-center">{config.action}</div>}
    </nav>
  )
}
