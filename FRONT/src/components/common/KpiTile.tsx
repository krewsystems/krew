import type { ReactNode } from 'react'
import { AnimatedCounter } from '@/components/arc/animated-counter/animated-counter'
import { cn } from '@/lib/utils'

interface KpiTileProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  change?: string
  tone?: 'good' | 'bad' | 'neutral'
  context?: string
  icon?: ReactNode
  spark?: number[]
}

function MiniSpark({ data }: { data: number[] }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / (max - min || 1)) * 24 - 2}`).join(' ')
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-20 text-ink" aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/** KPI cell in the Onbase style: label, rolling number, quiet context, icon in a soft circle. */
export function KpiTile({ label, value, prefix, suffix, decimals = 0, change, tone = 'neutral', context, icon, spark }: KpiTileProps) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-4 bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-[13.5px] text-ink-2">{label}</p>
        {icon && <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-2 [&>svg]:size-4">{icon}</span>}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="[--text-3xl:1.875rem] [&_*]:font-normal!">
            <AnimatedCounter value={value} prefix={prefix} suffix={suffix} decimals={decimals} animateOnView />
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-3">
            {change && <span className={cn('tabular', tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-ink-2')}>{change}</span>}
            {context}
          </p>
        </div>
        {spark && <MiniSpark data={spark} />}
      </div>
    </div>
  )
}
