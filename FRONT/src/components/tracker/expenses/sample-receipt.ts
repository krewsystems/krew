import type { Expense } from '@/data/tracker/types'
import { moneyExact, shortDate } from '@/lib/format'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * A drawn stand-in for a seeded receipt, so the demo can show previews without shipping real documents.
 * It is marked as a sample on the paper itself. It is an image of paper, so its colours are fixed rather than themed.
 */
export function sampleReceiptUrl(e: Pick<Expense, 'vendor' | 'label' | 'amount' | 'at' | 'reference'>): string {
  const vendor = esc(e.vendor ?? 'Vendor')
  const line = esc(e.label.length > 34 ? `${e.label.slice(0, 33)}…` : e.label)
  const total = esc(moneyExact(e.amount))
  const date = esc(shortDate(e.at))
  const ref = esc(e.reference ?? `No. ${Math.abs(hash(e.label + e.at)) % 90000 + 10000}`)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520">
<rect width="360" height="520" fill="rgb(236,233,226)"/>
<path d="M30 24h300v452l-12 10-12-10-12 10-12-10-12 10-12-10-12 10-12-10-12 10-12-10-12 10-12-10-12 10-12-10-12 10-12-10-12 10-12-10-12 10-12-10-12 10-12-10-12 10-12-10-12 10-12-10z" fill="rgb(253,252,249)" stroke="rgb(214,210,200)"/>
<g font-family="Helvetica, Arial, sans-serif" fill="rgb(40,38,34)">
<text x="180" y="78" font-size="19" text-anchor="middle" font-weight="bold">${vendor}</text>
<text x="180" y="100" font-size="11" text-anchor="middle" fill="rgb(120,116,108)">${ref} · ${date}</text>
<line x1="56" y1="124" x2="304" y2="124" stroke="rgb(200,196,186)" stroke-dasharray="4 4"/>
<text x="56" y="156" font-size="13">${line}</text>
<text x="304" y="156" font-size="13" text-anchor="end">${total}</text>
<text x="56" y="182" font-size="11" fill="rgb(120,116,108)">Qty 1</text>
<line x1="56" y1="214" x2="304" y2="214" stroke="rgb(200,196,186)" stroke-dasharray="4 4"/>
<text x="56" y="246" font-size="14" font-weight="bold">Total</text>
<text x="304" y="246" font-size="16" text-anchor="end" font-weight="bold">${total}</text>
<text x="180" y="300" font-size="11" text-anchor="middle" fill="rgb(120,116,108)">Thank you</text>
<g transform="rotate(-18 180 380)"><rect x="70" y="352" width="220" height="52" rx="6" fill="none" stroke="rgb(176,120,40)" stroke-width="2"/>
<text x="180" y="385" font-size="18" text-anchor="middle" fill="rgb(176,120,40)" letter-spacing="3">SAMPLE RECEIPT</text></g>
</g></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
