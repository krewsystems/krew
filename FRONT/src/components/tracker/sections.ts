import { Boxes, FileBarChart2, FolderKanban, LayoutDashboard, PieChart, ReceiptText, type LucideIcon } from 'lucide-react'

export type TrackerSectionId = 'overview' | 'costing' | 'seasons' | 'expenses' | 'profitability' | 'reports'

export interface TrackerSection {
  id: TrackerSectionId
  label: string
  icon: LucideIcon
  /** Built in this stage. The others render a preview of what is coming. */
  ready: boolean
  summary: string
  planned: string[]
}

export const TRACKER_SECTIONS: TrackerSection[] = [
  {
    id: 'overview',
    label: 'Summary',
    icon: LayoutDashboard,
    ready: true,
    summary: 'The financial state of the business at a glance.',
    planned: [],
  },
  {
    id: 'costing',
    label: 'Product costing',
    icon: Boxes,
    ready: true,
    summary: 'What each product really costs to make or buy, batch by batch.',
    planned: [
      'Your own cost fields, such as materials, labour, packaging or freight',
      'Enter each cost per unit or as one amount for the whole batch',
      'Shared batch costs spread across the units produced',
      'Works for brands that manufacture and brands that resell',
    ],
  },
  {
    id: 'seasons',
    label: 'Seasons',
    icon: FolderKanban,
    ready: true,
    summary: 'Seasons and projects group batches, expenses and revenue around a collection or launch.',
    planned: [
      'Optional groupings, such as a winter collection or a gifting season',
      'Batches keep their own costs and history inside a project',
      'Project expenses stay separate from product inventory cost',
      'Budget, spend and revenue against target for each project',
    ],
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: ReceiptText,
    ready: true,
    summary: 'Every cost of running the business, categorized and backed by receipts.',
    planned: [
      'Record expenses by hand or from a photo of the receipt',
      'Send receipts to Tracker in chat or on Telegram',
      'Anything Tracker prepares waits for you to confirm it',
      'Categories, suppliers and payment status',
    ],
  },
  {
    id: 'profitability',
    label: 'Profitability',
    icon: PieChart,
    ready: true,
    summary: 'Margin by product, collection, channel and season.',
    planned: [
      'Gross and contribution margin for every product and collection',
      'Profit by sales channel and by season',
      'Margin trends and the costs behind each change',
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileBarChart2,
    ready: true,
    summary: 'Tracker’s financial reports, the same ones shared in chat and in the Reports library.',
    planned: [],
  },
]

export function trackerSection(id: string | undefined): TrackerSection {
  return TRACKER_SECTIONS.find((s) => s.id === id) ?? TRACKER_SECTIONS[0]
}

export function sectionPath(id: TrackerSectionId): string {
  return id === 'overview' ? '/krew/tracker/workspace' : `/krew/tracker/workspace/${id}`
}
