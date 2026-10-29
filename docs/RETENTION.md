# Retention: follow-up desk (V1)

> **Living document.** It records what has been built for Retention (KREW's customer retention agent), why, and what the backend and agent runtime must do. Update it at the end of every stage. Read `docs/KREW_CONTEXT.md` and `docs/LUNA.md` first: Retention is built entirely on Luna's records.
>
> **Status (29 October 2026):** frontend only, on precomputed sample data. V1 workspace and the desk redesign are done and awaiting owner review. Committed on branch `luna-retention-workspaces`.

**Readers.**
- A new Claude session continuing the frontend: sections 1 to 5, 11 and 12.
- The technical partner connecting the backend and agent runtime: sections 1, 3, 6 to 10, then 13.

---

## 1. What Retention is in V1

Retention takes customers Luna flagged in the DMs and helps the owner decide **who deserves a follow-up, why, when, and what to say**. Then it keeps track of what happened.

- **Luna discovers the signal; Retention turns it into a possible action.** Retention never re-reads or re-analyses the inbox. It reads Luna's cases, conversations and messages by id.
- **DMs only.** V1 uses no Shopify customer history: no lifetime value, VIPs, purchase frequency, lapsed buyers, repeat segments or order-based churn. The only context is the conversation and Luna's findings. (The one Shopify touch is a person typing an order number when recording a purchase; see 6.4.)
- **Never sends.** Retention prepares a message. A person approves it, sends it themselves from Instagram, and marks it sent. Sending from KREW comes later, through the approval gate (section 9).
- **Not a CRM and not an inbox.** No pipeline board, no composer, no thread view of its own beyond reusing Luna's read-only thread for context.

### How it differs from Luna

| | Luna | Retention |
|---|---|---|
| Question | What is happening in my DMs? | Who should I follow up with, and how? |
| Unit | Conversation, case, insight | Follow-up (one per customer situation) |
| Status owner | A person sets Luna case statuses | A person moves follow-ups; readiness is derived from Luna |
| Output | Analysis, cases, insights | Reason, timing, action, personal message, outcome |
| Contact with customers | Never | Prepares messages; a person sends |

---

## 2. Where it lives

- `/krew/retention/workspace`: the agent's **Follow-ups** tab (was "Segments"), inside the standard agent frame.
- One page, the **desk**; no section navigation. Lanes in the URL (`?lane=waiting|sent|done`, default Ready now). Any follow-up opens in the focused sheet with `?case=<retentionCaseId>`, from any lane or from Luna.
- **Agent header:** Ready now, Waiting, Sent awaiting reply, Outcomes recorded (all from the desk).
- **Agent profile copy** (`data/agents.ts`) rewritten for V1: DM-based recovery and purchase follow-ups, integration Instagram. The old Shopify segment module (`RetentionModule`) was removed.
- **Not changed yet (legacy seed):** Sahra's seeded Retention feed posts, tasks and the `apv_recovery` approval still describe the old segment campaign ("86 customers, 15% code"). They live in `data/seed-sahra.ts` and should be rewritten or removed when the owner confirms V1 (open decision 1).

---

## 3. The experience

**Desk (top to bottom)**
1. A one-line read: "5 customers are ready for a follow-up, 2 of them recovering from a bad experience. Start with Faisal."
2. **Four headline tiles, each also a filter** (icon on its accent tint, large figure, one supporting line):
   - **All follow-ups:** open count; ready now and awaiting a reply.
   - **Recovery** (rose): value of the orders that went wrong for customers still to win back; count and how many are high.
   - **Sales follow-ups** (blue): possible order value; count and high intent.
   - **Results** (green): customers won back (outcomes that went well); value bought and outcomes recorded. Opens the Done lane.
   A note under the tiles says both values come from list prices, not revenue.
3. **Start here:** the single most useful ready follow-up, large: who, kind, priority, value, Retention's reason, the action and timing, the message preview, **Review follow-up**. Shown on Ready now when it matches the type filter and there is no search.
4. **Table** with a toolbar: search (customer or reason), lane filter with counts for the current type (Ready now, Waiting, Sent, Done), sort (priority, value, most recent). Columns: customer and handle; follow-up (kind icon, action, Luna's issue and Retention's reason); value; priority; when (timing when ready, the short waiting reason in amber, sent time, or when the outcome was recorded); status pill (Ready, Waiting, Sent, the outcome, Dismissed, or closed in Luna). Active high-priority recovery rows get a thin rose marker.
5. **Why some customers aren't here** (collapsed): every Luna case that did not become a follow-up with its reason, plus the count of routine conversations.
6. Polished empty states for each lane and for searches.

URL state: `?kind=recovery|sales`, `?lane=waiting|sent|done`, `?sort=value|recent`, `?q=`, `?case=`.

### Values (from DMs and list prices only)
- **Sales follow-up value:** Luna's `estimatedValue` on the opportunity, or the list price of the products discussed.
- **Recovery value:** the list price of the products in the order that went wrong (`productIds` on the case). It shows what the customer's trust is tied to, not revenue at risk; no order history is used.
- **Bought:** the follow-up's value when a person records a purchase with an order number.
- Prices come from `LunaProductRef.price`, the same catalogue as Tracker.

**Ordering:** priority, then recovery before sales at the same priority, then most recent activity.

**Follow-up sheet**
- Left, **Why this customer:** the kind, priority, Retention's reason in plain words, then the **Luna source** (case title, Luna's explanation, its live status, "Open in Luna").
- Left, **What happened:** the evidence messages quoted first, then one story timeline merging the conversation start, Luna's case events and Retention's events. "Read the full conversation" expands Luna's read-only thread.
- Right, **What to do:** readiness (green "ready", amber "waiting: why", or done), the recommended action and its reasoning, when and why, the channel and its messaging window.
- Right, **Follow-up message:** editable text (right-to-left for Arabic automatically), "Based on" chips listing the facts it uses, and the actions for its state (section 5).

**Visual rules:** Ivory OS base; colour only marks the job (rose for recovery, blue for sales follow-ups, violet for re-engagement), readiness (green / amber) and outcomes. Priority bars use the case's accent, never red: urgency of a problem is Luna's job; Retention says how much a follow-up is worth.

---

## 4. Data model (`FRONT/src/data/retention/types.ts`)

Retention stores only its own layer. Customer, conversation, messages and the Luna case are references.

| Field | Meaning |
|---|---|
| `id` | Retention case id (`rc-…`) |
| `customerId`, `conversationId` | Luna's customer and conversation |
| `lunaCaseId?` | The Luna opportunity or at-risk case it came from. Missing when it came from a conversation signal without a case (`lunaSignal` then holds Luna's words) |
| `evidence?` | Message ids to read first; defaults to the Luna case's evidence |
| `kind` | `recovery`, `purchase_follow_up`, `unfinished_conversation`, `re_engagement` (flexible: the reason text carries the specifics) |
| `priority` | How much the follow-up matters (not Luna's issue urgency) |
| `reason` | Retention's why, one or two sentences |
| `action` | `{ label, detail }`: what to do and how (for example "no discount unless he raises a problem") |
| `timing` | `{ label, rationale }`: when, and why then |
| `waitFor?` | Conditions before it makes sense: `restock` (product, variant, expected), `date`, `event`, `quiet` (hours of customer silence) |
| `productIds` | Shopify product ids, shared with Luna and Tracker; also the basis for the follow-up's value |
| `draft` | `{ channel, language, text, uses[], signedAs }`: the prepared message, the facts it relies on, and who it comes from |
| `status` | `suggested`, `prepared`, `sent`, `done`, `dismissed` (section 5) |
| `preparedAt`, `sentAt`, `sentText` | When the message was approved and sent, and the exact text sent |
| `outcome?` | `{ kind, at, note?, orderRef? }` |
| `dismissReason?` | Why it was dismissed |

`RetentionEvent`: suggested (by Retention), draft edited, prepared, sent, outcome, dismissed, reopened (by you), with time and note.

**Derived, never stored:** readiness (with a long and a short reason), lane, why a Luna case was not taken, the channel window (`lib/retention.ts`), and each follow-up's value (`use-retention.ts`).

```
Luna:  Customer ── Conversation ──< Message
                       └── Luna case (opportunity | at-risk) ──< CaseEvent
Retention:  RetentionCase ──> customerId, conversationId, lunaCaseId?, evidence (message ids)
                  └──< RetentionEvent
```

---

## 5. Statuses and readiness

Two separate ideas: **status** is what a person did; **readiness** is whether the follow-up makes sense now (derived).

### Status (a person moves it)
```
suggested (New) ──Approve message──► prepared ──I sent it──► sent ──Record outcome──► done
      │                                  │                    │
      └──────────── Dismiss (reason) ────┴────────────────────┘──► dismissed
done ──Reopen──► sent (outcome cleared)      dismissed ──Reopen──► prepared or suggested
```
- **Approve message** saves the (possibly edited) text and marks it prepared. This is the future approval point.
- **I sent it** is enabled only when the follow-up is ready; it records the text actually sent.
- **Record outcome** offers outcomes for the case's group: all get Replied warmly, No reply; sales add Bought, Not interested; recovery adds Happy (issue closed), Still unhappy.
- **Bought** requires an order number, and also marks Luna's opportunity **converted** with that order (one fact, recorded once, still a person's decision).
- **Dismiss** requires a reason: Not worth a message, Already handled, Too soon, Customer asked for no contact, No offer to make.
- Editing the message, and going back to Retention's draft, are allowed while suggested or prepared.

### Readiness (derived from Luna, then Retention's own conditions)
1. Luna at-risk case **dismissed** → no longer needed. **Open or in progress** → waiting: a recovery message before the problem is fixed lands badly. **Resolved** → continue.
2. Luna opportunity **converted** → no longer needed. **Closed as Not interested / Asked not to be contacted** → no longer needed. **Possible order found by Luna (unconfirmed)** → waiting: confirm it in Luna first, because following up someone who already bought is worse than not following up.
3. `waitFor`: restock not back, a future date, an event that has not happened, or the customer wrote less than N hours ago → waiting, with the reason.
4. Otherwise **ready**.

Lanes: sent → **Sent**; done, dismissed or closed by Luna → **Done**; otherwise **Ready now** or **Waiting** by readiness. Because readiness reads Luna's live records, resolving Reem's case in Luna moves her follow-up to Ready now immediately.

---

## 6. The Luna → Retention handoff

### 6.1 What becomes a follow-up (rules for the agent)
| Luna source | Becomes | Ready when |
|---|---|---|
| At-risk case (delivery, unanswered, damaged, wrong item, repeated dissatisfaction, product problem) | `recovery` | Luna case resolved |
| Opportunity, high or medium intent, open, customer quiet ≥ 24 h, no order evidence | `purchase_follow_up` | quiet period passed, product available |
| Opportunity where the **brand** owes the next message (a promise like "let me check and come back") | `unfinished_conversation` | now |
| Conversation with a clear unanswered need and no case (for example a sizing question left at "I'll think about it") | `unfinished_conversation` (`lunaSignal`) | now |
| Opportunity waiting on something specific (restock, a sale, a set launch) | `re_engagement` or `purchase_follow_up` with `waitFor` | the condition is met |

### 6.2 What does not (shown under "Why some customers aren't here")
- Converted opportunities ("already bought").
- Opportunities with an unconfirmed possible order ("confirm it in Luna first").
- Opportunities closed for price or shipping with nothing new to offer; closed as not interested.
- Dismissed Luna cases.
- Routine conversations: answered questions, order status, praise, restock requests without a personal ask. They stay with Luna.

### 6.3 Never claim what the data does not show
Purchase follow-ups say "we have not seen an order", never "did not buy". Drafts offer help rather than assume a cart was abandoned.

### 6.4 Writes across the boundary
Retention writes nothing to Luna's analysis or cases, with one exception made by a person: recording **Bought** converts the Luna opportunity with the order number. Luna's case panel shows the linked follow-up ("Retention follow-up: waiting… Open in Retention") or why there is none.

---

## 7. Personalised messages

- Written from the conversation: the product and variant chosen, what was promised, the problem and how it was fixed, the customer's own words ("stressful week").
- In the conversation's language: Egyptian Arabic, Arabizi, English or mixed, as the thread was. `signedAs` matches the staff member who handled the thread.
- `uses[]` lists the facts the message depends on, so the owner can check them before approving.
- Tone rules in the recommended action: recovery messages acknowledge and offer help; no discount unless a problem remains; purchase follow-ups restate the choice and remove the blocker; no pressure.
- All draft text is mock in V1.

---

## 8. Outcomes

`outcome.kind`: replied warmly, bought (order required), happy and issue closed, no reply, not interested, still unhappy. The desk shows how many recorded outcomes went well; the Sent lane flags a reply detected in Luna's thread after `sentAt` (a hint for the person, not an automatic outcome). Outcomes are never set automatically in V1.

---

## 9. Future messaging requirements

- **Approval gate.** "Approve message" becomes an `Approval` (KREW_CONTEXT 5.2): channel, recipient, exact text, case link. Only approved text can be sent, and only by the executor. Customer-facing messages always ask, whatever the approval mode.
- **Instagram:** the API allows business messages within 24 hours of the customer's last message (7 days with the human agent tag, for a person's replies). Most follow-ups fall outside 24 hours. The sheet shows the window; V1 tells the person to send from the Instagram app. Production must decide what is allowed (open decision 3).
- **WhatsApp later:** outside 24 hours only pre-approved templates can be sent, so personal follow-ups would need template variables or a customer-initiated window. Needs the customer's opt-in.
- **Sent detection:** when sending happens in KREW, the executor sets `sentAt` and Luna's ingestion sees the message as a brand message in the thread. When a person sends from the Instagram app, ingestion could match the text and mark it sent automatically.
- **Consent:** "Asked not to be contacted" in Luna must block any follow-up for that customer across channels.

---

## 10. Backend and agent responsibilities

**Retention agent run (on schedule and when a Luna case changes):**
1. Read new or changed Luna cases and conversation signals.
2. Apply 6.1 and 6.2; upsert one follow-up per `(customerId, lunaCaseId or conversationId)`, never duplicates.
3. Write reason, action, timing, waitFor, priority and the draft. Rewrite the draft only while `suggested` and never over a person's edit.
4. Never change status beyond `suggested`; never send.

**Backend:**
- Store Retention cases and events; compute readiness server-side from Luna's live state (or return it computed).
- Enforce transitions and requirements (dismiss reason, order number for bought, sent only when ready).
- Turn approvals into `Approval` records when sending exists.

**Suggested endpoints** under `/workspaces/:wsId/retention`:

| Operation | Prototype | Endpoint |
|---|---|---|
| Desk | `useRetentionData` | `GET /cases?lane=ready\|waiting\|sent\|done` (with readiness and joined customer, Luna case summary) |
| One follow-up | `RetentionSheet` | `GET /cases/:id` (with events, evidence messages) |
| Not taken | `notTaken` | `GET /not-taken` |
| Edit message | `saveDraft`, `resetDraft` | `PATCH /cases/:id/draft { text }` |
| Approve | `prepare` | `POST /cases/:id/prepare { text }` (later: creates an Approval) |
| Mark sent | `markSent` | `POST /cases/:id/sent { text }` (later: replaced by the executor) |
| Record outcome | `recordOutcome` | `POST /cases/:id/outcome { kind, orderRef?, note? }` (bought also converts the Luna opportunity) |
| Dismiss / reopen | `dismiss`, `reopen` | `POST /cases/:id/dismiss { reason }`, `POST /cases/:id/reopen` |

---

## 11. Frontend architecture

```
data/retention/types.ts    shapes
data/retention/mock.ts     sample follow-ups per workspace, referencing Luna ids
store/retention.ts         a person's changes (localStorage "krew-retention-demo"), reset with KREW demo data
lib/retention.ts           readiness, lanes, not-taken reasons, channel window (pure)
components/retention/      use-retention (joins Luna, actions, sheet URL), labels, parts (KindTag, Worth)
pages/agent/retention/     RetentionDesk, RetentionSheet
```
- Reuses Luna's `Thread`, `CustomerAvatar`, `CaseStatus`, the shared `ProductSheet` and `Timeline`.
- Luna changes for coherence: `CasePanel` shows the linked follow-up; the earlier placeholder `retentionHandoff` was removed from `lib/luna.ts` and `types.ts`.

---

## 12. Sample data

Built on Luna's Sahra threads; a few Luna threads were extended so they agree with Retention:
- Faisal (s18): resend added, now resolved → **high-priority recovery, ready** (Start here).
- Salma Kamel (s21): exchange confirmed, resolved → **low-priority complaint follow-up, ready**.
- Omar (s17): the check-in and his warm reply are in the thread → **done, replied warmly**.
- Tamer (s10): the sizing answer is in the thread → **unfinished conversation, sent, waiting for a reply**.
- Rana (s06): now in progress in Luna → recovery **waiting**.

Sahra, 14 follow-ups: Ready now: Faisal, Salma, Mariam (strong purchase intent), Nour El-Din (unfinished: the brand owes a quote; message approved), Yasmin (unfinished purchase conversation). Waiting: Reem, Mostafa, Hana, Rana (on Luna), Youssef (restock, message approved), Mohamed (Black Friday). Sent: Tamer. Done: Omar; Karim (dismissed: no bundle planned).

Not taken, with reasons: Dina (possible order, confirm in Luna), Habiba (bought), Ahmed Fouad (closed for shipping cost), Ahmed Shawky (dismissed in Luna), plus 18 routine conversations.

Noor, 5 follow-ups (Retention is not hired in Noor; hire it from the marketplace to see them): Sara (ready), Dana (waiting: too soon), Fatima and Reem Y. (waiting on Luna), Lama (waiting for a set launch).

---

## 13. Verification

- `npm run build` clean; no new lint warnings beyond the existing `Date.now` timeline pattern.
- Browser journey (Playwright with system Chrome, script outside the repo), 14 checks passing, no console errors: desk starts with Faisal; edit, approve, mark sent, record outcome; Bought requires an order number and converts Mariam's Luna opportunity; Reem waits on Luna, Luna's panel links to Retention, resolving in Luna makes her ready; dismiss with a reason; Done lane; not-taken list explains Dina; the full thread opens from the sheet; reload keeps changes; 390 px width without sideways scroll.

---

## 14. Open decisions for the technical partner and owner

1. Rewrite or remove the legacy Retention seed content (segment campaign post, tasks, `apv_recovery` approval) to match V1.
2. Should "Approve message" create a KREW `Approval` now (visible in Approvals), or only once sending exists?
3. Instagram messaging window: which follow-ups may be sent through the API (24 h, human agent tag), and is "send from the app yourself" acceptable for the rest?
4. Who owns the follow-up when several staff reply to DMs (assignee)?
5. How Retention learns an outcome automatically: reply detection from Luna's thread, order matching (needs Shopify, out of V1), or always a person.
6. Cool-down rules: at most one follow-up per customer per N days across agents.
7. Language of the draft when a thread is mixed: follow the customer's last message, or the brand's default.
8. When Shopify history arrives (V2), how it changes priority without turning Retention into segment marketing.

---

## 15. Changelog

| Date | Change |
|---|---|
| 2026-10-29 | Desk redesign: headline tiles that filter by type (all, recovery, sales, results) with values; table with search, lane filter, sort and columns; Luna products carry list prices |
| 2026-10-29 | V1: follow-up desk from Luna's DM findings; readiness derived from Luna; editable personal messages; sent and outcome tracking; not-taken explanations; Luna threads extended for coherence; Retention agent copy rewritten for DMs |
