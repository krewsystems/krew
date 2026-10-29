import { Bot, ChevronDown, CircleAlert, Plus, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/arc/button/button'
import { Input } from '@/components/arc/input/input'
import { Select } from '@/components/arc/select/select'
import { fieldClass, MoneyInput } from '@/components/tracker/costing/parts'
import { useSheetGuard } from '@/components/tracker/costing/sheet-guard'
import { PAYMENT_METHOD, TREATMENT } from '@/components/tracker/expenses/labels'
import { ReceiptView } from '@/components/tracker/expenses/ReceiptView'
import { sectionPath } from '@/components/tracker/sections'
import { useExpenseActions } from '@/components/tracker/use-tracker'
import { uid } from '@/data/seed-utils'
import type { Expense, ExpenseField, ExpenseTreatment, PaymentMethod, ReceiptFile, TrackerDataset } from '@/data/tracker/types'
import { atFromDate, categoryLabel, confirmBlockers, draftOf, normalizeDraft, possibleDuplicates, validateCategoryName, validateExpense, type ExpenseDraft } from '@/lib/expenses'
import { saveReceiptFile } from '@/lib/receipt-files'
import { money, shortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/store/krew'
import { toast } from '@/store/toasts'

const today = () => new Date().toLocaleDateString('en-CA')
const stamp = () => new Date().toISOString()
const NEW_CATEGORY = '__new'
const NONE = 'none'
const panel = 'rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]'
/** Fields Tracker was unsure about get a quiet amber edge during review. */
const unsureRing = 'rounded-[12px] ring-1 ring-[color-mix(in_oklab,var(--warning)_45%,transparent)] ring-offset-4 ring-offset-[var(--surface)]'

const blank = (projectId?: string): ExpenseDraft => ({ label: '', amount: Number.NaN, date: today(), projectId })

function TreatmentPicker({ value, onChange, suggested }: { value?: ExpenseTreatment; onChange: (t: ExpenseTreatment | undefined) => void; suggested?: ExpenseTreatment }) {
  const options: { value: ExpenseTreatment | undefined; label: string }[] = [
    { value: 'operating', label: TREATMENT.operating.label },
    { value: 'production', label: TREATMENT.production.label },
    { value: 'non_expense', label: TREATMENT.non_expense.label },
    { value: undefined, label: 'Not sure yet' },
  ]
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] text-ink-2">How it counts</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How it counts">
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-9 rounded-full border px-3.5 text-[13px] transition-colors',
              value === o.value ? (o.value ? 'border-ink bg-inverse text-ink-inverse' : 'border-[color-mix(in_oklab,var(--warning)_55%,transparent)] bg-warn-soft text-warn') : 'border-line bg-panel text-ink-2 hover:border-line-strong hover:text-ink',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-[12.5px] leading-snug text-ink-3">
        {value ? TREATMENT[value].help : 'It will wait in review, counted nowhere, until you decide.'}
        {suggested && value === suggested && ' Suggested by the category; change it if this one is different.'}
      </p>
    </div>
  )
}

interface ExpenseFormProps {
  data: TrackerDataset
  /** The entry being edited or reviewed. Missing when creating. */
  expense?: Expense
  /** Pre-selected project when opened from a project. */
  projectId?: string
}

/**
 * Add, edit or review one expense. The same form, rules and save path serve entries typed by hand and entries
 * prepared by Tracker: only the starting values differ.
 */
export function ExpenseForm({ data, expense, projectId }: ExpenseFormProps) {
  const ws = useWorkspace()
  const navigate = useNavigate()
  const actions = useExpenseActions()
  const sheet = useSheetGuard()
  const base = sectionPath('expenses')
  const reviewing = expense?.status === 'needs_review'
  const editing = !!expense

  const [id, setId] = useState(() => expense?.id ?? uid('exp'))
  const [draft, setDraft] = useState<ExpenseDraft>(() => (expense ? draftOf(expense) : blank(projectId && data.projects.some((p) => p.id === projectId) ? projectId : undefined)))
  const [file, setFile] = useState<File | undefined>()
  const [removeReceipt, setRemoveReceipt] = useState(false)
  const [treatmentTouched, setTreatmentTouched] = useState(editing)
  const [newCategory, setNewCategory] = useState<string | null>(null)
  const [more, setMore] = useState(!!(expense?.paymentMethod || expense?.reference || expense?.notes))
  const [tried, setTried] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    sheet.setDirty(dirty)
    return () => sheet.setDirty(false)
  }, [dirty, sheet])

  const categories = actions.categories
  const clean = normalizeDraft(draft)
  const errors = validateExpense(clean, { today: today(), batches: data.batches })
  const blockers = confirmBlockers(clean)
  const valid = Object.keys(errors).length === 0
  const duplicates = possibleDuplicates(clean, data.expenses, id)
  const suggested = categories.find((c) => c.id === draft.category)?.suggests
  const unsure = new Set<ExpenseField>(reviewing ? (expense?.prepared?.unsure ?? []) : [])
  const show = (k: keyof typeof errors) => (tried ? errors[k] : undefined)

  const update = (patch: Partial<ExpenseDraft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setDirty(true)
  }
  const setCategory = (category: string) => {
    if (category === NEW_CATEGORY) return setNewCategory('')
    const next = categories.find((c) => c.id === category)
    // The category suggests a treatment until the person picks one themselves.
    update({ category, ...(treatmentTouched ? {} : { treatment: next?.suggests }) })
  }
  const categoryError = newCategory !== null && newCategory.trim() ? validateCategoryName(newCategory, categories) : null
  const addCategory = () => {
    if (newCategory === null || validateCategoryName(newCategory, categories)) return
    const def = actions.addCategory(newCategory)
    setNewCategory(null)
    update({ category: def.id })
    toast('Category added', def.label)
  }

  const projectOptions = [{ value: NONE, label: 'No project, a general expense' }, ...data.projects.filter((p) => p.status !== 'archived' || p.id === draft.projectId).map((p) => ({ value: p.id, label: p.name }))]
  const productName = (pid: string) => data.products.find((p) => p.id === pid)?.name ?? ''
  const batchOptions = data.batches.filter((b) => b.status !== 'revised').map((b) => ({ value: b.id, label: `${b.label} · ${productName(b.productId)}${b.status === 'draft' ? ' · draft' : ''}` }))
  const chosenBatch = data.batches.find((b) => b.id === draft.batchId)

  /** Saves the entry. `confirm` asks for it to be confirmed; it is only when nothing blocks it. */
  async function save(intent: 'confirm' | 'later', next?: 'another') {
    setTried(true)
    if (!valid || busy) return
    if (intent === 'confirm' && reviewing && blockers.length) return
    setBusy(true)
    let receipt: ReceiptFile | undefined = removeReceipt ? undefined : expense?.receipt
    if (file) {
      const rid = uid('rc')
      try {
        await saveReceiptFile(ws.id, rid, file)
      } catch {
        toast('The receipt could not be stored in this browser', 'The entry is saved without it')
        setBusy(false)
        return
      }
      receipt = { id: rid, name: file.name, type: file.type, size: file.size, addedAt: stamp() }
    }
    const status = intent === 'confirm' && blockers.length === 0 ? 'confirmed' : 'needs_review'
    const record: Expense = {
      ...(expense ?? { id, source: 'manual', createdAt: stamp(), status }),
      label: clean.label,
      amount: clean.amount,
      at: atFromDate(clean.date, expense?.at),
      vendor: clean.vendor,
      category: clean.category,
      treatment: clean.treatment,
      projectId: clean.projectId,
      batchId: clean.batchId,
      paymentMethod: clean.paymentMethod,
      reference: clean.reference,
      notes: clean.notes,
      receipt,
      status: expense?.status === 'void' ? 'void' : status,
    }
    if (expense) actions.update(expense, record)
    else actions.create(record)
    setDirty(false)
    setBusy(false)
    toast(status === 'confirmed' ? (editing && !reviewing ? 'Expense updated' : 'Expense saved') : 'Saved for review', `${record.label}, ${money(record.amount)}`)
    if (next === 'another') {
      setId(uid('exp'))
      setDraft(blank(draft.projectId))
      setFile(undefined)
      setTried(false)
      setTreatmentTouched(false)
      return
    }
    navigate(`${base}/${record.id}`, { replace: true })
  }

  const primaryLabel = reviewing ? 'Confirm entry' : editing ? (blockers.length ? 'Save for review' : 'Save changes') : blockers.length ? 'Save for review' : 'Save expense'
  const receiptShown = removeReceipt ? undefined : expense?.receipt

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void save('confirm')
      }}
      className="mx-auto flex max-w-[1080px] flex-col gap-6"
    >
      <div>
        <h2 className="text-[22px] font-medium tracking-[-0.02em] text-ink">{reviewing ? 'Review entry' : editing ? 'Edit expense' : 'Add an expense'}</h2>
        <p className="mt-1 text-[13.5px] text-ink-3">
          {reviewing
            ? 'Check what was prepared, fix anything that is off, then confirm. Nothing counts until you do.'
            : editing
              ? 'Changes are recorded in the entry’s history, and every total that uses it updates.'
              : 'Amount, description, date and category are enough. Everything else is optional.'}
        </p>
      </div>

      {reviewing && expense?.prepared && (
        <div className="flex gap-3 rounded-[14px] border border-line bg-panel-muted p-4">
          <Bot className="mt-0.5 size-4 shrink-0 text-ink-2" strokeWidth={1.6} />
          <div className="min-w-0 text-[13px]">
            <p className="text-ink">
              {expense.prepared.request} <span className="ml-1 rounded-full border border-dashed border-line-strong px-2 py-0.5 text-[11.5px] text-ink-3">Sample</span>
            </p>
            <p className="mt-1 text-ink-2">{expense.prepared.reading}</p>
            {unsure.size > 0 && <p className="mt-1.5 text-[12.5px] text-warn">Tracker was unsure about the fields marked in amber.</p>}
          </div>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <section className={cn(panel, 'flex flex-col gap-5 p-5 sm:p-6')}>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
              <label className={cn('flex flex-col gap-2', unsure.has('amount') && unsureRing)}>
                <span className="text-[13px] text-ink-2">Amount</span>
                <MoneyInput
                  aria-label="Amount"
                  value={draft.amount}
                  onValue={(n) => update({ amount: n })}
                  placeholder="0.00"
                  autoFocus={!editing}
                  aria-invalid={!!show('amount')}
                  className="[&_input]:h-12! [&_input]:text-[20px]! [&_input]:font-light"
                />
                {show('amount') ? <span className="text-[12.5px] text-warn">{show('amount')}</span> : <span className="text-[12px] text-ink-3">In {data.currency}, your brand’s currency</span>}
              </label>
              <label className={cn('flex flex-col gap-2', unsure.has('at') && unsureRing)}>
                <span className="text-[13px] text-ink-2">Date</span>
                <input type="date" aria-label="Date" value={draft.date} max={today()} onChange={(e) => update({ date: e.target.value })} aria-invalid={!!show('date')} className={cn(fieldClass, 'h-12')} />
                {show('date') && <span className="text-[12.5px] text-warn">{show('date')}</span>}
              </label>
            </div>

            <div className={cn(unsure.has('label') && unsureRing)}>
              <Input label="Description" value={draft.label} onChange={(e) => update({ label: e.target.value })} placeholder="For example: Winter lookbook photoshoot" error={show('label')} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={cn('flex flex-col gap-2', unsure.has('category') && unsureRing)}>
                <Select
                  label="Category"
                  value={draft.category ?? ''}
                  placeholder="Choose a category"
                  onValueChange={setCategory}
                  options={[...categories.map((c) => ({ value: c.id, label: c.label })), { value: NEW_CATEGORY, label: '+ New category' }]}
                />
                {show('category') && newCategory === null && <span className="text-[12.5px] text-warn">{show('category')}</span>}
              </div>
              <div className={cn(unsure.has('vendor') && unsureRing)}>
                <Input label="Vendor or supplier" value={draft.vendor ?? ''} onChange={(e) => update({ vendor: e.target.value })} placeholder="Optional" />
              </div>
            </div>

            {newCategory !== null && (
              <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-panel-muted p-3.5">
                <div className="flex gap-2">
                  <input
                    aria-label="New category name"
                    value={newCategory}
                    autoFocus
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCategory()
                      }
                      if (e.key === 'Escape') setNewCategory(null)
                    }}
                    placeholder="For example: Pop-up events"
                    className={cn(fieldClass, 'h-9')}
                  />
                  <Button type="button" size="sm" onClick={addCategory} disabled={!newCategory.trim() || !!categoryError}>
                    <Plus className="size-4" strokeWidth={1.7} /> Add
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setNewCategory(null)}>
                    Cancel
                  </Button>
                </div>
                <p className={cn('text-[12px]', categoryError ? 'text-warn' : 'text-ink-3')}>{categoryError ?? 'A label for your own reports. You still choose below how it counts.'}</p>
              </div>
            )}

            <div className={cn(unsure.has('treatment') && unsureRing)}>
              <TreatmentPicker
                value={draft.treatment}
                suggested={suggested}
                onChange={(t) => {
                  setTreatmentTouched(true)
                  update({ treatment: t })
                }}
              />
            </div>

            {draft.treatment === 'production' ? (
              <div className={cn('flex flex-col gap-2', unsure.has('batchId') && unsureRing)}>
                <Select label="Batch" value={draft.batchId ?? ''} placeholder="Choose the batch it belongs to" onValueChange={(v) => update({ batchId: v })} options={batchOptions} />
                {show('batchId') && <span className="text-[12.5px] text-warn">{show('batchId')}</span>}
                <p className="text-[12.5px] leading-snug text-ink-3">
                  {chosenBatch?.status === 'finalized'
                    ? `Batch ${chosenBatch.label} is finalized, so its cost already includes this. The entry is kept as the document behind it and is not counted again.`
                    : chosenBatch?.status === 'draft'
                      ? `Batch ${chosenBatch.label} is still a draft. Add this cost to it in Product costing so it reaches the unit cost; this entry is never counted as an expense.`
                      : 'Production costs reach their project through the batch, never directly.'}
                </p>
              </div>
            ) : draft.treatment !== 'non_expense' ? (
              <div className={cn('flex flex-col gap-2', unsure.has('projectId') && unsureRing)}>
                <Select label="Season or project" value={draft.projectId ?? NONE} onValueChange={(v) => update({ projectId: v === NONE ? undefined : v })} options={projectOptions} />
                <p className="text-[12.5px] text-ink-3">{draft.projectId ? 'Counted once: in operating expenses, and in this project’s profit and budget.' : 'Optional. Link a season or project to count it in that project’s profit.'}</p>
              </div>
            ) : null}

            <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="inline-flex items-center gap-1 self-start text-[13px] text-ink-2 hover:text-ink">
              <ChevronDown className={cn('size-4 transition-transform', more && 'rotate-180')} strokeWidth={1.7} /> Payment method, reference and notes
              <span className="text-ink-3">· optional</span>
            </button>
            {more && (
              <div className="flex flex-col gap-4 border-t border-line-subtle pt-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Payment method"
                    value={draft.paymentMethod ?? NONE}
                    onValueChange={(v) => update({ paymentMethod: v === NONE ? undefined : (v as PaymentMethod) })}
                    options={[{ value: NONE, label: 'Not recorded' }, ...(Object.keys(PAYMENT_METHOD) as PaymentMethod[]).map((m) => ({ value: m, label: PAYMENT_METHOD[m] }))]}
                  />
                  <Input label="Reference number" value={draft.reference ?? ''} onChange={(e) => update({ reference: e.target.value })} placeholder="Invoice or transaction number" />
                </div>
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] text-ink-2">Notes</span>
                  <textarea value={draft.notes ?? ''} onChange={(e) => update({ notes: e.target.value })} rows={2} placeholder="Anything your accountant should know" className={cn(fieldClass, 'h-auto py-2.5')} />
                </label>
              </div>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-0">
          <div>
            <p className="mb-2 text-[13px] text-ink-2">Receipt or invoice</p>
            <ReceiptView
              ws={ws.id}
              receipt={file ? undefined : receiptShown}
              local={file}
              expense={{ ...clean, at: atFromDate(clean.date || today()), amount: Number.isFinite(clean.amount) ? clean.amount : 0 }}
              onAttach={(f) => {
                setFile(f)
                setDirty(true)
              }}
              onRemove={() => {
                setFile(undefined)
                if (expense?.receipt) setRemoveReceipt(true)
                setDirty(true)
              }}
            />
          </div>

          {duplicates.length > 0 && (
            <div className="flex gap-2.5 rounded-[12px] border border-[color-mix(in_oklab,var(--warning)_30%,transparent)] bg-warn-soft p-3.5 text-[13px]">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" strokeWidth={1.7} />
              <div className="min-w-0">
                <p className="text-ink">This may already be recorded</p>
                <ul className="mt-1 flex flex-col gap-0.5 text-[12.5px] text-ink-2">
                  {duplicates.slice(0, 3).map((d) => (
                    <li key={d.id} className="truncate">
                      <Link to={`${base}/${d.id}`} className="underline decoration-line-strong underline-offset-4 hover:text-ink">
                        {d.label}
                      </Link>
                      , {money(d.amount)} on {shortDate(d.at)}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[12px] text-ink-3">You can still save it if it is a separate expense.</p>
              </div>
            </div>
          )}

          {tried && (reviewing || !editing) && blockers.length > 0 && valid && (
            <div className="flex gap-2.5 rounded-[12px] border border-line bg-panel-muted p-3.5 text-[13px]">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-warn" strokeWidth={1.7} />
              <div>
                <p className="text-ink">{reviewing ? 'Before you can confirm' : 'This will be saved for review'}</p>
                <ul className="mt-1 list-disc pl-4 text-[12.5px] text-ink-2">
                  {blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="rounded-[12px] bg-panel-muted p-3.5 text-[12.5px] leading-snug text-ink-2">
            {clean.category ? `${categoryLabel(clean.category, categories)} is a label. ` : ''}
            {draft.treatment === 'operating'
              ? 'Counts in operating expenses once confirmed.'
              : draft.treatment === 'production'
                ? 'Counted through its batch as cost of goods sold, never as an expense.'
                : draft.treatment === 'non_expense'
                  ? 'Kept for your records. It is not counted as an expense.'
                  : 'Undecided entries are counted nowhere.'}
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 -mx-4 -mb-6 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        {editing && expense?.status === 'confirmed' && blockers.length > 0 && valid && <p className="mr-auto text-[12.5px] text-warn">Saving moves this entry back to review.</p>}
        <Button type="button" variant="ghost" size="sm" onClick={() => sheet.guard(() => navigate(expense ? `${base}/${expense.id}` : base))}>
          Cancel
        </Button>
        {!editing && (
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void save('confirm', 'another')}>
            Save and add another
          </Button>
        )}
        {reviewing && (
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void save('later')}>
            Save for later
          </Button>
        )}
        <Button type="submit" size="sm" disabled={busy || (tried && reviewing && blockers.length > 0)}>
          {primaryLabel}
        </Button>
      </div>
    </form>
  )
}
