import { Ban, Bot, CircleCheck, Inbox, Pencil, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/arc/badge/badge'
import { Button } from '@/components/arc/button/button'
import { Select } from '@/components/arc/select/select'
import { fieldClass } from '@/components/tracker/costing/parts'
import { CLASS_LABEL, EXPENSE_SOURCE, EXPENSE_STATUS, PAYMENT_METHOD, TREATMENT } from '@/components/tracker/expenses/labels'
import { ReceiptView } from '@/components/tracker/expenses/ReceiptView'
import { sectionPath } from '@/components/tracker/sections'
import { useExpenseActions } from '@/components/tracker/use-tracker'
import { uid } from '@/data/seed-utils'
import type { Expense, TrackerDataset } from '@/data/tracker/types'
import { categoryLabel, classify, confirmBlockers, draftOf, possibleDuplicates } from '@/lib/expenses'
import { deleteReceiptFile, saveReceiptFile } from '@/lib/receipt-files'
import { money, moneyExact, relativeTime, shortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/krew'
import { toast } from '@/store/toasts'

const panel = 'rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]'
const NONE = 'none'
const VOID_REASONS = ['Duplicate entry', 'Entered by mistake', 'Not a business cost']

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-3 py-3 text-[13.5px] first:pt-0 last:pb-0">
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  )
}

/** Where this entry's money shows up, so the owner can see it is counted once and where. */
function whereItCounts(e: Expense, projectName?: string, batchLabel?: string): { counts: string[]; not: string } {
  if (e.status === 'void') return { counts: [], not: 'Voided entries are kept for history and counted nowhere.' }
  if (e.status === 'needs_review') return { counts: [], not: 'Nothing yet. It counts once you confirm it.' }
  if (e.treatment === 'production') return { counts: [`Batch ${batchLabel ?? ''} cost, then cost of goods sold as units sell`], not: 'Not an expense, so it is never added to operating or project expenses.' }
  if (e.treatment === 'non_expense') return { counts: [], not: 'Not an expense. It is kept for your records and reconciliation.' }
  return { counts: ['Operating expenses', ...(projectName ? [`${projectName}: profit and budget`] : [])], not: 'Never added to any product’s unit cost.' }
}

export function ExpenseDetail({ expense: e, data }: { expense: Expense; data: TrackerDataset }) {
  const ws = useWorkspace()
  const navigate = useNavigate()
  const actions = useExpenseActions()
  const [voiding, setVoiding] = useState(false)
  const [reason, setReason] = useState('')
  const base = sectionPath('expenses')
  const categories = actions.categories
  const project = data.projects.find((p) => p.id === e.projectId)
  const batch = data.batches.find((b) => b.id === e.batchId)
  const product = batch ? data.products.find((p) => p.id === batch.productId) : undefined
  const blockers = confirmBlockers(draftOf(e))
  const events = data.expenseEvents.filter((x) => x.expenseId === e.id).sort((a, b) => b.at.localeCompare(a.at))
  const duplicates = e.status === 'void' ? [] : possibleDuplicates(draftOf(e), data.expenses, e.id)
  const where = whereItCounts(e, project?.name, batch?.label)
  const Source = EXPENSE_SOURCE[e.source]
  const live = e.status !== 'void'
  const projectLinkable = live && e.treatment !== 'production' && e.treatment !== 'non_expense'

  const confirm = () => {
    actions.update(e, { ...e, status: 'confirmed' })
    toast('Entry confirmed', `${e.label}, ${money(e.amount)}${project ? ` · counted in ${project.name}` : ''}`)
  }
  const setProject = (projectId: string | undefined) => {
    actions.update(e, { ...e, projectId })
    const to = data.projects.find((p) => p.id === projectId)
    toast(to ? `Linked to ${to.name}` : 'Removed from the project', to ? (project ? `Moved from ${project.name}` : e.label) : 'It stays recorded as a general expense')
  }
  const attach = async (file: File) => {
    const rid = uid('rc')
    try {
      await saveReceiptFile(ws.id, rid, file)
    } catch {
      toast('The receipt could not be stored in this browser')
      return
    }
    actions.update(e, { ...e, receipt: { id: rid, name: file.name, type: file.type, size: file.size, addedAt: new Date().toISOString() } })
    toast(e.receipt ? 'Receipt replaced' : 'Receipt attached', file.name)
  }
  const removeReceipt = () => {
    if (e.receipt && !e.receipt.sample) void deleteReceiptFile(ws.id, e.receipt.id)
    actions.update(e, { ...e, receipt: undefined })
    toast('Receipt removed')
  }

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge size="sm" tone={EXPENSE_STATUS[e.status].tone}>
              {EXPENSE_STATUS[e.status].label}
            </Badge>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[12px] text-ink-2">
              <Source.icon className="size-3.5" strokeWidth={1.7} /> {Source.label}
            </span>
            <span className="text-[12.5px] text-ink-3">{CLASS_LABEL[classify(e)]}</span>
          </div>
          <p className={cn('tabular mt-3 text-[40px] font-light leading-none tracking-[-0.03em]', live ? 'text-ink' : 'text-ink-3 line-through decoration-1')}>{moneyExact(e.amount)}</p>
          <p className="mt-2 text-[15px] text-ink">{e.label}</p>
          <p className="mt-0.5 text-[13px] text-ink-3">{[shortDate(e.at), e.vendor].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {live && (
            <Button size="sm" variant="secondary" onClick={() => navigate(`${base}/${e.id}?edit=1`)}>
              <Pencil className="size-4" strokeWidth={1.6} /> {e.status === 'needs_review' ? 'Review and edit' : 'Edit'}
            </Button>
          )}
          {live ? (
            <Button size="sm" variant="ghost" onClick={() => setVoiding((v) => !v)} aria-expanded={voiding}>
              <Ban className="size-4" strokeWidth={1.6} /> Void
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                actions.update(e, { ...e, status: 'needs_review', voidReason: undefined })
                toast('Entry restored', 'It is back in review')
              }}
            >
              <RotateCcw className="size-4" strokeWidth={1.6} /> Restore
            </Button>
          )}
        </div>
      </div>

      {voiding && live && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-panel p-4" role="group" aria-label="Void this entry">
          <p className="text-[13.5px] text-ink">Void this entry? It stays in the history but counts nowhere{project ? `, including ${project.name}` : ''}. You can restore it later.</p>
          <div className="flex flex-wrap gap-2">
            {VOID_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)} className={cn('h-8 rounded-full border px-3 text-[12.5px] transition-colors', reason === r ? 'border-ink bg-inverse text-ink-inverse' : 'border-line text-ink-2 hover:border-line-strong')}>
                {r}
              </button>
            ))}
            <input aria-label="Other reason" value={VOID_REASONS.includes(reason) ? '' : reason} onChange={(ev) => setReason(ev.target.value)} placeholder="Or write a reason" className={cn(fieldClass, 'h-8 w-48 text-[12.5px]')} />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setVoiding(false)}>
              Keep it
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                actions.update(e, { ...e, status: 'void', voidReason: reason.trim() || undefined })
                setVoiding(false)
                toast('Entry voided', e.label)
              }}
            >
              Void entry
            </Button>
          </div>
        </div>
      )}

      {e.status === 'needs_review' && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-[color-mix(in_oklab,var(--warning)_30%,transparent)] bg-warn-soft p-4 sm:flex-row sm:items-center">
          <Inbox className="hidden size-5 shrink-0 text-warn sm:block" strokeWidth={1.6} />
          <div className="min-w-0 flex-1 text-[13.5px]">
            <p className="text-ink">Waiting for your review. Not counted anywhere yet.</p>
            {blockers.length > 0 ? <p className="mt-0.5 text-[12.5px] text-ink-2">{blockers.join(' ')}</p> : <p className="mt-0.5 text-[12.5px] text-ink-2">Everything needed is filled in. Confirm it if it looks right.</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            {blockers.length === 0 ? (
              <Button size="sm" onClick={confirm}>
                <CircleCheck className="size-4" strokeWidth={1.7} /> Confirm
              </Button>
            ) : (
              <Button size="sm" onClick={() => navigate(`${base}/${e.id}?edit=1`)}>
                Complete and confirm
              </Button>
            )}
          </div>
        </div>
      )}
      {e.status === 'void' && (
        <div className="rounded-[14px] border border-line bg-panel-muted p-4 text-[13.5px] text-ink-2">
          Voided{e.voidReason ? `: ${e.voidReason}` : ''}. Kept for history and counted nowhere.
        </div>
      )}
      {duplicates.length > 0 && (
        <p className="text-[12.5px] text-warn">
          Looks like{' '}
          {duplicates.slice(0, 2).map((d, i) => (
            <span key={d.id}>
              {i > 0 && ' and '}
              <Link to={`${base}/${d.id}`} className="underline decoration-[color-mix(in_oklab,var(--warning)_50%,transparent)] underline-offset-4">
                {d.label}
              </Link>
            </span>
          ))}{' '}
          (same amount, within three days). If it is the same expense, void one of them.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          {e.prepared && (
            <section aria-label="Prepared by Tracker" className="flex gap-3 rounded-[14px] border border-line bg-panel-muted p-4">
              <Bot className="mt-0.5 size-4 shrink-0 text-ink-2" strokeWidth={1.6} />
              <div className="min-w-0 text-[13px]">
                <p className="text-ink">
                  Prepared by Tracker <span className="ml-1 rounded-full border border-dashed border-line-strong px-2 py-0.5 text-[11.5px] text-ink-3">Sample data</span>
                </p>
                <p className="mt-1 text-ink-2">
                  <span className="text-ink-3">Received: </span>
                  {e.prepared.request}
                </p>
                <p className="mt-0.5 text-ink-2">
                  <span className="text-ink-3">Read as: </span>
                  {e.prepared.reading}
                </p>
                <p className="mt-1.5 text-[12px] text-ink-3">Receipt reading is not built yet. This shows how Tracker will present what it prepares; a person always confirms.</p>
              </div>
            </section>
          )}

          <section aria-label="Details" className={cn(panel, 'p-5 sm:p-6')}>
            <dl className="divide-y divide-line-subtle">
              <Row label="Category">{e.category ? categoryLabel(e.category, categories) : <span className="text-warn">Not categorized</span>}</Row>
              <Row label="How it counts">
                {e.treatment ? (
                  <>
                    {TREATMENT[e.treatment].label}
                    <span className="mt-0.5 block text-[12.5px] text-ink-3">{TREATMENT[e.treatment].help}</span>
                  </>
                ) : (
                  <span className="text-warn">Not decided</span>
                )}
              </Row>
              {e.treatment === 'production' ? (
                <Row label="Batch">
                  {batch ? (
                    <Link to={`${sectionPath('costing')}/${batch.productId}?batch=${batch.id}`} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {batch.label} · {product?.name}
                    </Link>
                  ) : (
                    <span className="text-warn">No batch chosen</span>
                  )}
                  {batch?.status === 'draft' && <span className="mt-0.5 block text-[12.5px] text-warn">The batch is a draft. Add this cost to it in Product costing.</span>}
                </Row>
              ) : (
                e.treatment !== 'non_expense' && (
                  <Row label="Season or project">
                    {projectLinkable ? (
                      <div className="max-w-[300px] [&_label]:sr-only">
                        <Select
                          label="Season or project"
                          value={e.projectId ?? NONE}
                          onValueChange={(v) => setProject(v === NONE ? undefined : v)}
                          options={[{ value: NONE, label: 'No project' }, ...data.projects.filter((p) => p.status !== 'archived' || p.id === e.projectId).map((p) => ({ value: p.id, label: p.name }))]}
                        />
                      </div>
                    ) : (
                      (project?.name ?? 'None')
                    )}
                    {project && (
                      <Link to={`${sectionPath('seasons')}/${project.id}`} className="mt-1 inline-block text-[12.5px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
                        Open {project.name}
                      </Link>
                    )}
                  </Row>
                )
              )}
              {e.paymentMethod && <Row label="Payment method">{PAYMENT_METHOD[e.paymentMethod]}</Row>}
              {e.reference && <Row label="Reference">{e.reference}</Row>}
              {e.notes && <Row label="Notes">{e.notes}</Row>}
              <Row label="Source">
                {Source.label}
                <span className="block text-[12.5px] text-ink-3">Recorded {relativeTime(e.createdAt)}</span>
              </Row>
            </dl>
          </section>

          <section aria-label="Where it counts" className={cn(panel, 'p-5 sm:p-6')}>
            <h3 className="text-[15px] font-medium text-ink">Where it counts</h3>
            {where.counts.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {where.counts.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-[13.5px] text-ink">
                    <CircleCheck className="size-4 shrink-0 text-good" strokeWidth={1.7} /> {c}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[13px] text-ink-3">{where.not}</p>
          </section>

          <section aria-label="History" className={cn(panel, 'p-5 sm:p-6')}>
            <h3 className="text-[15px] font-medium text-ink">History</h3>
            {events.length === 0 ? (
              <p className="mt-3 text-[13px] text-ink-3">Nothing recorded yet.</p>
            ) : (
              <ol className="mt-3 flex flex-col">
                {events.map((x, i) => (
                  <li key={x.id} className="relative flex gap-3 pb-3.5 last:pb-0">
                    {i < events.length - 1 && <span className="absolute left-[3.5px] top-3 h-full w-px bg-line" aria-hidden />}
                    <span className={cn('relative mt-1.5 size-2 shrink-0 rounded-full', x.kind === 'confirmed' ? 'bg-good' : x.kind === 'voided' ? 'bg-ink-3' : x.by === 'tracker' ? 'bg-line-strong' : 'bg-ink')} />
                    <span className="min-w-0">
                      <span className="block text-[13px] text-ink">{x.text}</span>
                      <span className="block text-[12px] text-ink-3">
                        {x.by === 'tracker' ? 'Tracker' : 'You'} · <time dateTime={x.at}>{relativeTime(x.at)}</time>
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-2 lg:sticky lg:top-0">
          <p className="text-[13px] text-ink-2">Receipt or invoice</p>
          <ReceiptView ws={ws.id} receipt={e.receipt} expense={e} onAttach={live ? (f) => void attach(f) : undefined} onRemove={live && e.receipt ? removeReceipt : undefined} />
        </aside>
      </div>
    </div>
  )
}
