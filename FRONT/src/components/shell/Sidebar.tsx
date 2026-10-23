import { Tooltip } from '@heroui/react'
import { PanelLeftClose, PanelLeftOpen, Send } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { UserMenu } from '@/components/arc/user-menu/user-menu'
import { cn } from '@/lib/utils'
import { useKrew, useWorkspace } from '@/store/krew'
import { toast } from '@/store/toasts'
import { KrewMark, KrewWordmark } from './KrewLogo'
import { NAV, SETTINGS_NAV, type NavItem } from './nav'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { CircleUserRound, RotateCcw, Settings as SettingsIcon } from 'lucide-react'

function RailTooltip({ label, collapsed, children }: { label: string; collapsed: boolean; children: ReactNode }) {
  if (!collapsed) return <>{children}</>
  return (
    <Tooltip delay={120} closeDelay={0}>
      <Tooltip.Trigger className="flex w-full justify-center">{children}</Tooltip.Trigger>
      <Tooltip.Content placement="right" offset={12} className="rounded-md bg-inverse px-2 py-1 text-[12.5px] text-ink-inverse shadow-[var(--shadow-raised)]">
        {label}
      </Tooltip.Content>
    </Tooltip>
  )
}

function NavRow({ item, collapsed, count }: { item: NavItem; collapsed: boolean; count?: number }) {
  const Icon = item.icon
  return (
    <RailTooltip label={count ? `${item.label} · ${count}` : item.label} collapsed={collapsed}>
      <NavLink
        to={item.to}
        end={item.to === '/'}
        aria-label={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            'group relative flex h-9 items-center gap-3 rounded-[10px] border text-[14px] transition-[background-color,border-color,color,box-shadow] duration-150',
            collapsed ? 'size-10 justify-center px-0' : 'w-full px-2.5',
            isActive
              ? 'border-line bg-panel text-ink shadow-[var(--shadow-resting)]'
              : 'border-transparent text-ink-2 hover:bg-[color-mix(in_oklab,var(--surface)_60%,transparent)] hover:text-ink',
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon className={cn('size-[18px] shrink-0', isActive ? 'text-ink' : 'text-ink-3 group-hover:text-ink-2')} strokeWidth={1.6} />
            {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
            {count ? (
              collapsed ? (
                <span className="absolute right-1 top-1 size-1.5 rounded-full bg-ink" aria-hidden />
              ) : (
                <span className="tabular min-w-5 rounded-full bg-inverse px-1.5 text-center text-[11px] leading-[18px] text-ink-inverse">{count}</span>
              )
            ) : null}
          </>
        )}
      </NavLink>
    </RailTooltip>
  )
}

export function Sidebar() {
  const collapsed = useKrew((s) => s.sidebarCollapsed)
  const setCollapsed = useKrew((s) => s.setSidebarCollapsed)
  const theme = useKrew((s) => s.theme)
  const setTheme = useKrew((s) => s.setTheme)
  const resetDemo = useKrew((s) => s.resetDemo)
  const ws = useWorkspace()
  const navigate = useNavigate()
  const pending = ws.approvals.filter((a) => a.status === 'pending').length
  const unread = ws.conversations.reduce((n, c) => n + c.unread, 0)
  const telegram = ws.integrations.find((i) => i.id === 'telegram')
  const counts: Record<string, number> = { approvals: pending, messages: unread }

  return (
    <aside
      className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-sidebar transition-[width] duration-300 ease-[var(--ease-standard)] md:flex"
      style={{ width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-expanded)' }}
      aria-label="Main navigation"
    >
      <div className={cn('flex h-16 items-center', collapsed ? 'justify-center px-0' : 'justify-between pl-5 pr-3')}>
        <NavLink to="/" className="flex items-center gap-2.5" aria-label="KREW home">
          <KrewMark size={26} />
          {!collapsed && <KrewWordmark />}
        </NavLink>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-panel hover:text-ink"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="size-[18px]" strokeWidth={1.6} />
          </button>
        )}
      </div>

      <div className={cn('pb-3', collapsed ? 'flex justify-center px-0' : 'px-3')}>
        <div className={collapsed ? 'flex justify-center' : 'w-full'}>
          <WorkspaceSwitcher collapsed={collapsed} />
        </div>
      </div>

      <nav className={cn('flex flex-1 flex-col gap-1 overflow-y-auto no-scrollbar', collapsed ? 'items-center px-0' : 'px-3')}>
        {NAV.map((item) => (
          <NavRow key={item.id} item={item} collapsed={collapsed} count={item.badge ? counts[item.badge] : undefined} />
        ))}
        <div className={cn('my-2 h-px shrink-0 bg-line', collapsed ? 'w-6' : 'w-full')} />
        <NavRow item={SETTINGS_NAV} collapsed={collapsed} />
        {collapsed && (
          <RailTooltip label="Expand sidebar" collapsed>
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="mt-1 inline-flex size-10 items-center justify-center rounded-[10px] text-ink-3 transition-colors hover:bg-panel hover:text-ink"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="size-[18px]" strokeWidth={1.6} />
            </button>
          </RailTooltip>
        )}
      </nav>

      {!collapsed && (
        <div className="mx-3 mb-3 rounded-[var(--radius-panel)] border border-line bg-panel p-4 shadow-[var(--shadow-resting)]">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-inverse text-ink-inverse">
              <Send className="size-3.5 -translate-x-px translate-y-px" strokeWidth={1.75} />
            </span>
            <span className="text-[13.5px] font-medium text-ink">Your Krew on Telegram</span>
          </div>
          <p className="mt-2 text-[12.5px] leading-snug text-ink-2">
            {telegram?.status === 'connected'
              ? `Briefings, alerts and approvals reach you at ${telegram.account}.`
              : 'Connect Telegram to talk to your agents and approve actions on the go.'}
          </p>
          <button
            type="button"
            onClick={() =>
              telegram?.status === 'connected'
                ? toast('Telegram is simulated in this prototype', `In production this opens ${telegram.account}.`)
                : navigate('/settings/integrations')
            }
            className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-[9px] bg-inverse text-[13px] text-ink-inverse transition-opacity hover:opacity-90"
          >
            {telegram?.status === 'connected' ? 'Open in Telegram' : 'Connect Telegram'}
          </button>
        </div>
      )}

      <div className={cn('flex items-center border-t border-line py-3', collapsed ? 'justify-center' : 'px-4')}>
        <UserMenu
          user={{ name: 'Hazem Mansour', email: ws.owner.email, plan: 'Managed' }}
          showName={!collapsed}
          align="start"
          theme={theme}
          onThemeChange={setTheme}
          items={[
            { label: 'Profile & team', icon: <CircleUserRound size={16} />, onSelect: () => navigate('/settings/team') },
            { label: 'Settings', icon: <SettingsIcon size={16} />, onSelect: () => navigate('/settings') },
            {
              label: 'Reset demo data',
              icon: <RotateCcw size={16} />,
              onSelect: () => {
                resetDemo()
                toast('Demo reset', 'Both workspaces are back to their original state.')
              },
            },
          ]}
          onSignOut={() => toast('Sign out is disabled in the prototype')}
        />
      </div>
    </aside>
  )
}
