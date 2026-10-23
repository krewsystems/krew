import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/arc/popover/popover'
import { cn } from '@/lib/utils'
import { useKrew, WORKSPACE_LIST } from '@/store/krew'
import { toast } from '@/store/toasts'

function BrandTile({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[9px] bg-inverse text-[11.5px] font-medium tracking-wide text-ink-inverse"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials}
    </span>
  )
}

export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const activeId = useKrew((s) => s.activeWorkspaceId)
  const setWorkspace = useKrew((s) => s.setWorkspace)
  const [open, setOpen] = useState(false)
  const active = WORKSPACE_LIST.find((w) => w.id === activeId) ?? WORKSPACE_LIST[0]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Workspace: ${active.name}. Switch workspace`}
          className={cn(
            'group flex items-center gap-2.5 rounded-[11px] border border-transparent text-left transition-colors hover:border-line hover:bg-panel',
            collapsed ? 'size-10 justify-center p-0' : 'w-full p-1.5',
            open && 'border-line bg-panel',
          )}
        >
          <BrandTile initials={active.initials} />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-ink">{active.name}</span>
                <span className="block truncate text-[12px] text-ink-3">{active.industry}</span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-ink-3" strokeWidth={1.75} />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side={collapsed ? 'right' : 'bottom'} className="w-[260px] p-1.5!">
        <p className="px-2 pb-1.5 pt-1 text-[12px] text-ink-3">Brand workspaces</p>
        <ul className="flex flex-col gap-0.5">
          {WORKSPACE_LIST.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => {
                  setWorkspace(w.id)
                  setOpen(false)
                  if (w.id !== activeId) toast(`Switched to ${w.name}`, 'Each brand has its own agents, data and approvals.')
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sunken"
              >
                <BrandTile initials={w.initials} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] text-ink">{w.name}</span>
                  <span className="block truncate text-[12px] text-ink-3">{w.industry}</span>
                </span>
                {w.id === activeId && <Check className="size-4 text-ink" strokeWidth={1.75} />}
              </button>
            </li>
          ))}
        </ul>
        <div className="my-1.5 h-px bg-line-subtle" />
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            toast('Request sent to the KREW team', 'We set up new brand workspaces for you. Expect a message within one working day.')
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[13.5px] text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
        >
          <span className="inline-flex size-7 items-center justify-center rounded-[8px] border border-dashed border-line-strong">
            <Plus className="size-3.5" strokeWidth={1.75} />
          </span>
          Request a new brand workspace
        </button>
      </PopoverContent>
    </Popover>
  )
}
