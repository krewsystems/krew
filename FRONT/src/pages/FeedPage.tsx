import { Bookmark, Layers, Newspaper } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/arc/button/button'
import { ChipGroup } from '@/components/arc/chip-group/chip-group'
import { Drawer, DrawerContent } from '@/components/arc/drawer/drawer'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { Skeleton } from '@/components/arc/skeleton/skeleton'
import { Timeline } from '@/components/arc/timeline/timeline'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { AgentStatus } from '@/components/agent/AgentStatus'
import { useAgentResolver } from '@/components/agent/use-agent'
import { Page, PageHeader, Panel } from '@/components/common/Panel'
import { FeedPost } from '@/components/feed/FeedPost'
import { POST_TYPES } from '@/components/feed/post-meta'
import { AppleMailTabs, type AppleMailTab } from '@/components/ui/apple-mail-tabs'
import type { FeedPost as Post, PostType } from '@/data/types'
import { dayGroup, relativeTime } from '@/lib/format'
import { useWorkspace } from '@/store/krew'

type FeedFilter = 'all' | PostType

const FILTER_ORDER: PostType[] = ['insight', 'alert', 'recommendation', 'approval', 'collaboration', 'report', 'task']
const PAGE = 8

function matches(post: Post, filter: FeedFilter) {
  if (filter === 'all') return true
  if (filter === 'approval') return post.type === 'approval' || post.embed?.kind === 'approval'
  return post.type === filter
}

export function FeedPage() {
  const ws = useWorkspace()
  const resolve = useAgentResolver()
  const navigate = useNavigate()
  const { hash } = useLocation()
  const [filter, setFilter] = useState<FeedFilter>('all')
  const [params] = useSearchParams()
  const view = params.get('view') ?? 'all'
  const [agents, setAgents] = useState<string[]>([])
  const [limit, setLimit] = useState(PAGE)
  const [loadingMore, setLoadingMore] = useState(false)
  const [openPost, setOpenPost] = useState<Post | null>(null)

  const tabs: AppleMailTab<FeedFilter>[] = useMemo(
    () => [
      { value: 'all', label: 'Everything', icon: Layers },
      ...FILTER_ORDER.map((t) => ({ value: t as FeedFilter, label: POST_TYPES[t].plural, icon: POST_TYPES[t].icon })),
    ],
    [ws.posts],
  )

  const authors = useMemo(() => [...new Set(ws.posts.map((p) => p.agentId))], [ws.posts])
  const filtered = ws.posts
    .filter((p) => (view !== 'saved' || p.saved) && (view !== 'needs' || (p.embed?.kind === 'approval' && ws.approvals.some((a) => a.id === (p.embed as { approvalId: string }).approvalId && a.status === 'pending'))) && matches(p, filter) && (agents.length === 0 || agents.includes(p.agentId) || p.with?.some((w) => agents.includes(w))))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const visible = filtered.slice(0, limit)
  const groups = visible.reduce<{ label: string; posts: Post[] }[]>((acc, p) => {
    const label = dayGroup(p.createdAt)
    const last = acc[acc.length - 1]
    if (last?.label === label) last.posts.push(p)
    else acc.push({ label, posts: [p] })
    return acc
  }, [])

  useEffect(() => setLimit(PAGE), [filter, agents, view])

  useEffect(() => {
    if (!hash) return
    const id = hash.slice(1)
    const index = filtered.findIndex((p) => p.id === id)
    if (index >= limit) setLimit(index + 2)
    const t = setTimeout(() => {
      const el = document.getElementById(id)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.animate([{ boxShadow: '0 0 0 3px color-mix(in oklab, var(--foreground) 18%, transparent)' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 1800, easing: 'ease-out' })
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash])

  const related = openPost?.scenario ? ws.posts.filter((p) => p.scenario === openPost.scenario) : []
  const pending = ws.approvals.filter((a) => a.status === 'pending')

  return (
    <Page wide>
      <PageHeader
        title="Agent Feed"
        description="What your AI team discovered, decided and finished. Only the updates worth your attention."
        actions={
          <Button variant="secondary" onClick={() => navigate('/messages/team')}>
            Open team room
          </Button>
        }
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="mx-auto w-full min-w-0 max-w-[720px]">
          <div className="sticky top-[68px] z-20 -mx-4 mb-5 bg-[color-mix(in_oklab,var(--background)_92%,transparent)] px-4 pb-3 pt-2 backdrop-blur-md sm:mx-0 sm:px-0">
            <AppleMailTabs
              size="compact"
              aria-label="Filter updates by type"
              tabs={tabs}
              value={filter}
              onValueChange={setFilter}
              tabClassName="border border-line bg-panel text-ink-2 hover:bg-sunken hover:text-ink active:bg-sunken focus-visible:ring-ink/30 focus-visible:ring-offset-canvas"
              activeTabClassName="border-ink bg-inverse text-ink-inverse hover:bg-inverse hover:text-ink-inverse"
            />
            <div className="mt-3">
              <ChipGroup
                label="Filter by agent"
                value={agents}
                onValueChange={setAgents}
                maxVisible={6}
                options={authors.map((id) => ({ value: id, label: resolve(id).displayName }))}
              />
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="rounded-[var(--radius-surface)] border border-line bg-panel py-10">
              <EmptyState
                icon={view === 'saved' ? <Bookmark size={24} /> : <Newspaper size={24} />}
                title={view === 'saved' ? 'Nothing saved yet' : 'No updates match these filters'}
                description={view === 'saved' ? 'Save posts you want to come back to. They will collect here.' : 'Try another type or clear the agent filter.'}
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setFilter('all')
                      setAgents([])
                    }}
                  >
                    Show everything
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {groups.map((g) => (
                <section key={g.label} aria-label={g.label}>
                  <div className="mb-3 flex items-center gap-3">
                    <h2 className="text-[13px] font-medium text-ink">{g.label}</h2>
                    <span className="h-px flex-1 bg-line" />
                    <span className="tabular text-[12px] text-ink-3">{g.posts.length} {g.posts.length === 1 ? 'update' : 'updates'}</span>
                  </div>
                  <div className="flex flex-col gap-4">
                    <AnimatePresence initial={false}>
                      {g.posts.map((p) => (
                        <motion.div key={p.id} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
                          <FeedPost post={p} onOpen={setOpenPost} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              ))}
              {loadingMore && (
                <div className="rounded-[var(--radius-surface)] border border-line bg-panel p-5">
                  <Skeleton avatar lines={3} label="Loading earlier updates" />
                </div>
              )}
              {filtered.length > limit ? (
                <Button
                  variant="secondary"
                  className="self-center"
                  loading={loadingMore}
                  onClick={() => {
                    setLoadingMore(true)
                    setTimeout(() => {
                      setLimit((l) => l + PAGE)
                      setLoadingMore(false)
                    }, 650)
                  }}
                >
                  Show earlier updates
                </Button>
              ) : (
                <p className="py-4 text-center text-[13px] text-ink-3">You’re up to date. Older activity lives in each agent’s history.</p>
              )}
            </div>
          )}
        </div>

        <aside className="hidden flex-col gap-4 xl:flex">
          <div className="sticky top-24 flex flex-col gap-4">
            <Panel title="Team pulse" href="/krew" bodyClassName="px-3 pb-3">
              <ul className="flex flex-col">
                {ws.hires.map((h) => {
                  const a = resolve(h.agentId)
                  return (
                    <li key={h.agentId}>
                      <Link to={`/krew/${h.agentId}`} className="flex items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-sunken">
                        <AgentAvatar agentId={h.agentId} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-ink">{a.displayName}</p>
                          <p className="truncate text-[11.5px] text-ink-3">Active {relativeTime(h.lastActiveAt)}</p>
                        </div>
                        <AgentStatus status={h.status} pulse={false} className="text-[11.5px]" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Panel>
            <Panel title="Waiting for you" href="/approvals" bodyClassName="px-3 pb-3">
              {pending.length === 0 ? (
                <p className="px-2 pb-2 text-[13px] text-ink-3">No decisions waiting.</p>
              ) : (
                <ul className="flex flex-col">
                  {pending.map((a) => (
                    <li key={a.id}>
                      <Link to={`/approvals/${a.id}`} className="flex items-start gap-2.5 rounded-[10px] px-2 py-2 hover:bg-sunken">
                        <AgentAvatar agentId={a.agentId} size="xs" className="mt-0.5" />
                        <span className="line-clamp-2 text-[13px] leading-snug text-ink">{a.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </aside>
      </div>

      <Drawer open={!!openPost} onOpenChange={(o) => !o && setOpenPost(null)}>
        {openPost && (
          <DrawerContent title={openPost.title} description={`${resolve(openPost.agentId).displayName} · ${POST_TYPES[openPost.type].label} · ${relativeTime(openPost.createdAt)}`}>
            <div className="flex flex-col gap-6">
              <p className="text-[14px] leading-relaxed text-ink-2">{openPost.body}</p>
              {openPost.details && (
                <div>
                  <h3 className="mb-2 text-[13px] font-medium text-ink">Evidence</h3>
                  <ul className="flex flex-col gap-1.5">
                    {openPost.details.map((d) => (
                      <li key={d} className="flex gap-2 text-[13.5px] text-ink-2">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-ink" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {openPost.source && (
                <div className="rounded-[12px] border border-line bg-panel-muted p-3.5 text-[13px] text-ink-2">
                  <span className="text-ink-3">Source · </span>
                  {openPost.source}
                  <span className="mt-1 block text-[12px] text-ink-3">Simulated data for this prototype</span>
                </div>
              )}
              {related.length > 1 && (
                <div>
                  <h3 className="mb-3 text-[13px] font-medium text-ink">How the team handled it</h3>
                  <Timeline
                    label="Related activity"
                    now={Date.now()}
                    timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
                    events={related.map((p) => ({ id: p.id, at: p.createdAt, actor: resolve(p.agentId).displayName, title: p.title.charAt(0).toLowerCase() + p.title.slice(1), meta: POST_TYPES[p.type].label }))}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => navigate(`/messages/${openPost.agentId}?post=${openPost.id}`)}>Ask {resolve(openPost.agentId).displayName.replace(' Agent', '')}</Button>
                <Button variant="secondary" onClick={() => navigate(`/krew/${openPost.agentId}`)}>
                  Open workspace
                </Button>
              </div>
            </div>
          </DrawerContent>
        )}
      </Drawer>
    </Page>
  )
}
