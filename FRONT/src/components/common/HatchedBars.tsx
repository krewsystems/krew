import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

interface Bar {
  label: string
  value: number
  prev?: number
}

interface HatchedBarsProps {
  bars: Bar[]
  height?: number
  unit?: string
  unitPosition?: 'prefix' | 'suffix'
  legend?: [string, string]
  className?: string
  /** Hatched dark bars for the current value, quiet grey bars for the comparison. */
  showPrev?: boolean
}

/** Grouped column chart in the Onbase reference style: hatched ink bars, soft grey comparisons. */
export function HatchedBars({ bars, height = 140, unit = '', unitPosition = 'prefix', legend, className, showPrev = true }: HatchedBarsProps) {
  const id = useId().replace(/:/g, '')
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(...bars.flatMap((b) => [b.value, b.prev ?? 0])) * 1.12 || 1
  const fmt = (v: number) => (unitPosition === 'prefix' ? `${unit}${v}` : `${v}${unit}`)
  const hasPrev = showPrev && bars.some((b) => b.prev !== undefined)

  return (
    <figure className={cn('w-full', className)}>
      {legend && (
        <figcaption className="mb-3 flex items-center gap-4 text-[12px] text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-ink" />
            {legend[0]}
          </span>
          {hasPrev && (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--series-2)]" />
              {legend[1]}
            </span>
          )}
        </figcaption>
      )}
      <div className="relative" style={{ height }}>
        <svg width="0" height="0" className="absolute" aria-hidden>
          <defs>
            <pattern id={`h-${id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="var(--series-1)" />
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--surface)" strokeOpacity="0.28" strokeWidth="1.6" />
            </pattern>
            <pattern id={`g-${id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="var(--series-2)" />
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--surface)" strokeOpacity="0.3" strokeWidth="1.6" />
            </pattern>
          </defs>
        </svg>
        {[0.25, 0.5, 0.75].map((g) => (
          <div key={g} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${g * 100}%` }} />
        ))}
        <div className="absolute inset-0 flex items-end justify-around gap-2">
          {bars.map((b, i) => (
            <button
              type="button"
              key={b.label}
              className="group relative flex h-full flex-1 items-end justify-center gap-1.5 outline-none"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${b.label}: ${fmt(b.value)}${b.prev !== undefined ? `, previously ${fmt(b.prev)}` : ''}`}
            >
              <svg className="h-full w-2.5 overflow-visible" preserveAspectRatio="none" viewBox={`0 0 10 100`} aria-hidden>
                <rect
                  x="0"
                  y={100 - (b.value / max) * 100}
                  width="10"
                  height={(b.value / max) * 100}
                  rx="3"
                  fill={`url(#h-${id})`}
                  style={{ transition: 'y 500ms var(--ease-enter), height 500ms var(--ease-enter)' }}
                  opacity={active === null || active === i ? 1 : 0.35}
                />
              </svg>
              {hasPrev && b.prev !== undefined && (
                <svg className="h-full w-2.5 overflow-visible" preserveAspectRatio="none" viewBox="0 0 10 100" aria-hidden>
                  <rect
                    x="0"
                    y={100 - (b.prev / max) * 100}
                    width="10"
                    height={(b.prev / max) * 100}
                    rx="3"
                    fill={`url(#g-${id})`}
                    opacity={active === null || active === i ? 1 : 0.35}
                  />
                </svg>
              )}
              {active === i && (
                <span className="tabular pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-inverse px-2 py-1 text-[11.5px] text-ink-inverse shadow-[var(--shadow-raised)]">
                  {fmt(b.value)}
                  {b.prev !== undefined && <span className="text-ink-inverse-2"> · was {fmt(b.prev)}</span>}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-around gap-2">
        {bars.map((b, i) => (
          <span key={b.label} className={cn('flex-1 truncate text-center text-[12px]', active === i ? 'text-ink' : 'text-ink-3')}>
            {b.label}
          </span>
        ))}
      </div>
    </figure>
  )
}
