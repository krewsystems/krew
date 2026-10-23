import { forwardRef, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArcProvider, type ArcLinkProps } from '@/components/arc/lib/arc-provider'
import { useKrew } from '@/store/krew'
import { AskKrew } from './AskKrew'
import { CommandMenu } from './CommandMenu'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'
import { Toaster } from './Toaster'
import { TopBar } from './TopBar'

/** Arc renders links through this, so its breadcrumbs and menus navigate client-side. */
const RouterLink = forwardRef<HTMLAnchorElement, ArcLinkProps>(function RouterLink({ href, ...props }, ref) {
  return /^https?:/.test(href) ? <a ref={ref} href={href} {...props} /> : <Link ref={ref} to={href} {...props} />
})

function useApplyTheme() {
  const theme = useKrew((s) => s.theme)
  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      root.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}

export function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false)
  const { pathname } = useLocation()
  const workspaceId = useKrew((s) => s.activeWorkspaceId)
  useApplyTheme()

  // Scroll to top when the page changes, but not when switching tabs inside a page (/krew/luna/tasks).
  const pageKey = pathname.split('/').slice(0, 3).join('/')
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pageKey, workspaceId])

  return (
    <ArcProvider link={RouterLink}>
    <div className="flex min-h-dvh bg-canvas text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onSearch={() => setSearchOpen(true)} />
        <main className="min-w-0 flex-1" key={workspaceId}>
          <Outlet />
        </main>
      </div>
      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} />
      <AskKrew />
      <MobileNav />
      <Toaster />
    </div>
    </ArcProvider>
  )
}
