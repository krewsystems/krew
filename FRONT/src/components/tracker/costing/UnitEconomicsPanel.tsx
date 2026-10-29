import { CircleCheck, TriangleAlert } from 'lucide-react'
import type { Product } from '@/data/tracker/types'
import { unitEconomics, variantPrice, type BatchCosting } from '@/lib/costing'
import { money, moneyExact, number } from '@/lib/format'
import { cn } from '@/lib/utils'

const SHADES = ['bg-[var(--series-1)]', 'bg-[var(--series-4)]', 'bg-[var(--series-2)]', 'bg-[var(--series-3)]']

interface UnitEconomicsPanelProps {
  product: Product
  costing?: BatchCosting
  title: string
  subtitle?: string
  className?: string
}

/** Unit cost, price, profit per unit and margin for one batch, plus where the cost comes from. Updates as costs are edited. */
export function UnitEconomicsPanel({ product, costing, title, subtitle, className }: UnitEconomicsPanelProps) {
  const unit = costing?.unitCost ?? null
  const e = unit === null ? null : unitEconomics(product.price, unit)
  const variantPrices = new Set(product.variants.map((v) => variantPrice(product, v)))

  // Up to four components keep their own shade; the rest fold into "Other" so the bar stays readable.
  const parts = [...(costing?.components ?? [])].filter((c) => c.total > 0).sort((a, b) => b.total - a.total)
  const shown = parts.length > 4 ? parts.slice(0, 3) : parts
  const rest = parts.length > 4 ? parts.slice(3) : []
  const rows = [...shown.map((c) => ({ key: c.id, label: c.label || 'Unnamed cost', perUnit: c.perUnit, total: c.total })), ...(rest.length ? [{ key: 'other', label: `${rest.length} other costs`, perUnit: rest.reduce((s, c) => s + c.perUnit, 0), total: rest.reduce((s, c) => s + c.total, 0) }] : [])]
  const total = costing?.totalCost ?? 0
  const multi = product.variants.length > 1 && (costing?.variants.length ?? 0) > 1

  return (
    <section aria-label={title} className={cn('grain rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]', className)}>
      <header className="px-5 pt-5">
        <h2 className="text-[15px] font-medium tracking-[-0.01em] text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-3">{subtitle}</p>}
      </header>

      <div className="px-5 pt-4">
        <p className="text-[12.5px] text-ink-3">Unit cost</p>
        <p className="tabular mt-1 text-[34px] font-light leading-none tracking-[-0.03em] text-ink">{unit === null ? <span className="text-ink-3">Not set</span> : moneyExact(unit)}</p>
        <p className="tabular mt-2 text-[12.5px] text-ink-3">
          {costing && costing.totalQuantity > 0 ? `${money(total)} across ${number(costing.totalQuantity)} units` : 'Add a quantity and at least one cost'}
        </p>
      </div>

      <dl className="mx-5 mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-line bg-line">
        <div className="bg-panel px-3.5 py-3">
          <dt className="text-[12px] text-ink-3">Selling price{variantPrices.size > 1 ? ', from' : ''}</dt>
          <dd className="tabular mt-0.5 text-[16px] text-ink">{moneyExact(product.price)}</dd>
        </div>
        <div className="bg-panel px-3.5 py-3">
          <dt className="text-[12px] text-ink-3">Total batch cost</dt>
          <dd className="tabular mt-0.5 text-[16px] text-ink">{money(total)}</dd>
        </div>
        <div className="bg-panel px-3.5 py-3">
          <dt className="text-[12px] text-ink-3">Gross profit per unit</dt>
          <dd className={cn('tabular mt-0.5 text-[16px]', !e ? 'text-ink-3' : e.grossProfit >= 0 ? 'text-profit' : 'text-bad')}>{e ? moneyExact(e.grossProfit) : 'n/a'}</dd>
        </div>
        <div className="bg-panel px-3.5 py-3">
          <dt className="text-[12px] text-ink-3">Gross margin</dt>
          <dd className={cn('tabular mt-0.5 text-[16px]', !e ? 'text-ink-3' : e.margin >= 0 ? 'text-profit' : 'text-bad')}>{e ? `${e.margin.toFixed(1)}%` : 'n/a'}</dd>
        </div>
      </dl>

      {rows.length > 0 && (
        <div className="px-5 pt-5">
          <p className="text-[12.5px] text-ink-3">Where the unit cost comes from</p>
          <div className="mt-2.5 flex h-2 w-full gap-[2px]" aria-hidden>
            {rows.map((r, i) => (
              <span key={r.key} className={cn('h-full rounded-[3px] transition-[width] duration-300', SHADES[i])} style={{ width: `${(r.total / (total || 1)) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {rows.map((r, i) => (
              <li key={r.key} className="flex items-center gap-2.5 text-[13px]">
                <span className={cn('size-2 shrink-0 rounded-[2px]', SHADES[i])} />
                <span className="min-w-0 flex-1 truncate text-ink-2">{r.label}</span>
                <span className="tabular text-ink">{moneyExact(r.perUnit)}</span>
                <span className="tabular w-10 text-right text-[12px] text-ink-3">{Math.round((r.total / (total || 1)) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {multi && costing && (
        <div className="px-5 pt-5">
          <p className="text-[12.5px] text-ink-3">By variant</p>
          <table className="mt-2 w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] text-ink-3">
                <th className="py-1 font-normal">Variant</th>
                <th className="py-1 text-right font-normal">Units</th>
                <th className="py-1 text-right font-normal">Unit cost</th>
                <th className="py-1 text-right font-normal">Margin</th>
              </tr>
            </thead>
            <tbody>
              {costing.variants.map((v) => {
                const variant = product.variants.find((x) => x.id === v.variantId)
                const ve = v.unitCost === null ? null : unitEconomics(variantPrice(product, variant), v.unitCost)
                return (
                  <tr key={v.variantId} className="border-t border-line-subtle">
                    <td className="py-1.5 pr-2 text-ink">{variant?.title ?? v.variantId}</td>
                    <td className="tabular py-1.5 text-right text-ink-2">{number(v.quantity)}</td>
                    <td className="tabular py-1.5 text-right text-ink">{v.unitCost === null ? 'n/a' : moneyExact(v.unitCost)}</td>
                    <td className="tabular py-1.5 text-right text-ink-2">{ve ? `${ve.margin.toFixed(1)}%` : 'n/a'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className={cn('mt-2 flex items-center gap-1.5 text-[12px]', costing.reconciles ? 'text-ink-3' : 'text-warn')}>
            {costing.reconciles ? <CircleCheck className="size-3.5 text-good" strokeWidth={1.7} /> : <TriangleAlert className="size-3.5" strokeWidth={1.7} />}
            {costing.reconciles
              ? `Variant costs add up to the batch total of ${money(total)}.`
              : 'Some costs could not be allocated to variants, so variant costs do not add up yet.'}
          </p>
        </div>
      )}

      <p className="mx-5 mb-5 mt-5 border-t border-line-subtle pt-4 text-[12px] leading-relaxed text-ink-3">Only production and purchase costs count here. Advertising and project expenses stay out of product cost.</p>
    </section>
  )
}
