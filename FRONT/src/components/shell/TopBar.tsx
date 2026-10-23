import { Kbd, Tooltip } from '@heroui/react'
import { FlaskConical, Search } from 'lucide-react'
import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { NotificationCenter } from '@/components/arc/notification-center/notification-center'
import { shortAgo } from '@/lib/format'
import { useKrew, useWorkspace } from '@/store/krew'
import { KrewMark } from './KrewLogo'
import { SectionBar } from './SectionBar'

export function TopBar({ onSearch }: { onSearch: () => void }) {
  const ws = useWorkspace()
  const activeId = useKrew((s) => s.activeWorkspaceId)
  const seededAt = useKrew((s) => s.seededAt)
  const setRead = useKrew((s) => s.setNotificationRead)
  const dismiss = useKrew((s) => s.dismissNotification)

  const notifications = useMemo(
    () => ws.notifications.map((n) => ({ id: n.id, title: n.title, description: n.description, time: shortAgo(n.createdAt), read: n.read, tone: n.tone })),
    [ws.notifications],
  )
  // Arc's notification center owns its list after mount; remount it when a new notification arrives
  // (they are prepended) or the demo is reset, but not on read or dismiss, which it already tracks.
  const centerKey = `${activeId}:${seededAt}:${ws.notifications[0]?.id ?? 'none'}`

  return (
    <header className="sticky top-0 z-30 bg-[color-mix(in_oklab,var(--background)_88%,transparent)] backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 pb-2 pt-3 sm:px-6 lg:px-8">
        <NavLink to="/" className="flex shrink-0 items-center pr-1 md:hidden" aria-label="KREW home">
          <KrewMark size={22} />
        </NavLink>

        <SectionBar />

        <div className="flex shrink-0 items-center gap-1">
          <Tooltip delay={200}>
            <Tooltip.Trigger>
              <button
                type="button"
                onClick={onSearch}
                aria-label="Search"
                className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-line bg-panel px-2.5 text-ink-2 shadow-[var(--shadow-resting)] transition-colors hover:text-ink"
              >
                <Search className="size-[17px]" strokeWidth={1.75} />
                <Kbd className="hidden xl:inline-flex">
                  <Kbd.Abbr keyValue="ctrl" />
                  <Kbd.Content>K</Kbd.Content>
                </Kbd>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content placement="bottom" className="rounded-md bg-inverse px-2 py-1 text-[12px] text-ink-inverse">
              Search agents, approvals and reports
            </Tooltip.Content>
          </Tooltip>
          <Tooltip delay={200}>
            <Tooltip.Trigger>
              <span className="hidden size-10 items-center justify-center rounded-[12px] text-ink-3 lg:inline-flex" aria-label="Demo data">
                <FlaskConical className="size-[17px]" strokeWidth={1.75} />
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content placement="bottom" className="max-w-64 rounded-lg bg-inverse px-3 py-2 text-[12.5px] leading-snug text-ink-inverse">
              Demo data. Everything here is simulated; no store, ad account or customer is touched.
            </Tooltip.Content>
          </Tooltip>
          <NotificationCenter key={centerKey} label="Notifications" notifications={notifications} onReadChange={(n, read) => setRead(n.id, read)} onDismiss={(n) => dismiss(n.id)} />
        </div>
      </div>
    </header>
  )
}
