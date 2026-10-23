import { Check, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/arc/button/button'
import { Dialog, DialogContent } from '@/components/arc/dialog/dialog'
import { Stepper } from '@/components/arc/stepper/stepper'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import type { AgentDefinition } from '@/data/types'
import { cn } from '@/lib/utils'
import { useKrew, useWorkspace } from '@/store/krew'
import { toast } from '@/store/toasts'

/** Three-step hiring flow: role, access, confirm. Instant agents go live; others start setup. */
export function HireDialog({ agent, open, onOpenChange }: { agent: AgentDefinition; open: boolean; onOpenChange: (o: boolean) => void }) {
  const ws = useWorkspace()
  const hire = useKrew((s) => s.hireAgent)
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const instant = agent.availability === 'instant'
  const missing = agent.integrations.filter((name) => {
    const match = ws.integrations.find((i) => i.name.toLowerCase().startsWith(name.toLowerCase().split(' ')[0]))
    return match ? match.status !== 'connected' : !['Telegram'].includes(name)
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setTimeout(() => setStep(0), 200)
      }}
    >
      <DialogContent title={step === 3 ? (instant ? `${agent.name} joined your team` : `${agent.name} is being set up`) : `Hire ${agent.name}`} description={step === 3 ? undefined : `${agent.role} for ${ws.brand.name}`}>
        <div className="flex flex-col gap-5">
          <Stepper
            current={step}
            compact
            steps={[
              { id: 'scope', label: 'Role' },
              { id: 'access', label: 'Access' },
              { id: 'confirm', label: 'Confirm' },
            ]}
            completeLabel="Hired"
          />
          {step === 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-[13.5px] text-ink-2">{agent.description}</p>
              <ul className="flex flex-col gap-2 rounded-[12px] border border-line p-4">
                {agent.capabilities.map((c) => (
                  <li key={c.title} className="flex gap-2.5 text-[13.5px]">
                    <Check className="mt-0.5 size-4 shrink-0 text-ink" strokeWidth={1.75} />
                    <span>
                      <span className="text-ink">{c.title}.</span> <span className="text-ink-3">{c.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {step === 1 && (
            <div className="flex flex-col gap-3">
              <p className="text-[13.5px] text-ink-2">{agent.name} needs read access to these sources. Our team handles the connection with you.</p>
              <ul className="flex flex-col divide-y divide-line-subtle rounded-[12px] border border-line">
                {agent.integrations.map((name) => {
                  const ok = !missing.includes(name)
                  return (
                    <li key={name} className="flex items-center justify-between px-4 py-3 text-[13.5px]">
                      <span className="text-ink">{name}</span>
                      <span className={cn('text-[12.5px]', ok ? 'text-good' : 'text-ink-3')}>{ok ? 'Connected' : 'Our team will connect it'}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="flex items-start gap-2 text-[12.5px] text-ink-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" strokeWidth={1.6} />
                Agents never act on customers, money or your live store without approval.
              </p>
            </div>
          )}
          {step === 2 && (
            <div className="flex flex-col gap-3">
              <dl className="grid grid-cols-2 gap-3">
                {[
                  { k: 'Starts', v: instant ? 'Today' : `In ${agent.setupTime}` },
                  { k: 'Reports', v: agent.defaultSchedule },
                  { k: 'Approvals', v: 'High-impact actions' },
                  { k: 'Included in', v: 'Your managed plan' },
                ].map((r) => (
                  <div key={r.k} className="rounded-[12px] border border-line-subtle p-3">
                    <dt className="text-[12px] text-ink-3">{r.k}</dt>
                    <dd className="mt-0.5 text-[13.5px] text-ink">{r.v}</dd>
                  </div>
                ))}
              </dl>
              {!instant && <p className="text-[13px] text-ink-2">This agent needs a short setup by the KREW team. It appears in My Krew straight away with its setup progress.</p>}
            </div>
          )}
          {step === 3 && (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <AgentAvatar agentId={agent.id} size="xl" ring />
              <p className="max-w-sm text-[14px] text-ink-2">
                {instant ? `${agent.name} has read your Brand DNA and posted a hello in your feed.` : `We’ll message you on Telegram when ${agent.name} is ready. Expected ${agent.setupTime}.`}
              </p>
            </div>
          )}
          <div className="flex justify-between gap-2">
            {step > 0 && step < 3 ? (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < 2 && <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>}
            {step === 2 && (
              <Button
                loading={busy}
                onClick={() => {
                  setBusy(true)
                  setTimeout(() => {
                    hire(agent.id)
                    setBusy(false)
                    setStep(3)
                    toast(instant ? `${agent.name} hired` : `${agent.name} setup started`, 'Find them in My Krew.')
                  }, 900)
                }}
              >
                {instant ? `Hire ${agent.name}` : 'Start setup'}
              </Button>
            )}
            {step === 3 && (
              <div className="flex w-full justify-center gap-2">
                <Button variant="secondary" onClick={() => { onOpenChange(false); navigate('/krew') }}>
                  Go to My Krew
                </Button>
                <Button onClick={() => { onOpenChange(false); navigate(`/krew/${agent.id}`) }}>Open workspace</Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
