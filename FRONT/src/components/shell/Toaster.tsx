import Toast from '@/components/arc/toast/toast'
import { useToasts } from '@/store/toasts'

/** Global toast outlet for background confirmations. Foreground actions also confirm in place. */
export function Toaster() {
  const current = useToasts((s) => s.current)
  const clear = useToasts((s) => s.clear)
  if (!current) return null
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-24 z-[100] flex justify-center md:inset-x-auto md:bottom-[84px] md:right-6 md:justify-end" role="region" aria-label="Notifications">
      <div className="pointer-events-auto w-full max-w-[26rem]">
        <Toast
          key={current.id}
          open
          onOpenChange={(open) => {
            if (!open) clear()
          }}
          title={current.title}
          description={current.description}
          duration={4200}
        />
      </div>
    </div>
  )
}
