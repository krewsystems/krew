import { FolderKanban, PieChart, ReceiptText, Scale, type LucideIcon } from 'lucide-react'

/** Statements are always available: built live from the records for any period, never generated or stored. */
export type StatementId = 'pnl' | 'expenses' | 'margins' | 'seasons'

export const STATEMENTS: { id: StatementId; title: string; description: string; icon: LucideIcon; color: string }[] = [
  { id: 'pnl', title: 'Profit and loss', description: 'Sales, cost of goods, operating costs and net profit, against the previous period.', icon: Scale, color: 'var(--profit)' },
  { id: 'expenses', title: 'Expense statement', description: 'Confirmed expenses by category, with what belongs to projects.', icon: ReceiptText, color: 'var(--agent-ads)' },
  { id: 'margins', title: 'Product margins', description: 'Revenue, cost of goods and gross margin by collection and product.', icon: PieChart, color: 'var(--sales)' },
  { id: 'seasons', title: 'Seasons and projects', description: 'What each season or project earned after its own costs.', icon: FolderKanban, color: 'var(--agent-store)' },
]
