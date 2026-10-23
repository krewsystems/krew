import { BookOpen, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/arc/button/button'
import { ChipGroup } from '@/components/arc/chip-group/chip-group'
import { ConfirmMorph } from '@/components/arc/confirm-morph/confirm-morph'
import { Dialog, DialogContent } from '@/components/arc/dialog/dialog'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { Input } from '@/components/arc/input/input'
import { SearchField } from '@/components/arc/search-field/search-field'
import { Select } from '@/components/arc/select/select'
import { TagInput } from '@/components/arc/tag-input/tag-input'
import { Textarea } from '@/components/arc/textarea/textarea'
import { AgentAvatar } from '@/components/agent/AgentAvatar'
import { useAgentResolver } from '@/components/agent/use-agent'
import type { BrandDNA, KnowledgeEntry } from '@/data/types'
import { relativeTime } from '@/lib/format'
import { useKrew, useWorkspace } from '@/store/krew'
import { toast } from '@/store/toasts'

export function SettingsSection({ title, description, children, aside }: { title: string; description?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-line-subtle py-7 first:pt-0 last:border-b-0 md:grid-cols-[230px_minmax(0,1fr)] md:gap-10">
      <div>
        <h3 className="text-[14px] font-medium text-ink">{title}</h3>
        {description && <p className="mt-1 text-[13px] leading-snug text-ink-3">{description}</p>}
        {aside}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  )
}

function UsedBy({ ids }: { ids: string[] }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
      Used by
      {ids.map((id) => (
        <AgentAvatar key={id} agentId={id} size="xs" />
      ))}
    </p>
  )
}

export function BrandSection() {
  const ws = useWorkspace()
  const updateBrand = useKrew((s) => s.updateBrand)
  const [draft, setDraft] = useState<BrandDNA>(ws.brand)
  const dirty = JSON.stringify(draft) !== JSON.stringify(ws.brand)
  const set = <K extends keyof BrandDNA>(key: K, value: BrandDNA[K]) => setDraft((d) => ({ ...d, [key]: value }))

  return (
    <div>
      <SettingsSection title="Brand basics" description="The name and summary every agent uses to introduce your business.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Brand name" value={draft.name} onChange={(e) => set('name', e.target.value)} />
          <Input label="Website" value={draft.website} onChange={(e) => set('website', e.target.value)} />
        </div>
        <Textarea label="Brand description" rows={3} value={draft.description} onChange={(e) => set('description', e.target.value)} />
      </SettingsSection>

      <SettingsSection title="Tone of voice" description="How your brand sounds in drafts, captions and customer messages." aside={<UsedBy ids={['luna', 'retention', 'store']} />}>
        <TagInput label="Voice keywords" value={draft.tone} onValueChange={(v) => set('tone', v)} description="Press Enter or comma to add." />
        <Textarea label="Voice notes" rows={3} value={draft.toneNotes} onChange={(e) => set('toneNotes', e.target.value)} />
      </SettingsSection>

      <SettingsSection title="Audience and positioning" description="Who you sell to and why they choose you." aside={<UsedBy ids={['ivy', 'ads']} />}>
        <Textarea label="Target audience" rows={3} value={draft.audience} onChange={(e) => set('audience', e.target.value)} />
        <Textarea label="Brand positioning" rows={2} value={draft.positioning} onChange={(e) => set('positioning', e.target.value)} />
      </SettingsSection>

      <SettingsSection title="Business goals" description="Agents rank recommendations against these." aside={<UsedBy ids={['manager', 'ivy', 'tracker']} />}>
        <TagInput label="Goals" value={draft.goals} onValueChange={(v) => set('goals', v)} description="One goal per tag." />
      </SettingsSection>

      <SettingsSection title="Customer service" description="Rules agents follow when classifying issues and drafting recovery messages." aside={<UsedBy ids={['luna', 'retention']} />}>
        <Textarea label="Service policy" rows={3} value={draft.servicePolicy} onChange={(e) => set('servicePolicy', e.target.value)} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea label="Shipping" rows={4} value={draft.shipping} onChange={(e) => set('shipping', e.target.value)} />
          <Textarea label="Returns and exchanges" rows={4} value={draft.returns} onChange={(e) => set('returns', e.target.value)} />
        </div>
      </SettingsSection>

      <SettingsSection title="Brand guidelines" description="Visual and copy rules for anything an agent drafts.">
        <Textarea label="Guidelines" rows={4} value={draft.guidelines} onChange={(e) => set('guidelines', e.target.value)} />
      </SettingsSection>

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-[14px] border border-line bg-panel/95 px-4 py-3 shadow-[var(--shadow-raised)] backdrop-blur">
        <p className="text-[13px] text-ink-3">{dirty ? 'Unsaved changes to your Brand DNA' : 'Agents read the latest version on every run'}</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={!dirty} onClick={() => setDraft(ws.brand)}>
            Discard
          </Button>
          <Button
            size="sm"
            disabled={!dirty}
            onClick={() => {
              updateBrand(draft)
              toast('Brand DNA saved', 'Your agents will use it from their next run.')
            }}
          >
            Save Brand DNA
          </Button>
        </div>
      </div>
    </div>
  )
}

const CATEGORIES: KnowledgeEntry['category'][] = ['Policy', 'Product', 'FAQ', 'Brand', 'Operations']

function KnowledgeDialog({ entry, open, onOpenChange }: { entry?: KnowledgeEntry; open: boolean; onOpenChange: (o: boolean) => void }) {
  const ws = useWorkspace()
  const resolve = useAgentResolver()
  const upsert = useKrew((s) => s.upsertKnowledge)
  const [title, setTitle] = useState(entry?.title ?? '')
  const [category, setCategory] = useState<KnowledgeEntry['category']>(entry?.category ?? 'FAQ')
  const [content, setContent] = useState(entry?.content ?? '')
  const [usedBy, setUsedBy] = useState<string[]>(entry?.usedBy ?? ['luna'])
  const [error, setError] = useState<string>()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={entry ? 'Edit entry' : 'Add knowledge'} description="Facts your agents should rely on, written the way you’d explain them to a new teammate.">
        <div className="flex flex-col gap-4">
          <Input label="Title" value={title} onChange={(e) => { setTitle(e.target.value); setError(undefined) }} error={error} placeholder="For example: Gift wrapping" />
          <Select label="Category" value={category} onValueChange={(v) => setCategory(v as KnowledgeEntry['category'])} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <Textarea label="Content" rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
          <div>
            <p className="mb-2 text-[13px] text-ink-2">Which agents use it</p>
            <ChipGroup label="Agents" value={usedBy} onValueChange={setUsedBy} options={ws.hires.map((h) => ({ value: h.agentId, label: resolve(h.agentId).displayName }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!title.trim()) return setError('Add a title')
                upsert({ id: entry?.id, title: title.trim(), category, content: content.trim(), usedBy })
                onOpenChange(false)
                toast(entry ? 'Entry updated' : 'Entry added', 'Agents will use it from their next run.')
              }}
            >
              {entry ? 'Save entry' : 'Add entry'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function KnowledgeSection() {
  const ws = useWorkspace()
  const remove = useKrew((s) => s.deleteKnowledge)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<{ key: number; entry?: KnowledgeEntry; open: boolean }>({ key: 0, open: false })
  const list = useMemo(() => {
    const q = query.toLowerCase()
    return ws.knowledge.filter((k) => !q || `${k.title} ${k.content} ${k.category}`.toLowerCase().includes(q))
  }, [ws.knowledge, query])

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-sm [&_label]:sr-only">
          <SearchField label="Search knowledge" placeholder="Search entries" value={query} onValueChange={setQuery} />
        </div>
        <Button onClick={() => setDialog((d) => ({ key: d.key + 1, entry: undefined, open: true }))}>
          <Plus className="size-4" strokeWidth={1.75} /> Add knowledge
        </Button>
      </div>
      {list.length === 0 ? (
        <div className="rounded-[var(--radius-surface)] border border-dashed border-line-strong py-10">
          <EmptyState icon={query ? <Search size={24} /> : <BookOpen size={24} />} title={query ? 'No entries match' : 'No knowledge yet'} description={query ? 'Try a different word.' : 'Add policies, product facts and FAQs your agents should know.'} />
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {list.map((k) => (
            <li key={k.id} className="flex flex-col rounded-[var(--radius-panel)] border border-line bg-panel p-4 shadow-[var(--shadow-resting)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink">{k.title}</p>
                  <p className="text-[12px] text-ink-3">
                    {k.category} · updated {relativeTime(k.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 -space-x-1.5">
                  {k.usedBy.map((id) => (
                    <AgentAvatar key={id} agentId={id} size="xs" ring />
                  ))}
                </div>
              </div>
              <p className="mt-2.5 line-clamp-3 text-[13.5px] leading-relaxed text-ink-2">{k.content}</p>
              <div className="mt-auto flex items-center gap-2 pt-4">
                <Button size="sm" variant="secondary" onClick={() => setDialog((d) => ({ key: d.key + 1, entry: k, open: true }))}>
                  Edit
                </Button>
                <ConfirmMorph
                  label="Delete"
                  prompt="Delete entry?"
                  onConfirm={async () => {
                    await new Promise((r) => setTimeout(r, 350))
                    remove(k.id)
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <KnowledgeDialog key={dialog.key} entry={dialog.entry} open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />
    </div>
  )
}
