import { MessagesSquare } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { DonutChart } from '@/components/arc/donut-chart/donut-chart'
import SegmentedControl from '@/components/arc/segmented-control/segmented-control'
import { Panel } from '@/components/common/Panel'
import { conversationMix } from '@/data/luna/volume'
import { number } from '@/lib/format'
import { useWorkspace } from '@/store/krew'

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
]

/** What customer DMs are about, as classified by Luna, over a chosen period. Used on the Overview and in Luna's Insights. */
export function ConversationMix({ title = 'Customer conversations', href, className, footer }: { title?: string; href?: string; className?: string; footer?: ReactNode }) {
  const ws = useWorkspace()
  const [range, setRange] = useState('7')
  const days = Number(range)
  const mix = useMemo(() => conversationMix(ws.id, days), [ws.id, days])
  const change = mix.previousTotal ? Math.round(((mix.total - mix.previousTotal) / mix.previousTotal) * 100) : null

  return (
    <Panel
      title={title}
      icon={<MessagesSquare />}
      description="Classified by Luna"
      href={href}
      hrefLabel="Open Luna"
      className={className}
    >
      <div className="mb-4">
        <SegmentedControl label="Time frame" value={range} onValueChange={setRange} options={RANGES} />
      </div>
      <DonutChart key={range} label="Conversations by topic" unit="conversations" data={mix.current.map((m) => ({ key: m.key, label: m.label, value: m.value }))} size={180} thickness={20} />
      <p className="mt-3 text-[12px] text-ink-3">
        {number(mix.total)} conversations
        {change !== null && ` · ${change === 0 ? 'same as' : `${change > 0 ? '+' : ''}${change}% on`} the previous ${days} days`}
      </p>
      {footer}
    </Panel>
  )
}
