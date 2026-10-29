import { Bot, MessageCircle, PenLine, Send, type LucideIcon } from 'lucide-react'
import type { BadgeTone } from '@/components/arc/badge/badge'
import type { ExpenseSource, ExpenseStatus, ExpenseTreatment, PaymentMethod } from '@/data/tracker/types'
import type { ExpenseClass } from '@/lib/expenses'

export const EXPENSE_STATUS: Record<ExpenseStatus, { label: string; tone: BadgeTone }> = {
  needs_review: { label: 'To review', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  void: { label: 'Void', tone: 'neutral' },
}

export const EXPENSE_SOURCE: Record<ExpenseSource, { label: string; icon: LucideIcon }> = {
  manual: { label: 'Manual', icon: PenLine },
  telegram: { label: 'Telegram', icon: Send },
  chat: { label: 'KREW chat', icon: MessageCircle },
  tracker: { label: 'Agent-prepared', icon: Bot },
}

/** How an entry counts, in the owner's words. The category is only a label; this is what decides where the money goes. */
export const TREATMENT: Record<ExpenseTreatment, { label: string; short: string; help: string }> = {
  operating: { label: 'Operating expense', short: 'Operating', help: 'A cost of running the business, such as ads, rent or a shoot. Counts in operating expenses, and in a project when you link one.' },
  production: { label: 'Production cost', short: 'Production', help: 'A cost of making or buying stock. It belongs to a batch in Product costing and reaches profit as units sell, so it is never counted again here.' },
  non_expense: { label: 'Not an expense', short: 'Not an expense', help: 'Money that moved without being a new cost: a supplier payment, a deposit, a refund, a transfer or an owner contribution.' },
}

export const CLASS_LABEL: Record<ExpenseClass, string> = {
  project: 'Project expense',
  operating: 'Operating expense',
  production: 'Production cost',
  non_expense: 'Not an expense',
  unclassified: 'Not classified',
}

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  card: 'Card',
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  wallet: 'Mobile wallet',
  other: 'Other',
}
