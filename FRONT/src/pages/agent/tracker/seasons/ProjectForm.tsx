import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/arc/button/button'
import { Input } from '@/components/arc/input/input'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { fieldClass, MoneyInput } from '@/components/tracker/costing/parts'
import { useSheetGuard } from '@/components/tracker/costing/sheet-guard'
import { PROJECT_STATUS, PROJECT_TYPE } from '@/components/tracker/projects/labels'
import { sectionPath } from '@/components/tracker/sections'
import { useProjectActions } from '@/components/tracker/use-tracker'
import { uid } from '@/data/seed-utils'
import type { Project, ProjectStatus, ProjectType, TrackerDataset } from '@/data/tracker/types'
import { money } from '@/lib/format'
import { validateProject } from '@/lib/projects'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toasts'

const today = () => new Date().toLocaleDateString('en-CA')
/** Empty optional amounts are undefined; NaN from an emptied field also means "not set". */
const optional = (n: number | undefined) => (n === undefined || Number.isNaN(n) ? undefined : n)

/** Create a project, or edit one. Short by default; targets and budget are optional and tucked away. */
export function ProjectForm({ data, project }: { data: TrackerDataset; project?: Project }) {
  const navigate = useNavigate()
  const actions = useProjectActions()
  const sheet = useSheetGuard()
  const editing = !!project
  const [draft, setDraft] = useState<Project>(() => project ?? { id: uid('prj'), name: '', type: 'season', status: 'planning', startsAt: today(), createdAt: new Date().toISOString() })
  const [more, setMore] = useState(editing && !!(project?.description || project?.endsAt || project?.budget || project?.revenueTarget))
  const [tried, setTried] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    sheet.setDirty(dirty)
    return () => sheet.setDirty(false)
  }, [dirty, sheet])

  const clean = { ...draft, name: draft.name.trim(), budget: optional(draft.budget), revenueTarget: optional(draft.revenueTarget), endsAt: draft.endsAt || undefined, description: draft.description?.trim() || undefined }
  const errors = validateProject(clean, data.projects.filter((p) => p.id !== draft.id).map((p) => p.name))
  const show = (k: keyof typeof errors) => (tried ? errors[k] : undefined)
  const update = (patch: Partial<Project>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setDirty(true)
  }

  const submit = () => {
    setTried(true)
    if (Object.keys(errors).length) {
      if (errors.budget || errors.revenueTarget || errors.endsAt) setMore(true)
      return
    }
    const events: { kind: 'created' | 'updated' | 'status_changed' | 'budget_updated'; text: string }[] = []
    if (!project) events.push({ kind: 'created', text: `Created ${clean.name}` })
    else {
      if (project.status !== clean.status) events.push({ kind: 'status_changed', text: `Status changed from ${PROJECT_STATUS[project.status].label} to ${PROJECT_STATUS[clean.status].label}` })
      if (project.budget !== clean.budget) events.push({ kind: 'budget_updated', text: clean.budget ? `Budget set to ${money(clean.budget)}` : 'Budget removed' })
      if (project.name !== clean.name || project.startsAt !== clean.startsAt || project.endsAt !== clean.endsAt || project.revenueTarget !== clean.revenueTarget || project.type !== clean.type || project.description !== clean.description)
        events.push({ kind: 'updated', text: 'Details updated' })
    }
    actions.save(clean, events)
    setDirty(false)
    toast(editing ? 'Project updated' : 'Project created', clean.name)
    navigate(`${sectionPath('seasons')}/${clean.id}`, { replace: true })
  }

  return (
    <form
      className="mx-auto flex max-w-[720px] flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      noValidate
    >
      <div>
        <h2 className="text-[22px] font-medium tracking-[-0.02em] text-ink">{editing ? 'Edit project' : 'New season or project'}</h2>
        <p className="mt-1 text-[13.5px] text-ink-3">{editing ? 'Changes are recorded in the project’s history.' : 'A name and a start date are enough. You can attach batches and expenses next.'}</p>
      </div>

      <section className="flex flex-col gap-5 rounded-[var(--radius-surface)] border border-line bg-panel p-5 shadow-[var(--shadow-resting)] sm:p-6">
        <Input label="Name" value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="For example: Winter 27" autoFocus error={show('name')} />

        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-ink-2">Type</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Project type">
            {(Object.keys(PROJECT_TYPE) as ProjectType[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={draft.type === t}
                onClick={() => update({ type: t })}
                className={cn('h-9 rounded-full border px-3.5 text-[13px] transition-colors', draft.type === t ? 'border-ink bg-inverse text-ink-inverse' : 'border-line bg-panel text-ink-2 hover:border-line-strong hover:text-ink')}
              >
                {PROJECT_TYPE[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Start date" type="date" value={draft.startsAt} onChange={(e) => update({ startsAt: e.target.value })} error={show('startsAt')} />
          <div className="flex flex-col gap-2">
            <span className="text-[13px] text-ink-2">Status</span>
            <SegmentedControl label="Status" value={draft.status} onValueChange={(v) => update({ status: v as ProjectStatus })} options={(['planning', 'active', 'completed'] as ProjectStatus[]).concat(editing ? ['archived'] : []).map((s) => ({ value: s, label: PROJECT_STATUS[s].label }))} />
          </div>
        </div>

        <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="inline-flex items-center gap-1 self-start text-[13px] text-ink-2 hover:text-ink">
          <ChevronDown className={cn('size-4 transition-transform', more && 'rotate-180')} strokeWidth={1.7} /> Description, end date, target and budget
          <span className="text-ink-3">· optional</span>
        </button>

        {more && (
          <div className="flex flex-col gap-5 border-t border-line-subtle pt-5">
            <label className="flex flex-col gap-2">
              <span className="text-[13px] text-ink-2">Description</span>
              <textarea value={draft.description ?? ''} onChange={(e) => update({ description: e.target.value })} rows={2} placeholder="What this project covers" className={cn(fieldClass, 'h-auto py-2.5')} />
            </label>
            <Input label="End date" type="date" value={draft.endsAt ?? ''} min={draft.startsAt} onChange={(e) => update({ endsAt: e.target.value || undefined })} error={show('endsAt')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-[13px] text-ink-2">Revenue target</span>
                <MoneyInput aria-label="Revenue target" value={draft.revenueTarget ?? Number.NaN} onValue={(n) => update({ revenueTarget: Number.isNaN(n) ? undefined : n })} placeholder="Optional" aria-invalid={!!show('revenueTarget')} />
                {show('revenueTarget') && <span className="text-[12.5px] text-warn">{show('revenueTarget')}</span>}
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[13px] text-ink-2">Budget</span>
                <MoneyInput aria-label="Budget" value={draft.budget ?? Number.NaN} onValue={(n) => update({ budget: Number.isNaN(n) ? undefined : n })} placeholder="Optional" aria-invalid={!!show('budget')} />
                {show('budget') && <span className="text-[12.5px] text-warn">{show('budget')}</span>}
              </label>
            </div>
            <p className="-mt-2 text-[12.5px] text-ink-3">Amounts are in {data.currency}, your brand’s currency. The budget covers production and project expenses together.</p>
          </div>
        )}
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => sheet.guard(() => navigate(project ? `${sectionPath('seasons')}/${project.id}` : sectionPath('seasons')))}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          {editing ? 'Save changes' : 'Create project'}
        </Button>
      </div>
    </form>
  )
}
