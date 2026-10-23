import {
  BadgeCheck,
  FileText,
  LayoutGrid,
  MessagesSquare,
  Newspaper,
  Settings,
  Store,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  to: string
  icon: LucideIcon
  badge?: 'approvals' | 'messages'
}

export const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', to: '/', icon: LayoutGrid },
  { id: 'krew', label: 'My Krew', to: '/krew', icon: UsersRound },
  { id: 'feed', label: 'Agent Feed', to: '/feed', icon: Newspaper },
  { id: 'messages', label: 'Messages', to: '/messages', icon: MessagesSquare, badge: 'messages' },
  { id: 'approvals', label: 'Approvals', to: '/approvals', icon: BadgeCheck, badge: 'approvals' },
  { id: 'reports', label: 'Reports', to: '/reports', icon: FileText },
  { id: 'marketplace', label: 'Marketplace', to: '/marketplace', icon: Store },
]

export const SETTINGS_NAV: NavItem = { id: 'settings', label: 'Settings', to: '/settings', icon: Settings }
