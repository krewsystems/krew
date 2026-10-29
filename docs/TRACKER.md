# Tracker: finance workspace

> **Living document.** It records what has been built for Tracker (KREW's finance agent), why, and what the backend must do. Update it at the end of every stage. Read `docs/KREW_CONTEXT.md` first for the whole product.
>
> **Status (29 October 2026):** frontend only, built on simulated data. Stages 1 to 6 are done; the Finance workspace is complete for owner review. Nothing is committed yet.

**Backend handoff:** the complete contract for the backend (data, rules, operations, agent permissions, open decisions) is in `docs/TRACKER_BACKEND.md`. This file covers what was built and why.

**Readers.** Two kinds of reader use this file:
- a new Claude session continuing the frontend, which should read sections 1 to 10;
- the technical partner and their Claude building the backend, who should start with sections 1, 5 to 7 and 11, then 12 and 13.

---

## 1. What Tracker is

Tracker is KREW's finance agent for e-commerce brands. It tracks:
- product costs and production or purchase batches;
- seasons and projects;
- expenses;
- profitability.

Unlike chat-first agents, Tracker has a dedicated visual workspace. The same operations will later be available through the Tracker agent in KREW Chat and on Telegram. The UI and the agent must share **one source of truth**. Any write the agent prepares waits for a human to confirm it, following the KREW approval rule.

The two demo brands exercise both business models:
- **Sahra Home** (home goods and ceramics, `manufacturing`): produces items from materials, and some products have variants.
- **Noor Skin** (skincare, `resale`): buys finished goods from contract labs.

---

## 2. Where it lives in the app

- **URL:** `/krew/tracker/workspace` is Tracker's **Finance** tab. It sits inside the normal agent page, which keeps the same profile header and the same top tab bar (Overview, Finance, Tasks, Reports, History, Settings) as every other agent.
- **Navigation:** inside Finance, one side navigation (desktop) or one "Sections" menu (mobile) switches sections:

| Section | Route | State |
|---|---|---|
| Summary | `/krew/tracker/workspace` | Built (Stage 1, refined in 1.1) |
| Product costing | `.../workspace/costing`, `.../costing/:productId?batch=…` | Built (Stage 2) |
| Seasons | `.../workspace/seasons`, `.../seasons/new`, `.../seasons/:projectId[?edit=1]` | Built (Stage 3) |
| Expenses | `.../workspace/expenses`, `.../expenses/new[?forProject=…]`, `.../expenses/:expenseId[?edit=1]` | Built (Stage 4) |
| Profitability | `.../workspace/profitability[?view=collections\|projects]`, `.../profitability/:productId` | Built (Stage 5) |
| Reports | `.../workspace/reports` (opens `/reports/:reportId`) | Built (Stage 6) |

- **Routes:** `App.tsx` gained two routes, `/krew/:agentId/:tab/:section` and `/krew/:agentId/:tab/:section/:itemId`. `AgentWorkspacePage` ignores the extra parameters, and `AgentModule` renders `TrackerWorkspace` for the tracker's workspace tab.
- **Top bar:** `SectionBar.tsx` changed only its path match, to `/krew/:agentId/:tab?/*`, so the Finance tab stays highlighted on sub-pages.

---

## 3. What was built, stage by stage

### Stage 1: Financial overview (Summary)
- **Period control:** 7, 30 or 90 days, or a custom range of up to 90 days, kept in the URL (`?period=` or `?from=&to=`). Every figure is compared with the previous period of the same length.
- **Main panel:** net profit is the headline number, marked **Estimate**. Months count as closed about 10 days after month end. Net sales comes second, with a smoothed trend line, followed by an "of every dollar" bar.
- **Missing costs shown as a range.** When products have no recorded cost, net profit is shown as a range (for example "Likely $106,831 to $120,272"). The low end assumes the uncosted products cost what the costed ones do relative to their sales.
- **Needs attention:** products without cost, entries to confirm and uncategorized expenses. Each opens a drawer listing the records behind it.
- **Supporting figures:** a compact row with COGS, gross profit, gross margin and operating expenses.
- **Performance chart:** net sales and net profit, with gross profit available as a toggle.
- **Top products:** ranked by gross profit, expanding into the full sortable table with a Products/Collections switch.
- **Recent activity:** items to review come first.
- **Seasons panel:** the active project in detail, the others one line each.

### Stage 1.1: UX refinement (owner feedback)
- Built the hierarchy described above, the semantic colour tokens, grain texture, side navigation and less dense layout.
- **Reverted:** an attempt to give Finance its own compact header and a different top bar was rejected by the owner, because changing the frame when you switch tabs is jarring. Finance now uses the standard agent frame (see section 4).

### Stage 2: Product costing
- **List:** search by name, SKU or variant; filters (Missing cost, Several batches, Drafts); sorting. Each row shows price, unit cost, margin, stock and status.
- **Focused pop-up:** clicking a product opens a near full-screen sheet (`ProductSheet`) over the list, as the owner requested. The sheet contains:
  - **Product view:** price, cost and margin; batch history (open, duplicate, new); variants table; current unit economics.
  - **Batch editor**, in three steps: details, quantity per variant, then costs.
    - Costs start simple: "What did you pay for one unit?". A full breakdown is optional: "+ Add cost" and suggestion chips. Each cost has a name, an amount, a **Per unit / Whole batch** switch and an **Applies to** variant picker.
    - Live unit economics sit alongside: total, unit cost, price, profit per unit, margin, cost breakdown, costs by variant, and a reconciliation check.
    - **Save draft**, then **Review and finalize**, with a confirmation in the sticky action bar.
    - Finalized batches are read-only. Corrections go through **Correct with a revision**, which needs a reason and keeps the original marked "Revised". **Duplicate as new batch** pre-fills a new draft.
- **Unsaved changes:** closing the sheet or leaving a batch with unsaved edits asks "Leave without saving?".

### Stage 3: Seasons and projects
- **List:** a grid of **cards**. Each card has a coloured band per project type, with an icon:

  | Type | Icon | Colour |
  |---|---|---|
  | Season | Snowflake | blue |
  | Collection | Layers | amber |
  | Product launch | Rocket | green |
  | Marketing campaign | Megaphone | terracotta |
  | Other | Folder | grey |

  Each card shows status, estimated profit (or "No sales yet · $X spent"), net sales against target, spending against budget, batch and expense counts, and warnings. A dashed "New project" card closes the grid.
- **Toolbar:** search, status filter (Planning, Active, Completed, Archived) and sort, plus a summary strip above the grid.
- **Create and edit:** in the same focused sheet.
  - **Up front:** name, type chips, start date and status.
  - **Optional, behind a disclosure:** description, end date, revenue target and budget.
  - **Validation:** empty or duplicate name, end date before start, amounts that are zero or below.
- **Project view:**
  - **Status and editing:** a status dropdown and an Edit button.
  - **Profit summary:** net sales − cost of units sold = gross profit − project expenses = estimated profit.
  - **Production investment:** split into sold versus still in stock.
  - **Budget and target:** progress for each.
  - **Batches:** attach or remove.
  - **Expenses:** link existing ones, add new ones, or remove them.
  - **History:** every change is recorded.

### Stage 4: Expenses and receipts
- **Ledger:** title, a one-line summary ("$X counted in the last 30 days… N entries waiting for review") and **Add expense**. A period switch (30 days, 90 days, 12 months, all time, or custom dates under Filters) drives four compact figures: total expenses, project expenses, general operating, needs review (amber, clickable). A quiet line below lists what is recorded but not counted (production costs, supplier payments).
- **List:** grouped by month when sorted by date. Each row: date, description, vendor and category, a source icon for anything not entered by hand, project (with its type colour), receipt clip, status, amount. Production costs, non-expenses and void entries show their amount muted.
- **Toolbar:** search (description, vendor, reference, category), status (All, To review, Confirmed, Void), Filters popover (category, project or "No project", how it counts, dates), sort (newest, oldest, highest, lowest). Filter chips remove one filter each. All of it lives in the URL.
- **Add, edit and review** open in the same focused sheet (`ProductSheet`) as Costing and Seasons:
  - Up front: amount, date (today by default), description, category (with **+ New category**), vendor, **How it counts** (Operating expense, Production cost, Not an expense, Not sure yet), then a project picker, or a batch picker for production costs.
  - Behind a disclosure: payment method, reference, notes.
  - Beside it: the receipt drop area or preview, a possible-duplicate warning, and a one-line note on where the money will count.
  - Buttons: **Save expense** (becomes **Save for review** when the treatment is undecided), **Save and add another**. In review: **Confirm entry** and **Save for later**. Fields Tracker was unsure about are ringed in amber.
- **Detail:** amount, description, status, source and classification; a review banner with **Confirm** (or **Complete and confirm**); the "Prepared by Tracker" panel marked **Sample data**; details with an inline project picker (link, move or unlink without opening the form); **Where it counts**; history; receipt preview that opens full size.
- **Void instead of delete:** with an optional reason. Void entries are kept, count nowhere and can be **restored** (back to review).
- **Seasons now uses the same records:** the project's quick add form uses the shared validation and save path (with a link to the full form with receipt). Linked entries still in review are listed as "To review · not counted". Rows open the entry in Expenses.
- **Summary (Stage 4 change):** the "entries to confirm" attention item now reads expense records (it absorbed the old "uncategorized" item, so the same entries are not listed twice) and links to `?status=needs_review`. Activity entries about an expense take their review state from it. Operating expenses are labelled "Estimated from sample rules" and are **unchanged** (section 7).

### Stage 5: Profitability
- **Page:** the same period picker as the Summary. A summary panel led by **gross profit** (large), with net sales, gross margin and **net profit marked Estimate** beside it. An amber strip appears when products have no cost, with the likely overstatement and an "Add costs" link.
- **Trend:** the existing performance chart, with net sales, gross profit and estimated net profit all shown (each can be toggled).
- **Needs attention:** findings from fixed rules (`lib/profitability.ts findings`), each linking to the product, Product costing or the project. Rules: missing cost with sales; selling below cost; margin under 30%; a product with 15% or more of sales whose margin is 8 or more points under the overall margin; the latest batch's unit cost up more than 5% on the previous batch; for active or completed projects, a loss, expenses over 30% of net sales, or spending over budget.
- **Breakdown:** one switch, Products / Collections / Seasons (URL `?view=`).
  - Products: search, filter (All, Low or losing, Missing cost) and sort (gross profit, highest margin, lowest margin, revenue, units). Each row shows units, net revenue, COGS, gross profit, margin and status (Healthy, Low margin, Losing money, Missing cost).
  - Collections: totals over the costed products only.
  - Seasons: `projectFinancials` rows. A row opens the existing project view in Seasons; nothing is duplicated.
- **Product detail** (focused sheet): the period's figures, sales, COGS and gross profit over time, batch history (unit cost, change against the previous batch, margin at list price, units sold), the current batch's cost breakdown (`UnitEconomicsPanel`), and the product's observations. Links go to Product costing.


### Stage 6: Reports
- **No second reporting system.** Finance → Reports is another entry point to the shared KREW report library:
  - the list is `ws.reports` filtered to `agentId: 'tracker'`;
  - each row opens the existing viewer at `/reports/:reportId`;
  - downloading and copying a link happen in that viewer, as everywhere else.
  - The same reports appear in the Reports library, on Tracker's Reports tab and as chat attachments.
- **The page has two parts:**
  - **Statements** (always available, live): Profit and loss, Expense statement, Product margins, Seasons and projects. Each card shows its headline figure for the period, and each opens in the focused sheet (`/reports/:statementId`) with its own period picker.
    - The P&L shows lines against the previous period, as a % of net sales, with change, plus the performance chart. Operating costs are still the estimate.
    - The expense statement lists confirmed entries by category, split general and project, and names what is excluded.
    - Product margins are grouped by collection; seasons use `projectFinancials`.
    - Statements are never stored or generated: they reuse `summarize`, `productRows`, `collectionRows`, `summarizeExpenses`, `expensesByCategory` and `projectFinancials`, so they always match the Finance screens.
  - **From Tracker:** the agent's reports drawn as documents (subject, key figures, summary, cadence, date, section count). A filter separates Scheduled (daily, weekly, monthly) from "You asked" (`ad-hoc`), and there is search. Each opens in the shared viewer.
- **Data changes:**
  - `Report` gained an optional `topic`: performance, profitability, expenses, projects or costs. No other agent uses it yet;
  - four Sahra and one Noor sample Tracker reports were added to the seeds (`data/tracker/reports.ts`), and the existing Tracker reports were tagged;
  - the KREW store moved to version 3, which merges the new reports into saved workspaces without reseeding.
- **Viewer:** when a report is opened from Finance, its breadcrumb returns to Finance reports.
- **Backend:** reports remain generated by the agent run (`/workspaces/:wsId/reports`, filterable by `agentId` and `topic`). Tracker's report content must be built from the same profitability, expense and project endpoints as the Finance workspace, so a report never disagrees with the screens. PDF export is still simulated in the shared viewer.
---

## 4. UX rules from the owner (follow these)

These came from direct owner feedback during the build.

1. **Keep the frame stable.** Switching tabs must only change the content below. Never swap the header or the top bar per tab.
2. **Use focused pop-ups for work.** Opening a product or project opens a near full-screen sheet over the list, and the person works there until they save. Use `ProductSheet` (it accepts a custom `thumb`).
3. **Calm, not crowded.** Make the most important number obvious, keep supporting figures compact, and reveal detail progressively (expanders, "show all").
4. **Cards with restrained colour** suit collections such as projects. Colour has a job:
   - sales: blue `--sales`;
   - profit: green `--profit`;
   - incomplete information: amber `--warning`;
   - losses: red `--danger`;
   - project types: accents from the existing agent palette.
5. **No extra navigation layers.** The section bar (top), the agent tabs and the Finance side navigation are the whole system. The owner wanted the floating section bar removed app-wide, but that is on hold: it is the only route to Settings sections, agent Tasks and Settings tabs, Approvals history and several filters. Removing it requires in-page tabs on those pages first.
6. **Honest numbers.** Estimates are labelled. Missing costs are flagged in amber and never treated as zero silently. Sample data is labelled as sample.
7. **House style:** Helvetica only, Ivory OS monochrome base, sentence case, no em dashes, no eyebrow labels. Prefer Arc components, then skecher-ui, then HeroUI (see `FRONT/CLAUDE.md`).

---

## 5. Frontend architecture

```
data/tracker/types.ts   domain shapes (draft API contract)
data/tracker/mock.ts    seeded sample data per workspace (sahra, noor)
        │
store/tracker.ts        persisted edits per workspace (zustand, localStorage "krew-tracker-demo")
        │  seed lists are used until a workspace is edited; KREW "Reset demo data" clears it
components/tracker/use-tracker.ts
        │  useTrackerData() merges seed + edits; useBatchActions(), useProjectActions(), useExpenseActions() write
lib/finance.ts · lib/costing.ts · lib/projects.ts · lib/expenses.ts   pure calculations and rules, no React
lib/receipt-files.ts    receipt files in IndexedDB (stand-in for object storage)
        │
pages/agent/tracker/**  and  components/tracker/**   presentation only
```

| Area | Files |
|---|---|
| Workspace shell and navigation | `pages/agent/tracker/TrackerWorkspace.tsx`, `components/tracker/sections.ts`, `SectionPreview.tsx` |
| Summary (Stage 1) | `pages/agent/tracker/TrackerOverview.tsx`, `components/tracker/{ProfitHero, SupportingMetrics, PerformancePanel, ProfitabilityPanel, ActivityPanel, AttentionPanel, ProjectsPanel, PeriodPicker}.tsx` |
| Product costing (Stage 2) | `pages/agent/tracker/costing/{CostingSection, CostingList, ProductCosting, BatchEditor}.tsx`, `components/tracker/costing/{ProductSheet, UnitEconomicsPanel, parts}.tsx`, `sheet-guard.ts` |
| Seasons (Stage 3) | `pages/agent/tracker/seasons/{SeasonsSection, ProjectsList, ProjectForm, ProjectDetail}.tsx`, `components/tracker/projects/labels.ts` |
| Expenses (Stage 4) | `pages/agent/tracker/expenses/{ExpensesSection, ExpensesLedger, ExpenseForm, ExpenseDetail}.tsx`, `components/tracker/expenses/{ReceiptView, labels, sample-receipt}.ts(x)`, `lib/expenses.ts`, `lib/receipt-files.ts` |
| Labels | `components/tracker/labels.ts` (activity kinds, sources) |
| Shared formatting | `lib/format.ts`: `moneyExact`, `signedPercent` and `shortDate` were added |
| Styles | `index.css`: tokens `--sales`, `--sales-soft`, `--profit` (light and dark), plus utilities `.grain` (paper texture) and `.hatch-estimate` (hatched fill for estimates) |

**Conventions**
- **Calculations** live only in `lib/*.ts` and are deterministic. Components never compute money.
- **Writes** go through `useBatchActions`, `useProjectActions` and `useExpenseActions` → `store/tracker.ts`. Every store action is a future backend operation (section 12). `useExpenseActions` is the only write path for expenses; Seasons' link, unlink and quick add call it too.
- **URLs** hold navigation state: section, product, batch, project, edit mode and period. Reloading or sharing a link reopens the same place.
- **Focused sheets** report unsaved work through `useSheetGuard().setDirty`, and gate navigation with `guard(action)`.
- **Global KREW store:** `store/krew.ts` was not changed. Tracker keeps a separate store, which follows KREW's reset by subscribing to `seededAt`.

---

## 6. Data model (`data/tracker/types.ts`)

| Type | Meaning |
|---|---|
| `Product` | Name, SKU, collection, list price, `variants[]`. `salesShare` is mock-only, used to generate sales. |
| `Variant` | Size or colour option. Optional `price` override and `inventory`. Single-option products have one default variant. |
| `Batch` | One production run or purchase: `kind`, `supplier`, `receivedAt`, `status` (`draft`, `finalized` or `revised`), `quantities[]` per variant, `components[]`, optional `projectId`, `revisionOf`/`revisionReason`/`revisedBy`, `finalizedAt`. |
| `CostComponent` | A user-named cost: `basis` (`per_unit` or `batch_total`), `amount`, optional `appliesTo` (variant ids; missing means the whole batch). |
| `Project` | Season or project: `type`, `status` (`planning`, `active`, `completed` or `archived`), dates, optional `revenueTarget` and `budget`, `description`. **Stores no totals.** |
| `ProjectEvent` | Project history entry: created, updated, status or budget changed, batch attached or detached, expense added, linked or unlinked. |
| `Expense` | One expense entry, the single record shared by Expenses, Seasons and Summary. `label`, `amount` (positive, brand currency), `at`, `vendor?`, `category?` (any category id), `treatment?` (`operating`, `production` or `non_expense`; missing = undecided), `status` (`needs_review`, `confirmed`, `void`), `projectId?` (operating only), `batchId?` (production only), `source` (`manual`, `telegram`, `chat`, `tracker`), `receipt?`, `paymentMethod?`, `reference?`, `notes?`, `prepared?`, `createdAt`, `updatedAt?`, `voidReason?`. |
| `ExpenseCategoryDef` | `id`, `label`, `suggests?` (treatment pre-filled when picked), `custom?`. Built-ins live in `lib/expenses.ts`; brands add their own (`expenseCategories` on the dataset). |
| `ReceiptFile` | Metadata on the entry: `id`, `name`, `type` (image or PDF), `size`, `addedAt`, `sample?`. The file itself is stored separately. |
| `PreparedBy` | What Tracker read when it prepared an entry: `request`, `reading`, `unsure[]` fields. **Sample data only**; no extraction exists. |
| `ExpenseEvent` | Entry history: created, prepared, updated, confirmed, voided, restored, receipt attached or removed, project changed; `by` is `you` or `tracker`. |
| `BatchSale` | Units sold out of a batch, and what customers actually paid for them. **Sample data**, standing in for a backend cost-flow result. |
| `LedgerDay` | Mock daily sales (units per product, gross, discounts, refunds) and rule-based operating expenses that drive the Summary. |
| `ActivityEntry` | Recent financial activity. `needsReview` marks entries prepared by Tracker or read from receipts. |

---

## 7. Calculations

### Costing (`lib/costing.ts`)
- **Per-unit cost:** amount × units of the variants it applies to.
- **Whole-batch cost:** the amount, allocated to the variants it applies to in proportion to their quantity.
- **Batch totals:** total cost = Σ components. Unit cost = total ÷ total units. Each variant's unit cost = its allocated cost ÷ its units.
- **Reconciliation:** the sum of variant allocations must equal the batch total.
- **Blocking issues:** a batch cannot be finalized while any of these hold:
  - no quantity, or no costs;
  - a cost has no name, or an amount of zero or below;
  - a cost is scoped to no variants;
  - a cost is scoped to variants with no units in the batch, so it cannot be allocated. It is never spread silently.
- **Current cost:** a product's current cost comes from its most recent finalized batch. This is a display rule, not a valuation method.

### Summary (`lib/finance.ts`)
- Net sales = gross − discounts − refunds.
- COGS = each day's units × the unit cost **in effect on that day** (`costTimeline`, `costOn`), since Stage 5. Before that it used today's cost for all history. The prototype rule: the most recent finalized batch received on or before the sale date. Sales before the first recorded batch use that first batch. Drafts have no cost, and revised batches are replaced by their revision. This changed Summary figures slightly for products with several batches (for example Dune bedding); the Summary and Profitability always agree.
- Gross profit = net sales − COGS.
- Net profit = gross profit − operating expenses (rule-based in the mock ledger).
- The missing-cost range: estimated missing COGS = uncosted sales × (COGS ÷ costed sales).

### Projects (`lib/projects.ts`)
- **Attribution:** a sale counts toward a project **only if it came out of one of the project's batches**.
- **Production investment:** Σ total cost of the project's finalized batches.
- **COGS:** units sold × that batch's unit cost. Unsold units stay as inventory.
- **Gross profit:** net sales − COGS.
- **Estimated profit:** gross profit − project expenses.
- **Spending** (measured against the budget): investment + project expenses.
- **Excluded:** revised batches, which are superseded by their revision.
- **Flagged:** draft batches with sales ("profit reads high").
- **Counted once:** each expense belongs to at most one project.
- **Only confirmed operating entries count** (`countsAsExpense`). Linked entries in review are returned as `pendingExpenses` and add nothing.

### Profitability (`lib/profitability.ts`, using `lib/finance.ts` and `lib/projects.ts`)
- **Sources:**
  - net sales come from the ledger (simulated orders: gross − discounts − refunds, split across products by gross contribution);
  - COGS comes from Product costing batches, through the cost timeline above;
  - estimated net profit uses the Summary's estimated operating expenses;
  - project rows come from `projectFinancials` (sales out of the project's own batches via `BatchSale`, confirmed linked expenses counted once). They cover each project's whole life, not the selected period.
- **Products stop at gross profit.** Operating expenses are never spread over products, because there is no justified allocation. Project expenses appear only in project profit.
- **Missing data:**
  - a product with no finalized cost shows "Not set" or "n/a" and the Missing cost status, never zero;
  - the summary shows how much of its sales are uncosted and the likely size of the overstatement;
  - collection margins cover only costed products.
- **Batch margin** in the product detail is at today's list price, used only to compare batch costs. Real realised margin needs order prices per batch.
- **Backend:**
  - replace the cost timeline with the chosen cost-flow method (FIFO or weighted average), allocating Shopify order lines (actual paid price, discounts, refunds and returns) to batches;
  - compute product, collection and project profitability server-side from those allocations;
  - expose `GET /profitability?from=&to=&by=product|collection|project` and `GET /profitability/products/:id`, which return the same figures and findings;
  - the Tracker agent answers chat and Telegram questions ("why did bedding margin drop?") by reading those endpoints and quoting the findings with their inputs (batch, cost change, margin points). It never computes figures of its own.

### Expenses (`lib/expenses.ts`)
- **Counts as an expense** only when `status = confirmed` and `treatment = operating`. Entries in review, void entries, production costs and non-expenses count in no expense total.
- **Total = project + general.** A project is a dimension of operating expenses, not another bucket, so nothing is added twice.
- **Production costs** belong to a batch. The batch's cost components carry the money into COGS as units sell, so the entry is the document behind the batch cost and is never added again. If the batch is still a draft, the UI asks the owner to add the cost in Product costing; it never edits the batch itself.
- **Normalizing on save:** production and non-expense entries lose any `projectId` (production reaches projects through its batch); non-production entries lose any `batchId`.
- **Validation:** description (1 to 140 chars); amount entered, above zero, at most 10,000,000, at most two decimals; a real date, not in the future, not before 2000; category required for a person's save (Tracker may prepare without one); a chosen batch must exist and not be revised.
- **Confirming** additionally needs a category, a treatment, and a batch for production costs. Undecided entries stay in review.
- **Possible duplicates:** same amount, same vendor or description, within three days, not void. A warning only; it never blocks.
- **Dates** are stored at 12:00 UTC on the chosen day, so time zones never shift them.

### Summary and the ledger (the transition)
The Summary's operating expenses are still the **rule-based estimate** from the mock ledger, labelled as such. Confirmed ledger entries are **not** added on top, because the ledger is incomplete (it has no payroll history, no payment fees, no months of past rent) and mixing the two would understate profit. The intended switch, for the backend:
1. Per closed month, the ledger becomes the source of truth for operating expenses once that month is reconciled (books closed, nothing in review for it).
2. Open months keep showing an estimate, clearly labelled, until they close.
3. Payment fees and shipping labels should come from Shopify and carrier data as entries, not from rules.
4. The rules are then deleted, never blended with records.

---

## 8. Persistence and reset

- **Storage:** `store/tracker.ts` saves per-workspace lists (batches, projects, expenses, expense events, custom categories, project events) to localStorage key `krew-tracker-demo` (version 4; it migrates version 2's batches and gives version 3 expenses a status and treatment).
- **Receipt files** go to IndexedDB (`krew-tracker-receipts`), keyed `workspace:receiptId`. Seeded receipts are drawn on the fly and marked "Sample receipt". Both resets also clear the stored files.
- **Reset:**
  - KREW "Reset demo data" (Settings → Plan) clears Tracker edits.
  - Product costing also has **Reset demo costs**, which resets all Tracker edits for the active workspace.
- **Known gotcha:** the main KREW store only writes to localStorage after its first change, so its `seededAt` changes on every page load until then. Do not use `seededAt` to detect staleness; listen for changes to it during the session, as the store does now.

---

## 9. Sample data (`data/tracker/mock.ts`)

- **Sales:** a 180-day ledger per brand. The last 60 days follow the workspace's existing daily revenue, so Tracker agrees with the global Overview; older days extend the same curve.
- **Missing costs:**
  - Sahra: *Winter ember mug* has only a draft batch, and *Kilim cushion cover* has no batch at all.
  - Noor: *Barrier mist* has only a draft batch.
- **Variant example:** *Dune linen bedding set* has three variants (Queen Sand, Queen Clay, King Sand) and a King-only cost on batch DN-07.
- **Projects:**
  - Sahra: Winter collection 2026 (active), Ramadan gifting 2027 (planning), Summer linen 2026 (completed).
  - Noor: Winter barrier care, Ramadan gift sets, Summer SPF campaign.
- **Expenses:**
  - Project expenses sum to realistic totals, for example $14,260 on Winter collection 2026.
  - Some expenses have no project and are available for linking.
  - A few are uncategorized.
  - General operating entries (rent, Shopify, bookkeeping, electricity, mailers, creators) so the ledger looks like a real month.
  - Recorded but not counted: Sahra's DHL freight invoice for DN-07 (production, already in the batch) and the Fayoum Linen Mill payment (not an expense); Noor's deposit for VC-15.
  - In review: Sahra's kiln receipt for draft batch WN-01 (Telegram), a Meta invoice with no project (Tracker), the owner's chat message "Add 1,500 for yesterday's photoshoot to the winter collection" (chat), and four uncategorized payments; Noor's gift-set cartons (treatment unclear) and creator payments.
  - Seeded receipts are drawn images stamped "Sample receipt"; every `prepared` reading is sample text.
- **Currency:** USD for both brands. The owner's examples use EGP; the arithmetic is identical.

---

## 10. Verification

**Checks**
- **Calculation checks** run without a browser, from `FRONT/`:
  ```
  node --import ./scripts/tracker/register.mjs scripts/tracker/costing.check.ts
  node --import ./scripts/tracker/register.mjs scripts/tracker/projects.check.ts
  node --import ./scripts/tracker/register.mjs scripts/tracker/expenses.check.ts
  ```
  The Stage 3 fixture gained `status` and `treatment` on its expenses; its assertions are unchanged.
- **Browser journeys:** Stage 2 had 23 checks and Stage 3 had 19, all passing with no console errors. Stage 4: a 16-scenario Playwright run; 11 passed (create general and project expenses, shown in both places, counted once, no-receipt state, attach and preview, edit and recalculate, reload persistence, Costing unchanged, Summary estimate unchanged, mobile without sideways scroll). Moving between projects, confirming prepared entries, form error messages and filters were left unverified in the browser when the owner stopped the test work; their rules are covered by `expenses.check.ts`. The scripts were not added to the repo.
- **Repo checks:** `npm run build` and `npm run lint` are clean for all Tracker files.

**Acceptance scenarios and expected results**

| Scenario | Input | Expected |
|---|---|---|
| A, reseller | 300 per unit + 30 packaging per unit | unit **330** |
| B, manufacturer | 100 units; fabric 20,000, buttons 2,000, manufacturing 15,000 (whole batch); packaging 30 per unit | total **40,000**, unit **400** |
| C, two batches | 100 at 300, then 150 at 350 | kept separately; the latest finalized is current |
| D, variants | S 30, M 50, L 20; fabric 10,000 (whole batch); sewing 40 per unit; L-only 25 per unit; S+M labels 800 (whole batch) | total **15,300**, unit **153**; S **150**, M **150**, L **165**; allocations reconcile |
| Project | 100 made at 300 with 30 sold; 50 made at 350 with 10 sold; expense 2,000 | investment 47,500 · COGS **12,500** · inventory 35,000 · profit 21,500 |
| Winter 27 (in the app) | attach DN-07 and CC-09, link 650, add 1,200 | net sales $71,999 · COGS $27,646 · profit $42,503 · investment $31,370 |

---

## 11. Backend handoff: requirements

### Shopify versus KREW records
- **Tracker reads from Shopify:** products, variants, SKUs and Shopify IDs, images, current list prices, orders and order lines, actual transaction prices and discounts, quantities, and refunds and returns where available.
- **KREW owns:** product costs, batches and their history, cost components, expenses, cost allocations, project relationships and calculated profitability.
- **Never write back:** Tracker must never write prices or inventory to Shopify.
- **Joining:** records are joined by Shopify product and variant IDs.

### Historical profitability
- **Revenue:** use each order's **actual paid amount**, never today's list price.
- **Cost:** a sold unit's cost comes from the batch it was drawn from. New batches never change past costs.
- **Overlapping batches:** order dates alone cannot identify the batch. Choose and document **one cost-flow method** (FIFO or weighted average), and apply it consistently, including to refunds, returns and adjustments. Its output replaces the mock `BatchSale` records.
- **Project attribution of real orders** must be defined explicitly. The prototype rule is "sales out of the project's batches". A product being in a project must not pull all of its sales in.

### Integrity
- **Immutable history:** finalized batches cannot be edited. Corrections create a revision and keep the original.
- **Relationships only:** attaching or detaching a batch changes only the relationship, never the cost.
- **Separate expenses:** project and operating expenses are never added to product unit cost. Each expense is stored once.
- **One source:** Summary operating expenses must come from recorded expenses only, not rules plus records (switch per closed month, section 7).
- **Never double count:** an entry counts as an expense only when confirmed and operating. Production costs live in batches; their documents are stored as `production` entries linked to the batch and never summed as expenses. A record has at most one project and one batch.
- **Inventory cost flow is a backend decision.** Profit must use the cost of the units actually sold, from the batch they came out of, never the latest unit cost applied to all history. Define one cost-flow method (FIFO or weighted average) and one order-to-batch allocation, apply them to refunds and returns too, and produce `BatchSale`-like results from it. The frontend deliberately does not invent one.
- **Reconciliation, eventually:** Shopify orders (sales, discounts, refunds, product and variant ids, prices) + Product costing (historical batch costs) + Expenses (operating and project costs) must reconcile into one P&L. Supplier payments and deposits (`non_expense`) are kept for cash and payables reconciliation, not P&L.

### Receipts
- Store files in object storage; keep `ReceiptFile` metadata on the entry. Accept images and PDF up to 10 MB. Never delete a file of a confirmed entry silently; removal is logged.
- **Future extraction:** a receipt sent on Telegram or in chat creates an entry with `source` set to the channel, `status = needs_review`, the extracted fields, and `prepared` (what was received, what was read, which fields are uncertain). It never confirms itself.

### Agent permissions and approvals
The agent uses the same records, validation and operations as the dashboard; there is no separate agent model. Three levels:

| Level | Examples | Who |
|---|---|---|
| **Read** | list and search entries, open receipts, answer questions from confirmed records | Agent, if granted |
| **Prepare** (no financial effect) | create an entry in `needs_review`; suggest category, treatment, project or batch on an entry in review; attach a receipt to it | Agent, if granted; always lands in review |
| **Consequential** (changes figures) | confirm an entry; edit a confirmed entry's amount, date, treatment, project or batch; void or restore; add a cost to a batch | A person, or the agent only through the KREW approval gate with a recorded approval |

Default for a new workspace: read and prepare only. Every write records who did it (`by`), and the server, not the client, writes history.

### One source of truth and approvals
The Tracker agent (chat and Telegram) must use the same records and operations as the dashboard, with the same permissions. Agent-initiated writes, such as an expense read from a receipt photo, are created as entries awaiting review and take effect only after a person confirms them. This follows the KREW approval gate in `KREW_CONTEXT.md` section 5.2.

---

## 12. Backend operations (one per store action)

Suggested REST shape, under `/workspaces/:wsId/tracker`:

| Operation | Prototype action | Suggested endpoint |
|---|---|---|
| List products, variants, current cost | `useTrackerData` | `GET /products` (with Shopify data merged) |
| List batches | `useTrackerData` | `GET /batches?productId=&projectId=` |
| Save batch draft | `saveDraft` | `POST /batches`, `PATCH /batches/:id` (drafts only) |
| Finalize batch | `finalize` | `POST /batches/:id/finalize` |
| Correct a finalized batch | `finalize` with `revisionOf` | `POST /batches/:id/revisions` (reason required) |
| Discard draft | `discardDraft` | `DELETE /batches/:id` (drafts only) |
| Attach or detach batch to a project | `setBatchProject` | `PATCH /batches/:id { projectId }` (relationship only) |
| Create or update project | `saveProject` | `POST /projects`, `PATCH /projects/:id` |
| Project history | `projectEvents` | `GET /projects/:id/events` (server-written) |
| List and search expenses | `useTrackerData`, `filterExpenses` | `GET /expenses?from=&to=&q=&status=&category=&project=&treatment=&sort=` |
| Create expense (person or agent) | `createExpense` | `POST /expenses` with an idempotency key (the client id) so a double submit records once; agent calls are forced to `needs_review` |
| Edit, categorize, classify, link or unlink project or batch | `updateExpense` | `PATCH /expenses/:id` (server recomputes history; consequential fields on confirmed entries need a person or an approval) |
| Confirm | `updateExpense` (status) | `POST /expenses/:id/confirm` (person or approved agent; runs the confirm rules) |
| Void and restore | `updateExpense` (status) | `POST /expenses/:id/void { reason }`, `POST /expenses/:id/restore` |
| Attach or remove a receipt | `updateExpense` + `receipt-files` | `POST /expenses/:id/receipt` (upload), `DELETE /expenses/:id/receipt` |
| Expense history | `expenseEvents` | `GET /expenses/:id/events` (server-written) |
| Custom categories | `addExpenseCategory` | `GET /expense-categories`, `POST /expense-categories` (unique names) |
| Expense summary | `summarizeExpenses` | `GET /expenses/summary?from=&to=` |
| Project financials | `projectFinancials` | `GET /projects/:id/financials` (server-calculated) |
| Summary figures | `summarize` etc. | `GET /summary?from=&to=` |

Every change should write to the audit log. Agent-originated writes enter a review queue first.

---

## 13. Assumptions to replace, and known limitations

1. **Cost per sale:** "current cost" (latest finalized batch) is now only a display rule in Product costing. Period COGS uses the batch in effect on each sale date, a simplification. Replace it with batch-level COGS from the cost-flow method.
12. **Profitability thresholds** (30% low margin, 5% cost rise, 30% project spend ratio) are fixed constants in `lib/profitability.ts`; they could become brand settings.
2. **Allocation:** whole-batch costs are allocated by quantity only. There is no allocation by value or weight.
3. **Variant prices:** the model supports per-variant prices, but the demo uses the product price and there is no UI to edit them.
4. **Operating expenses:** Summary operating expenses are rule-based estimates in the mock. Recorded expenses are not added on top (switch plan in section 7).
10. **Expenses, open accounting decisions:** no accruals or prepayments (an expense counts on its date); no payment status or payables; no tax or VAT split; no multi-currency; packaging and transport have no default treatment because they depend; a production entry's amount is not reconciled against its batch's components yet; restore always returns an entry to review rather than to its earlier status; hard delete is not offered, void is.
11. **Receipt files** live only in the browser that attached them; another browser sees the record but not the file.
5. **Sample sales:** `BatchSale` is sample data. It uses list price × 0.92 as the amount paid.
6. **Currency:** one currency per brand, no conversion.
7. **Product images:** products show initials tiles. Shopify images come later.
8. **Agent header:** the Finance tab shows the full agent profile header with its four KPI blocks. The owner may want a compact header on **every** agent tab (consistently, never only on Finance); this needs a decision.
9. **Test data:** the browser journey tests wrote demo data into the test browser only, not the owner's.

---

## 14. Roadmap

- **Stage 4, Expenses and receipts:** done, awaiting owner review. Still open from its plan: payment status, and the Summary switch to ledger-backed operating expenses (a backend dependency, section 7).
- **Stage 5, Profitability:** done, awaiting owner review. Not covered: profit by sales channel (it needs order channel data from Shopify).
- **Stage 6, Reports:** done. It replaced the planned Statements section; live statements now live inside Reports.
- **Later:** formal statements (monthly P&L after month close, exports for the accountant) as report topics in the shared system, not as a separate feature.
- **Pending owner decisions:** compact agent header everywhere (yes or no); app-wide removal of the floating section bar, which needs in-page tabs on Settings, agent pages, Approvals and the filtered lists first.

---

## 15. Changelog

| Date | Change |
|---|---|
| 2026-10-28 | Stage 1 Summary; Stage 1.1 hierarchy and colour; reverted the special Finance frame |
| 2026-10-28 | Stage 2 Product costing: variants, batches, dynamic cost builder, revisions, focused sheet |
| 2026-10-28 | Stage 3 Seasons and projects: cards, create and edit, project view, attribution and investment logic |
| 2026-10-28 | This document; calculation checks added under `FRONT/scripts/tracker/` |
| 2026-10-29 | Stage 4 Expenses and receipts: shared expense record with status and treatment, ledger, focused add/edit/review sheet, receipts, Seasons and Summary on the same records, agent permission levels |
| 2026-10-29 | Stage 5 Profitability: gross-profit-led summary, trend, rule-based findings, product, collection and season breakdown, product detail with batch history; COGS now uses the batch cost in effect on each sale date |
| 2026-10-29 | Stage 6 Reports: Finance entry point to the shared report library, report topics, Tracker sample reports, store version 3 |
