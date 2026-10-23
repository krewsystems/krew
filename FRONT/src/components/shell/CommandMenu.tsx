import * as DialogPrimitive from '@radix-ui/react-dialog'
import { BadgeCheck, MessageCircle, RotateCcw, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CommandPalette, type CommandItem } from '@/components/arc/command-palette/command-palette'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { resolveAgent } from '@/components/agent/use-agent'
import { AGENTS } from '@/data/agents'
import { useKrew, useWorkspace } from '@/store/krew'
import { toast } from '@/store/toasts'
import { NAV, SETTINGS_NAV } from './nav'

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const ws = useWorkspace()
  const navigate = useNavigate()
  const resetDemo = useKrew((s) => s.resetDemo)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const { items, actions } = useMemo(() => {
    const actions = new Map<string, () => void>()
    const items: CommandItem[] = []
    for (const n of [...NAV, SETTINGS_NAV]) {
      const id = `nav-${n.id}`
      const Icon = n.icon
      items.push({ id, label: n.label, group: 'Go to', icon: <Icon size={16} strokeWidth={1.6} /> })
      actions.set(id, () => navigate(n.to))
    }
    for (const h of ws.hires) {
      const a = resolveAgent(h.agentId, ws.hires)
      const open = `agent-${a.id}`
      items.push({ id: open, label: a.displayName, description: a.role, group: 'Your Krew', keywords: [a.role], icon: <AgentAvatar agentId={a.id} size="xs" /> })
      actions.set(open, () => navigate(`/krew/${a.id}`))
      if (h.status !== 'setup') {
        const msg = `msg-${a.id}`
        items.push({ id: msg, label: `Message ${a.displayName}`, group: 'Ask', icon: <MessageCircle size={16} strokeWidth={1.6} /> })
        actions.set(msg, () => navigate(`/messages/${a.id}`))
      }
    }
    for (const ap of ws.approvals.filter((x) => x.status === 'pending')) {
      const id = `apv-${ap.id}`
      items.push({ id, label: ap.title, description: 'Waiting for approval', group: 'Approvals', icon: <BadgeCheck size={16} strokeWidth={1.6} /> })
      actions.set(id, () => navigate(`/approvals/${ap.id}`))
    }
    for (const a of AGENTS.filter((x) => !ws.hires.some((h) => h.agentId === x.id))) {
      const id = `hire-${a.id}`
      items.push({ id, label: `Hire ${a.name}`, description: a.role, group: 'Marketplace', icon: <Sparkles size={16} strokeWidth={1.6} /> })
      actions.set(id, () => navigate(`/marketplace/${a.id}`))
    }
    items.push({ id: 'reset', label: 'Reset demo data', group: 'Prototype', icon: <RotateCcw size={16} strokeWidth={1.6} /> })
    actions.set('reset', () => {
      resetDemo()
      toast('Demo reset', 'Both workspaces are back to their original state.')
    })
    return { items, actions }
  }, [ws, navigate, resetDemo])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[90] bg-[oklch(16%_0_0/0.18)] backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed left-1/2 top-[14vh] z-[91] w-[min(640px,calc(100vw-24px))] -translate-x-1/2 outline-none"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 520, damping: 40 }}
              >
                <DialogPrimitive.Title className="sr-only">Search KREW</DialogPrimitive.Title>
                <CommandPalette
                  autoFocus
                  items={items}
                  placeholder="Search pages, agents, approvals or actions"
                  onSelect={(item) => {
                    onOpenChange(false)
                    actions.get(item.id)?.()
                  }}
                  onClose={() => onOpenChange(false)}
                />
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
