// Demo dataset behind Tracker's finance workspace. Everything here is simulated; the backend replaces it.
// Sales in the ledger follow the workspace's daily revenue series, so Tracker reconciles with the global Overview.

import { ago, D, rng } from '../seed-utils'
import type { DailyPoint } from '../types'
import type { ActivityEntry, Batch, BatchSale, BatchStatus, Collection, Expense, ExpenseCategory, ExpenseEvent, ExpenseRule, LedgerDay, Product, Project, ProjectEvent, TrackerDataset } from './types'

const LEDGER_DAYS = 180
const DAY = 86_400_000

function isoDay(offset: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return new Date(d.getTime() + offset * DAY).toISOString().slice(0, 10)
}

/** Seed products list their options as [title, units in stock]; ids and SKUs are derived. */
type SeedProduct = Omit<Product, 'variants'> & { options?: [title: string, inventory: number][] }
/** Seed expenses default to a confirmed manual entry; `receipt: true` attaches a drawn sample receipt. */
type SeedExpense = Omit<Expense, 'status' | 'source' | 'createdAt' | 'receipt'> & { status?: Expense['status']; source?: Expense['source']; receipt?: boolean }
/** Seed batches give a total quantity and optional per-option weights; the converter spreads it across variants. */
type SeedBatch = Omit<Batch, 'quantities' | 'status'> & { quantity: number; split?: number[]; status?: BatchStatus }

interface BrandSeed {
  seed: number
  baseRevenue: number
  model: TrackerDataset['model']
  collections: Collection[]
  products: SeedProduct[]
  batches: SeedBatch[]
  projects: Project[]
  expenseRules: ExpenseRule[]
  activity: ActivityEntry[]
  expenses: SeedExpense[]
  /** Units sold out of each batch so far (sample attribution). */
  sold: Record<string, number>
}

const SAHRA: BrandSeed = {
  seed: 17,
  baseRevenue: 17_200,
  model: 'manufacturing',
  collections: [
    { id: 'tableware', name: 'Tableware' },
    { id: 'serveware', name: 'Serveware' },
    { id: 'textiles', name: 'Bedding and textiles' },
  ],
  products: [
    { id: 'dune-bedding', name: 'Dune linen bedding set', sku: 'SH-BED-01', collectionId: 'textiles', price: 240, salesShare: 0.3, options: [['Queen, Sand', 64], ['Queen, Clay', 38], ['King, Sand', 41]] },
    { id: 'terracotta-mugs', name: 'Terracotta mug set', sku: 'SH-MUG-04', collectionId: 'tableware', price: 68, salesShare: 0.22, options: [['Set of 4', 412]] },
    { id: 'oasis-bowl', name: 'Oasis serving bowl', sku: 'SH-BWL-02', collectionId: 'serveware', price: 92, salesShare: 0.16, options: [['Sand glaze', 96], ['Charcoal glaze', 58]] },
    { id: 'siwa-throw', name: 'Siwa wool throw', sku: 'SH-THR-01', collectionId: 'textiles', price: 165, salesShare: 0.17, options: [['Natural', 22], ['Indigo', 31]] },
    { id: 'clay-coasters', name: 'Clay coasters, set of 6', sku: 'SH-CST-06', collectionId: 'tableware', price: 34, salesShare: 0.09, options: [['Set of 6', 188]] },
    { id: 'ember-mug', name: 'Winter ember mug', sku: 'SH-MUG-11', collectionId: 'tableware', price: 38, salesShare: 0.04, options: [['Ember red', 540]] },
    { id: 'kilim-cushion', name: 'Kilim cushion cover', sku: 'SH-CSH-02', collectionId: 'textiles', price: 58, salesShare: 0.02, options: [['Red', 44], ['Blue', 37]] },
  ],
  batches: [
    {
      id: 'b-dune-07', split: [120, 100, 80], productId: 'dune-bedding', label: 'DN-07', kind: 'production', supplier: 'Fayoum Linen Mill', quantity: 300, receivedAt: isoDay(-34),
      components: [
        { id: 'c1', label: 'Linen fabric', basis: 'per_unit', amount: 52 },
        { id: 'c2', label: 'Sewing labour', basis: 'per_unit', amount: 18 },
        { id: 'c3', label: 'Stone wash and dye', basis: 'batch_total', amount: 1_800 },
        { id: 'c4', label: 'Packaging', basis: 'per_unit', amount: 4.5 },
        { id: 'c5', label: 'Freight in', basis: 'batch_total', amount: 1_350 },
        { id: 'c6', label: 'Extra fabric, King size', basis: 'per_unit', amount: 9, appliesTo: ['dune-bedding-v3'] },
      ],
    },
    {
      id: 'b-mug-12', productId: 'terracotta-mugs', label: 'TM-12', kind: 'production', supplier: 'Studio, Cairo', quantity: 800, receivedAt: isoDay(-21),
      components: [
        { id: 'c1', label: 'Clay', basis: 'per_unit', amount: 6.2 },
        { id: 'c2', label: 'Glazing labour', basis: 'per_unit', amount: 7.5 },
        { id: 'c3', label: 'Kiln firing', basis: 'batch_total', amount: 1_600 },
        { id: 'c4', label: 'Packaging', basis: 'per_unit', amount: 3.1 },
        { id: 'c5', label: 'Breakage allowance', basis: 'per_unit', amount: 1.2 },
      ],
    },
    {
      id: 'b-bowl-05', split: [180, 120], productId: 'oasis-bowl', label: 'OB-05', kind: 'production', supplier: 'Studio, Cairo', quantity: 300, receivedAt: isoDay(-46),
      components: [
        { id: 'c1', label: 'Clay', basis: 'per_unit', amount: 7 },
        { id: 'c2', label: 'Throwing labour', basis: 'per_unit', amount: 14 },
        { id: 'c3', label: 'Glaze', basis: 'per_unit', amount: 3.2 },
        { id: 'c4', label: 'Kiln firing', basis: 'batch_total', amount: 900 },
        { id: 'c5', label: 'Packaging', basis: 'per_unit', amount: 4.8 },
      ],
    },
    {
      id: 'b-throw-03', split: [70, 80], productId: 'siwa-throw', label: 'SW-03', kind: 'purchase', supplier: 'Siwa Weavers Co-op', quantity: 150, receivedAt: isoDay(-58),
      components: [
        { id: 'c1', label: 'Supplier price', basis: 'per_unit', amount: 62 },
        { id: 'c2', label: 'Freight in', basis: 'batch_total', amount: 1_200 },
        { id: 'c3', label: 'Duties', basis: 'per_unit', amount: 9.3 },
      ],
    },
    {
      id: 'b-cst-09', productId: 'clay-coasters', label: 'CC-09', kind: 'production', supplier: 'Studio, Cairo', quantity: 500, receivedAt: isoDay(-40),
      components: [
        { id: 'c1', label: 'Clay', basis: 'per_unit', amount: 2.4 },
        { id: 'c2', label: 'Labour', basis: 'per_unit', amount: 4.1 },
        { id: 'c3', label: 'Cork backing', basis: 'per_unit', amount: 1.6 },
        { id: 'c4', label: 'Kiln firing', basis: 'batch_total', amount: 400 },
        { id: 'c5', label: 'Packaging', basis: 'per_unit', amount: 1.4 },
      ],
    },
    { id: 'b-ember-01', status: 'draft', productId: 'ember-mug', projectId: 'winter-26', label: 'WN-01', kind: 'production', supplier: 'Studio, Cairo', quantity: 600, receivedAt: isoDay(-9), components: [] },
    {
      id: 'b-dune-08', split: [100, 90, 70], productId: 'dune-bedding', projectId: 'winter-26', label: 'DN-08 Winter', kind: 'production', supplier: 'Fayoum Linen Mill', quantity: 260, receivedAt: isoDay(-6),
      components: [
        { id: 'c1', label: 'Brushed linen fabric', basis: 'per_unit', amount: 58 },
        { id: 'c2', label: 'Sewing labour', basis: 'per_unit', amount: 18 },
        { id: 'c3', label: 'Dye, winter palette', basis: 'batch_total', amount: 2_100 },
        { id: 'c4', label: 'Packaging', basis: 'per_unit', amount: 4.5 },
      ],
    },
    {
      id: 'b-dune-05', split: [260, 200, 140], productId: 'dune-bedding', projectId: 'summer-26', label: 'DN-05 Summer', kind: 'production', supplier: 'Fayoum Linen Mill', quantity: 600, receivedAt: isoDay(-196),
      components: [
        { id: 'c1', label: 'Linen fabric', basis: 'per_unit', amount: 49 },
        { id: 'c2', label: 'Sewing labour', basis: 'per_unit', amount: 18 },
        { id: 'c3', label: 'Stone wash and dye', basis: 'batch_total', amount: 1_800 },
        { id: 'c4', label: 'Packaging', basis: 'per_unit', amount: 4.5 },
        { id: 'c5', label: 'Freight in', basis: 'batch_total', amount: 1_350 },
      ],
    },
  ],
  projects: [
    { id: 'winter-26', name: 'Winter collection 2026', type: 'season', description: 'Brushed linen bedding and the ember mug for the cold months.', status: 'active', startsAt: isoDay(-58), endsAt: isoDay(95), budget: 48_000, revenueTarget: 210_000, createdAt: isoDay(-64) },
    { id: 'ramadan-27', name: 'Ramadan gifting 2027', type: 'collection', description: 'Gift boxes built around the serveware range.', status: 'planning', startsAt: isoDay(70), endsAt: isoDay(150), budget: 22_000, revenueTarget: 96_000, createdAt: isoDay(-12) },
    { id: 'summer-26', name: 'Summer linen 2026', type: 'season', status: 'completed', startsAt: isoDay(-210), endsAt: isoDay(-62), budget: 70_000, revenueTarget: 170_000, createdAt: isoDay(-220) },
  ],
  expenseRules: [
    { category: 'marketing', label: 'Marketing', rate: 0.162 },
    { category: 'shipping', label: 'Shipping and fulfilment', rate: 0.068 },
    { category: 'payment_fees', label: 'Payment fees', rate: 0.029 },
    { category: 'payroll', label: 'Team and contractors', monthly: 62_000 },
    { category: 'rent', label: 'Studio rent', monthly: 9_000 },
    { category: 'software', label: 'Software', monthly: 3_200 },
    { category: 'other', label: 'Other', rate: 0.012 },
  ],
  activity: [
    { id: 'a1', expenseId: 'e-t1', kind: 'receipt_uploaded', title: 'Receipt from Cairo Kiln Works', detail: 'Kiln firing for batch WN-01. Read by Tracker from a Telegram photo.', amount: 1_600, source: 'telegram', at: ago(26), needsReview: true, projectId: 'winter-26' },
    { id: 'a2', kind: 'batch_created', title: 'Batch DN-08 Winter received', detail: 'Dune linen bedding set · 260 units · Fayoum Linen Mill', source: 'manual', at: ago(140), projectId: 'winter-26' },
    { id: 'a3', kind: 'cost_updated', title: 'Linen fabric cost updated', detail: 'Dune linen bedding set · $49.00 to $52.00 per unit', source: 'manual', at: ago(320) },
    { id: 'a4', expenseId: 'e-w1', kind: 'expense_recorded', title: 'Winter lookbook photo shoot', detail: 'Project expense · Winter collection 2026', amount: 3_800, source: 'manual', at: ago(1_380), projectId: 'winter-26' },
    { id: 'a5', expenseId: 'e-n1', kind: 'supplier_payment', title: 'Paid Fayoum Linen Mill', detail: 'Invoice FLM-2210 · bank transfer', amount: 15_600, source: 'manual', at: ago(1_620) },
    { id: 'a6', expenseId: 'e-t2', kind: 'expense_recorded', title: 'Meta Ads invoice drafted', detail: 'Matched to this month’s ad spend by Tracker', amount: 9_420, source: 'tracker', at: ago(2_900), needsReview: true },
    { id: 'a7', kind: 'batch_created', title: 'Batch WN-01 received', detail: 'Winter ember mug · 600 units · costs not entered yet', source: 'manual', at: ago(12_960), projectId: 'winter-26' },
    { id: 'a9', expenseId: 'e-t3', kind: 'expense_recorded', title: 'Photoshoot, from your message', detail: 'Winter collection 2026 · prepared by Tracker from KREW chat', amount: 1_500, source: 'chat', at: ago(D + 170), needsReview: true, projectId: 'winter-26' },
    { id: 'a8', expenseId: 'e-p1', kind: 'receipt_uploaded', title: 'DHL freight invoice', detail: 'Freight in for batch DN-07', amount: 1_350, source: 'receipt', at: ago(4_400) },
  ],
  expenses: [
    // Project expenses, confirmed. Winter collection 2026 totals $14,260.
    { id: 'e-w1', label: 'Winter lookbook photo shoot', vendor: 'Studio Nour', amount: 3_800, at: ago(1_380), category: 'content', treatment: 'operating', projectId: 'winter-26', paymentMethod: 'bank_transfer', reference: 'SN-0412', receipt: true },
    { id: 'e-w2', label: 'Samples and prototypes', vendor: 'Studio, Cairo', amount: 2_460, at: ago(40 * D), category: 'samples', treatment: 'operating', projectId: 'winter-26' },
    {
      id: 'e-w3', label: 'Launch ads, winter', vendor: 'Meta', amount: 6_200, at: ago(12 * D), category: 'advertising', treatment: 'operating', projectId: 'winter-26', source: 'tracker', paymentMethod: 'card',
      prepared: { request: 'Meta billing email forwarded to Tracker', reading: 'Meta invoice for the winter launch campaign, $6,200.' },
    },
    { id: 'e-w4', label: 'Stylist and props', vendor: 'Props House', amount: 1_800, at: ago(3 * D), category: 'content', treatment: 'operating', projectId: 'winter-26', paymentMethod: 'cash', receipt: true },
    { id: 'e-r1', label: 'Gift box samples', vendor: 'Cairo Paper Co.', amount: 1_150, at: ago(8 * D), category: 'samples', treatment: 'operating', projectId: 'ramadan-27' },
    { id: 'e-s1', label: 'Summer campaign shoot', vendor: 'Studio Nour', amount: 4_200, at: ago(200 * D), category: 'content', treatment: 'operating', projectId: 'summer-26' },
    { id: 'e-s2', label: 'Summer launch ads', vendor: 'Meta', amount: 12_800, at: ago(160 * D), category: 'advertising', treatment: 'operating', projectId: 'summer-26', source: 'tracker', prepared: { request: 'Meta billing email forwarded to Tracker', reading: 'Meta invoices for the summer launch, $12,800.' } },
    { id: 'e-s3', label: 'Creator gifting', vendor: 'Various', amount: 3_110, at: ago(150 * D), category: 'marketing', treatment: 'operating', projectId: 'summer-26' },
    { id: 'e-s4', label: 'Travel to Siwa', vendor: 'Go Bus', amount: 1_200, at: ago(190 * D), category: 'travel', treatment: 'operating', projectId: 'summer-26', receipt: true },
    // General operating expenses, confirmed.
    { id: 'e-x1', label: 'Lighting rental', vendor: 'Cairo Film Gear', amount: 650, at: ago(2 * D), category: 'equipment', treatment: 'operating', paymentMethod: 'card', receipt: true },
    { id: 'e-x2', label: 'Team lunch, shoot day', vendor: 'Zooba', amount: 180, at: ago(2 * D), category: 'meals', treatment: 'operating', source: 'telegram', receipt: true, prepared: { request: 'Photo of a receipt sent on Telegram', reading: 'Zooba receipt, $180, food for the shoot team.' } },
    { id: 'e-x3', label: 'Courier for samples', vendor: 'Bosta', amount: 120, at: ago(6 * D), category: 'shipping', treatment: 'operating', paymentMethod: 'cash' },
    { id: 'e-o1', label: 'Studio rent, this month', vendor: 'Maadi Properties', amount: 9_000, at: ago(27 * D), category: 'rent', treatment: 'operating', paymentMethod: 'bank_transfer', reference: 'RENT-M1' },
    { id: 'e-o2', label: 'Studio rent, last month', vendor: 'Maadi Properties', amount: 9_000, at: ago(57 * D), category: 'rent', treatment: 'operating', paymentMethod: 'bank_transfer', reference: 'RENT-M0' },
    { id: 'e-o3', label: 'Shopify plan', vendor: 'Shopify', amount: 399, at: ago(15 * D), category: 'software', treatment: 'operating', paymentMethod: 'card' },
    { id: 'e-o4', label: 'Monthly bookkeeping', vendor: 'Hany and Co. Accountants', amount: 1_200, at: ago(20 * D), category: 'professional', treatment: 'operating', paymentMethod: 'bank_transfer', reference: 'INV-3381' },
    { id: 'e-o5', label: 'Studio electricity', vendor: 'North Cairo Electricity', amount: 310, at: ago(18 * D), category: 'utilities', treatment: 'operating', paymentMethod: 'cash', receipt: true },
    { id: 'e-o6', label: 'Shipping mailers', vendor: 'Cairo Paper Co.', amount: 540, at: ago(10 * D), category: 'packaging', treatment: 'operating', notes: 'Outbound mailers for orders, not tied to a batch.' },
    { id: 'e-o7', label: 'Creator posts, this month', vendor: 'Various', amount: 1_450, at: ago(9 * D), category: 'marketing', treatment: 'operating' },
    // Recorded, but not expenses: a production cost already in a batch, and a supplier payment.
    { id: 'e-p1', label: 'DHL freight invoice, batch DN-07', vendor: 'DHL Express', amount: 1_350, at: ago(4_400), category: 'transport', treatment: 'production', batchId: 'b-dune-07', reference: 'DHL-88213', receipt: true },
    { id: 'e-n1', label: 'Paid Fayoum Linen Mill', vendor: 'Fayoum Linen Mill', amount: 15_600, at: ago(1_620), category: 'other', treatment: 'non_expense', paymentMethod: 'bank_transfer', reference: 'FLM-2210', notes: 'Settles the invoice for batch DN-08. The cost is already recorded in the batch.' },
    // Waiting for review: prepared by Tracker, sent on Telegram or in chat, or missing details.
    {
      id: 'e-t1', label: 'Kiln firing, batch WN-01', vendor: 'Cairo Kiln Works', amount: 1_600, at: ago(26), category: 'production', treatment: 'production', batchId: 'b-ember-01', source: 'telegram', status: 'needs_review', receipt: true,
      prepared: { request: 'Photo of a receipt sent on Telegram', reading: 'Cairo Kiln Works receipt for kiln firing, $1,600. Looks like a production cost of batch WN-01.', unsure: ['batchId'] },
    },
    {
      id: 'e-t2', label: 'Meta Ads invoice, this month', vendor: 'Meta', amount: 9_420, at: ago(2_900), category: 'advertising', treatment: 'operating', source: 'tracker', status: 'needs_review', paymentMethod: 'card',
      prepared: { request: 'Meta billing email forwarded to Tracker', reading: 'Matched to this month’s ad spend. Part of it may belong to Winter collection 2026, so no project was chosen.', unsure: ['projectId'] },
    },
    {
      id: 'e-t3', label: 'Photoshoot', vendor: 'Studio Nour', amount: 1_500, at: ago(D + 180), category: 'content', treatment: 'operating', projectId: 'winter-26', source: 'chat', status: 'needs_review',
      prepared: { request: '“Add 1,500 for yesterday’s photoshoot to the winter collection.”', reading: 'Photoshoot, $1,500, dated yesterday, for Winter collection 2026. The vendor is a guess from the last shoot.', unsure: ['vendor'] },
    },
    { id: 'u1', label: 'Card payment', vendor: 'AMZN Mktp', amount: 86.4, at: ago(900), source: 'tracker', status: 'needs_review', paymentMethod: 'card', prepared: { request: 'Card transaction from the bank feed', reading: 'A card payment with no description. Tracker cannot tell what it was for.', unsure: ['category', 'treatment'] } },
    { id: 'u2', label: 'Bank transfer', vendor: 'M. Hassan', amount: 600, at: ago(2_100), status: 'needs_review', paymentMethod: 'bank_transfer' },
    { id: 'u3', label: 'Card payment', vendor: 'Vodafone EG', amount: 42, at: ago(3_300), status: 'needs_review', paymentMethod: 'card' },
    { id: 'u4', label: 'Receipt', vendor: 'Souq El Fustat', amount: 215, at: ago(5_200), source: 'telegram', status: 'needs_review', receipt: true, prepared: { request: 'Photo of a receipt sent on Telegram', reading: 'Handwritten receipt. The amount reads as $215; the purpose is unclear.', unsure: ['amount', 'category', 'treatment'] } },
  ],
  sold: { 'b-dune-07': 268, 'b-dune-08': 64, 'b-dune-05': 585, 'b-mug-12': 610, 'b-bowl-05': 240, 'b-throw-03': 118, 'b-cst-09': 410, 'b-ember-01': 210 },
}

const NOOR: BrandSeed = {
  seed: 41,
  baseRevenue: 6_100,
  model: 'resale',
  collections: [
    { id: 'treat', name: 'Treatments' },
    { id: 'hydrate', name: 'Hydration' },
    { id: 'protect', name: 'Sun care' },
  ],
  products: [
    { id: 'vitc-serum', name: 'Vitamin C serum', sku: 'NS-SER-01', collectionId: 'treat', price: 48, salesShare: 0.28, options: [['30 ml', 1_120]] },
    { id: 'spf50', name: 'SPF 50 fluid', sku: 'NS-SPF-50', collectionId: 'protect', price: 36, salesShare: 0.24, options: [['50 ml', 1_640]] },
    { id: 'hydra-gel', name: 'Hydra gel moisturiser', sku: 'NS-MOI-02', collectionId: 'hydrate', price: 42, salesShare: 0.22, options: [['50 ml', 860], ['100 ml', 310]] },
    { id: 'night-oil', name: 'Night repair oil', sku: 'NS-OIL-01', collectionId: 'treat', price: 58, salesShare: 0.12, options: [['30 ml', 402]] },
    { id: 'clay-mask', name: 'Clay mask', sku: 'NS-MSK-01', collectionId: 'treat', price: 32, salesShare: 0.1, options: [['75 ml', 515]] },
    { id: 'barrier-mist', name: 'Barrier mist', sku: 'NS-MST-01', collectionId: 'hydrate', price: 29, salesShare: 0.04, options: [['100 ml', 1_480]] },
  ],
  batches: [
    {
      id: 'n-vitc-14', productId: 'vitc-serum', label: 'VC-14', kind: 'purchase', supplier: 'Gulf Cosmetic Labs', quantity: 2_000, receivedAt: isoDay(-28),
      components: [
        { id: 'c1', label: 'Filled unit from lab', basis: 'per_unit', amount: 7.4 },
        { id: 'c2', label: 'Bottle and dropper', basis: 'per_unit', amount: 2.1 },
        { id: 'c3', label: 'Carton', basis: 'per_unit', amount: 0.6 },
        { id: 'c4', label: 'Stability testing', basis: 'batch_total', amount: 2_400 },
        { id: 'c5', label: 'Freight in', basis: 'batch_total', amount: 900 },
      ],
    },
    {
      id: 'n-spf-09', productId: 'spf50', label: 'SP-09', kind: 'purchase', supplier: 'Gulf Cosmetic Labs', quantity: 3_000, receivedAt: isoDay(-50),
      components: [
        { id: 'c1', label: 'Filled unit from lab', basis: 'per_unit', amount: 6.1 },
        { id: 'c2', label: 'Tube', basis: 'per_unit', amount: 1.3 },
        { id: 'c3', label: 'SPF certification', basis: 'batch_total', amount: 3_600 },
        { id: 'c4', label: 'Freight in', basis: 'batch_total', amount: 1_100 },
      ],
    },
    {
      id: 'n-gel-11', split: [1_900, 600], productId: 'hydra-gel', label: 'HG-11', kind: 'purchase', supplier: 'Gulf Cosmetic Labs', quantity: 2_500, receivedAt: isoDay(-36),
      components: [
        { id: 'c1', label: 'Filled unit from lab', basis: 'per_unit', amount: 6.8 },
        { id: 'c2', label: 'Jar and lid', basis: 'per_unit', amount: 1.9 },
        { id: 'c3', label: 'Carton', basis: 'per_unit', amount: 0.6 },
        { id: 'c4', label: 'Freight in', basis: 'batch_total', amount: 950 },
      ],
    },
    {
      id: 'n-oil-04', productId: 'night-oil', label: 'NO-04', kind: 'purchase', supplier: 'Atlas Botanicals', quantity: 1_000, receivedAt: isoDay(-64),
      components: [
        { id: 'c1', label: 'Filled unit', basis: 'per_unit', amount: 11.2 },
        { id: 'c2', label: 'Glass bottle', basis: 'per_unit', amount: 2.4 },
        { id: 'c3', label: 'Duties', basis: 'per_unit', amount: 1.1 },
        { id: 'c4', label: 'Freight in', basis: 'batch_total', amount: 700 },
      ],
    },
    {
      id: 'n-mask-06', productId: 'clay-mask', label: 'CM-06', kind: 'purchase', supplier: 'Gulf Cosmetic Labs', quantity: 1_200, receivedAt: isoDay(-44),
      components: [
        { id: 'c1', label: 'Filled unit from lab', basis: 'per_unit', amount: 5.2 },
        { id: 'c2', label: 'Jar', basis: 'per_unit', amount: 1.4 },
        { id: 'c3', label: 'Freight in', basis: 'batch_total', amount: 480 },
      ],
    },
    { id: 'n-mist-01', status: 'draft', productId: 'barrier-mist', projectId: 'winter-barrier', label: 'BM-01', kind: 'purchase', supplier: 'Gulf Cosmetic Labs', quantity: 1_500, receivedAt: isoDay(-5), components: [] },
    {
      id: 'n-spf-07', productId: 'spf50', projectId: 'summer-spf', label: 'SP-07 Summer', kind: 'purchase', supplier: 'Gulf Cosmetic Labs', quantity: 4_000, receivedAt: isoDay(-150),
      components: [
        { id: 'c1', label: 'Filled unit from lab', basis: 'per_unit', amount: 6.1 },
        { id: 'c2', label: 'Tube', basis: 'per_unit', amount: 1.1 },
        { id: 'c3', label: 'SPF certification', basis: 'batch_total', amount: 3_600 },
        { id: 'c4', label: 'Freight in', basis: 'batch_total', amount: 1_100 },
      ],
    },
  ],
  projects: [
    { id: 'winter-barrier', name: 'Winter barrier care', type: 'launch', description: 'Barrier mist launch for dry winter skin.', status: 'active', startsAt: isoDay(-20), endsAt: isoDay(110), budget: 18_000, revenueTarget: 64_000, createdAt: isoDay(-30) },
    { id: 'ramadan-sets', name: 'Ramadan gift sets', type: 'collection', status: 'planning', startsAt: isoDay(75), endsAt: isoDay(140), budget: 12_500, revenueTarget: 41_000, createdAt: isoDay(-6) },
    { id: 'summer-spf', name: 'Summer SPF campaign', type: 'campaign', status: 'completed', startsAt: isoDay(-160), endsAt: isoDay(-45), budget: 50_000, revenueTarget: 52_000, createdAt: isoDay(-170) },
  ],
  expenseRules: [
    { category: 'marketing', label: 'Marketing', rate: 0.19 },
    { category: 'shipping', label: 'Shipping and fulfilment', rate: 0.075 },
    { category: 'payment_fees', label: 'Payment fees', rate: 0.029 },
    { category: 'payroll', label: 'Team and contractors', monthly: 21_000 },
    { category: 'rent', label: 'Fulfilment storage', monthly: 2_500 },
    { category: 'software', label: 'Software', monthly: 1_400 },
    { category: 'other', label: 'Other', rate: 0.012 },
  ],
  activity: [
    { id: 'a1', kind: 'batch_created', title: 'Batch BM-01 received', detail: 'Barrier mist · 1,500 units · lab invoice not entered yet', source: 'manual', at: ago(95), projectId: 'winter-barrier' },
    { id: 'a2', expenseId: 'e-t1', kind: 'receipt_uploaded', title: 'Receipt from Dubai Print House', detail: 'Ramadan gift set cartons, sample run. Read by Tracker.', amount: 640, source: 'telegram', at: ago(410), needsReview: true, projectId: 'ramadan-sets' },
    { id: 'a3', expenseId: 'e-n1', kind: 'supplier_payment', title: 'Paid Gulf Cosmetic Labs', detail: 'Deposit for batch VC-15 · 40%', amount: 8_200, source: 'manual', at: ago(1_500) },
    { id: 'a4', kind: 'cost_updated', title: 'Tube cost updated', detail: 'SPF 50 fluid · $1.10 to $1.30 per unit', source: 'manual', at: ago(2_800) },
    { id: 'a5', expenseId: 'e-t2', kind: 'expense_recorded', title: 'Creator content, this month', detail: 'Matched to marketing by Tracker', amount: 2_400, source: 'tracker', at: ago(3_900), needsReview: true },
    { id: 'a6', expenseId: 'e-b1', kind: 'expense_recorded', title: 'Winter campaign shoot', detail: 'Project expense · Winter barrier care', amount: 3_150, source: 'manual', at: ago(6_100), projectId: 'winter-barrier' },
  ],
  expenses: [
    { id: 'e-b1', label: 'Winter campaign shoot', vendor: 'Lumen Studio', amount: 3_150, at: ago(6_100), category: 'content', treatment: 'operating', projectId: 'winter-barrier', receipt: true },
    { id: 'e-b2', label: 'Launch ads, barrier mist', vendor: 'Meta', amount: 2_500, at: ago(4 * D), category: 'advertising', treatment: 'operating', projectId: 'winter-barrier', source: 'tracker', prepared: { request: 'Meta billing email forwarded to Tracker', reading: 'Meta invoice for the barrier mist launch, $2,500.' } },
    { id: 'e-b3', label: 'Formula samples', vendor: 'Gulf Cosmetic Labs', amount: 830, at: ago(18 * D), category: 'samples', treatment: 'operating', projectId: 'winter-barrier' },
    { id: 'e-p1', label: 'Summer SPF ads', vendor: 'Meta', amount: 10_200, at: ago(130 * D), category: 'advertising', treatment: 'operating', projectId: 'summer-spf', source: 'tracker', prepared: { request: 'Meta billing email forwarded to Tracker', reading: 'Meta invoices for the summer SPF campaign, $10,200.' } },
    { id: 'e-p2', label: 'Beach shoot', vendor: 'Lumen Studio', amount: 2_870, at: ago(150 * D), category: 'content', treatment: 'operating', projectId: 'summer-spf' },
    { id: 'e-p3', label: 'Pool event booth', vendor: 'JBR Events', amount: 800, at: ago(120 * D), category: 'marketing', treatment: 'operating', projectId: 'summer-spf', receipt: true },
    { id: 'e-x1', label: 'Pop-up stand rental', vendor: 'Mall Kiosks', amount: 900, at: ago(3 * D), category: 'equipment', treatment: 'operating', receipt: true },
    { id: 'e-o1', label: 'Fulfilment storage, this month', vendor: 'Dubai Logistics Hub', amount: 2_500, at: ago(27 * D), category: 'rent', treatment: 'operating', paymentMethod: 'bank_transfer' },
    { id: 'e-o2', label: 'Email marketing plan', vendor: 'Klaviyo', amount: 180, at: ago(14 * D), category: 'software', treatment: 'operating', paymentMethod: 'card' },
    { id: 'e-o3', label: 'Monthly bookkeeping', vendor: 'Desert Ledger', amount: 600, at: ago(21 * D), category: 'professional', treatment: 'operating', paymentMethod: 'bank_transfer' },
    { id: 'e-o4', label: 'Courier pickups', vendor: 'Aramex', amount: 230, at: ago(5 * D), category: 'shipping', treatment: 'operating', paymentMethod: 'card' },
    { id: 'e-n1', label: 'Deposit for batch VC-15', vendor: 'Gulf Cosmetic Labs', amount: 8_200, at: ago(1_500), category: 'other', treatment: 'non_expense', paymentMethod: 'bank_transfer', notes: '40% deposit on a purchase order. It becomes batch cost when VC-15 is received and costed.' },
    {
      id: 'e-t1', label: 'Gift set cartons, sample run', vendor: 'Dubai Print House', amount: 640, at: ago(410), category: 'packaging', projectId: 'ramadan-sets', source: 'telegram', status: 'needs_review', receipt: true,
      prepared: { request: 'Photo of a receipt sent on Telegram', reading: 'Cartons for a Ramadan gift set sample run. Could be a project expense or a production cost of a future batch.', unsure: ['treatment'] },
    },
    { id: 'e-t2', label: 'Creator content, this month', vendor: 'Various', amount: 2_400, at: ago(3_900), category: 'marketing', treatment: 'operating', source: 'tracker', status: 'needs_review', prepared: { request: 'Payment list shared in KREW chat', reading: 'Four creator payments, $2,400 in total, matched to marketing.', unsure: ['projectId'] } },
    { id: 'u1', label: 'Card payment', vendor: 'Noon', amount: 128, at: ago(1_700), status: 'needs_review', paymentMethod: 'card' },
    { id: 'u2', label: 'Receipt', vendor: 'Carrefour', amount: 54.5, at: ago(4_300), source: 'telegram', status: 'needs_review', receipt: true, prepared: { request: 'Photo of a receipt sent on Telegram', reading: 'Supermarket receipt, $54.50. The purpose is unclear.', unsure: ['category', 'treatment'] } },
  ],
  sold: { 'n-vitc-14': 1_650, 'n-spf-09': 2_400, 'n-gel-11': 1_900, 'n-oil-04': 820, 'n-mask-06': 900, 'n-mist-01': 140, 'n-spf-07': 3_720 },
}

const BRANDS: Record<string, BrandSeed> = { sahra: SAHRA, noor: NOOR }

/** Sample sales per batch. The net amount takes a typical 8% of discounts and refunds off the list price, standing in for real order lines. */
function toSales(brand: BrandSeed, products: Product[]): BatchSale[] {
  return brand.batches.flatMap((b) => {
    const units = brand.sold[b.id]
    const price = products.find((p) => p.id === b.productId)?.price ?? 0
    return units ? [{ batchId: b.id, unitsSold: units, netSales: Math.round(units * price * 0.92) }] : []
  })
}

/** Project history implied by the seed: creation, batches received into the project, expenses recorded against it. */
function seedEvents(brand: BrandSeed): ProjectEvent[] {
  const events: ProjectEvent[] = brand.projects.map((p) => ({ id: `ev-${p.id}`, projectId: p.id, kind: 'created', text: `Created ${p.name}`, at: p.createdAt }))
  for (const b of brand.batches) if (b.projectId) events.push({ id: `ev-${b.id}`, projectId: b.projectId, kind: 'batch_attached', text: `Batch ${b.label} added`, at: b.receivedAt })
  for (const e of brand.expenses) if (e.projectId) events.push({ id: `ev-${e.id}`, projectId: e.projectId, kind: 'expense_added', text: `Expense recorded: ${e.label}`, at: e.at })
  return events
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function toExpense({ status = 'confirmed', source = 'manual', receipt, ...e }: SeedExpense): Expense {
  return {
    ...e,
    status,
    source,
    createdAt: e.at,
    receipt: receipt ? { id: `rc-${e.id}`, name: `receipt-${slug(e.vendor ?? e.label)}.svg`, type: 'image/svg+xml', size: 0, addedAt: e.at, sample: true } : undefined,
  }
}

/** Expense history implied by the seed: who created or prepared each entry, and who confirmed it. */
function seedExpenseEvents(expenses: Expense[]): ExpenseEvent[] {
  const later = (iso: string, minutes: number) => new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
  return expenses.flatMap((e): ExpenseEvent[] => {
    const out: ExpenseEvent[] = []
    if (e.source === 'manual') out.push({ id: `xe-${e.id}-c`, expenseId: e.id, kind: 'created', text: 'Entered by hand', at: e.at, by: 'you' })
    else out.push({ id: `xe-${e.id}-p`, expenseId: e.id, kind: 'prepared', text: e.source === 'telegram' ? 'Prepared by Tracker from a Telegram message' : e.source === 'chat' ? 'Prepared by Tracker from KREW chat' : 'Prepared by Tracker', at: e.at, by: 'tracker' })
    if (e.receipt) out.push({ id: `xe-${e.id}-r`, expenseId: e.id, kind: 'receipt_attached', text: 'Receipt attached', at: e.at, by: e.source === 'manual' ? 'you' : 'tracker' })
    if (e.status === 'confirmed' && e.source !== 'manual') out.push({ id: `xe-${e.id}-ok`, expenseId: e.id, kind: 'confirmed', text: 'Confirmed', at: later(e.at, 90), by: 'you' })
    return out
  })
}

function toProduct({ options, ...p }: SeedProduct): Product {
  const list = options?.length ? options : [['Default', undefined] as const]
  return { ...p, variants: list.map(([title, inventory], i) => ({ id: `${p.id}-v${i + 1}`, title, sku: `${p.sku}-${i + 1}`, inventory })) }
}

/** Spreads a seed quantity over the product's variants by the given weights (evenly when none), keeping the exact total. */
function toBatch({ quantity, split, status = 'finalized', ...b }: SeedBatch, products: Product[]): Batch {
  const variants = products.find((p) => p.id === b.productId)?.variants ?? []
  const weights = split ?? variants.map(() => 1)
  const sum = weights.reduce((a, w) => a + w, 0) || 1
  const quantities = variants.map((v, i) => ({ variantId: v.id, quantity: Math.floor((quantity * (weights[i] ?? 0)) / sum) }))
  const short = quantity - quantities.reduce((a, q) => a + q.quantity, 0)
  if (quantities.length) quantities[0].quantity += short
  return { ...b, status, quantities, finalizedAt: status === 'finalized' ? b.receivedAt : undefined }
}

const EMPTY_OPEX = (): Record<ExpenseCategory, number> => ({ marketing: 0, shipping: 0, payment_fees: 0, software: 0, payroll: 0, rent: 0, other: 0 })

/** Builds 180 days of sales and operating expenses. Days covered by the workspace series use its revenue; older days extend the same curve. */
function buildLedger(brand: BrandSeed, daily: DailyPoint[]): LedgerDay[] {
  const rand = rng(brand.seed * 7 + 3)
  const known = new Map(daily.map((d) => [d.date, d.revenue]))
  const out: LedgerDay[] = []
  for (let i = LEDGER_DAYS - 1; i >= 0; i--) {
    const date = isoDay(-i)
    const weekday = new Date(`${date}T00:00:00`).getDay()
    const weekend = weekday === 5 || weekday === 6 ? 1.14 : 1
    const target = known.get(date) ?? brand.baseRevenue * weekend * (1 - (i - 59) * 0.001) * (0.86 + rand() * 0.28)

    const units: Record<string, number> = {}
    let grossSales = 0
    for (const p of brand.products) {
      const u = Math.max(0, Math.round((target * p.salesShare * (0.85 + rand() * 0.3)) / p.price))
      units[p.id] = u
      grossSales += u * p.price
    }
    const opex = EMPTY_OPEX()
    for (const r of brand.expenseRules) opex[r.category] += (r.rate ?? 0) * grossSales + (r.monthly ?? 0) / 30.44
    out.push({
      date,
      grossSales,
      discounts: Math.round(grossSales * (0.052 + rand() * 0.02)),
      refunds: Math.round(grossSales * (0.014 + rand() * 0.014)),
      units,
      opex,
    })
  }
  return out
}

const cache = new Map<string, TrackerDataset>()

/** Tracker's dataset for a workspace. Unknown workspaces get an empty dataset so empty states render. */
export function trackerDataset(workspaceId: string, daily: DailyPoint[]): TrackerDataset {
  const key = `${workspaceId}:${daily.at(-1)?.date ?? ''}:${isoDay(0)}`
  const hit = cache.get(key)
  if (hit) return hit
  const brand = BRANDS[workspaceId]
  const products = brand ? brand.products.map(toProduct) : []
  const expenses = brand ? brand.expenses.map(toExpense) : []
  const data: TrackerDataset = brand
    ? {
        currency: 'USD',
        model: brand.model,
        collections: brand.collections,
        products,
        batches: brand.batches.map((b) => toBatch(b, products)),
        projects: brand.projects,
        expenseRules: brand.expenseRules,
        ledger: buildLedger(brand, daily),
        activity: brand.activity,
        expenses,
        expenseEvents: seedExpenseEvents(expenses),
        expenseCategories: [],
        batchSales: toSales(brand, products),
        projectEvents: seedEvents(brand),
      }
    : { currency: 'USD', model: 'resale', collections: [], products: [], batches: [], projects: [], expenseRules: [], ledger: [], activity: [], expenses: [], expenseEvents: [], expenseCategories: [], batchSales: [], projectEvents: [] }
  cache.set(key, data)
  return data
}
