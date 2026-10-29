import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ChevronRight, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/arc/button/button'
import { motionTokens } from '@/components/arc/lib/motion-tokens'
import { cn } from '@/lib/utils'
import { ProductThumb } from './parts'
import { GuardContext } from './sheet-guard'


interface ProductSheetProps {
  open: boolean
  onClose: () => void
  /** Changes whenever the view inside the sheet changes, so the body scrolls back to the top. */
  viewKey: string
  name: string
  meta: ReactNode
  /** Replaces the product initials tile, for sheets that are not about a product. */
  thumb?: ReactNode
  /** Breadcrumb trail after the product name, such as the batch being edited. */
  trail?: { label: string; onClick?: () => void }[]
  children: ReactNode
}

/** A focused, near full-screen sheet for working on one record (a product, a project) until it is saved. The list stays underneath. */
export function ProductSheet({ open, onClose, viewKey, name, meta, thumb, trail = [], children }: ProductSheetProps) {
  const reduced = useReducedMotion()
  const body = useRef<HTMLDivElement>(null)
  const dirty = useRef(false)
  const [pending, setPending] = useState<(() => void) | null>(null)

  const setDirty = useCallback((d: boolean) => {
    dirty.current = d
  }, [])
  const guard = useCallback((action: () => void) => {
    if (dirty.current) setPending(() => action)
    else action()
  }, [])

  const value = useMemo(() => ({ setDirty, guard }), [setDirty, guard])

  useEffect(() => {
    body.current?.scrollTo({ top: 0 })
  }, [viewKey])

  return (
    <GuardContext.Provider value={value}>
      <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && guard(onClose)}>
        <AnimatePresence>
          {open && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div className="fixed inset-0 z-[60] bg-[oklch(16%_0_0/0.32)] backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: motionTokens.duration.fast }} />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  className="fixed inset-0 z-[61] m-auto flex flex-col overflow-hidden bg-canvas shadow-[var(--shadow-floating)] outline-none sm:inset-4 sm:max-w-[1240px] sm:rounded-[22px] sm:border sm:border-line"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.99, transition: { duration: motionTokens.duration.fast } }}
                  transition={reduced ? { duration: 0 } : motionTokens.spring.smooth}
                >
                  <header className="flex shrink-0 items-center gap-3.5 border-b border-line bg-panel px-4 py-3.5 sm:px-6">
                    {thumb ?? <ProductThumb name={name} size={40} />}
                    <div className="min-w-0 flex-1">
                      <DialogPrimitive.Title className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[15.5px] font-medium tracking-[-0.01em] text-ink">
                        {trail.length ? (
                          <button type="button" onClick={trail[0].onClick ? () => guard(trail[0].onClick!) : undefined} className="truncate text-ink-2 hover:text-ink">
                            {name}
                          </button>
                        ) : (
                          <span className="truncate">{name}</span>
                        )}
                        {trail.map((t, i) => (
                          <span key={t.label} className="flex min-w-0 items-center gap-1.5">
                            <ChevronRight className="size-4 shrink-0 text-ink-3" strokeWidth={1.7} />
                            <span className={cn('truncate', i === trail.length - 1 ? 'text-ink' : 'text-ink-2')}>{t.label}</span>
                          </span>
                        ))}
                      </DialogPrimitive.Title>
                      <div className="mt-0.5 truncate text-[12.5px] text-ink-3">{meta}</div>
                    </div>
                    <DialogPrimitive.Close className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line text-ink-2 transition-colors hover:border-line-strong hover:text-ink" aria-label="Close">
                      <X className="size-4" strokeWidth={1.75} />
                    </DialogPrimitive.Close>
                  </header>

                  <div ref={body} className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5 sm:px-6 sm:pt-6">
                    {children}
                  </div>

                  <AnimatePresence>
                    {pending && (
                      <motion.div
                        role="alertdialog"
                        aria-label="Unsaved changes"
                        className="absolute inset-x-4 bottom-4 z-10 mx-auto flex max-w-[560px] flex-col gap-3 rounded-[16px] border border-line bg-panel p-4 shadow-[var(--shadow-floating)] sm:flex-row sm:items-center"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                      >
                        <p className="flex-1 text-[13.5px] text-ink">You have unsaved changes. Leave without saving?</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
                            Keep editing
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              const next = pending
                              setPending(null)
                              dirty.current = false
                              next()
                            }}
                          >
                            Discard changes
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>
    </GuardContext.Provider>
  )
}
