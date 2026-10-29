import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Expand, FileText, Paperclip, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/arc/button/button'
import type { Expense, ReceiptFile } from '@/data/tracker/types'
import { receiptProblem } from '@/lib/expenses'
import { loadReceiptFile } from '@/lib/receipt-files'
import { cn } from '@/lib/utils'
import { sampleReceiptUrl } from './sample-receipt'

const size = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

/** A viewable URL for a receipt: a drawn sample, the unsaved file picked in the form, or the stored file. */
function useReceiptUrl(ws: string, receipt: ReceiptFile | undefined, expense: Pick<Expense, 'vendor' | 'label' | 'amount' | 'at' | 'reference'>, local?: File) {
  const [state, setState] = useState<{ key: string; url?: string; missing?: boolean }>({ key: '' })
  const stored = receipt && !receipt.sample && !local ? receipt.id : undefined
  const key = stored ?? ''
  const sample = receipt?.sample && !local ? sampleReceiptUrl(expense) : undefined
  // A file picked in the form is shown straight from memory; its URL is released when it changes.
  const localUrl = useMemo(() => (local ? URL.createObjectURL(local) : undefined), [local])
  useEffect(() => () => void (localUrl && URL.revokeObjectURL(localUrl)), [localUrl])

  useEffect(() => {
    if (!stored) return
    let url: string | undefined
    let live = true
    loadReceiptFile(ws, stored)
      .then((blob) => {
        if (!live) return
        if (!blob) return setState({ key: stored, missing: true })
        url = URL.createObjectURL(blob)
        setState({ key: stored, url })
      })
      .catch(() => live && setState({ key: stored, missing: true }))
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [ws, stored])

  if (localUrl) return { url: localUrl, missing: false, loading: false }
  if (sample) return { url: sample, missing: false, loading: false }
  const current = state.key === key
  return { url: current ? state.url : undefined, missing: current && !!state.missing, loading: !!key && !current }
}

function Preview({ url, type, name, large }: { url: string; type: string; name: string; large?: boolean }) {
  if (type === 'application/pdf')
    return <iframe src={url} title={`Receipt ${name}`} className={cn('w-full rounded-[10px] border border-line bg-panel', large ? 'h-[78vh]' : 'h-[340px]')} />
  return <img src={url} alt={`Receipt ${name}`} className={cn('mx-auto rounded-[10px] object-contain', large ? 'max-h-[80vh]' : 'max-h-[340px]')} />
}

interface ReceiptViewProps {
  ws: string
  receipt?: ReceiptFile
  /** A file picked in the form but not saved yet. */
  local?: File
  expense: Pick<Expense, 'vendor' | 'label' | 'amount' | 'at' | 'reference'>
  /** Hidden when the entry cannot change, such as a voided one. */
  onAttach?: (file: File) => void
  onRemove?: () => void
  className?: string
}

/** The receipt behind an entry: a preview that opens full size, or a quiet drop area when there is none. A receipt is never required. */
export function ReceiptView({ ws, receipt, local, expense, onAttach, onRemove, className }: ReceiptViewProps) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const [full, setFull] = useState(false)
  const meta = local ? { name: local.name, type: local.type, size: local.size, sample: false } : receipt
  const { url, missing, loading } = useReceiptUrl(ws, receipt, expense, local)

  const pick = (file: File | undefined) => {
    if (!file || !onAttach) return
    const problem = receiptProblem(file)
    setError(problem)
    if (!problem) onAttach(file)
  }

  const picker = (
    <input
      ref={input}
      type="file"
      accept="image/*,application/pdf"
      className="sr-only"
      tabIndex={-1}
      aria-label="Receipt file"
      onChange={(e) => {
        pick(e.target.files?.[0])
        e.target.value = ''
      }}
    />
  )

  if (!meta) {
    return (
      <div className={className}>
        {picker}
        <div
          onDragOver={(e) => {
            if (!onAttach) return
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            pick(e.dataTransfer.files?.[0])
          }}
          className={cn('flex flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed px-5 py-9 text-center transition-colors', over ? 'border-ink bg-panel-muted' : 'border-line-strong')}
        >
          <Paperclip className="size-5 text-ink-3" strokeWidth={1.5} />
          <p className="text-[13.5px] text-ink">No receipt attached</p>
          <p className="max-w-[240px] text-[12.5px] text-ink-3">{onAttach ? 'Optional. Drop an image or PDF here, up to 10 MB.' : 'This entry was saved without one.'}</p>
          {onAttach && (
            <Button type="button" size="sm" variant="secondary" className="mt-1" onClick={() => input.current?.click()}>
              <Upload className="size-4" strokeWidth={1.6} /> Attach receipt
            </Button>
          )}
        </div>
        {error && <p className="mt-2 text-[12.5px] text-warn">{error}</p>}
      </div>
    )
  }

  return (
    <div className={className}>
      {picker}
      <div className="overflow-hidden rounded-[14px] border border-line bg-panel">
        <div className="grain relative bg-sunken p-3">
          {url ? (
            <button type="button" onClick={() => setFull(true)} className="group relative block w-full" aria-label="Open the receipt full size">
              <Preview url={url} type={meta.type} name={meta.name} />
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-panel/90 px-2 py-1 text-[11.5px] text-ink-2 opacity-0 shadow-[var(--shadow-resting)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Expand className="size-3" strokeWidth={1.8} /> Full size
              </span>
            </button>
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center text-[12.5px] text-ink-3">
              <FileText className="size-5" strokeWidth={1.5} />
              {loading ? 'Loading the receipt' : missing ? 'The file is not stored in this browser. The record of it is kept.' : null}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line-subtle px-3.5 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] text-ink">{meta.name}</span>
            <span className="block text-[12px] text-ink-3">{meta.sample ? 'Sample receipt drawn for the demo' : `${meta.type === 'application/pdf' ? 'PDF' : 'Image'} · ${size(meta.size)}${local ? ' · saved with the entry' : ''}`}</span>
          </span>
          {onAttach && (
            <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-1 text-[12.5px] text-ink-2 hover:text-ink">
              <RefreshCw className="size-3.5" strokeWidth={1.7} /> Replace
            </button>
          )}
          {onRemove && (
            <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-[12.5px] text-ink-2 hover:text-bad">
              <Trash2 className="size-3.5" strokeWidth={1.7} /> Remove
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-[12.5px] text-warn">{error}</p>}

      {/* Full size, above the focused sheet. */}
      <DialogPrimitive.Root open={full && !!url} onOpenChange={setFull}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-[oklch(12%_0_0/0.6)]" />
          <DialogPrimitive.Content aria-describedby={undefined} className="fixed inset-0 z-[71] m-auto flex h-fit max-h-[96vh] w-[min(96vw,900px)] flex-col gap-3 rounded-[18px] border border-line bg-panel p-4 shadow-[var(--shadow-floating)] outline-none">
            <div className="flex items-center justify-between gap-3">
              <DialogPrimitive.Title className="truncate text-[14px] text-ink">{meta.name}</DialogPrimitive.Title>
              <DialogPrimitive.Close className="inline-flex size-8 items-center justify-center rounded-[10px] border border-line text-ink-2 hover:text-ink" aria-label="Close">
                <X className="size-4" strokeWidth={1.75} />
              </DialogPrimitive.Close>
            </div>
            {url && <Preview url={url} type={meta.type} name={meta.name} large />}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
