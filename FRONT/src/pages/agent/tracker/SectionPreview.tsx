import { ArrowLeft, Check, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { sectionPath, type TrackerSection } from '@/components/tracker/sections'

/** Placeholder for a section that is designed but not built yet: says what it will do, offers a way back. */
export function SectionPreview({ section }: { section: TrackerSection }) {
  const Icon = section.icon
  return (
    <div className="rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]">
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12 lg:p-10">
        <div className="flex flex-col items-start">
          <span className="inline-flex size-11 items-center justify-center rounded-full border border-line text-ink-2">
            <Icon className="size-5" strokeWidth={1.5} />
          </span>
          <h2 className="mt-5 text-[24px] font-medium tracking-[-0.02em] text-ink">{section.label}</h2>
          <p className="mt-2 max-w-md text-[14.5px] text-ink-2">{section.summary}</p>
          <p className="mt-4 rounded-full border border-dashed border-line-strong px-2.5 py-1 text-[12px] text-ink-3">Planned for the next stage of Tracker</p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link to={sectionPath('overview')} className="inline-flex h-[var(--control-height-md)] items-center gap-1.5 rounded-[var(--radius-control)] bg-inverse px-3.5 text-[13.5px] text-ink-inverse transition-opacity hover:opacity-90">
              <ArrowLeft className="size-4" strokeWidth={1.6} /> Back to summary
            </Link>
            <Link to="/messages/tracker" className="inline-flex h-[var(--control-height-md)] items-center gap-1.5 rounded-[var(--radius-control)] border border-line px-3.5 text-[13.5px] text-ink transition-colors hover:border-line-strong">
              <MessageCircle className="size-4" strokeWidth={1.6} /> Message Tracker
            </Link>
          </div>
        </div>
        <div className="rounded-[14px] bg-panel-muted p-5 sm:p-6">
          <p className="text-[13px] text-ink-3">What this section will do</p>
          <ul className="mt-4 flex flex-col gap-3.5">
            {section.planned.map((item) => (
              <li key={item} className="flex gap-3 text-[14px] text-ink">
                <Check className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.8} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
