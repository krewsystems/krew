# Tracker: backend handoff

> For the technical partner (and their Claude) building Tracker's production backend. It covers everything the frontend prototype assumes: data, rules, operations, agent permissions, and what is simulated today.
> For the product, read `docs/KREW_CONTEXT.md` first. For screens and UX decisions, read `docs/TRACKER.md`. This document is the contract; where they differ, the code in `FRONT/src/lib/*.ts` is the reference implementation of each rule.
>
> **State (29 October 2026):** the frontend prototype is complete (Summary, Product costing, Seasons, Expenses, Profitability, Reports). There is no backend; all data is simulated and saved in the browser.

---

## 1. Principles (non-negotiable)

1. **One source of truth.** The Finance screens, Tracker reports, KREW Chat and Telegram all read the same records through the same operations. No screen or agent computes its own totals.
2. **Human approval for consequences.** Anything that changes financial figures (confirming an expense, editing a confirmed one, finalizing a batch) needs a person, or the agent going through the KREW approval gate with a recorded approval (`KREW_CONTEXT.md` §5.2).
3. **Never write to Shopify.** Tracker reads Shopify; it never writes prices, inventory or orders.
4. **History is immutable.** Finalized batches are never edited; corrections create revisions. Expenses are voided, not deleted. Every change is written to an audit log server-side.
5. **Count everything once.** A record has at most one project and one batch. Moving it never duplicates it.
6. **Honest numbers.**
   - Missing costs are flagged, never treated as zero silently.
   - Estimates are labelled.
   - Incomplete real data is never blended with simulated or rule-based figures.
7. **Keep it simple.** One API service and one database to start.

---

## 2. Who owns what

| Data | Owner | Notes |
|---|---|---|
| Products, variants, SKUs, Shopify ids, images, list prices | Shopify (read) | Joined to KREW records by Shopify product and variant id |
| Orders, order lines, quantities, prices actually paid, discounts, refunds, returns, sales channel | Shopify (read) | Revenue always uses the price actually paid, never today's list price |
| Inventory levels | Shopify (read) | Display only |
| Batches, cost components, revisions | KREW | Product costing |
| Seasons and projects, and their links to batches and expenses | KREW | |
| Expense entries, receipts, categories, history | KREW | |
| Order-line to batch allocations (cost flow) | KREW (computed) | **To be designed** (§5.2) |
| Profitability, statements, findings | KREW (computed) | Never stored as editable totals |
| Reports | KREW agent reporting system (shared) | Tracker's reports are ordinary KREW reports |

---

## 3. Data model

The draft contract is `FRONT/src/data/tracker/types.ts` (Tracker) and `FRONT/src/data/types.ts` (KREW-wide, including `Report`). All money is in the brand's single currency (USD in the demo; the owner's examples use EGP). Dates are ISO strings.

### 3.1 Products (from Shopify)
- `Product`: id, name, sku, collectionId, `price` (list price), `variants[]`.
- `Variant`: id, title, sku, optional `price` override, optional `inventory`.
- `salesShare` on `Product` is **mock-only**: drop it.

### 3.2 Batches (Product costing)
- **`Batch`:** one production run (maker) or purchase order (reseller).
  - `id`, `productId`, `projectId?`, `label`, `kind` (`production` | `purchase`), `supplier?`, `receivedAt`
  - `status` (`draft` | `finalized` | `revised`)
  - `quantities[]` (`variantId`, `quantity`), `components[]`
  - `revisionOf?`, `revisionReason?`, `revisedBy?`, `finalizedAt?`, `updatedAt?`
- **`CostComponent`:** a user-named cost line.
  - `id`, `label`, `basis` (`per_unit` | `batch_total`), `amount`
  - `appliesTo?` (variant ids; missing means the whole batch)

### 3.3 Projects (Seasons)
- `Project`: id, name, `type` (`season` | `collection` | `launch` | `campaign` | `other`), description?, `status` (`planning` | `active` | `completed` | `archived`), startsAt, endsAt?, revenueTarget?, budget?, createdAt. **It stores no totals.**
- `ProjectEvent`: project history (created, updated, status or budget changed, batch attached or detached, expense added, linked, unlinked, confirmed or updated). Written by the server.

### 3.4 Expenses
- **`Expense`:** one entry, shared by Expenses, Seasons, Summary and statements.
  - `id`, `label` (description), `amount` (positive), `at` (date incurred), `vendor?`
  - `category?`: any category id; missing means uncategorized.
  - `treatment?`: `operating` | `production` | `non_expense`; missing means undecided.
  - `status`: `needs_review` | `confirmed` | `void`.
  - `projectId?`: operating entries only. `batchId?`: production entries only.
  - `source`: `manual` | `telegram` | `chat` | `tracker` (the channel the entry came from, not who confirmed it).
  - `receipt?` (`ReceiptFile`), `paymentMethod?` (`card` | `bank_transfer` | `cash` | `wallet` | `other`), `reference?`, `notes?`
  - `prepared?` (`PreparedBy`), `createdAt`, `updatedAt?`, `voidReason?`
- **`ExpenseCategoryDef`:** `id`, `label`, `suggests?` (treatment pre-filled when picked), `custom?`.
  - Built-ins are in `lib/expenses.ts` `EXPENSE_CATEGORIES`. Packaging, transport and other suggest nothing, because it depends.
  - Custom categories are per brand, with unique names (case-insensitive).
- **`ReceiptFile`:** `id`, `name`, `type` (image/* or application/pdf), `size`, `addedAt`, `sample?`. Metadata only; the file goes to object storage.
- **`PreparedBy`:** what the agent read when it prepared an entry.
  - `request` (what was received), `reading` (what was understood), `unsure[]` (fields to check).
  - **Sample data today; no extraction exists.**
- **`ExpenseEvent`:** `kind` (created, prepared, updated, confirmed, voided, restored, receipt attached or removed, project changed), `text`, `at`, `by` (`you` | `tracker`). Server-written.

### 3.5 Reports (shared KREW model)
- **`Report`:** `id`, `agentId`, `topic?`, `title`, `period`, `createdAt`, `summary`, `highlights[]`, `sections[]`.
  - `kind`: `daily` | `weekly` | `monthly` | `ad-hoc`. `ad-hoc` means the person asked for it.
  - `topic` was added for Tracker: `performance` | `profitability` | `expenses` | `projects` | `costs`. It is optional, and no other agent uses it yet.

### 3.6 Simulated in the prototype, to be replaced
| Prototype | Replace with |
|---|---|
| `LedgerDay` (180 days of mock daily sales and rule-based opex) | Aggregations over Shopify order lines and expense entries |
| `ExpenseRule` (rate or monthly rules for opex) | Confirmed expense entries plus fee and shipping data (§5.4). **Delete the rules; never blend them with records.** |
| `BatchSale` (units sold and net sales per batch) | The cost-flow allocation output (§5.2) |
| `ActivityEntry` (recent activity feed) | The audit log. Activity about an expense takes its review state from the expense (`expenseId`). |
| localStorage (`krew-tracker-demo` v4, `krew-demo` v3) and IndexedDB receipts | The database and object storage |

---

## 4. Costing rules (`lib/costing.ts`)

- **Per-unit cost:** amount × units of the variants it applies to.
- **Whole-batch cost:** the amount, allocated to the variants it applies to in proportion to quantity. Allocation is by quantity only; value or weight allocation is not supported.
- **Batch totals:**
  - total cost = Σ components;
  - unit cost = total ÷ units;
  - variant unit cost = its allocation ÷ its units;
  - the variant allocations must sum to the batch total.
- **A batch cannot be finalized** while:
  - it has no quantity or no costs;
  - a cost has no name, or an amount of zero or below;
  - a cost applies to no variants, or only to variants with zero units (it is never spread silently).
- **Lifecycle:**
  - drafts are editable;
  - a finalized batch is read-only;
  - a correction creates a new batch with `revisionOf` and a required reason, and on finalize the original becomes `revised` with `revisedBy`;
  - discarding is allowed for drafts only.
- **Attaching or detaching a batch to a project** changes only `projectId`, never the cost.
- **"Current cost"** (the latest finalized batch) is a display rule in Product costing only. It is **not** used to cost sales.

---

## 5. Financial calculations

### 5.1 Period summary and P&L (`lib/finance.ts`)
- Net sales = gross sales − discounts − refunds (from order lines, at prices actually paid).
- COGS = Σ units sold × the unit cost of the batch those units came from.
- Gross profit = net sales − COGS. Gross margin = gross profit ÷ net sales.
- Net profit = gross profit − operating expenses.
- Each period is compared with the previous period of equal length.
- **Closed months:** books count as final for whole months about ten days after month end (`finalizedThrough`). Anything later is labelled an estimate.
- **Missing costs:**
  - products with no finalized cost add their sales to `uncostedSales` and no COGS;
  - the UI shows the likely understatement: uncosted sales × (COGS ÷ costed sales);
  - net profit is shown as a range when costs are missing.

### 5.2 Cost flow: **the main backend decision**
The prototype costs each day's units at the most recent finalized batch received on or before that day (`costTimeline` / `costOn`). Sales before the first recorded batch use the first batch. That keeps history from moving when a new batch arrives, but it is a stand-in. The backend must:
1. **Choose one cost-flow method**, FIFO or weighted average, document it, and apply it consistently, including to refunds, returns and adjustments.
2. **Allocate each order line to batches** with that method, producing per-batch units sold and net sales (this replaces `BatchSale`).
3. **Never re-cost history** when a new batch arrives or a revision is made. A revision changes the cost of units allocated to the revised batch only if the policy says so; decide and document it.
4. **Define overlapping batches:** order dates alone cannot identify the batch when two are in stock.

### 5.3 Projects (`lib/projects.ts`)
- **Attribution:** a sale counts toward a project **only if it came out of one of the project's batches**. A product being in a project does not pull all of its sales in. This must be defined for real orders, and the rule above is the prototype's.
- **Production investment** = Σ total cost of the project's finalized batches. Of that:
  - **COGS** = units sold × each batch's unit cost;
  - **inventory** is the unsold remainder.
- **Profit chain:**
  - gross profit = net sales − COGS;
  - **estimated profit** = gross profit − project expenses (confirmed operating entries linked to the project);
  - **spending** (against the budget) = investment + project expenses.
- **Edge cases:** revised batches are excluded. Draft batches with sales are flagged ("profit reads high"), not costed at zero silently. Linked entries still in review are listed as pending and not counted.
- Project figures cover each project's whole life, not a selected period.

### 5.4 Expenses (`lib/expenses.ts`)
- **An entry counts as an expense only when `status = confirmed` and `treatment = operating`.** Nothing else counts in any expense total.
- **Total expenses = project expenses + general operating.** A project is a dimension of operating expenses, not a separate category.
- **Production entries** are the documents behind batch costs (an invoice for freight-in, say). The batch's components carry the cost into COGS, so the entry is never added as an expense.
  - If the batch is a draft, the owner adds the cost to the batch; Tracker never edits batch costs from an expense.
  - *To build:* reconcile production entries against their batch's component total.
- **Non-expense entries** (supplier payments, deposits, refunds, owner contributions, transfers, inventory purchases) are kept for cash and payables reconciliation, not P&L.
- **Normalization on save:**
  - production and non-expense entries lose any `projectId`, because production reaches projects through its batch;
  - non-production entries lose any `batchId`.
- **Validation** (a person saving):
  - description 1 to 140 characters;
  - amount above 0, at most 10,000,000 and at most 2 decimals;
  - a real date, not in the future and not before 2000;
  - a category is required;
  - a chosen batch must exist and not be revised.
- **Agent preparing:** the same rules, except the category is optional.
- **Confirming additionally needs** a category, a treatment, and a batch for production entries. Undecided entries stay in review.
- **Possible duplicates:** same amount, same vendor or description, within three days, not void. A warning only, never a block.
- **Void instead of delete.** A void entry has an optional reason, counts nowhere and can be restored. Restoring returns it to review.
- **Dates:** store the chosen date at 12:00 UTC (or as a date type) so time zones never shift it.

**Summary operating expenses: the switch to the ledger.** The prototype still uses rule-based estimates, labelled, because the demo ledger is incomplete. Do **not** add confirmed entries on top of rules. Switch per closed month:
1. A month uses the confirmed ledger once it is reconciled (closed, nothing in review for it).
2. Open months show a labelled estimate until they close.
3. Payment fees and shipping labels should arrive as entries from Shopify Payments and carrier data, not from rates.

### 5.5 Profitability (`lib/profitability.ts`)
- Product profitability stops at **gross profit**. Operating expenses are never spread over products; there is no justified allocation. Project expenses appear only in project profit.
- **Product status:**
  - Missing cost: no finalized cost;
  - Losing money: margin below 0;
  - Low margin: below 30%;
  - Healthy: otherwise.
- **Collections:** totals over costed products only; uncosted products are counted and named.
- **Batch history per product:** unit cost per batch, change against the previous finalized batch, and margin at list price. The list price is used only to compare batches; realised margin needs allocated order prices.
- **Findings:** fixed rules, not AI. Each finding links to the product, Product costing or the project.
  - missing cost with sales;
  - selling below cost;
  - margin under 30%;
  - a product with at least 15% of sales whose margin is at least 8 points under the overall margin;
  - the latest batch's unit cost up more than 5% on the previous batch;
  - active or completed projects with a loss, expenses over 30% of net sales, or spending over budget.

  The thresholds are constants and could become brand settings.

### 5.6 Statements (Reports → Statements)
Profit and loss, Expense statement, Product margins, Seasons and projects. They are **computed on request for any period, never stored or generated**, and use exactly the calculations above, so they always match the Finance screens. In the P&L, a cost line's change is the change in its size, so a rising cost reads as an increase.

---

## 6. Operations (API)

Suggested REST shape under `/workspaces/:wsId/tracker`. Each maps to a prototype action in `FRONT/src/store/tracker.ts` (via the hooks in `components/tracker/use-tracker.ts`). Every write appends to the audit log and to the entity's history.

| Operation | Prototype | Endpoint |
|---|---|---|
| Products with variants and current cost | `useTrackerData` | `GET /products` (Shopify data merged) |
| List batches | `useTrackerData` | `GET /batches?productId=&projectId=` |
| Save a batch draft | `saveDraft` | `POST /batches`, `PATCH /batches/:id` (drafts only) |
| Finalize a batch | `finalize` | `POST /batches/:id/finalize` (runs the blocking rules) |
| Correct a finalized batch | `finalize` with `revisionOf` | `POST /batches/:id/revisions` (reason required) |
| Discard a draft | `discardDraft` | `DELETE /batches/:id` (drafts only) |
| Attach or detach a batch | `setBatchProject` | `PATCH /batches/:id { projectId }` |
| Create or update a project | `saveProject` | `POST /projects`, `PATCH /projects/:id` |
| Project history | `projectEvents` | `GET /projects/:id/events` |
| Project financials | `projectFinancials` | `GET /projects/:id/financials` |
| List and search expenses | `filterExpenses`, `sortExpenses` | `GET /expenses?from=&to=&q=&status=&category=&project=&treatment=&sort=` (void hidden unless `status=void`) |
| Create an expense | `createExpense` | `POST /expenses` with an idempotency key (the client id), so a double submit records once. Agent calls are forced to `needs_review`. |
| Edit, categorize, classify, link or unlink | `updateExpense` | `PATCH /expenses/:id` (server writes the history diff) |
| Confirm | `updateExpense` (status) | `POST /expenses/:id/confirm` |
| Void and restore | `updateExpense` (status) | `POST /expenses/:id/void { reason? }`, `POST /expenses/:id/restore` |
| Receipt | `updateExpense` + `lib/receipt-files.ts` | `POST /expenses/:id/receipt` (upload), `GET` (signed URL), `DELETE` |
| Expense history | `expenseEvents` | `GET /expenses/:id/events` |
| Categories | `addExpenseCategory` | `GET /expense-categories`, `POST /expense-categories` |
| Expense summary | `summarizeExpenses`, `expensesByCategory` | `GET /expenses/summary?from=&to=` |
| Period summary and series | `summarize`, `performanceSeries` | `GET /summary?from=&to=` (with the previous period) |
| Profitability | `productRows`, `collectionRows`, `findings` | `GET /profitability?from=&to=&by=product\|collection\|project` |
| Product profitability detail | `productSeries`, `batchCostHistory` | `GET /profitability/products/:id?from=&to=` |
| Statements | `StatementView` | `GET /statements/:id?from=&to=` (`pnl`, `expenses`, `margins`, `seasons`) |
| Tracker's reports | shared `ws.reports` | `GET /workspaces/:wsId/reports?agentId=tracker&topic=` (shared reports service) |

---

## 7. Tracker agent: permissions and approvals

The agent uses the **same records, validation and endpoints** as the dashboard. There is no separate agent data model and no agent-only shortcut.

| Level | What | Who |
|---|---|---|
| **Read** | List, search and summarize records; open receipts; answer questions; explain findings | Agent, if granted |
| **Prepare** (no financial effect) | Create an expense in `needs_review` with `prepared`; on an entry in review, suggest a category, treatment, project or batch; attach a receipt to it | Agent, if granted; the result always lands in review |
| **Consequential** (changes figures) | Confirm an entry; edit a confirmed entry's amount, date, treatment, project or batch; void or restore; finalize or revise a batch; add a cost to a batch; create a project | A person, or the agent only through the KREW approval gate with a recorded approval |

- **Default** for a new workspace: read and prepare only.
- **Server-side:** the server enforces the level, records `by` (person or agent) on every event, and rejects agent writes above its grant.
- **Example flow:** "Add 1,500 for yesterday's photoshoot to Winter 27" in chat or on Telegram.
  1. The agent resolves the project by name, then calls `POST /expenses` with `source: chat`, `status: needs_review`, the fields it parsed, and `prepared` (request, reading, and `unsure`, for example the vendor).
  2. It replies with a link to the entry.
  3. The owner confirms in the app or by a confirmation reply that the approval gate records.
- **Explaining figures:** the agent reads the profitability, expense and project endpoints and quotes the finding with its inputs (batch, cost change, margin points). It never computes figures of its own.

---

## 8. Receipts

- **Accepted files:** images and PDF, up to 10 MB, stored in object storage. The entry keeps `ReceiptFile` metadata and the server issues signed URLs for preview. Removal is logged; never silently delete the file of a confirmed entry.
- **Future extraction** (not built):
  1. A photo sent on Telegram or in chat creates an entry in `needs_review`, with `source` set to the channel, the extracted fields, and `prepared` naming the uncertain fields. It never confirms itself.
  2. Low-confidence fields are highlighted in the review form (the UI already supports `prepared.unsure`).
- **The prototype** keeps files in IndexedDB, in the browser that attached them. Seeded receipts are drawn images stamped "Sample receipt".

---

## 9. Reports

- Tracker's reports are ordinary KREW reports in the shared reporting system, the same store and viewer used by every agent.
  - **Finance → Reports** is only an entry point. It lists the workspace's reports filtered to `agentId: tracker`, and opens them in the shared viewer (`/reports/:id`).
  - There is no second report store, viewer or export engine.
- **Scheduled reports** (`daily`, `weekly`, `monthly`) come from the agent run on its schedule. **Requested reports** (`ad-hoc`) are produced when the person asks in chat.
- **Report content** must be built from the same endpoints as the Finance screens (§6), so a report never disagrees with the screens at the time it was written. A report is a snapshot; statements are live.
- **Still simulated:** PDF export in the shared viewer.

---

## 10. Open decisions and known gaps

1. **Cost-flow method** and order-line to batch allocation (§5.2), including refunds, returns and the effect of revisions.
2. **Project attribution** of real orders (prototype: sales out of the project's batches).
3. **Switch to ledger-backed operating expenses**, per closed month (§5.4); the source of payment fees and shipping costs.
4. **Accruals and prepayments:** none today; an expense counts on its date.
5. **Payment status and payables** for expenses and supplier invoices: not built.
6. **Tax / VAT split, multi-currency and FX:** not supported; one currency per brand.
7. **Reconciliation of production entries** against batch components, and of non-expense entries against bank data.
8. **Whole-batch cost allocation** by value or weight: not supported (quantity only).
9. **Variant prices:** the model supports overrides, but there is no UI to edit them.
10. **Thresholds** for findings as brand settings.
11. **Profit by sales channel:** needs channel data from Shopify orders.
12. **Monthly close:** who closes a month, what locks it, and how late entries for a closed month are handled.

---

## 11. Code map and checks

| Concern | Files |
|---|---|
| Contract | `FRONT/src/data/tracker/types.ts`, `FRONT/src/data/types.ts` (`Report`) |
| Rules (reference implementation) | `FRONT/src/lib/costing.ts`, `finance.ts`, `projects.ts`, `expenses.ts`, `profitability.ts` |
| Operations | `FRONT/src/store/tracker.ts`; hooks `FRONT/src/components/tracker/use-tracker.ts` (`useBatchActions`, `useProjectActions`, `useExpenseActions`) |
| Sample data | `FRONT/src/data/tracker/mock.ts`, `FRONT/src/data/tracker/reports.ts` |
| Screens | `FRONT/src/pages/agent/tracker/**` |

Calculation checks run without a browser, from `FRONT/`:
```
node --import ./scripts/tracker/register.mjs scripts/tracker/costing.check.ts
node --import ./scripts/tracker/register.mjs scripts/tracker/projects.check.ts
node --import ./scripts/tracker/register.mjs scripts/tracker/expenses.check.ts
```
They encode the acceptance scenarios (for example a 100-unit batch with fabric 20,000, buttons 2,000, manufacturing 15,000 and packaging 30 per unit comes to a unit cost of 400; a project with 30 of 100 units sold recognises COGS only for those 30). Port them as backend unit tests.
