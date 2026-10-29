import { Copy, FolderKanban, Plus, TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/arc/button/button'
import { UnitEconomicsPanel } from '@/components/tracker/costing/UnitEconomicsPanel'
import { BatchStatusBadge, CostingStatusBadge } from '@/components/tracker/costing/parts'
import { sectionPath } from '@/components/tracker/sections'
import type { Batch, Product, TrackerDataset } from '@/data/tracker/types'
import { costBatch, summarizeProductCost, unitEconomics, variantPrice } from '@/lib/costing'
import { money, moneyExact, number, shortDate } from '@/lib/format'
import { cn } from '@/lib/utils'

function BatchRow({ batch, product, data, onOpen, onDuplicate }: { batch: Batch; product: Product; data: TrackerDataset; onOpen: () => void; onDuplicate: () => void }) {
  const c = costBatch(batch)
  const project = data.projects.find((p) => p.id === batch.projectId)
  const revisedBy = batch.revisedBy ? data.batches.find((b) => b.id === batch.revisedBy) : undefined
  const revisionOf = batch.revisionOf ? data.batches.find((b) => b.id === batch.revisionOf) : undefined
  return (
    <li className={cn('group relative rounded-[14px] border border-line-subtle transition-colors hover:border-line-strong', batch.status === 'revised' ? 'bg-panel-muted/60' : 'bg-panel')}>
      <button type="button" onClick={onOpen} className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 p-4 pr-14 text-left sm:grid-cols-[minmax(0,1fr)_repeat(3,96px)] sm:items-center">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className={cn('text-[14.5px] font-medium', batch.status === 'revised' ? 'text-ink-2' : 'text-ink')}>{batch.label || 'Untitled batch'}</span>
            <BatchStatusBadge status={batch.status} />
          </span>
          <span className="mt-1 block text-[12.5px] text-ink-3">
            {shortDate(batch.receivedAt)} · {batch.kind === 'production' ? 'Production' : 'Purchase'}
            {batch.supplier ? ` · ${batch.supplier}` : ''}
          </span>
          {(project || revisedBy || revisionOf) && (
            <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
              {project && (
                <span className="inline-flex items-center gap-1">
                  <FolderKanban className="size-3.5" strokeWidth={1.6} /> {project.name}
                </span>
              )}
              {revisionOf && <span>Corrects {revisionOf.label}</span>}
              {revisedBy && <span>Replaced by {revisedBy.label}</span>}
            </span>
          )}
        </span>
        <span className="tabular text-right text-[13.5px] sm:text-right">
          <span className="block text-[11.5px] text-ink-3 sm:hidden">Units</span>
          <span className="text-ink">{number(c.totalQuantity)}</span>
          <span className="hidden text-[12px] text-ink-3 sm:block">units</span>
        </span>
        <span className="tabular text-[13.5px] sm:text-right">
          <span className="block text-[11.5px] text-ink-3 sm:hidden">Total cost</span>
          <span className="text-ink">{c.unitCost === null ? 'n/a' : money(c.totalCost)}</span>
          <span className="hidden text-[12px] text-ink-3 sm:block">total</span>
        </span>
        <span className="tabular text-right text-[13.5px]">
          <span className="block text-[11.5px] text-ink-3 sm:hidden">Unit cost</span>
          <span className={c.unitCost === null ? 'text-ink-3' : 'text-ink'}>{c.unitCost === null ? 'No costs yet' : moneyExact(c.unitCost)}</span>
          <span className="hidden text-[12px] text-ink-3 sm:block">{c.unitCost === null ? '' : `${unitEconomics(product.price, c.unitCost).margin.toFixed(1)}% margin`}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onDuplicate}
        aria-label={`Duplicate ${batch.label} as a new batch`}
        title="Duplicate as a new batch"
        className="absolute right-3 top-3.5 inline-flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
      >
        <Copy className="size-4" strokeWidth={1.6} />
      </button>
    </li>
  )
}

export function ProductCosting({ product, data }: { product: Product; data: TrackerDataset }) {
  const navigate = useNavigate()
  const base = `${sectionPath('costing')}/${product.id}`
  const s = summarizeProductCost(product, data.batches)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 rounded-[var(--radius-surface)] border border-line bg-panel p-5 shadow-[var(--shadow-resting)] sm:p-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div>
            <CostingStatusBadge status={s.status} />
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {product.variants.map((v) => (
                <li key={v.id} className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink-2">
                  {v.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-6 border-t border-line-subtle pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <dt className="text-[12px] text-ink-3">Selling price</dt>
            <dd className="tabular mt-1 text-[20px] font-light tracking-[-0.02em] text-ink">{moneyExact(product.price)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-ink-3">Unit cost</dt>
            <dd className={cn('tabular mt-1 text-[20px] font-light tracking-[-0.02em]', s.unitCost === null ? 'text-ink-3' : 'text-ink')}>{s.unitCost === null ? 'Not set' : moneyExact(s.unitCost)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-ink-3">Gross margin</dt>
            <dd className={cn('tabular mt-1 text-[20px] font-light tracking-[-0.02em]', !s.economics ? 'text-ink-3' : s.economics.margin >= 0 ? 'text-profit' : 'text-bad')}>{s.economics ? `${s.economics.margin.toFixed(1)}%` : 'n/a'}</dd>
          </div>
        </dl>
      </header>

      {s.status !== 'costed' && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-[color-mix(in_oklab,var(--warning)_30%,transparent)] bg-warn-soft p-4 sm:flex-row sm:items-center">
          <TriangleAlert className="size-4 shrink-0 text-warn" strokeWidth={1.7} />
          <p className="flex-1 text-[13.5px] text-ink-2">
            {s.draftCount > 0
              ? 'This product has a draft batch but no finalized cost yet, so its sales count at zero cost in your profit figures.'
              : 'No cost is recorded for this product yet, so its sales count at zero cost in your profit figures.'}
          </p>
          <Button size="sm" onClick={() => navigate(s.draftCount > 0 ? `${base}?batch=${s.batches.find((b) => b.status === 'draft')!.id}` : `${base}?batch=new`)}>
            {s.draftCount > 0 ? 'Finish the draft' : 'Add the first batch'}
          </Button>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-label="Batches" className="rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]">
            <header className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
              <div>
                <h3 className="text-[15px] font-medium tracking-[-0.01em] text-ink">Batches</h3>
                <p className="mt-0.5 text-[13px] text-ink-3">Each production run or purchase keeps its own costs. New batches never change old ones.</p>
              </div>
              <Button size="sm" onClick={() => navigate(`${base}?batch=new`)}>
                <Plus className="size-4" strokeWidth={1.7} /> New batch
              </Button>
            </header>
            {s.batches.length === 0 ? (
              <div className="m-5 flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-line-strong px-6 py-10 text-center sm:m-6">
                <p className="text-[14px] text-ink">No batches yet</p>
                <p className="max-w-sm text-[13px] text-ink-3">A batch is one purchase or production run. If you buy this product ready-made, one cost per unit is enough.</p>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => navigate(`${base}?batch=new`)}>
                  Add the first batch
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col gap-2 p-3 pt-4 sm:p-4">
                {s.batches.map((b) => (
                  <BatchRow key={b.id} batch={b} product={product} data={data} onOpen={() => navigate(`${base}?batch=${b.id}`)} onDuplicate={() => navigate(`${base}?batch=new&from=${b.id}`)} />
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Variants" className="rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]">
            <header className="px-5 pt-5 sm:px-6">
              <h3 className="text-[15px] font-medium tracking-[-0.01em] text-ink">Variants</h3>
              <p className="mt-0.5 text-[13px] text-ink-3">{s.current ? `Unit costs from ${s.current.label}, the most recent finalized batch.` : 'Unit costs appear once a batch is finalized.'}</p>
            </header>
            <div className="thin-scroll overflow-x-auto px-2 pb-3 pt-2 sm:px-3">
              <table className="w-full min-w-[440px] text-[13.5px]">
                <thead>
                  <tr className="text-left text-[12px] text-ink-3">
                    <th className="px-3 py-2 font-normal">Variant</th>
                    <th className="px-3 py-2 text-right font-normal">Price</th>
                    <th className="px-3 py-2 text-right font-normal">In stock</th>
                    <th className="px-3 py-2 text-right font-normal">Unit cost</th>
                    <th className="px-3 py-2 text-right font-normal">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((v) => {
                    const vc = s.currentCosting?.variants.find((x) => x.variantId === v.id)
                    const ve = vc?.unitCost == null ? null : unitEconomics(variantPrice(product, v), vc.unitCost)
                    return (
                      <tr key={v.id} className="border-t border-line-subtle">
                        <td className="px-3 py-2.5">
                          <span className="block text-ink">{v.title}</span>
                          <span className="block text-[12px] text-ink-3">{v.sku}</span>
                        </td>
                        <td className="tabular px-3 py-2.5 text-right text-ink">{moneyExact(variantPrice(product, v))}</td>
                        <td className="tabular px-3 py-2.5 text-right text-ink-2">{v.inventory === undefined ? 'n/a' : number(v.inventory)}</td>
                        <td className={cn('tabular px-3 py-2.5 text-right', vc?.unitCost == null ? 'text-ink-3' : 'text-ink')}>{vc?.unitCost == null ? 'Not set' : moneyExact(vc.unitCost)}</td>
                        <td className="tabular px-3 py-2.5 text-right text-ink-2">{ve ? `${ve.margin.toFixed(1)}%` : 'n/a'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <UnitEconomicsPanel
          product={product}
          costing={s.currentCosting}
          title="Current unit economics"
          subtitle={s.current ? `From ${s.current.label}, finalized ${shortDate(s.current.finalizedAt ?? s.current.receivedAt)}` : 'Finalize a batch to set the current cost'}
          className="xl:sticky xl:top-0"
        />
      </div>
    </div>
  )
}
