import { ChevronDown } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/arc/popover/popover'
import { ChannelIcon } from '@/components/luna/parts'
import { LUNA_SECTIONS, lunaPath, lunaSection, type LunaSection } from '@/components/luna/sections'
import { useLunaData } from '@/components/luna/use-luna'
import { relativeTime } from '@/lib/format'
import { isActiveRisk } from '@/lib/luna'
import { cn } from '@/lib/utils'
import { CasesSection } from './CasesSection'
import { ConversationsSection } from './ConversationsSection'
import { InsightsSection } from './InsightsSection'
import { LunaSheet } from './LunaSheet'
import { PulseSection } from './PulseSection'

function SectionLink({ section, active, count, onNavigate }: { section: LunaSection; active: boolean; count?: number; onNavigate?: () => void }) {
  const Icon = section.icon
  return (
    <NavLink
      to={lunaPath(section.id)}
      end
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn('relative flex min-h-9 items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-[13.5px] leading-snug transition-colors', active ? 'text-ink' : 'text-ink-2 hover:text-ink')}
    >
      {active && <motion.span layoutId="luna-section" className="absolute inset-0 rounded-[10px] border border-line bg-panel shadow-[0_1px_2px_rgb(0_0_0/0.05)]" transition={{ type: 'spring', stiffness: 520, damping: 42 }} />}
      <Icon className="relative size-4 shrink-0" strokeWidth={1.6} />
      <span className="relative flex-1">{section.label}</span>
      {!!count && <span className="tabular relative text-[11.5px] text-bad">{count}</span>}
    </NavLink>
  )
}

/** Luna's customer intelligence workspace, inside the agent's Intelligence tab. */
export function LunaWorkspace() {
  const { section: sectionId } = useParams()
  const section = lunaSection(sectionId)
  const data = useLunaData()
  const [menu, setMenu] = useState(false)
  const urgent = data.risks.filter((r) => isActiveRisk(r) && r.priority === 'high').length
  const counts: Partial<Record<LunaSection['id'], number>> = { cases: urgent }
  const Icon = section.icon

  return (
    <div className="grid gap-6 lg:grid-cols-[212px_minmax(0,1fr)] lg:gap-10">
      <nav aria-label="Luna sections" className="sticky top-[84px] hidden self-start lg:block">
        <ul className="flex flex-col gap-0.5">
          {LUNA_SECTIONS.map((s) => (
            <li key={s.id}>
              <SectionLink section={s} active={s.id === section.id} count={counts[s.id]} />
            </li>
          ))}
        </ul>
        <div className="mt-6 border-t border-line pt-5 text-[12.5px] leading-relaxed text-ink-3">
          <p className="flex items-center gap-1.5 text-ink-2">
            <ChannelIcon channel="instagram" size={13} /> {data.instagramAccount} DMs
          </p>
          <p className="mt-1">Last read {relativeTime(data.lastScanAt)}. Luna reads and reports. She never replies to customers.</p>
          <p className="mt-2">Sample conversations. Live DMs arrive once Instagram is connected.</p>
        </div>
      </nav>

      <div className="min-w-0">
        <div className="mb-6 lg:hidden">
          <Popover open={menu} onOpenChange={setMenu}>
            <PopoverTrigger asChild>
              <button type="button" className="flex h-11 w-full items-center gap-2.5 rounded-[12px] border border-line bg-panel px-3.5 text-left text-[14px] text-ink shadow-[var(--shadow-resting)]">
                <Icon className="size-4 text-ink-2" strokeWidth={1.6} />
                <span className="flex-1 truncate">{section.label}</span>
                <span className="text-[12.5px] text-ink-3">Sections</span>
                <ChevronDown className={cn('size-4 text-ink-3 transition-transform', menu && 'rotate-180')} strokeWidth={1.75} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1.5!">
              <ul className="flex flex-col gap-0.5">
                {LUNA_SECTIONS.map((s) => (
                  <li key={s.id}>
                    <SectionLink section={s} active={s.id === section.id} count={counts[s.id]} onNavigate={() => setMenu(false)} />
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </div>
        {section.id === 'pulse' ? <PulseSection /> : section.id === 'cases' ? <CasesSection /> : section.id === 'conversations' ? <ConversationsSection /> : <InsightsSection />}
      </div>
      <LunaSheet />
    </div>
  )
}
