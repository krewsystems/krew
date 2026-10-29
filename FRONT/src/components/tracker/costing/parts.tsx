import { forwardRef, type InputHTMLAttributes } from 'react'
import { Badge, type BadgeTone } from '@/components/arc/badge/badge'
import type { BatchStatus } from '@/data/tracker/types'
import type { CostingStatus } from '@/lib/costing'
import { cn } from '@/lib/utils'

/** Products have no photos in the demo, so each gets a quiet tile with its initials. A real image replaces it later. */
export function ProductThumb({ name, size = 44, className }: { name: string; size?: number; className?: string }) {
  const initials = name
    .split(/[\s,]+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
  return (
    <span
      aria-hidden
      className={cn('grain inline-flex shrink-0 items-center justify-center rounded-[12px] border border-line bg-sunken font-medium tracking-[-0.02em] text-ink-2', className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
    >
      {initials}
    </span>
  )
}

const COSTING: Record<CostingStatus, { label: string; tone: BadgeTone }> = {
  costed: { label: 'Costed', tone: 'success' },
  draft: { label: 'Draft batch', tone: 'info' },
  missing: { label: 'Missing cost', tone: 'warning' },
}

export function CostingStatusBadge({ status }: { status: CostingStatus }) {
  return (
    <Badge size="sm" tone={COSTING[status].tone}>
      {COSTING[status].label}
    </Badge>
  )
}

const BATCH: Record<BatchStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'info' },
  finalized: { label: 'Finalized', tone: 'success' },
  revised: { label: 'Revised', tone: 'neutral' },
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return (
    <Badge size="sm" tone={BATCH[status].tone}>
      {BATCH[status].label}
    </Badge>
  )
}

export const fieldClass =
  'h-10 w-full min-w-0 rounded-[10px] border border-line bg-panel px-3 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-3 hover:border-line-strong focus-visible:border-ink aria-[invalid=true]:border-[color-mix(in_oklab,var(--warning)_60%,transparent)]'

/** Amount field with a currency prefix. Empty input reads as NaN so validation can tell "not entered" from zero. */
export const MoneyInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: number; onValue: (n: number) => void }>(function MoneyInput(
  { value, onValue, className, ...props },
  ref,
) {
  return (
    <span className={cn('relative block', className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-ink-3">$</span>
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onValue(e.target.value === '' ? Number.NaN : Number(e.target.value))}
        className={cn(fieldClass, 'tabular pl-7')}
        {...props}
      />
    </span>
  )
})

export function QuantityInput({ value, onValue, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: number; onValue: (n: number) => void }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      step={1}
      value={value > 0 ? value : ''}
      placeholder="0"
      onChange={(e) => onValue(e.target.value === '' ? 0 : Math.max(0, Math.floor(Number(e.target.value))))}
      className={cn(fieldClass, 'tabular text-right', className)}
      {...props}
    />
  )
}
