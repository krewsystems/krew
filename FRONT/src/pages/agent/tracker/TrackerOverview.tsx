import { FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/arc/empty-state/empty-state'
import { Skeleton } from '@/components/arc/skeleton/skeleton'
import { ActivityPanel } from '@/components/tracker/ActivityPanel'
import { AttentionPanel, type IssueId } from '@/components/tracker/AttentionPanel'
import { PerformancePanel } from '@/components/tracker/PerformancePanel'
import { PeriodPicker } from '@/components/tracker/PeriodPicker'
import { ProfitabilityPanel } from '@/components/tracker/ProfitabilityPanel'
import { ProfitHero } from '@/components/tracker/ProfitHero'
import { ProjectsPanel } from '@/components/tracker/ProjectsPanel'
import { SupportingMetrics } from '@/components/tracker/SupportingMetrics'
import { useOverviewFigures, usePeriod, useTrackerData } from '@/components/tracker/use-tracker'
import { productsMissingCost } from '@/lib/finance'
import { shortDate } from '@/lib/format'

export function TrackerOverview() {
  const { ws, data, costs, loading } = useTrackerData()
  const period = usePeriod(data.ledger)
  const figures = useOverviewFigures(data, costs, period.period)
  const [issue, setIssue] = useState<IssueId | null>(null)

  if (data.ledger.length === 0) {
    return (
      <div className="rounded-[var(--radius-surface)] border border-line bg-panel py-12">
        <EmptyState title="No financial data yet" description="Tracker builds this view from your store’s orders and the costs you record. It fills in once Shopify is connected." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[24px] font-medium leading-tight tracking-[-0.025em] text-ink">Financial overview</h2>
          <p className="tabular mt-1.5 text-[13.5px] text-ink-3">
            {shortDate(period.period.from)} to {shortDate(period.period.to)}, compared with the previous {figures.length} days
          </p>
        </div>
        <PeriodPicker key={`${period.period.from}:${period.period.to}`} state={period} />
      </header>

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton label="Loading profit and sales" lines={6} loading={loading} className="min-h-[360px]">
          <ProfitHero
            current={figures.current}
            prior={figures.prior}
            series={figures.series}
            missingCogs={figures.missingCogs}
            missingProducts={productsMissingCost(data).length}
            finalized={figures.finalized}
            through={figures.through}
            onReviewCosts={() => setIssue('costs')}
            className="h-full"
          />
        </Skeleton>
        <AttentionPanel data={data} products={figures.products} open={issue} onOpenChange={setIssue} />
      </div>

      <SupportingMetrics current={figures.current} prior={figures.prior} />

      <PerformancePanel series={figures.series} through={figures.through} loading={loading} className="mt-2" />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <ProfitabilityPanel data={data} products={figures.products} />
        <ActivityPanel entries={data.activity} />
      </div>

      <ProjectsPanel data={data} />

      <p className="flex items-center gap-1.5 pb-6 text-[12px] text-ink-3">
        <FlaskConical className="size-3.5 shrink-0" strokeWidth={1.6} />
        Sample data for {ws.brand.name}, in USD. Sales follow the store’s simulated orders; costs, batches and expenses are illustrative.
      </p>
    </div>
  )
}
