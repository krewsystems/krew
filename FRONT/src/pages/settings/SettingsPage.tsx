import { BookOpen, Bot, CreditCard, Fingerprint, PlugZap, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { AgentSettingsForm } from '@/components/agent/AgentSettingsForm'
import { useAgentResolver } from '@/components/agent/use-agent'
import { Page, PageHeader } from '@/components/common/Panel'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/krew'
import { BrandSection, KnowledgeSection } from './BrandSection'
import { IntegrationsSection, PlanSection, TeamSection } from './OtherSections'

const SECTIONS = [
  { id: 'brand', label: 'Brand DNA', icon: Fingerprint, description: 'Identity, voice, policies and goals every agent works from.' },
  { id: 'knowledge', label: 'Knowledge base', icon: BookOpen, description: 'Facts, product details and answers your agents rely on.' },
  { id: 'integrations', label: 'Integrations', icon: PlugZap, description: 'The sources and channels your agents can read and act on.' },
  { id: 'agents', label: 'Agent preferences', icon: Bot, description: 'Names, personality, schedules, notifications and approvals per agent.' },
  { id: 'team', label: 'Team & permissions', icon: UsersRound, description: 'People who can see this workspace and approve actions.' },
  { id: 'plan', label: 'Plan & prototype', icon: CreditCard, description: 'Your managed plan, appearance and demo data.' },
] as const

function AgentPreferences() {
  const ws = useWorkspace()
  const resolve = useAgentResolver()
  const [selected, setSelected] = useState(ws.hires[0]?.agentId ?? 'manager')
  return (
    <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
        {ws.hires.map((h) => {
          const a = resolve(h.agentId)
          return (
            <li key={h.agentId} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelected(h.agentId)}
                className={cn('flex w-full items-center gap-2.5 rounded-[10px] border px-2.5 py-2 text-left transition-colors', selected === h.agentId ? 'border-line bg-panel shadow-[var(--shadow-resting)]' : 'border-transparent hover:bg-sunken')}
              >
                <AgentAvatar agentId={h.agentId} size="sm" showStatus />
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] text-ink">{a.displayName}</span>
                  <span className="block truncate text-[11.5px] text-ink-3">{a.role}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="min-w-0 rounded-[var(--radius-surface)] border border-line bg-panel px-6 pb-6 shadow-[var(--shadow-resting)]">
        <AgentSettingsForm key={selected} agentId={selected} />
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { section = 'brand' } = useParams()
  const current = SECTIONS.find((s) => s.id === section)
  if (!current) return <Navigate to="/settings/brand" replace />

  return (
    <Page wide>
      <PageHeader title="Settings" description="Your brand’s context and how your AI workforce operates." />
      <div className="mx-auto max-w-[1080px]">
        <div className="min-w-0">
          <div className="mb-6">
            <h2 className="text-[19px] font-medium tracking-[-0.015em] text-ink">{current.label}</h2>
            <p className="mt-1 text-[13.5px] text-ink-3">{current.description}</p>
          </div>
          {section === 'brand' && (
            <div className="rounded-[var(--radius-surface)] border border-line bg-panel p-6 shadow-[var(--shadow-resting)]">
              <BrandSection />
            </div>
          )}
          {section === 'knowledge' && <KnowledgeSection />}
          {section === 'integrations' && <IntegrationsSection />}
          {section === 'agents' && <AgentPreferences />}
          {section === 'team' && <TeamSection />}
          {section === 'plan' && (
            <div className="rounded-[var(--radius-surface)] border border-line bg-panel p-6 shadow-[var(--shadow-resting)]">
              <PlanSection />
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}
