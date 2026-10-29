import { CalendarRange } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/arc/button/button'
import { Input } from '@/components/arc/input/input'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/arc/popover/popover'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { periodLength, type PeriodPreset } from '@/lib/finance'
import { shortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PRESETS, type PeriodState } from './use-tracker'

/** 7, 30 or 90 days, or a custom range in a popover. Drives every figure on the Overview. */
export function PeriodPicker({ state }: { state: PeriodState }) {
  const { period, preset, bounds, maxDays, setPreset, setCustom } = state
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(period.from)
  const [to, setTo] = useState(period.to)

  const error =
    !from || !to
      ? 'Choose a start and an end date.'
      : from > to
        ? 'The start date must be before the end date.'
        : from < bounds.from || to > bounds.to
          ? `Choose dates between ${shortDate(bounds.from)} and ${shortDate(bounds.to)}.`
          : periodLength({ from, to }) > maxDays
            ? `Custom ranges can cover up to ${maxDays} days.`
            : undefined

  const custom = preset === 'custom'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl label="Period" value={custom ? '' : preset} onValueChange={(v) => setPreset(v as PeriodPreset)} options={PRESETS} />
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (o) {
            setFrom(period.from)
            setTo(period.to)
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'tabular inline-flex h-[var(--control-height-md)] items-center gap-2 rounded-[var(--radius-control)] border px-3 text-[13px] transition-colors',
              custom ? 'border-ink bg-panel text-ink' : 'border-line bg-panel text-ink-2 hover:border-line-strong hover:text-ink',
            )}
          >
            <CalendarRange className="size-4" strokeWidth={1.6} />
            {custom ? `${shortDate(period.from)} to ${shortDate(period.to)}` : 'Custom'}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[300px] p-4!">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (error) return
              setCustom({ from, to })
              setOpen(false)
            }}
          >
            <div>
              <p className="text-[13.5px] font-medium text-ink">Custom range</p>
              <p className="mt-0.5 text-[12.5px] text-ink-3">Compared with the same number of days just before it.</p>
            </div>
            <Input label="From" type="date" value={from} min={bounds.from} max={bounds.to} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} min={bounds.from} max={bounds.to} onChange={(e) => setTo(e.target.value)} error={from && to ? error : undefined} />
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="tabular text-[12px] text-ink-3">{!error && `${periodLength({ from, to })} days`}</span>
              <div className="flex gap-2">
                <PopoverClose asChild>
                  <Button variant="ghost" size="sm" type="button">
                    Cancel
                  </Button>
                </PopoverClose>
                <Button size="sm" type="submit" disabled={!!error}>
                  Apply
                </Button>
              </div>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  )
}
