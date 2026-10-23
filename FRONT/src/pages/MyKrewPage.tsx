import { Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { AgentCard } from '@/components/agent/AgentCard'
import { Page, PageHeader } from '@/components/common/Panel'
import { RippleGrid } from '@/components/ui/RippleGrid'
import { useWorkspace } from '@/store/krew'

type Filter = 'all' | 'active' | 'paused' | 'setup'

export function MyKrewPage() {
  const ws = useWorkspace()
  const [params] = useSearchParams()
  const filter = (params.get('status') ?? 'all') as Filter
  const count = (f: Filter) => (f === 'all' ? ws.hires.length : ws.hires.filter((h) => h.status === f).length)
  const hires = ws.hires.filter((h) => filter === 'all' || h.status === filter)
  const decided = ws.approvals.filter((a) => a.status !== 'pending').length
  const tasksDone = ws.tasks.filter((t) => t.status === 'done').length

  return (
    <Page wide>
      <PageHeader
        title="My Krew"
        description={`The AI team working for ${ws.brand.name}. Each agent has its own workspace, schedule and settings.`}
      />

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line sm:grid-cols-4">
        {[
          { label: 'Agents working', value: String(count('active')) },
          { label: 'Actions this week', value: String(ws.kpis.agentActions) },
          { label: 'Tasks completed', value: String(tasksDone) },
          { label: 'Decisions you made', value: String(decided) },
        ].map((s) => (
          <div key={s.label} className="bg-panel px-5 py-4">
            <p className="text-[12.5px] text-ink-3">{s.label}</p>
            <p className="tabular mt-1 text-[24px] font-light tracking-[-0.02em] text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-end gap-3">
        <p className="text-[13px] text-ink-3">Managed by the KREW team · changes to agents are applied within one working day</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {hires.map((h) => (
          <AgentCard key={h.agentId} agentId={h.agentId} />
        ))}
        {(filter === 'all' || hires.length === 0) && (
          <Link
            to="/marketplace"
            className="group relative flex min-h-[300px] flex-col items-center justify-center overflow-hidden rounded-[var(--radius-surface)] border border-dashed border-line-strong bg-panel-muted p-6 text-center transition-colors hover:border-ink/30"
          >
            <div className="pointer-events-none absolute inset-0 opacity-50">
              <RippleGrid columns={14} rows={10} nodeSize={2} aspect="fill" showControls={false} hint={null} tapToRipple={false} autoInterval={2600} className="h-full w-full" />
            </div>
            <span className="relative inline-flex size-11 items-center justify-center rounded-full bg-inverse text-ink-inverse shadow-[var(--shadow-raised)] transition-transform group-hover:scale-105">
              <Plus className="size-5" strokeWidth={1.75} />
            </span>
            <p className="relative mt-4 text-[15px] font-medium text-ink">Hire your next agent</p>
            <p className="relative mt-1 max-w-[30ch] text-[13px] text-ink-2">Reviews, inventory, creative, competitors and more. Our team sets them up for you.</p>
          </Link>
        )}
      </div>
    </Page>
  )
}
