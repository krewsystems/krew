import * as DialogPrimitive from '@radix-ui/react-dialog'
import { BadgeCheck, CalendarClock, Check, Clock, Languages, MessageCircle, Quote, Sparkles, Star, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { AgentPortrait } from '@/components/agent/AgentPortrait'
import { CATEGORY_LABELS, getAgent } from '@/data/agents'
import { getPersona } from '@/data/personas'
import type { AgentDefinition } from '@/data/types'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/krew'
import { WorkSampleArt } from './WorkSample'

function Block({ title, icon, children, className }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h3 className="mb-3 flex items-center gap-2 text-[12.5px] text-ink-3 [&_svg]:size-3.5">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  )
}

/** A marketplace agent presented like a candidate's resume: portrait, headline, skills, work samples, track record and references. */
export function AgentProfile({ agent, open, onOpenChange, onHire }: { agent: AgentDefinition | null; open: boolean; onOpenChange: (o: boolean) => void; onHire: (a: AgentDefinition) => void }) {
  const ws = useWorkspace()
  const navigate = useNavigate()

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && agent && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-[90] bg-[oklch(12%_0_0/0.42)] backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed inset-x-0 bottom-0 z-[91] mx-auto flex max-h-[94dvh] w-full max-w-[1000px] flex-col overflow-hidden rounded-t-[24px] border border-line bg-panel shadow-[var(--shadow-floating)] outline-none sm:inset-y-[3dvh] sm:bottom-auto sm:max-h-[94dvh] sm:w-[calc(100vw-32px)] sm:rounded-[24px]"
                initial={{ opacity: 0, y: 24, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              >
                <ProfileBody agent={agent} hired={ws.hires.some((h) => h.agentId === agent.id)} connected={ws.integrations.filter((i) => i.status === 'connected').map((i) => i.name.toLowerCase())} onHire={() => onHire(agent)} onOpenWorkspace={() => navigate(`/krew/${agent.id}`)} />
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

function ProfileBody({ agent, hired, connected, onHire, onOpenWorkspace }: { agent: AgentDefinition; hired: boolean; connected: string[]; onHire: () => void; onOpenWorkspace: () => void }) {
  const p = getPersona(agent.id)
  const instant = agent.availability === 'instant'
  const cover = {
    backgroundColor: `color-mix(in oklab, ${p.tint} 14%, var(--surface-muted))`,
    backgroundImage: `radial-gradient(color-mix(in oklab, ${p.tint} 70%, var(--foreground)) 0.9px, transparent 1.2px)`,
    backgroundSize: '9px 9px',
    maskImage: 'linear-gradient(to bottom, black 35%, transparent)',
  } as CSSProperties

  const cta = hired ? (
    <button type="button" onClick={onOpenWorkspace} className="inline-flex h-10 items-center gap-2 rounded-[11px] border border-line bg-panel px-4 text-[14px] text-ink transition-colors hover:border-line-strong">
      <Check className="size-4" strokeWidth={1.75} /> On your team · open workspace
    </button>
  ) : (
    <button type="button" onClick={onHire} className="inline-flex h-10 items-center gap-2 rounded-[11px] bg-inverse px-5 text-[14px] font-medium text-ink-inverse transition-opacity hover:opacity-90">
      {instant ? `Hire ${agent.name}` : `Request ${agent.name}`}
    </button>
  )

  return (
    <>
      <div className="thin-scroll flex-1 overflow-y-auto">
        {/* Cover + identity */}
        <div className="relative">
          <div className="h-36 w-full sm:h-44" style={cover} aria-hidden />
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <span className={cn('rounded-full border px-2.5 py-1 text-[12px] backdrop-blur', instant ? 'border-line bg-panel/80 text-ink' : 'border-line bg-panel/80 text-ink-2')}>
              <span className={cn('mr-1.5 inline-block size-1.5 rounded-full align-middle', instant ? 'bg-good' : 'bg-warn')} />
              {instant ? 'Available to start today' : `Starts after ${agent.setupTime} setup`}
            </span>
            <DialogPrimitive.Close className="inline-flex size-9 items-center justify-center rounded-full border border-line bg-panel/90 text-ink-2 backdrop-blur hover:text-ink" aria-label="Close profile">
              <X className="size-4" strokeWidth={1.75} />
            </DialogPrimitive.Close>
          </div>
        </div>

        <div className="px-6 sm:px-9">
          <div className="-mt-20 flex flex-col gap-5 sm:-mt-24 sm:flex-row sm:items-end">
            <div className="rounded-[32px] bg-panel p-1.5 shadow-[var(--shadow-raised)]">
              <AgentPortrait agentId={agent.id} size={156} shape="card" />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-[13px] text-ink-3">
                {agent.role} · {CATEGORY_LABELS[agent.category]}
              </p>
              <DialogPrimitive.Title className="mt-0.5 text-[32px] font-medium leading-tight tracking-[-0.03em] text-ink">{agent.name}</DialogPrimitive.Title>
              <p className="mt-1 max-w-[52ch] text-[15px] leading-snug text-ink-2">{agent.tagline}</p>
            </div>
            <div className="flex shrink-0 gap-2 pb-1">{cta}</div>
          </div>

          {/* Stats */}
          <dl className="mt-7 grid grid-cols-2 overflow-hidden rounded-[14px] border border-line sm:grid-cols-4">
            {[
              { k: 'Rating from brands', v: (
                <span className="inline-flex items-center gap-1.5">
                  {p.rating.toFixed(1)} <Star className="size-4 fill-current text-ink" strokeWidth={1.5} />
                </span>
              ) },
              { k: 'Brands employing', v: agent.brandsUsing.toLocaleString() },
              { k: 'Work completed', v: p.tasksDone },
              { k: 'Works', v: p.responseTime },
            ].map((s, i) => (
              <div key={s.k} className={cn('px-4 py-3.5', i % 2 === 1 && 'border-l border-line', i > 1 && 'border-t border-line sm:border-t-0', i === 2 && 'sm:border-l')}>
                <dt className="text-[12px] text-ink-3">{s.k}</dt>
                <dd className="tabular mt-1 text-[18px] tracking-[-0.01em] text-ink">{s.v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 grid gap-10 pb-10 lg:grid-cols-[minmax(0,1fr)_280px]">
            {/* Main column */}
            <div className="flex min-w-0 flex-col gap-9">
              <Block title="About me">
                <p className="text-[15px] leading-[1.7] text-ink">
                  Hi, I’m {agent.name}. {p.intro}
                </p>
                <blockquote className="mt-4 flex gap-3 border-l-2 pl-4 text-[15px] italic leading-snug text-ink-2" style={{ borderColor: p.tint }}>
                  “{p.quote}”
                </blockquote>
              </Block>

              <Block title="What I do" icon={<Sparkles />}>
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {agent.capabilities.map((c, i) => (
                    <li key={c.title} className="rounded-[14px] border border-line p-4">
                      <span className="tabular inline-flex size-6 items-center justify-center rounded-full text-[11.5px] text-ink" style={{ background: `color-mix(in oklab, ${p.tint} 22%, var(--surface))` }}>
                        {i + 1}
                      </span>
                      <p className="mt-2.5 text-[14px] font-medium text-ink">{c.title}</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-ink-3">{c.description}</p>
                    </li>
                  ))}
                </ul>
              </Block>

              <Block title="Work samples">
                <ul className="grid gap-3 sm:grid-cols-3">
                  {p.samples.map((s) => (
                    <li key={s.title} className="group">
                      <div className="aspect-[4/3] overflow-hidden rounded-[14px] border border-line bg-panel-muted p-3 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-raised)]">
                        <WorkSampleArt kind={s.kind} tint={p.tint} />
                      </div>
                      <p className="mt-2 text-[13.5px] text-ink">{s.title}</p>
                      <p className="text-[12.5px] text-ink-3">{s.caption}</p>
                    </li>
                  ))}
                </ul>
                {agent.sampleOutputs[0] && (
                  <div className="mt-4 flex gap-3 rounded-[14px] border border-line-subtle bg-panel-muted p-4">
                    <AgentAvatar agentId={agent.id} size="sm" />
                    <div className="min-w-0">
                      <p className="text-[12px] text-ink-3">A typical message from me · {agent.sampleOutputs[0].title}</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-ink">{agent.sampleOutputs[0].body}</p>
                    </div>
                  </div>
                )}
              </Block>

              <Block title="Track record" icon={<BadgeCheck />}>
                <ol className="relative flex flex-col gap-5 border-l border-line pl-5">
                  {p.experience.map((e) => (
                    <li key={e.title} className="relative">
                      <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-panel" style={{ background: p.tint }} />
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="text-[14.5px] text-ink">{e.title}</p>
                        <span className="tabular rounded-full bg-sunken px-2 py-0.5 text-[12px] text-ink">{e.result}</span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-ink-3">{e.detail}</p>
                    </li>
                  ))}
                </ol>
              </Block>

              <Block title="What brands say" icon={<Quote />}>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {p.reviews.map((r) => (
                    <li key={r.brand} className="flex flex-col rounded-[14px] border border-line p-4">
                      <div className="flex gap-0.5 text-ink" aria-label="5 out of 5">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className="size-3.5 fill-current" strokeWidth={1.5} />
                        ))}
                      </div>
                      <p className="mt-2.5 flex-1 text-[14px] leading-relaxed text-ink">“{r.quote}”</p>
                      <p className="mt-3 text-[12.5px] text-ink-3">
                        <span className="text-ink-2">{r.person}</span> · {r.role} · {r.brand}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11.5px] text-ink-3">Sample references for the prototype.</p>
              </Block>
            </div>

            {/* Side column */}
            <aside className="flex flex-col gap-7 lg:sticky lg:top-6 lg:self-start">
              <Block title="Personality">
                <div className="flex flex-wrap gap-1.5">
                  {p.traits.map((t) => (
                    <span key={t} className="rounded-full border px-3 py-1 text-[13px] text-ink" style={{ borderColor: `color-mix(in oklab, ${p.tint} 45%, var(--border))`, background: `color-mix(in oklab, ${p.tint} 9%, var(--surface))` }}>
                      {t}
                    </span>
                  ))}
                </div>
              </Block>

              <Block title="Tools I need">
                <ul className="flex flex-col divide-y divide-line-subtle rounded-[12px] border border-line">
                  {agent.integrations.map((name) => {
                    const ok = connected.some((c) => c.startsWith(name.toLowerCase().split(' ')[0]))
                    return (
                      <li key={name} className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-[13px]">
                        <span className="text-ink">{name}</span>
                        <span className={cn('text-[12px]', ok ? 'text-good' : 'text-ink-3')}>{ok ? 'Connected' : 'We connect it'}</span>
                      </li>
                    )
                  })}
                </ul>
              </Block>

              <Block title="Works best with">
                <ul className="flex flex-col gap-2">
                  {p.worksWith.slice(0, 4).map((id) => (
                    <li key={id}>
                      <Link to={`/marketplace/${id}`} className="flex items-center gap-2.5 rounded-[10px] text-[13px] text-ink hover:text-ink-2">
                        <AgentAvatar agentId={id} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate">{getAgentName(id)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Block>

              <Block title="Working details">
                <dl className="flex flex-col gap-2.5 text-[13px]">
                  <div className="flex items-start gap-2.5">
                    <CalendarClock className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.6} />
                    <div>
                      <dt className="text-ink-3">Schedule</dt>
                      <dd className="text-ink">{agent.defaultSchedule}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Languages className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.6} />
                    <div>
                      <dt className="text-ink-3">Languages</dt>
                      <dd className="text-ink">{p.languages.join(', ')}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.6} />
                    <div>
                      <dt className="text-ink-3">Start date</dt>
                      <dd className="text-ink">{instant ? 'Today, after you hire' : `After ${agent.setupTime} of setup by the KREW team`}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MessageCircle className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.6} />
                    <div>
                      <dt className="text-ink-3">Reach me</dt>
                      <dd className="text-ink">Here and on Telegram</dd>
                    </div>
                  </div>
                </dl>
              </Block>

              <div className="rounded-[16px] border border-line bg-panel-muted p-4">
                <p className="text-[13.5px] text-ink">Included in your Managed plan</p>
                <p className="mt-1 text-[12.5px] leading-snug text-ink-3">The KREW team sets {agent.name} up for your brand and checks the first week of work.</p>
                <button
                  type="button"
                  onClick={hired ? onOpenWorkspace : onHire}
                  className={cn('mt-3 inline-flex h-10 w-full items-center justify-center rounded-[11px] text-[14px] transition-opacity hover:opacity-90', hired ? 'border border-line bg-panel text-ink' : 'bg-inverse font-medium text-ink-inverse')}
                >
                  {hired ? 'Open workspace' : instant ? `Hire ${agent.name}` : `Request ${agent.name}`}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}

function getAgentName(id: string) {
  return getAgent(id).name
}
