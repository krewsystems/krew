import { ChevronDown } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/arc/popover/popover'
import { TRACKER_SECTIONS, sectionPath, trackerSection, type TrackerSection } from '@/components/tracker/sections'
import { finalizedThrough } from '@/lib/finance'
import { shortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CostingSection } from './costing/CostingSection'
import { ExpensesSection } from './expenses/ExpensesSection'
import { ProfitabilitySection } from './profitability/ProfitabilitySection'
import { FinanceReports } from './reports/FinanceReports'
import { SeasonsSection } from './seasons/SeasonsSection'
import { SectionPreview } from './SectionPreview'
import { TrackerOverview } from './TrackerOverview'

function SectionLink({ section, active, onNavigate }: { section: TrackerSection; active: boolean; onNavigate?: () => void }) {
  const Icon = section.icon
  return (
    <NavLink
      to={sectionPath(section.id)}
      end
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn('relative flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[13.5px] transition-colors', active ? 'text-ink' : section.ready ? 'text-ink-2 hover:text-ink' : 'text-ink-3 hover:text-ink-2')}
    >
      {active && <motion.span layoutId="tracker-section" className="absolute inset-0 rounded-[10px] border border-line bg-panel shadow-[0_1px_2px_rgb(0_0_0/0.05)]" transition={{ type: 'spring', stiffness: 520, damping: 42 }} />}
      <Icon className="relative size-4 shrink-0" strokeWidth={1.6} />
      <span className="relative flex-1 truncate">{section.label}</span>
      {!section.ready && <span className="relative text-[11px] text-ink-3">Soon</span>}
    </NavLink>
  )
}

/** Desktop: a quiet column beside the content. */
function SideNav({ current }: { current: TrackerSection }) {
  const through = finalizedThrough()
  return (
    <nav aria-label="Finance sections" className="sticky top-[84px] hidden self-start lg:block">
      <ul className="flex flex-col gap-0.5">
        {TRACKER_SECTIONS.map((s) => (
          <li key={s.id}>
            <SectionLink section={s} active={s.id === current.id} />
          </li>
        ))}
      </ul>
      <div className="mt-6 border-t border-line pt-5 text-[12.5px] leading-relaxed text-ink-3">
        <p className="text-ink-2">Books final through {shortDate(through)}</p>
        <p className="mt-1">Anything after that is an estimate until the month is closed.</p>
      </div>
    </nav>
  )
}

/** Phones and tablets: one menu button instead of another row of tabs. */
function SectionMenu({ current }: { current: TrackerSection }) {
  const [open, setOpen] = useState(false)
  const Icon = current.icon
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex h-11 w-full items-center gap-2.5 rounded-[12px] border border-line bg-panel px-3.5 text-left text-[14px] text-ink shadow-[var(--shadow-resting)] lg:hidden">
          <Icon className="size-4 text-ink-2" strokeWidth={1.6} />
          <span className="flex-1">{current.label}</span>
          <span className="text-[12.5px] text-ink-3">Sections</span>
          <ChevronDown className={cn('size-4 text-ink-3 transition-transform', open && 'rotate-180')} strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1.5!">
        <ul className="flex flex-col gap-0.5">
          {TRACKER_SECTIONS.map((s) => (
            <li key={s.id}>
              <SectionLink section={s} active={s.id === current.id} onNavigate={() => setOpen(false)} />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/** Tracker's finance workspace, inside the agent's Finance tab: its own section navigation, then the section. */
export function TrackerWorkspace() {
  const { section: sectionId } = useParams()
  const section = trackerSection(sectionId)

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
        <SideNav current={section} />
        <div className="min-w-0">
          <div className="mb-6 lg:hidden">
            <SectionMenu current={section} />
          </div>
          {section.id === 'overview' ? <TrackerOverview /> : section.id === 'costing' ? <CostingSection /> : section.id === 'seasons' ? <SeasonsSection /> : section.id === 'expenses' ? <ExpensesSection /> : section.id === 'profitability' ? <ProfitabilitySection /> : section.id === 'reports' ? <FinanceReports /> : <SectionPreview section={section} />}
        </div>
      </div>
    </div>
  )
}
