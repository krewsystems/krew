import { CircleAlert, CircleCheck, CircleDashed, Plus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/arc/avatar/avatar'
import { Button } from '@/components/arc/button/button'
import { ConfirmMorph } from '@/components/arc/confirm-morph/confirm-morph'
import { Dialog, DialogContent } from '@/components/arc/dialog/dialog'
import { Input } from '@/components/arc/input/input'
import { RadioCards } from '@/components/arc/radio-cards/radio-cards'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { Select } from '@/components/arc/select/select'
import { UsageMeter } from '@/components/arc/usage-meter/usage-meter'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { KrewMark } from '@/components/shell/KrewLogo'
import { DitherCreditCard } from '@/components/ui/dither-credit-card'
import type { Integration, TeamRole } from '@/data/types'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useKrew, useWorkspace, type ThemePref } from '@/store/krew'
import { toast } from '@/store/toasts'
import { SettingsSection } from './BrandSection'

const MONO: Record<string, string> = { shopify: 'Sh', instagram: 'Ig', facebook: 'Fb', whatsapp: 'Wa', 'meta-ads': 'Ma', telegram: 'Tg' }

function IntegrationCard({ integration }: { integration: Integration }) {
  const setStatus = useKrew((s) => s.setIntegrationStatus)
  const [busy, setBusy] = useState(false)
  const connected = integration.status === 'connected'
  const attention = integration.status === 'attention'

  const connect = () => {
    setBusy(true)
    setTimeout(() => {
      setStatus(integration.id, 'connected')
      setBusy(false)
      toast(`${integration.name} connected`, 'Simulated connection. No real account was accessed.')
    }, 1300)
  }

  return (
    <article className={cn('flex flex-col rounded-[var(--radius-panel)] border bg-panel p-5 shadow-[var(--shadow-resting)]', attention ? 'border-[color-mix(in_oklab,var(--warning)_40%,var(--border))]' : 'border-line')}>
      <div className="flex items-start gap-3">
        <span className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-[11px] text-[13px] font-medium', connected ? 'bg-inverse text-ink-inverse' : 'border border-line bg-panel-muted text-ink-2')}>{MONO[integration.id]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-medium text-ink">{integration.name}</p>
          <p className="text-[12.5px] text-ink-3">{integration.description}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[12.5px]">
        {connected ? (
          <CircleCheck className="size-4 text-good" strokeWidth={1.75} />
        ) : attention ? (
          <CircleAlert className="size-4 text-warn" strokeWidth={1.75} />
        ) : (
          <CircleDashed className="size-4 text-ink-3" strokeWidth={1.75} />
        )}
        <span className="text-ink">{connected ? 'Connected' : attention ? 'Needs attention' : 'Not connected'}</span>
        {integration.account && integration.status !== 'disconnected' && <span className="truncate text-ink-3">· {integration.account}</span>}
      </div>
      <p className="mt-1 text-[12px] text-ink-3">
        {attention ? 'Access token expires in 3 days. Reconnect to keep Luna and Retention working.' : connected && integration.lastSync ? `Synced ${relativeTime(integration.lastSync)}` : 'Connect to unlock agents that need it.'}
      </p>
      <div className="mt-4 flex items-center gap-2 border-t border-line-subtle pt-4">
        {integration.usedBy.length > 0 && (
          <div className="flex -space-x-1.5">
            {integration.usedBy.slice(0, 5).map((id) => (
              <AgentAvatar key={id} agentId={id} size="xs" ring />
            ))}
          </div>
        )}
        <div className="ml-auto flex gap-2">
          {connected ? (
            <ConfirmMorph
              label="Disconnect"
              tone="neutral"
              prompt="Disconnect?"
              confirmLabel="Disconnect"
              pendingLabel="Disconnecting"
              doneLabel="Disconnected"
              onConfirm={async () => {
                await new Promise((r) => setTimeout(r, 500))
                setStatus(integration.id, 'disconnected')
              }}
            />
          ) : (
            <Button size="sm" loading={busy} onClick={connect}>
              {attention ? 'Reconnect' : 'Connect'}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

export function IntegrationsSection() {
  const ws = useWorkspace()
  return (
    <div>
      <p className="mb-5 rounded-[12px] border border-dashed border-line-strong bg-panel-muted px-4 py-3 text-[13px] text-ink-2">
        Connections in this prototype are simulated. In the managed service, the KREW team connects each account with you during onboarding.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ws.integrations.map((i) => (
          <IntegrationCard key={i.id} integration={i} />
        ))}
      </div>
    </div>
  )
}

const ROLES: { value: TeamRole; label: string; description: string }[] = [
  { value: 'Admin', label: 'Admin', description: 'Manages agents, settings and the team.' },
  { value: 'Approver', label: 'Approver', description: 'Reviews and approves agent actions.' },
  { value: 'Viewer', label: 'Viewer', description: 'Reads the feed, reports and dashboards.' },
]

export function TeamSection() {
  const ws = useWorkspace()
  const invite = useKrew((s) => s.inviteMember)
  const updateRole = useKrew((s) => s.updateMemberRole)
  const remove = useKrew((s) => s.removeMember)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'Approver' as TeamRole })
  const [error, setError] = useState<string>()

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-[13.5px] text-ink-2">
          {ws.team.length} people can see {ws.brand.name}. Roles are a preview; access control is not enforced in the prototype.
        </p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" strokeWidth={1.75} /> Invite
        </Button>
      </div>
      <ul className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-panel shadow-[var(--shadow-resting)]">
        {ws.team.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-4 border-b border-line-subtle px-5 py-4 last:border-0">
            <Avatar name={m.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[14px] text-ink">
                {m.name}
                {m.invited && <span className="rounded-full border border-dashed border-line-strong px-2 text-[11px] text-ink-3">Invite pending</span>}
              </p>
              <p className="truncate text-[12.5px] text-ink-3">
                {m.email}
                {m.telegram && ` · ${m.telegram} on Telegram`}
              </p>
            </div>
            <span className="hidden text-[12px] text-ink-3 md:inline">Active {relativeTime(m.lastActive)}</span>
            {m.role === 'Owner' ? (
              <span className="w-44 text-[13px] text-ink-2">Owner</span>
            ) : (
              <div className="w-44 [&_label]:sr-only">
                <Select
                  label={`Role for ${m.name}`}
                  value={m.role}
                  onValueChange={(v) => {
                    updateRole(m.id, v as TeamRole)
                    toast('Role updated', `${m.name} is now ${v === 'Admin' ? 'an' : 'a'} ${v}.`)
                  }}
                  options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
                />
              </div>
            )}
            {m.role !== 'Owner' && (
              <ConfirmMorph
                label="Remove"
                prompt={`Remove ${m.name.split(' ')[0]}?`}
                confirmLabel="Remove"
                pendingLabel="Removing"
                doneLabel="Removed"
                onConfirm={async () => {
                  await new Promise((r) => setTimeout(r, 400))
                  remove(m.id)
                }}
              />
            )}
          </li>
        ))}
      </ul>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Invite a teammate" description="They’ll get an email and can link Telegram to approve on the go.">
          <div className="flex flex-col gap-4">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Work email" type="email" value={form.email} error={error} onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(undefined) }} />
            <RadioCards aria-label="Role" layout="list" value={form.role} onValueChange={(v) => setForm({ ...form, role: v as TeamRole })} options={ROLES} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!form.email.includes('@')) return setError('Enter a valid email')
                  invite({ name: form.name.trim() || form.email.split('@')[0], email: form.email.trim(), role: form.role })
                  setOpen(false)
                  setForm({ name: '', email: '', role: 'Approver' })
                  toast('Invite sent (simulated)', form.email)
                }}
              >
                Send invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function PlanSection() {
  const ws = useWorkspace()
  const reset = useKrew((s) => s.resetDemo)
  const theme = useKrew((s) => s.theme)
  const setTheme = useKrew((s) => s.setTheme)
  const active = ws.hires.filter((h) => h.status === 'active').length
  const other = ws.hires.length - active

  return (
    <div>
      <SettingsSection title="Your plan" description="KREW is a managed service. Our team configures and maintains your AI workforce.">
        <div className="flex flex-col gap-5">
          <div className="w-full max-w-[380px]">
            <DitherCreditCard
              ariaLabel="KREW Managed plan card"
              colors={{ background: '#171717', accent: '#595959', details: '#8c8c8c', foreground: '#f5f5f5' }}
              content={{ brandName: 'KREW Managed', cardNumber: ws.brand.name.toUpperCase(), cardholder: ws.owner.email }}
              dither={{ speed: 0.25 }}
              mark={<KrewMark size={34} className="text-[#f5f5f5]" />}
              network={null}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3 text-[13px] xl:grid-cols-4">
              {[
                { k: 'Plan', v: 'Managed · Growth' },
                { k: 'Renews', v: 'November 14' },
                { k: 'Account manager', v: 'Mariam, KREW' },
                { k: 'Billing', v: 'Simulated in prototype' },
              ].map((r) => (
                <div key={r.k} className="rounded-[12px] border border-line-subtle p-3">
                  <dt className="text-ink-3">{r.k}</dt>
                  <dd className="mt-0.5 text-ink">{r.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <UsageMeter
          label="Agent seats"
          limit={10}
          decimals={0}
          segments={[
            { id: 'active', label: 'Active', value: active },
            { id: 'other', label: 'Paused or in setup', value: other },
          ]}
        />
      </SettingsSection>
      <SettingsSection title="Appearance" description="Ivory is the default. Dark follows the same system.">
        <SegmentedControl
          label="Theme"
          value={theme}
          onValueChange={(v) => setTheme(v as ThemePref)}
          options={[
            { value: 'light', label: 'Ivory' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
      </SettingsSection>
      <SettingsSection title="Prototype data" description="Everything you change is saved in this browser only.">
        <div className="flex flex-col items-start gap-3 rounded-[12px] border border-line p-4">
          <p className="text-[13.5px] text-ink-2">Reset both brand workspaces to the original demo: agents, approvals, messages, Brand DNA and settings.</p>
          <ConfirmMorph
            label={
              <span className="inline-flex items-center gap-2">
                <RotateCcw className="size-4" strokeWidth={1.6} /> Reset demo data
              </span>
            }
            prompt="Reset everything?"
            confirmLabel="Reset"
            pendingLabel="Resetting"
            doneLabel="Demo restored"
            confirmMode="hold"
            onConfirm={async () => {
              await new Promise((r) => setTimeout(r, 600))
              reset()
            }}
          />
        </div>
      </SettingsSection>
    </div>
  )
}
