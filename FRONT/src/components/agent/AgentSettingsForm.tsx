import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/arc/button/button'
import { ColorPicker } from '@/components/arc/color-picker/color-picker'
import { Input } from '@/components/arc/input/input'
import { RadioCards } from '@/components/arc/radio-cards/radio-cards'
import { Select } from '@/components/arc/select/select'
import { Switch } from '@/components/arc/switch/switch'
import { SpringSlider } from '@/components/ui/spring-slider'
import { getAgent } from '@/data/agents'
import { defaultSettings } from '@/data/seed-utils'
import type { AgentSettings, ApprovalMode, Personality } from '@/data/types'
import { cn } from '@/lib/utils'
import { useKrew } from '@/store/krew'
import { toast } from '@/store/toasts'
import { AgentAvatar } from './AgentAvatar'
import { useAgentView } from './use-agent'

const ACCENTS = [
  'oklch(62% 0.07 295)',
  'oklch(58% 0.07 160)',
  'oklch(60% 0.08 128)',
  'oklch(64% 0.08 72)',
  'oklch(60% 0.1 42)',
  'oklch(60% 0.08 12)',
  'oklch(58% 0.06 240)',
  'oklch(45% 0 0)',
]

const SCHEDULES = ['Hourly scan, daily report at 18:00', 'Daily at 07:30', 'Daily at 08:00', 'Daily at 09:00', 'Daily at 10:00', 'Daily at 11:00', 'Daily at 17:00', 'Weekly on Monday', 'Weekly on Thursday', 'Monthly on the 1st']

const PERSONALITIES: { value: Personality; label: string; description: string }[] = [
  { value: 'concise', label: 'Concise', description: 'Short updates, numbers first.' },
  { value: 'warm', label: 'Warm', description: 'Friendly, explains the why.' },
  { value: 'analytical', label: 'Analytical', description: 'Detailed, shows the working.' },
  { value: 'direct', label: 'Direct', description: 'Clear calls, no hedging.' },
]

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-line-subtle py-6 last:border-b-0 md:grid-cols-[240px_minmax(0,1fr)] md:gap-8">
      <div>
        <h3 className="text-[14px] font-medium text-ink">{title}</h3>
        {description && <p className="mt-1 text-[13px] leading-snug text-ink-3">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

export function AgentSettingsForm({ agentId }: { agentId: string }) {
  const agent = useAgentView(agentId)
  const update = useKrew((s) => s.updateAgentSettings)
  const saved = agent.hire?.settings
  const [draft, setDraft] = useState<AgentSettings | undefined>(saved)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => setDraft(saved), [agentId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!draft || !saved) return null
  const def = getAgent(agentId)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const set = (patch: Partial<AgentSettings>) => {
    setJustSaved(false)
    setDraft((d) => (d ? { ...d, ...patch } : d))
  }
  const name = draft.displayName || def.name

  return (
    <div>
      <Section title="Identity" description="How this agent appears across KREW and Telegram.">
        <div className="flex items-start gap-4">
          <div className="pt-6">
            <AgentAvatar agentId={agentId} size="lg" />
          </div>
          <div className="flex-1">
            <Input label="Agent name" value={draft.displayName} onChange={(e) => set({ displayName: e.target.value })} description={`Default: ${def.name}`} maxLength={28} />
          </div>
        </div>
        <div className="mt-5">
          <p className="mb-2 text-[13px] text-ink-2">Accent color</p>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set({ accent: c })}
                aria-label={`Use accent ${c}`}
                aria-pressed={draft.accent === c}
                className={cn('relative inline-flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-panel transition-shadow', draft.accent === c ? 'ring-2 ring-ink' : 'ring-1 ring-line hover:ring-line-strong')}
                style={{ background: c }}
              >
                {draft.accent === c && <Check className="size-4 text-white" strokeWidth={2} />}
              </button>
            ))}
            <div className="ml-1">
              <ColorPicker label="Custom" value={draft.accent.startsWith('#') ? draft.accent : '#8A7FB8'} onValueChange={(hex) => set({ accent: hex })} />
            </div>
          </div>
          <p className="mt-2 text-[12px] text-ink-3">Accents stay subtle: avatar tint and small markers only.</p>
        </div>
      </Section>

      <Section title="Personality" description="Tone of the agent’s posts, reports and messages. Brand voice still comes from Brand DNA.">
        <RadioCards aria-label="Personality" value={draft.personality} onValueChange={(v) => set({ personality: v as Personality })} minColumnWidth={150} options={PERSONALITIES} />
      </Section>

      <Section title="Schedule" description="When the agent runs its main report. Monitoring continues in between.">
        <div className="max-w-sm">
          <Select label="Reporting schedule" value={draft.schedule} onValueChange={(v) => set({ schedule: v })} options={[...new Set([draft.schedule, ...SCHEDULES])].map((s) => ({ value: s, label: s }))} />
        </div>
      </Section>

      <Section title="Capabilities" description="Turn off anything you don’t want this agent to do.">
        <ul className="flex flex-col divide-y divide-line-subtle rounded-[12px] border border-line">
          {def.capabilities.map((c) => (
            <li key={c.title} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[13.5px] text-ink">{c.title}</p>
                <p className="text-[12.5px] text-ink-3">{c.description}</p>
              </div>
              <Switch aria-label={c.title} checked={draft.capabilities[c.title] ?? true} onCheckedChange={(v) => set({ capabilities: { ...draft.capabilities, [c.title]: v } })} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Approvals" description="What needs your sign-off. Anything that touches customers, money or your live store always asks first.">
        <RadioCards
          aria-label="Approval preference"
          layout="list"
          value={draft.approvalMode}
          onValueChange={(v) => set({ approvalMode: v as ApprovalMode })}
          options={[
            { value: 'always', label: 'Ask me for everything', description: 'Every action waits for approval.' },
            { value: 'high-impact', label: 'Ask for high-impact actions', description: 'Routine, reversible work runs on its own.', meta: 'Recommended' },
            { value: 'never', label: 'Only ask for customer-facing actions', description: 'Internal work and drafts run automatically.' },
          ]}
        />
        <div className="mt-6 max-w-md">
          <div className="mb-1 flex items-baseline justify-between">
            <p className="text-[13px] text-ink-2">Independence</p>
            <p className="text-[12px] text-ink-3">{draft.autonomy < 34 ? 'Checks in often' : draft.autonomy < 67 ? 'Balanced' : 'Works independently'}</p>
          </div>
          <div className="pt-10">
            <SpringSlider aria-label={`${name} independence`} value={draft.autonomy} onValueChange={(v) => set({ autonomy: v })} min={0} max={100} step={10} ticks={11} />
          </div>
        </div>
      </Section>

      <Section title="Notifications" description="Where this agent reaches you.">
        <div className="flex flex-col gap-3">
          <Switch label="Telegram messages for alerts and approvals" checked={draft.notifyTelegram} onCheckedChange={(v) => set({ notifyTelegram: v })} />
          <Switch label="Notifications in the web app" checked={draft.notifyWeb} onCheckedChange={(v) => set({ notifyWeb: v })} />
          <Switch label="Include in the Manager’s daily digest" checked={draft.notifyDigest} onCheckedChange={(v) => set({ notifyDigest: v })} />
        </div>
      </Section>

      <div className="sticky bottom-4 z-10 mt-2 flex items-center justify-between gap-3 rounded-[14px] border border-line bg-panel/95 px-4 py-3 shadow-[var(--shadow-raised)] backdrop-blur">
        <p className="text-[13px] text-ink-3">{dirty ? 'You have unsaved changes' : justSaved ? 'All changes saved' : 'Changes apply to the next run'}</p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraft(defaultSettings(agentId))
              setJustSaved(false)
            }}
          >
            Reset to defaults
          </Button>
          <Button
            size="sm"
            disabled={!dirty}
            onClick={() => {
              update(agentId, draft)
              setJustSaved(true)
              toast('Settings saved', `${name} will use them from the next run.`)
            }}
          >
            {justSaved && !dirty ? 'Saved' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
