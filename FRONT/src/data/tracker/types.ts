// Tracker (finance) domain shapes. Frontend draft of the contract the backend and the Tracker agent will share.

/** How a cost line is entered: once per unit, or as one amount for the whole batch that is spread over the units produced. */
export type CostBasis = 'per_unit' | 'batch_total'

/** A user-defined cost field on a batch, such as "Clay", "Glazing labour" or "Freight in". */
export interface CostComponent {
  id: string
  label: string
  basis: CostBasis
  /** Per unit: the cost of one unit. Whole batch: the total, allocated across units by quantity. */
  amount: number
  /** Variant ids this cost applies to. Missing means the whole batch. */
  appliesTo?: string[]
}

/** How many units of one variant a batch produced or bought. */
export interface BatchQuantity {
  variantId: string
  quantity: number
}

/** Drafts can be edited. Finalized batches are historical records; a correction creates a revision and marks the original as revised. */
export type BatchStatus = 'draft' | 'finalized' | 'revised'

/** One production run (maker brands) or purchase order (resellers). Each keeps its own costs and history. */
export interface Batch {
  id: string
  productId: string
  /** Optional season or project the batch belongs to. */
  projectId?: string
  label: string
  kind: 'production' | 'purchase'
  supplier?: string
  /** ISO date the batch was produced or received into stock. */
  receivedAt: string
  status: BatchStatus
  quantities: BatchQuantity[]
  components: CostComponent[]
  /** Set on a correction: the batch it revises and why. */
  revisionOf?: string
  revisionReason?: string
  /** Set on a revised batch: the batch that replaced it. */
  revisedBy?: string
  finalizedAt?: string
  updatedAt?: string
}

/** A sellable option of a product, such as a size or colour. Single-option products have one default variant. */
export interface Variant {
  id: string
  title: string
  sku: string
  /** Overrides the product price when the variant sells for a different amount. */
  price?: number
  /** Units in stock, when the store reports it. */
  inventory?: number
}

export interface Product {
  id: string
  name: string
  sku: string
  collectionId: string
  /** Shelf price before discounts. */
  price: number
  /** Share of gross sales this product drives, 0 to 1. Mock only: real data comes from orders. */
  salesShare: number
  variants: Variant[]
}

export interface Collection {
  id: string
  name: string
}

export type ProjectStatus = 'planning' | 'active' | 'completed' | 'archived'
export type ProjectType = 'season' | 'collection' | 'launch' | 'campaign' | 'other'

/**
 * Season or project: an optional grouping. Batches and expenses point at a project through their own projectId,
 * so a project never stores copies of costs, and attaching or detaching never changes a batch's cost.
 */
export interface Project {
  id: string
  name: string
  type: ProjectType
  description?: string
  status: ProjectStatus
  /** ISO date. */
  startsAt: string
  endsAt?: string
  /** What the project is expected to bring in. Optional. */
  revenueTarget?: number
  /** Spending limit for production and project expenses together. Optional. */
  budget?: number
  createdAt: string
}

/** What a project's history records. */
export type ProjectEventKind =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'budget_updated'
  | 'batch_attached'
  | 'batch_detached'
  | 'expense_added'
  | 'expense_linked'
  | 'expense_unlinked'
  | 'expense_confirmed'
  | 'expense_updated'

export interface ProjectEvent {
  id: string
  projectId: string
  kind: ProjectEventKind
  /** Human-readable summary, such as "Attached DN-08 Winter". */
  text: string
  at: string
}

/**
 * Units sold out of a specific batch, with the net amount customers actually paid for them.
 * Sample data. The backend derives these from Shopify order lines through a defined cost-flow method (such as FIFO),
 * using each order's real transaction price, never today's list price.
 */
export interface BatchSale {
  batchId: string
  unitsSold: number
  netSales: number
}

export type ExpenseCategory = 'marketing' | 'shipping' | 'payment_fees' | 'software' | 'payroll' | 'rent' | 'other'

/** Daily operating expense rule used to build the mock ledger. */
export interface ExpenseRule {
  category: ExpenseCategory
  label: string
  /** Variable part, as a share of gross sales. */
  rate?: number
  /** Fixed monthly amount, spread evenly across days. */
  monthly?: number
}

/** One day of the ledger, the unit every period figure is summed from. */
export interface LedgerDay {
  date: string
  grossSales: number
  discounts: number
  refunds: number
  /** Units sold per product id. */
  units: Record<string, number>
  opex: Record<ExpenseCategory, number>
}

export type ActivityKind = 'batch_created' | 'expense_recorded' | 'cost_updated' | 'receipt_uploaded' | 'supplier_payment'
export type EntrySource = 'manual' | 'receipt' | 'tracker' | 'telegram' | 'chat' | 'shopify'

export interface ActivityEntry {
  id: string
  kind: ActivityKind
  title: string
  detail: string
  amount?: number
  source: EntrySource
  /** ISO timestamp. */
  at: string
  /** Entries proposed by the agent or captured from receipts wait for a person to confirm them. */
  needsReview?: boolean
  projectId?: string
  /** The expense entry this activity is about. Its review state then comes from that record, not from this flag. */
  expenseId?: string
}

/** Built-in expense categories. Brands add their own, so a category on a record is any category id (see ExpenseCategoryDef). */
export type ExpenseRecordCategory =
  | 'advertising'
  | 'marketing'
  | 'content'
  | 'samples'
  | 'production'
  | 'packaging'
  | 'transport'
  | 'travel'
  | 'meals'
  | 'equipment'
  | 'rent'
  | 'utilities'
  | 'software'
  | 'salaries'
  | 'professional'
  | 'shipping'
  | 'other'

/**
 * How an entry is treated financially. The category is only a label; this decides where the money counts.
 * - operating: a cost of running the business. Counts in operating expenses (and in a project, when linked to one).
 * - production: a cost of making or buying stock. It belongs to a batch in Product costing and reaches profit as COGS when units sell.
 *   The record is kept as the document behind the batch cost and is never counted again as an expense.
 * - non_expense: money that moved without being a new cost: supplier payments, deposits, refunds, owner contributions, transfers.
 * Missing means nobody has decided yet; the entry stays in review and counts nowhere.
 */
export type ExpenseTreatment = 'operating' | 'production' | 'non_expense'

/** A category the brand can pick. Built-in ones ship with the app; custom ones are created by the brand. */
export interface ExpenseCategoryDef {
  id: string
  label: string
  /** Treatment suggested when this category is picked. The person can always change it. Missing when it depends (packaging, other). */
  suggests?: ExpenseTreatment
  custom?: boolean
}

/** needs_review: drafted (by Tracker, from a receipt, or incomplete) and counted nowhere. confirmed: a person checked it. void: kept for history, counted nowhere. */
export type ExpenseStatus = 'needs_review' | 'confirmed' | 'void'

/** Where an expense entry came from. Agent-prepared entries use the same record and rules as manual ones. */
export type ExpenseSource = 'manual' | 'telegram' | 'chat' | 'tracker'

export type PaymentMethod = 'card' | 'bank_transfer' | 'cash' | 'wallet' | 'other'

/** Fields of an expense that a reading or a review can point at. */
export type ExpenseField = 'amount' | 'label' | 'at' | 'vendor' | 'category' | 'treatment' | 'projectId' | 'batchId'

/** A receipt or invoice file. The file itself lives in browser storage (IndexedDB) in the prototype, object storage in production. */
export interface ReceiptFile {
  id: string
  name: string
  /** MIME type: an image or application/pdf. */
  type: string
  size: number
  addedAt: string
  /** Seeded demo receipt drawn by the app, not a real file. */
  sample?: boolean
}

/**
 * What Tracker read from a message or a receipt when it prepared the entry. Sample data in the prototype:
 * there is no OCR or AI extraction yet. The backend fills this when the agent prepares an entry.
 */
export interface PreparedBy {
  /** What the person sent, such as a chat message or "Photo of a receipt". */
  request: string
  /** One line on what Tracker understood. */
  reading: string
  /** Fields Tracker was unsure about; the review highlights them. */
  unsure?: ExpenseField[]
}

/**
 * One expense entry. A single record, optionally linked to one project, so it is never counted twice.
 * Operating and project expenses are never added to product inventory cost; production costs live in batches.
 */
export interface Expense {
  id: string
  /** Description, such as "Winter lookbook photo shoot". */
  label: string
  vendor?: string
  /** Positive, in the brand's currency. */
  amount: number
  /** ISO timestamp the expense was incurred. */
  at: string
  /** Category id. Missing until someone categorizes it. */
  category?: string
  /** Missing until someone decides; such entries stay in review. */
  treatment?: ExpenseTreatment
  status: ExpenseStatus
  /** Season or project this cost belongs to. Only for operating costs; production costs reach projects through their batch. */
  projectId?: string
  /** Batch this production cost belongs to. Only for production costs. */
  batchId?: string
  source: ExpenseSource
  receipt?: ReceiptFile
  paymentMethod?: PaymentMethod
  /** Invoice or transaction reference. */
  reference?: string
  notes?: string
  prepared?: PreparedBy
  createdAt: string
  updatedAt?: string
  voidReason?: string
}

export type ExpenseEventKind = 'created' | 'prepared' | 'updated' | 'confirmed' | 'voided' | 'restored' | 'receipt_attached' | 'receipt_removed' | 'project_changed'

/** One line of an expense's history. Server-written in production. */
export interface ExpenseEvent {
  id: string
  expenseId: string
  kind: ExpenseEventKind
  text: string
  at: string
  /** Who made the change. Tracker only ever prepares; a person confirms. */
  by: 'you' | 'tracker'
}

export interface TrackerDataset {
  currency: 'USD'
  /** Manufacturing brands build products from batches; resellers buy finished stock. */
  model: 'manufacturing' | 'resale'
  collections: Collection[]
  products: Product[]
  batches: Batch[]
  projects: Project[]
  expenseRules: ExpenseRule[]
  ledger: LedgerDay[]
  activity: ActivityEntry[]
  expenses: Expense[]
  expenseEvents: ExpenseEvent[]
  /** The brand's custom categories. Built-in ones come from EXPENSE_CATEGORIES in lib/expenses.ts. */
  expenseCategories: ExpenseCategoryDef[]
  batchSales: BatchSale[]
  projectEvents: ProjectEvent[]
}
