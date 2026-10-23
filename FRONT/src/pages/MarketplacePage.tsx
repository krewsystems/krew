import { Check, Clock, Search, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/arc/badge/badge'
import { Button } from '@/components/arc/button/button'
import { ChipGroup } from '@/components/arc/chip-group/chip-group'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { SearchField } from '@/components/arc/search-field/search-field'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { AgentProfile } from '@/components/marketplace/AgentProfile'
import { HireDialog } from '@/components/marketplace/HireDialog'
import { Page, PageHeader } from '@/components/common/Panel'
import { WheelCarousel } from '@/components/ui/3d-wheel-carousel'
import { AGENTS, CATEGORY_LABELS, getAgent } from '@/data/agents'
import { agentPortrait } from '@/data/photos'
import type { AgentDefinition } from '@/data/types'
import { useWorkspace } from '@/store/krew'

function Availability({ agent }: { agent: AgentDefinition }) {
  return agent.availability === 'instant' ? (
    <Badge size="sm" tone="success">
      Ready today
    </Badge>
  ) : (
    <Badge size="sm" tone="warning" icon={<Clock size={11} />}>
      {`Setup ${agent.setupTime}`}
    </Badge>
  )
}

function FeaturedCard({ agent, hired, onOpen }: { agent: AgentDefinition; hired: boolean; onOpen: () => void }) {
  const photo = agentPortrait(agent.id)
  return (
    <div className="always-dark relative flex h-full flex-col bg-inverse text-ink-inverse">
      <div className="relative h-[58%] overflow-hidden">
        {photo ? <img src={photo} alt="" draggable={false} className="size-full object-cover object-top" /> : <div className="flex size-full items-center justify-center"><AgentAvatar agentId={agent.id} size="xl" /></div>}
        <span className="absolute left-3 top-3 rounded-full bg-[oklch(17%_0_0/0.72)] px-2 py-0.5 text-[11px] text-ink-inverse backdrop-blur">
          {hired ? 'On your team' : agent.availability === 'instant' ? 'Ready today' : `Setup ${agent.setupTime}`}
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <p className="text-[11.5px] text-ink-inverse-2">{agent.role}</p>
          <p className="mt-0.5 text-[20px] font-medium tracking-[-0.02em]">{agent.name}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-ink-inverse-2">{agent.brandsUsing} brands</p>
          <button type="button" onClick={onOpen} onPointerDownCapture={(e) => e.stopPropagation()} className="rounded-full bg-[color-mix(in_oklab,var(--text-inverse)_14%,transparent)] px-3 py-1 text-[12px] text-ink-inverse transition-colors hover:bg-[color-mix(in_oklab,var(--text-inverse)_24%,transparent)]">
            View profile
          </button>
        </div>
      </div>
    </div>
  )
}

export function MarketplacePage() {
  const ws = useWorkspace()
  const navigate = useNavigate()
  const { agentId } = useParams()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string[]>([])
  const [params] = useSearchParams()
  const availability = params.get('show') ?? 'all'
  const [hiring, setHiring] = useState<AgentDefinition | null>(null)
  const hired = (id: string) => ws.hires.some((h) => h.agentId === id)

  const catalog = AGENTS.filter((a) => a.id !== 'manager')
  const featured = catalog
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter(
      (a) =>
        (!q || [a.name, a.role, a.tagline, a.description, ...a.capabilities.map((c) => c.title)].join(' ').toLowerCase().includes(q)) &&
        (category.length === 0 || category.includes(a.category)) &&
        (availability === 'all' || a.availability === availability),
    )
  }, [catalog, query, category, availability]).sort((a, b) => Number(hired(a.id)) - Number(hired(b.id)))

  const profile = agentId ? getAgent(agentId) : null
  const categories = [...new Set(catalog.map((a) => a.category))]

  return (
    <Page wide>
      <PageHeader
        title="Hire your agent"
        description="Specialised digital team members for e-commerce. Pick a role, and the KREW team sets the agent up for your brand."
        actions={
          <span className="inline-flex items-center gap-2 text-[13px] text-ink-3">
            <UsersRound className="size-4" strokeWidth={1.6} /> {ws.hires.length} on your team
          </span>
        }
      />

      <section className="relative mb-10 overflow-hidden rounded-[var(--radius-surface)] border border-line bg-panel-muted" aria-label="Featured agents">
        <div className="flex items-end justify-between gap-4 px-6 pt-5">
          <div>
            <p className="text-[12.5px] text-ink-3">Featured roles</p>
            <p className="mt-0.5 text-[17px] font-medium tracking-[-0.015em] text-ink">Meet the team you could have</p>
          </div>
          <p className="hidden text-[12.5px] text-ink-3 sm:block">Drag or use arrow keys</p>
        </div>
        <div className="flex h-[400px] items-center justify-center [--wheel-card-radius:18px]">
          <WheelCarousel
            aria-label="Featured agents"
            items={featured.map((a) => ({ id: a.id, label: `${a.name}, ${a.role}`, content: <FeaturedCard agent={a} hired={hired(a.id)} onOpen={() => navigate(`/marketplace/${a.id}`)} /> }))}
            cardWidth={230}
            cardHeight={300}
            radius={520}
            autoRotateSpeed={6}
            maxBlur={6}
            cardClassName="shadow-[var(--shadow-floating)] cursor-pointer"
          />
        </div>
      </section>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-sm [&_label]:sr-only">
          <SearchField label="Search agents" placeholder="Search roles, skills or tools" value={query} onValueChange={setQuery} />
        </div>
      </div>
      <div className="mb-6">
        <ChipGroup label="Categories" multiple={false} value={category} onValueChange={setCategory} options={categories.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))} />
      </div>

      {list.length === 0 ? (
        <div className="rounded-[var(--radius-surface)] border border-line bg-panel py-10">
          <EmptyState icon={<Search size={24} />} title="No agents match" description="Try a broader search. We add new roles every month." action={<Button variant="secondary" onClick={() => { setQuery(''); setCategory([]); navigate('/marketplace') }}>Clear filters</Button>} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((a) => {
            const onTeam = hired(a.id)
            return (
              <article key={a.id} className="group flex flex-col rounded-[var(--radius-surface)] border border-line bg-panel p-5 shadow-[var(--shadow-resting)] transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-[var(--shadow-raised)]">
                <div className="flex items-start gap-3">
                  <AgentAvatar agentId={a.id} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-medium tracking-[-0.015em] text-ink">{a.name}</p>
                    <p className="text-[13px] text-ink-3">{a.role}</p>
                  </div>
                  {onTeam ? (
                    <Badge size="sm" tone="neutral" icon={<Check size={11} />}>
                      On your team
                    </Badge>
                  ) : (
                    <Availability agent={a} />
                  )}
                </div>
                <p className="mt-4 text-[14px] leading-snug text-ink">{a.tagline}</p>
                <p className="mt-2 line-clamp-2 text-[13px] text-ink-2">{a.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {a.integrations.map((i) => (
                    <span key={i} className="rounded-full border border-line-subtle bg-panel-muted px-2 py-0.5 text-[11.5px] text-ink-2">
                      {i}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex items-center gap-2 pt-5">
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/marketplace/${a.id}`)}>
                    View profile
                  </Button>
                  {onTeam ? (
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/krew/${a.id}`)}>
                      Open workspace
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setHiring(a)}>
                      Hire
                    </Button>
                  )}
                  <span className="ml-auto text-[11.5px] text-ink-3">{a.brandsUsing} brands</span>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <AgentProfile
        agent={profile}
        open={!!profile}
        onOpenChange={(o) => !o && navigate('/marketplace')}
        onHire={(a) => {
          navigate('/marketplace')
          setHiring(a)
        }}
      />

      {hiring && <HireDialog key={hiring.id} agent={hiring} open={!!hiring} onOpenChange={(o) => !o && setHiring(null)} />}
    </Page>
  )
}
