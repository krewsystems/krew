import { ArrowRight, CircleCheck, Inbox, PackageX, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Drawer, DrawerContent } from '@/components/arc/drawer/drawer'
import type { TrackerDataset } from '@/data/tracker/types'
import { allCategories, categoryLabel } from '@/lib/expenses'
import { productsMissingCost, type ProfitRow } from '@/lib/finance'
import { money, relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EXPENSE_SOURCE } from './expenses/labels'
import { sectionPath, type TrackerSectionId } from './sections'

export type IssueId = 'costs' | 'review'

interface Issue {
  id: IssueId
  icon: LucideIcon
  count: number
  title: string
  impact: string
  section: TrackerSectionId
  /** Where the link goes, when it is more than the section itself. */
  to?: string
  sectionLabel: string
}

interface AttentionPanelProps {
  data: TrackerDataset
  products: ProfitRow[]
  /** The issue whose records are open in the drawer. Controlled so other parts of the page can open it. */
  open: IssueId | null
  onOpenChange: (id: IssueId | null) => void
  className?: string
}

/** Missing or unconfirmed information, ordered by how much it distorts the numbers. Each opens the records behind it. */
export function AttentionPanel({ data, products, open, onOpenChange, className }: AttentionPanelProps) {
  const missing = productsMissingCost(data)
  // Entries to confirm come from the expense records themselves, the same list the Expenses section reviews.
  const review = data.expenses.filter((e) => e.status === 'needs_review').sort((a, b) => b.at.localeCompare(a.at))
  const reviewTotal = review.reduce((s, e) => s + e.amount, 0)
  const uncategorized = review.filter((e) => !e.category).length
  const categories = allCategories(data.expenseCategories)
  const missingSales = missing.reduce((s, m) => s + (products.find((r) => r.id === m.product.id)?.revenue ?? 0), 0)

  const all: Issue[] = [
    {
      id: 'costs',
      icon: PackageX,
      count: missing.length,
      title: `${missing.length} ${missing.length === 1 ? 'product has' : 'products have'} no cost`,
      impact: `${money(missingSales)} of sales count at zero cost, so profit reads high.`,
      section: 'costing',
      sectionLabel: 'Add costs in Product costing',
    },
    {
      id: 'review',
      icon: Inbox,
      count: review.length,
      title: `${review.length} ${review.length === 1 ? 'entry' : 'entries'} to confirm`,
      impact: `${money(reviewTotal)} prepared by Tracker or missing details${uncategorized ? `, ${uncategorized} without a category` : ''}. Not counted until you confirm.`,
      section: 'expenses',
      to: `${sectionPath('expenses')}?status=needs_review`,
      sectionLabel: 'Review in Expenses',
    },
  ]
  const issues = all.filter((i) => i.count > 0)
  const active = issues.find((i) => i.id === open)

  return (
    <section aria-label="Needs attention" className={cn('flex flex-col rounded-[var(--radius-surface)] border border-line bg-panel shadow-[var(--shadow-resting)]', className)}>
      <header className="flex items-center justify-between gap-3 px-5 pb-1 pt-5">
        <h2 className="text-[15px] font-medium tracking-[-0.01em] text-ink">Needs attention</h2>
        {issues.length > 0 && <span className="tabular rounded-full bg-warn-soft px-2 py-0.5 text-[12px] text-warn">{issues.length} to resolve</span>}
      </header>
      {issues.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          <CircleCheck className="size-5 text-good" strokeWidth={1.6} />
          <p className="text-[13.5px] text-ink">Everything is recorded</p>
          <p className="text-[12.5px] text-ink-3">Every product has a cost and every expense entry is confirmed.</p>
        </div>
      ) : (
        <>
          <p className="px-5 text-[13px] text-ink-3">Resolve these to make the numbers reliable.</p>
          <ul className="flex flex-col gap-2 p-3 pt-4">
            {issues.map((i, index) => {
              const Icon = i.icon
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => onOpenChange(i.id)}
                    className={cn(
                      'group flex w-full gap-3 rounded-[12px] border p-3.5 text-left transition-colors',
                      index === 0 ? 'border-[color-mix(in_oklab,var(--warning)_28%,transparent)] bg-warn-soft hover:border-[color-mix(in_oklab,var(--warning)_50%,transparent)]' : 'border-line-subtle bg-panel-muted hover:border-line-strong',
                    )}
                  >
                    <Icon className={cn('mt-0.5 size-4 shrink-0', index === 0 ? 'text-warn' : 'text-ink-2')} strokeWidth={1.6} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] text-ink">{i.title}</span>
                      <span className="mt-1 block text-[12.5px] leading-snug text-ink-2">{i.impact}</span>
                    </span>
                    <ArrowRight className="mt-0.5 size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" strokeWidth={1.6} />
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <Drawer open={!!active} onOpenChange={(o) => !o && onOpenChange(null)}>
        {active && (
          <DrawerContent title={active.title} description={active.impact}>
            <div className="flex flex-col gap-4">
              {active.id === 'costs' && (
                <ul className="flex flex-col divide-y divide-line-subtle rounded-[12px] border border-line">
                  {missing.map((m) => {
                    const row = products.find((r) => r.id === m.product.id)
                    return (
                      <li key={m.product.id}>
                        <Link to={`${sectionPath('costing')}/${m.product.id}`} onClick={() => onOpenChange(null)} className="flex items-start justify-between gap-3 p-3.5 transition-colors hover:bg-panel-muted">
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] text-ink">{m.product.name}</p>
                            <p className="mt-0.5 text-[12.5px] text-ink-3">{m.batch ? `Batch ${m.batch.label} is a draft without final costs` : 'No batch or purchase recorded'}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="tabular text-[13.5px] text-ink">{money(row?.revenue ?? 0)}</p>
                            <p className="tabular text-[12px] text-ink-3">{row?.units ?? 0} units sold</p>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
              {active.id === 'review' && (
                <ul className="flex flex-col divide-y divide-line-subtle rounded-[12px] border border-line">
                  {review.map((e) => (
                    <li key={e.id}>
                      <Link to={`${sectionPath('expenses')}/${e.id}`} onClick={() => onOpenChange(null)} className="flex items-start justify-between gap-3 p-3.5 transition-colors hover:bg-panel-muted">
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] text-ink">
                            {e.label}
                            {e.vendor ? ` · ${e.vendor}` : ''}
                          </p>
                          <p className="mt-0.5 text-[12.5px] text-ink-3">
                            {EXPENSE_SOURCE[e.source].label} · {e.category ? categoryLabel(e.category, categories) : <span className="text-warn">No category</span>} · {relativeTime(e.at)}
                          </p>
                        </div>
                        <p className="tabular shrink-0 text-[13.5px] text-ink">{money(e.amount)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="rounded-[12px] bg-panel-muted p-3.5 text-[12.5px] text-ink-2">
                {active.section === 'costing'
                  ? 'Open a product to add a batch and its costs. Profit updates as soon as the batch is finalized.'
                  : 'Open an entry to check it, fix anything that is off and confirm it. Nothing Tracker prepares counts until you do.'}
              </div>
              <Link to={active.to ?? sectionPath(active.section)} onClick={() => onOpenChange(null)} className="inline-flex items-center gap-1 self-start text-[13px] text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
                {active.sectionLabel} <ArrowRight className="size-3.5" strokeWidth={1.6} />
              </Link>
            </div>
          </DrawerContent>
        )}
      </Drawer>
    </section>
  )
}
