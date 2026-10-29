// Sample Tracker reports, in the shared KREW Report shape. They live in the workspace's reports list like every other
// agent report, so they appear in the Reports library, in chat attachments and in Finance → Reports alike.
// Figures are illustrative snapshots, consistent with the Tracker demo records where they overlap.

import { ago, D, H } from '../seed-utils'
import type { Report } from '../types'

const sahra = (t: (minutes: number) => string): Report[] => [
  {
    id: 'rep_tr_profit',
    agentId: 'tracker',
    topic: 'profitability',
    title: 'Product profitability, last 30 days',
    kind: 'ad-hoc',
    period: 'Last 30 days',
    createdAt: t(1 * D + 5 * H),
    summary: 'Five of seven products are healthy at 47% to 68% gross margin. Two have no recorded cost, so their profit is not known yet.',
    highlights: [
      { label: 'Gross profit', value: '$359K', change: '+8%', tone: 'good' },
      { label: 'Gross margin', value: '63.1%', change: '-1.2 pts', tone: 'bad' },
      { label: 'Products without cost', value: '2', tone: 'bad' },
    ],
    sections: [
      { id: 'leaders', title: 'What earns the most', body: 'Dune linen bedding leads on gross profit, then the terracotta mug set and the Oasis serving bowl.', bullets: ['Dune linen bedding set: $101K at 60%', 'Terracotta mug set: $87K at 68%', 'Oasis serving bowl: $56K at 62%'] },
      { id: 'thin', title: 'Where margin is thinner', body: 'The Siwa wool throw drives 17% of sales at a 47.6% margin, about 13 points under the business. Freight and duties are a fifth of its cost.' },
      { id: 'missing', title: 'Missing costs', body: 'The Winter ember mug and the Kilim cushion cover have no finalized batch, so $34.6K of sales count at zero cost. Add their batches in Product costing.' },
    ],
  },
  {
    id: 'rep_tr_expenses',
    agentId: 'tracker',
    topic: 'expenses',
    title: 'Expense breakdown, last 30 days',
    kind: 'weekly',
    period: 'Last 30 days',
    createdAt: t(2 * D + 3 * H),
    summary: '$26.8K of confirmed expenses, half of them linked to the winter collection. Seven entries are waiting for review and are not counted.',
    highlights: [
      { label: 'Confirmed expenses', value: '$26.8K' },
      { label: 'Project expenses', value: '$13.0K' },
      { label: 'To review', value: '7', tone: 'bad' },
    ],
    sections: [
      { id: 'where', title: 'Where the money went', body: 'Rent and the winter campaign are the two largest items.', bullets: ['Studio rent $9,000', 'Launch ads, winter $6,200', 'Lookbook shoot $3,800', 'Creator posts $1,450'] },
      { id: 'review', title: 'Waiting for you', body: 'A Meta invoice of $9,420 and a $1,500 photoshoot sent in chat are the largest entries to confirm. Neither counts until you do.' },
      { id: 'excluded', title: 'Recorded, not counted', body: 'The DHL freight invoice belongs to batch DN-07 and the Fayoum Linen Mill payment settles a batch already costed, so neither is an expense.' },
    ],
  },
  {
    id: 'rep_tr_winter',
    agentId: 'tracker',
    topic: 'projects',
    title: 'Winter collection 2026, progress',
    kind: 'ad-hoc',
    period: 'Since Sep 1',
    createdAt: t(3 * D + 8 * H),
    summary: 'Winter is profitable from its own batches, but project expenses are high for the sales so far, and batch WN-01 still has no cost.',
    highlights: [
      { label: 'Project expenses', value: '$14.3K' },
      { label: 'Budget used', value: '68%' },
      { label: 'Batches without cost', value: '1', tone: 'bad' },
    ],
    sections: [
      { id: 'sales', title: 'Sales and profit', body: 'Sales count only from the project’s own batches, DN-08 Winter and WN-01. Profit reads high until WN-01 is costed.' },
      { id: 'spend', title: 'Spending', body: 'Lookbook shoot, launch ads, samples and props make up the project’s expenses, each counted once.' },
    ],
  },
  {
    id: 'rep_tr_costs',
    agentId: 'tracker',
    topic: 'costs',
    title: 'Cost and margin review: bedding',
    kind: 'ad-hoc',
    period: 'Batches DN-05 to DN-08',
    createdAt: t(9 * D + 2 * H),
    summary: 'The bedding unit cost rose 14% between DN-05 and DN-07, taking about 4 margin points at the same price. DN-08 held steady.',
    highlights: [
      { label: 'Unit cost, DN-08', value: '$88.58', change: '+1.3%' },
      { label: 'Margin at list price', value: '63.1%', change: '-0.5 pts' },
    ],
    sections: [
      { id: 'drivers', title: 'What moved', body: 'Linen fabric went from $49 to $52 a unit, and DN-07 added a King-size fabric cost.', bullets: ['DN-05: $76.75 a unit', 'DN-07: $87.40 a unit', 'DN-08 Winter: $88.58 a unit'] },
      { id: 'options', title: 'Options', body: 'A price review on King sets, or a fabric quote from a second mill, would recover most of the lost margin.' },
    ],
  },
]

const noor = (t: (minutes: number) => string): Report[] => [
  {
    id: 'nrep_tr_profit',
    agentId: 'tracker',
    topic: 'profitability',
    title: 'Product profitability, last 30 days',
    kind: 'ad-hoc',
    period: 'Last 30 days',
    createdAt: t(2 * D + 6 * H),
    summary: 'Serum and SPF lead on gross profit. Barrier mist has only a draft batch, so its cost is not recorded yet.',
    highlights: [
      { label: 'Products without cost', value: '1', tone: 'bad' },
      { label: 'Top earner', value: 'Vitamin C serum' },
    ],
    sections: [{ id: 'missing', title: 'Missing costs', body: 'Finish batch BM-01 in Product costing so barrier mist sales carry a cost.' }],
  },
]

/** Tracker's sample reports for a workspace, dated relative to when the demo was seeded. */
export function trackerSampleReports(workspaceId: string, now = Date.now()): Report[] {
  const t = (minutes: number) => ago(minutes, now)
  return workspaceId === 'sahra' ? sahra(t) : workspaceId === 'noor' ? noor(t) : []
}
