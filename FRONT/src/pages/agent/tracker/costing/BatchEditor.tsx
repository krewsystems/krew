import { ArrowLeft, Check, ChevronDown, Copy, History, Lock, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/arc/button/button'
import { Checkbox } from '@/components/arc/checkbox/checkbox'
import { Input } from '@/components/arc/input/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/arc/popover/popover'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { Select } from '@/components/arc/select/select'
import { useSheetGuard } from '@/components/tracker/costing/sheet-guard'
import { UnitEconomicsPanel } from '@/components/tracker/costing/UnitEconomicsPanel'
import { BatchStatusBadge, fieldClass, MoneyInput, QuantityInput } from '@/components/tracker/costing/parts'
import { sectionPath } from '@/components/tracker/sections'
import { useBatchActions } from '@/components/tracker/use-tracker'
import { uid } from '@/data/seed-utils'
import type { Batch, CostBasis, CostComponent, Product, TrackerDataset } from '@/data/tracker/types'
import { canFinalize, costBatch, nextBatchLabel, quantityOf, type BatchCosting, type CostIssue } from '@/lib/costing'
import { money, moneyExact, number, shortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toast } from '@/store/toasts'

const today = () => new Date().toLocaleDateString('en-CA')

const SUGGESTIONS: Record<Batch['kind'], string[]> = {
  purchase: ['Product purchase', 'Packaging', 'Shipping in', 'Customs and duties', 'Labels'],
  production: ['Fabric', 'Materials', 'Manufacturing', 'Labour', 'Packaging', 'Transport'],
}

/** Builds the working copy the editor starts from: a saved batch, a blank one, a duplicate or a revision. */
function initialBatch(product: Product, data: TrackerDataset, batchParam: string, fromId: string | null, reviseId: string | null): Batch | undefined {
  const existing = data.batches.find((b) => b.id === batchParam && b.productId === product.id)
  if (existing) return existing
  if (batchParam !== 'new') return undefined
  const source = data.batches.find((b) => b.id === (reviseId ?? fromId) && b.productId === product.id)
  const fresh = (prefix: string) => ({ id: uid(prefix), status: 'draft' as const, receivedAt: today() })
  if (source && reviseId) {
    return { ...source, ...fresh('rev'), label: `${source.label} rev`, receivedAt: source.receivedAt, revisionOf: source.id, revisionReason: '', revisedBy: undefined, finalizedAt: undefined, components: source.components.map((c) => ({ ...c, id: uid('c') })) }
  }
  if (source) {
    return { ...source, ...fresh('b'), label: nextBatchLabel(data.batches, product.id, `${product.sku}-`), revisionOf: undefined, revisionReason: undefined, revisedBy: undefined, finalizedAt: undefined, components: source.components.map((c) => ({ ...c, id: uid('c') })) }
  }
  return {
    ...fresh('b'),
    productId: product.id,
    label: nextBatchLabel(data.batches, product.id, `${product.sku}-`),
    kind: data.model === 'manufacturing' ? 'production' : 'purchase',
    quantities: product.variants.map((v) => ({ variantId: v.id, quantity: 0 })),
    components: [],
  }
}

function issueText(issue: CostIssue): string {
  switch (issue.kind) {
    case 'missing_label':
      return 'Give this cost a name.'
    case 'invalid_amount':
      return 'Enter an amount above zero.'
    case 'empty_scope':
      return 'Choose at least one variant, or apply it to the whole batch.'
    case 'unallocatable':
      return 'The variants this cost applies to have no units in this batch, so it cannot be allocated. Add their quantities or change where it applies.'
    default:
      return ''
  }
}

/* ---------------- Cost row ---------------- */

interface CostRowProps {
  component: CostComponent
  product: Product
  batch: Batch
  costing: BatchCosting
  issues: CostIssue[]
  showIssues: boolean
  autoFocus: boolean
  onChange: (patch: Partial<CostComponent>) => void
  onRemove: () => void
}

function CostRow({ component: c, product, batch, costing, issues, showIssues, autoFocus, onChange, onRemove }: CostRowProps) {
  const cost = costing.components.find((x) => x.id === c.id)
  const multi = product.variants.length > 1
  const scope = c.appliesTo ?? product.variants.map((v) => v.id)
  const scopeQty = quantityOf(batch, c.appliesTo)
  const scopeLabel = !c.appliesTo ? 'All variants' : c.appliesTo.length === 1 ? (product.variants.find((v) => v.id === c.appliesTo![0])?.title ?? '1 variant') : `${c.appliesTo.length} variants`
  const amount = Number.isFinite(c.amount) ? c.amount : 0
  const visible = issues.filter((i) => showIssues || i.kind === 'unallocatable')

  const toggle = (id: string) => {
    const next = scope.includes(id) ? scope.filter((x) => x !== id) : [...scope, id]
    onChange({ appliesTo: next.length === product.variants.length ? undefined : next })
  }

  let explain = ''
  if (amount > 0 && cost) {
    explain =
      c.basis === 'per_unit'
        ? `${moneyExact(amount)} × ${number(scopeQty)} units = ${money(cost.total)}`
        : scopeQty > 0
          ? `${money(amount)} ÷ ${number(scopeQty)} units = ${moneyExact(amount / scopeQty)} per unit`
          : `${money(amount)} for the batch`
  }

  return (
    <li className={cn('rounded-[14px] border p-3.5 transition-colors', visible.length ? 'border-[color-mix(in_oklab,var(--warning)_40%,transparent)] bg-warn-soft/40' : 'border-line-subtle bg-panel-muted/60')}>
      <div className="flex items-center gap-2">
        <input
          aria-label="Cost name"
          value={c.label}
          autoFocus={autoFocus}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Cost name, such as Fabric"
          aria-invalid={showIssues && issues.some((i) => i.kind === 'missing_label')}
          className={cn(fieldClass, 'flex-1')}
        />
        <button type="button" onClick={onRemove} aria-label={`Remove ${c.label || 'cost'}`} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-bad">
          <Trash2 className="size-4" strokeWidth={1.6} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 sm:pr-11">
        <MoneyInput aria-label={`${c.label || 'Cost'} amount`} className="w-40" value={c.amount} onValue={(n) => onChange({ amount: n })} placeholder="0.00" aria-invalid={showIssues && issues.some((i) => i.kind === 'invalid_amount')} />
        <SegmentedControl
          label="Amount is"
          value={c.basis}
          onValueChange={(v) => onChange({ basis: v as CostBasis })}
          options={[
            { value: 'per_unit', label: 'Per unit' },
            { value: 'batch_total', label: 'Whole batch' },
          ]}
        />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px]">
        {multi && (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-2.5 py-0.5 text-ink-2 transition-colors hover:border-line-strong hover:text-ink">
                Applies to: {scopeLabel}
                <ChevronDown className="size-3.5" strokeWidth={1.7} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[260px] p-3!">
              <p className="mb-2 text-[12.5px] text-ink-3">{c.basis === 'batch_total' ? 'The amount is shared across these variants by quantity.' : 'Charged on every unit of these variants.'}</p>
              <div className="flex flex-col gap-2">
                <Checkbox label="All variants" checked={!c.appliesTo ? true : c.appliesTo.length === 0 ? false : 'indeterminate'} onCheckedChange={() => onChange({ appliesTo: c.appliesTo ? undefined : [] })} />
                <div className="ml-1 flex flex-col gap-2 border-l border-line pl-3">
                  {product.variants.map((v) => (
                    <Checkbox key={v.id} label={`${v.title} (${number(batch.quantities.find((q) => q.variantId === v.id)?.quantity ?? 0)} units)`} checked={scope.includes(v.id)} onCheckedChange={() => toggle(v.id)} />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        {explain && <span className="tabular text-ink-3">{explain}</span>}
      </div>
      {visible.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {visible.map((i) => (
            <li key={i.kind} className="flex items-start gap-1.5 text-[12.5px] text-warn">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.7} />
              {issueText(i)}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/* ---------------- Read-only review ---------------- */

function BatchReview({ batch, product, data, costing }: { batch: Batch; product: Product; data: TrackerDataset; costing: BatchCosting }) {
  const project = data.projects.find((p) => p.id === batch.projectId)
  const revisedBy = data.batches.find((b) => b.id === batch.revisedBy)
  const revisionOf = data.batches.find((b) => b.id === batch.revisionOf)
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3 rounded-[14px] border border-line bg-panel-muted p-4 text-[13px] text-ink-2">
        {batch.status === 'revised' ? <History className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.6} /> : <Lock className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.6} />}
        <p>
          {batch.status === 'revised'
            ? `Replaced by ${revisedBy?.label ?? 'a revision'}. Its original values are kept here for history and no longer set the product’s cost.`
            : `Finalized ${shortDate(batch.finalizedAt ?? batch.receivedAt)}. Finalized batches are historical records; to fix a mistake, create a revision and this one stays on file.`}
          {revisionOf && ` This batch corrects ${revisionOf.label}${batch.revisionReason ? `: “${batch.revisionReason}”` : '.'}`}
        </p>
      </div>
      <section className="rounded-[var(--radius-surface)] border border-line bg-panel p-5 shadow-[var(--shadow-resting)] sm:p-6">
        <h3 className="text-[15px] font-medium text-ink">Details</h3>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-[13.5px] sm:grid-cols-4">
          {[
            ['Date', shortDate(batch.receivedAt)],
            ['Type', batch.kind === 'production' ? 'Production' : 'Purchase'],
            ['Supplier', batch.supplier || 'Not recorded'],
            ['Season or project', project?.name ?? 'None'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[12px] text-ink-3">{k}</dt>
              <dd className="mt-0.5 text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="rounded-[var(--radius-surface)] border border-line bg-panel p-5 shadow-[var(--shadow-resting)] sm:p-6">
        <h3 className="text-[15px] font-medium text-ink">Quantity</h3>
        <ul className="mt-3 flex flex-col divide-y divide-line-subtle text-[13.5px]">
          {batch.quantities.map((q) => (
            <li key={q.variantId} className="flex justify-between py-2">
              <span className="text-ink-2">{product.variants.find((v) => v.id === q.variantId)?.title ?? q.variantId}</span>
              <span className="tabular text-ink">{number(q.quantity)} units</span>
            </li>
          ))}
          <li className="flex justify-between py-2 font-medium">
            <span className="text-ink">Total</span>
            <span className="tabular text-ink">{number(costing.totalQuantity)} units</span>
          </li>
        </ul>
      </section>
      <section className="rounded-[var(--radius-surface)] border border-line bg-panel p-5 shadow-[var(--shadow-resting)] sm:p-6">
        <h3 className="text-[15px] font-medium text-ink">Costs</h3>
        <ul className="mt-3 flex flex-col divide-y divide-line-subtle text-[13.5px]">
          {batch.components.map((c) => {
            const cc = costing.components.find((x) => x.id === c.id)
            return (
              <li key={c.id} className="flex items-start justify-between gap-4 py-2.5">
                <span className="min-w-0">
                  <span className="block text-ink">{c.label}</span>
                  <span className="block text-[12px] text-ink-3">
                    {c.basis === 'per_unit' ? `${moneyExact(c.amount)} per unit` : `${money(c.amount)} for the batch`}
                    {c.appliesTo && ` · ${c.appliesTo.map((id) => product.variants.find((v) => v.id === id)?.title).join(', ')}`}
                  </span>
                </span>
                <span className="tabular shrink-0 text-right">
                  <span className="block text-ink">{money(cc?.total ?? 0)}</span>
                  <span className="block text-[12px] text-ink-3">{moneyExact(cc?.perUnit ?? 0)} per unit</span>
                </span>
              </li>
            )
          })}
          <li className="flex justify-between py-2.5 font-medium">
            <span className="text-ink">Total batch cost</span>
            <span className="tabular text-ink">{money(costing.totalCost)}</span>
          </li>
        </ul>
      </section>
    </div>
  )
}

/* ---------------- Editor ---------------- */

interface BatchEditorProps {
  product: Product
  data: TrackerDataset
  batchParam: string
  fromId: string | null
  reviseId: string | null
}

export function BatchEditor(props: BatchEditorProps) {
  const { product, data, batchParam, fromId, reviseId } = props
  const start = useMemo(() => initialBatch(product, data, batchParam, fromId, reviseId), [product, data, batchParam, fromId, reviseId])
  const base = `${sectionPath('costing')}/${product.id}`

  if (!start) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-surface)] border border-line bg-panel px-6 py-14 text-center">
        <p className="text-[14px] text-ink">This batch could not be found</p>
        <p className="text-[13px] text-ink-3">It may have been a draft that was discarded, or the demo was reset.</p>
        <Link to={base} className="mt-2 text-[13px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
          Back to {product.name}
        </Link>
      </div>
    )
  }
  // Keyed so switching batches starts a fresh working copy.
  return <Editor key={`${start.id}:${start.status}`} {...props} start={start} base={base} />
}

function Editor({ product, data, start, base }: BatchEditorProps & { start: Batch; base: string }) {
  const navigate = useNavigate()
  const actions = useBatchActions()
  const sheet = useSheetGuard()
  const [batch, setBatch] = useState<Batch>(start)
  const [dirty, setDirty] = useState(false)

  // Tell the sheet about unsaved work, so closing it or leaving the batch asks first.
  useEffect(() => {
    sheet.setDirty(dirty)
    return () => sheet.setDirty(false)
  }, [dirty, sheet])
  const [showIssues, setShowIssues] = useState(false)
  const [lastAdded, setLastAdded] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [quick, setQuick] = useState(Number.NaN)

  const readOnly = start.status !== 'draft'
  const saved = data.batches.some((b) => b.id === batch.id)
  const costing = useMemo(() => costBatch(batch), [batch])
  const multi = product.variants.length > 1
  const needsReason = !!batch.revisionOf && !(batch.revisionReason ?? '').trim()
  const ready = canFinalize(costing, batch) && !needsReason
  const project = data.projects.find((p) => p.id === batch.projectId)

  const update = (patch: Partial<Batch>) => {
    setBatch((b) => ({ ...b, ...patch }))
    setDirty(true)
  }
  const setComponent = (id: string, patch: Partial<CostComponent>) => update({ components: batch.components.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  const addComponent = (label = '', amount = Number.NaN, basis: CostBasis = 'per_unit') => {
    const id = uid('c')
    setLastAdded(label ? null : id)
    update({ components: [...batch.components, { id, label, amount, basis }] })
  }
  const setQty = (variantId: string, quantity: number) => update({ quantities: batch.quantities.map((q) => (q.variantId === variantId ? { ...q, quantity } : q)) })

  const save = () => {
    actions.saveDraft({ ...batch, label: batch.label.trim() || nextBatchLabel(data.batches, product.id, `${product.sku}-`) })
    setDirty(false)
    toast('Draft saved', `${batch.label || 'Batch'} for ${product.name}`)
    navigate(`${base}?batch=${batch.id}`, { replace: true })
  }
  const finalize = () => {
    actions.finalize({ ...batch, label: batch.label.trim() })
    setConfirming(false)
    setDirty(false)
    toast('Batch finalized', `${batch.label.trim()}: ${moneyExact(costing.unitCost ?? 0)} per unit`)
    navigate(base, { replace: true })
  }
  const blockers = [
    !batch.label.trim() && 'Name the batch',
    costing.totalQuantity <= 0 && 'Enter how many units the batch has',
    batch.components.length === 0 && 'Add at least one cost',
    costing.issues.some((i) => 'componentId' in i) && 'Fix the costs marked below',
    needsReason && 'Say why this revision is needed',
  ].filter(Boolean) as string[]

  const title = readOnly ? batch.label : saved ? `Draft: ${batch.label || 'Untitled batch'}` : batch.revisionOf ? 'Correct a finalized batch' : 'New batch'

  return (
    <div className="flex flex-col gap-6">
      <button type="button" onClick={() => sheet.guard(() => navigate(base))} className="inline-flex items-center gap-1.5 self-start text-[13px] text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4" strokeWidth={1.6} /> All batches
      </button>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[24px] font-medium leading-tight tracking-[-0.025em] text-ink">{title}</h2>
            <BatchStatusBadge status={batch.status} />
          </div>
          <p className="mt-1.5 text-[13.5px] text-ink-3">
            {readOnly
              ? `${product.name} · ${number(costing.totalQuantity)} units${project ? ` · ${project.name}` : ''}`
              : 'Start with the quantity and what one unit cost. Add a full breakdown only if you need it.'}
          </p>
        </div>
        {readOnly && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate(`${base}?batch=new&from=${batch.id}`)}>
              <Copy className="size-4" strokeWidth={1.6} /> Duplicate as new batch
            </Button>
            {batch.status === 'finalized' && (
              <Button size="sm" variant="ghost" onClick={() => navigate(`${base}?batch=new&revise=${batch.id}`)}>
                <History className="size-4" strokeWidth={1.6} /> Correct with a revision
              </Button>
            )}
          </div>
        )}
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {readOnly ? (
          <BatchReview batch={batch} product={product} data={data} costing={costing} />
        ) : (
          <div className="flex min-w-0 flex-col gap-6">
            {batch.revisionOf && (
              <section className="rounded-[var(--radius-surface)] border border-[color-mix(in_oklab,var(--warning)_30%,transparent)] bg-warn-soft p-5">
                <p className="text-[13.5px] text-ink">
                  You are correcting {data.batches.find((b) => b.id === batch.revisionOf)?.label}. When you finalize, it is kept on file as revised and this version sets the cost.
                </p>
                <div className="mt-3">
                  <Input label="Why is this correction needed?" value={batch.revisionReason ?? ''} onChange={(e) => update({ revisionReason: e.target.value })} placeholder="For example: freight invoice came in higher" error={showIssues && needsReason ? 'Add a short reason.' : undefined} />
                </div>
              </section>
            )}

            <section aria-labelledby="step-details" className="rounded-[var(--radius-surface)] border border-line bg-panel p-5 shadow-[var(--shadow-resting)] sm:p-6">
              <h3 id="step-details" className="text-[15px] font-medium text-ink">
                <span className="tabular mr-2 text-ink-3">1</span>Batch details
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input label="Batch name" value={batch.label} onChange={(e) => update({ label: e.target.value })} error={showIssues && !batch.label.trim() ? 'Name the batch.' : undefined} />
                <Input label={batch.kind === 'production' ? 'Production date' : 'Purchase date'} type="date" value={batch.receivedAt.slice(0, 10)} onChange={(e) => update({ receivedAt: e.target.value })} />
              </div>
              <div className="mt-4 flex flex-col gap-1.5">
                <span className="text-[13px] text-ink-2">This batch was</span>
                <SegmentedControl
                  label="Batch type"
                  value={batch.kind}
                  onValueChange={(v) => update({ kind: v as Batch['kind'] })}
                  options={[
                    { value: 'purchase', label: 'Bought ready-made' },
                    { value: 'production', label: 'Produced' },
                  ]}
                />
              </div>
              <details className="group mt-4">
                <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" strokeWidth={1.7} /> Supplier and season{(batch.supplier || batch.projectId) && ' · filled in'}
                </summary>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Input label="Supplier, optional" value={batch.supplier ?? ''} onChange={(e) => update({ supplier: e.target.value })} placeholder="Who made or sold it" />
                  <Select
                    label="Season or project, optional"
                    value={batch.projectId ?? 'none'}
                    onValueChange={(v) => update({ projectId: v === 'none' ? undefined : v })}
                    options={[{ value: 'none', label: 'No project' }, ...data.projects.filter((p) => p.status === 'planning' || p.status === 'active' || p.id === batch.projectId).map((p) => ({ value: p.id, label: p.name }))]}
                  />
                </div>
              </details>
            </section>

            <section aria-labelledby="step-qty" className="rounded-[var(--radius-surface)] border border-line bg-panel p-5 shadow-[var(--shadow-resting)] sm:p-6">
              <h3 id="step-qty" className="text-[15px] font-medium text-ink">
                <span className="tabular mr-2 text-ink-3">2</span>Quantity
              </h3>
              {multi ? (
                <>
                  <p className="mt-1 text-[13px] text-ink-3">How many units of each variant. Shared costs are split by these quantities.</p>
                  <ul className="mt-4 flex flex-col divide-y divide-line-subtle">
                    {product.variants.map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-4 py-2.5">
                        <span className="min-w-0">
                          <span className="block text-[14px] text-ink">{v.title}</span>
                          <span className="block text-[12px] text-ink-3">{v.sku}</span>
                        </span>
                        <QuantityInput aria-label={`${v.title} units`} className="w-32" value={batch.quantities.find((q) => q.variantId === v.id)?.quantity ?? 0} onValue={(n) => setQty(v.id, n)} />
                      </li>
                    ))}
                    <li className="flex items-center justify-between py-2.5 text-[14px]">
                      <span className="text-ink">Total</span>
                      <span className="tabular pr-3 text-ink">{number(costing.totalQuantity)} units</span>
                    </li>
                  </ul>
                </>
              ) : (
                <div className="mt-4 flex items-center gap-3">
                  <QuantityInput aria-label="Units in this batch" className="w-40" value={batch.quantities[0]?.quantity ?? 0} onValue={(n) => setQty(product.variants[0].id, n)} />
                  <span className="text-[14px] text-ink-2">units</span>
                </div>
              )}
              {showIssues && costing.totalQuantity <= 0 && <p className="mt-2 text-[12.5px] text-warn">Enter how many units this batch has.</p>}
            </section>

            <section aria-labelledby="step-costs" className="rounded-[var(--radius-surface)] border border-line bg-panel p-5 shadow-[var(--shadow-resting)] sm:p-6">
              <h3 id="step-costs" className="text-[15px] font-medium text-ink">
                <span className="tabular mr-2 text-ink-3">3</span>Costs
              </h3>
              <p className="mt-1 text-[13px] text-ink-3">Enter each cost per unit, or as one amount for the whole batch. You can mix both.</p>

              {batch.components.length === 0 ? (
                <div className="mt-4 rounded-[14px] border border-dashed border-line-strong p-4 sm:p-5">
                  <p className="text-[14px] text-ink">{batch.kind === 'purchase' ? 'What did you pay for one unit?' : 'What did one unit cost to make?'}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-3">If that is all you know, this is enough to finish.</p>
                  <form
                    className="mt-3 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!(quick > 0)) return
                      addComponent(batch.kind === 'purchase' ? 'Product purchase' : 'Production cost', quick, 'per_unit')
                    }}
                  >
                    <MoneyInput aria-label="Cost per unit" className="sm:w-48" value={quick} onValue={setQuick} placeholder="0.00" />
                    <Button size="sm" type="submit" disabled={!(quick > 0)} className="h-10!">
                      Add as cost per unit
                    </Button>
                  </form>
                  <p className="mt-4 text-[12.5px] text-ink-3">Or build a breakdown:</p>
                </div>
              ) : (
                <ul className="mt-4 flex flex-col gap-2.5">
                  {batch.components.map((c) => (
                    <CostRow
                      key={c.id}
                      component={c}
                      product={product}
                      batch={batch}
                      costing={costing}
                      issues={costing.issues.filter((i) => 'componentId' in i && i.componentId === c.id)}
                      showIssues={showIssues}
                      autoFocus={c.id === lastAdded}
                      onChange={(patch) => setComponent(c.id, patch)}
                      onRemove={() => update({ components: batch.components.filter((x) => x.id !== c.id) })}
                    />
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => addComponent()} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-panel px-3 text-[13px] text-ink transition-colors hover:border-line-strong">
                  <Plus className="size-4" strokeWidth={1.7} /> Add cost
                </button>
                {SUGGESTIONS[batch.kind]
                  .filter((s) => !batch.components.some((c) => c.label.toLowerCase() === s.toLowerCase()))
                  .map((s) => (
                    <button key={s} type="button" onClick={() => addComponent(s)} className="inline-flex h-8 items-center rounded-full border border-dashed border-line-strong px-3 text-[12.5px] text-ink-2 transition-colors hover:border-ink hover:text-ink">
                      {s}
                    </button>
                  ))}
              </div>
            </section>

            {confirming ? (
              <div role="region" aria-label="Confirm finalize" className="sticky bottom-0 z-10 rounded-[16px] border border-line-strong bg-panel p-4 shadow-[var(--shadow-floating)] sm:p-5">
                <p className="text-[15px] font-medium text-ink">Finalize {batch.label}?</p>
                <p className="mt-1 text-[13px] text-ink-3">A finalized batch is kept as a historical record. To change it later you create a revision, and this version stays on file. Nothing is sent to your store.</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 rounded-[12px] bg-panel-muted p-3.5 text-[13.5px] sm:grid-cols-4">
                  <div>
                    <dt className="text-[12px] text-ink-3">Units</dt>
                    <dd className="tabular text-ink">{number(costing.totalQuantity)}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-ink-3">Total batch cost</dt>
                    <dd className="tabular text-ink">{money(costing.totalCost)}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-ink-3">Unit cost</dt>
                    <dd className="tabular text-ink">{moneyExact(costing.unitCost ?? 0)}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-ink-3">Costs</dt>
                    <dd className="tabular text-ink">{batch.components.length}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                    Keep editing
                  </Button>
                  <Button size="sm" onClick={finalize}>
                    Finalize batch
                  </Button>
                </div>
              </div>
            ) : (
            <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-[16px] border border-line bg-panel/95 p-3.5 shadow-[var(--shadow-raised)] backdrop-blur sm:flex-row sm:items-center">
              <p className="min-w-0 flex-1 text-[12.5px] text-ink-3">
                {ready ? (
                  <span className="inline-flex items-center gap-1.5 text-ink-2">
                    <Check className="size-4 text-good" strokeWidth={1.8} /> Ready to finalize
                  </span>
                ) : (
                  <>To finalize: {blockers.join(', ').toLowerCase()}.</>
                )}
                {dirty && <span className="ml-2 text-ink-3">· Unsaved changes</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {saved && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      actions.discardDraft(batch.id)
                      setDirty(false)
                      toast('Draft discarded')
                      navigate(base, { replace: true })
                    }}
                  >
                    Discard draft
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={save} disabled={!dirty && saved}>
                  Save draft
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowIssues(true)
                    if (ready) setConfirming(true)
                  }}
                >
                  Review and finalize
                </Button>
              </div>
            </div>
            )}
          </div>
        )}

        <UnitEconomicsPanel product={product} costing={costing} title={readOnly ? 'Unit economics' : 'Live unit economics'} subtitle={readOnly ? `${batch.label}, ${number(costing.totalQuantity)} units` : 'Updates as you type'} className="xl:sticky xl:top-0" />
      </div>

    </div>
  )
}
