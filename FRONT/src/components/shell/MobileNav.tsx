import { Ellipsis } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ExpandableMobileNav } from '@/components/ui/expandable-mobile-nav'
import { NAV, SETTINGS_NAV } from './nav'

const PRIMARY = ['overview', 'krew', 'feed', 'messages', 'approvals']

/** Phones get skecher's expandable bottom bar; the current page shows its label. */
export function MobileNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const all = [...NAV, SETTINGS_NAV]
  const current = all.filter((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to))).sort((a, b) => b.to.length - a.to.length)[0]
  const routeId = current && PRIMARY.includes(current.id) ? current.id : 'more'
  const secondary = all.filter((n) => !PRIMARY.includes(n.id))

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
      <ExpandableMobileNav
        className="pointer-events-auto"
        value={moreOpen ? 'more' : routeId}
        onValueChange={(v) => setMoreOpen(v === 'more' && !moreOpen)}
        onItemSelect={(item) => {
          const target = all.find((n) => n.id === item.id)
          if (target) {
            setMoreOpen(false)
            navigate(target.to)
          }
        }}
        classNames={{
          shell: 'rounded-2xl border border-line bg-panel shadow-[var(--shadow-floating)]',
          activeItem: 'bg-inverse text-ink-inverse',
          separator: 'bg-line',
        }}
        layout={{ iconSize: 19, collapsedPadding: 9, expandedPadding: 13, gap: 4 }}
        navItems={[
          ...NAV.filter((n) => PRIMARY.includes(n.id)).map((n) => ({ id: n.id, label: n.label, icon: n.icon })),
          { id: 'sep', type: 'separator' as const },
          {
            id: 'more',
            label: 'More',
            icon: Ellipsis,
            panelContent: (
              <div className="grid grid-cols-3 gap-1 p-2">
                {secondary.map((n) => {
                  const Icon = n.icon
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        setMoreOpen(false)
                        navigate(n.to)
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-[12px] text-ink-2 hover:bg-sunken hover:text-ink"
                    >
                      <Icon className="size-[18px]" strokeWidth={1.6} />
                      {n.label}
                    </button>
                  )
                })}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
