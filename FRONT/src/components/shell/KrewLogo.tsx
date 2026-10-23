import { cn } from '@/lib/utils'

/** KREW mark: a crew of dots in orbit around one core. */
export function KrewMark({ className, size = 28 }: { className?: string; size?: number }) {
  const dots = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    return { x: 16 + Math.cos(a) * 11, y: 16 + Math.sin(a) * 11, r: i % 2 === 0 ? 1.9 : 1.35 }
  })
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={cn('shrink-0 text-ink', className)} aria-hidden>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="currentColor" />
      ))}
      <circle cx="16" cy="16" r="4.2" fill="currentColor" />
    </svg>
  )
}

export function KrewWordmark({ className }: { className?: string }) {
  return <span className={cn('text-[20px] font-medium tracking-[0.12em] text-ink', className)}>KREW</span>
}
