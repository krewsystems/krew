import { Banknote, PackagePlus, ReceiptText, Tags, Upload, type LucideIcon } from 'lucide-react'
import type { BadgeTone } from '@/components/arc/badge/badge'
import type { ActivityKind, EntrySource } from '@/data/tracker/types'
import type { ProfitStatus } from '@/lib/profitability'

export const ACTIVITY_KIND: Record<ActivityKind, { label: string; icon: LucideIcon }> = {
  batch_created: { label: 'Batch', icon: PackagePlus },
  expense_recorded: { label: 'Expense', icon: ReceiptText },
  cost_updated: { label: 'Cost update', icon: Tags },
  receipt_uploaded: { label: 'Receipt', icon: Upload },
  supplier_payment: { label: 'Supplier payment', icon: Banknote },
}

export const SOURCE_LABEL: Record<EntrySource, string> = {
  manual: 'Entered by you',
  receipt: 'From a receipt',
  tracker: 'Prepared by Tracker',
  telegram: 'Sent on Telegram',
  chat: 'From KREW chat',
  shopify: 'From Shopify',
}

export const PROFIT_STATUS: Record<ProfitStatus, { label: string; tone: BadgeTone }> = {
  healthy: { label: 'Healthy', tone: 'success' },
  low: { label: 'Low margin', tone: 'warning' },
  loss: { label: 'Losing money', tone: 'danger' },
  missing: { label: 'Missing cost', tone: 'warning' },
}
