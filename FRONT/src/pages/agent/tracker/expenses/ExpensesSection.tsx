import { ReceiptText } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ProductSheet } from '@/components/tracker/costing/ProductSheet'
import { EXPENSE_STATUS } from '@/components/tracker/expenses/labels'
import { sectionPath } from '@/components/tracker/sections'
import { useTrackerData } from '@/components/tracker/use-tracker'
import { money } from '@/lib/format'
import { ExpenseDetail } from './ExpenseDetail'
import { ExpenseForm } from './ExpenseForm'
import { ExpensesLedger } from './ExpensesLedger'

function ExpenseIcon() {
  return (
    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-line bg-sunken text-ink-2">
      <ReceiptText className="size-[18px]" strokeWidth={1.6} />
    </span>
  )
}

/**
 * Expenses: the ledger, with one entry (or the add form) open in the same focused sheet as Product costing and Seasons.
 * /expenses/new adds (?forProject= pre-selects a project), /expenses/:id opens an entry, ?edit=1 edits or reviews it.
 */
export function ExpensesSection() {
  const { itemId } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { data } = useTrackerData()
  const creating = itemId === 'new'
  const found = data.expenses.find((e) => e.id === itemId)
  const editing = !!found && found.status !== 'void' && params.get('edit') === '1'
  const base = sectionPath('expenses')

  // The ledger's filters live in its URL; closing the sheet returns to them.
  const [listSearch, setListSearch] = useState('')
  if (!itemId && location.search !== listSearch) setListSearch(location.search)

  // Keep showing the last entry while the sheet animates closed.
  const [lastId, setLastId] = useState(itemId)
  if (itemId && itemId !== lastId) setLastId(itemId)
  const expense = found ?? data.expenses.find((e) => e.id === lastId)
  const open = creating || !!found
  const showingNew = creating || (!found && lastId === 'new')

  return (
    <>
      <ExpensesLedger />
      {(expense || showingNew) && (
        <ProductSheet
          open={open}
          onClose={() => navigate(`${base}${listSearch}`)}
          viewKey={`${itemId}:${editing}`}
          thumb={<ExpenseIcon />}
          name={showingNew ? 'New expense' : expense!.label}
          meta={showingNew ? `Expenses · amounts in ${data.currency}` : `${money(expense!.amount)} · ${EXPENSE_STATUS[expense!.status].label}`}
          trail={editing ? [{ label: expense!.status === 'needs_review' ? 'Review' : 'Edit', onClick: () => navigate(`${base}/${expense!.id}`) }] : []}
        >
          {showingNew ? (
            <ExpenseForm key={`new:${params.get('forProject') ?? ''}`} data={data} projectId={params.get('forProject') ?? undefined} />
          ) : editing ? (
            <ExpenseForm key={expense!.id} data={data} expense={expense} />
          ) : (
            <ExpenseDetail expense={expense!} data={data} />
          )}
        </ProductSheet>
      )}
    </>
  )
}
