# Luna: customer intelligence workspace

> **Living document.** It records what has been built for Luna (KREW's customer intelligence agent), why, and what the backend and agent infrastructure must do. Update it at the end of every stage. Read `docs/KREW_CONTEXT.md` first for the whole product.
>
> **Status (29 October 2026):** frontend only, built on precomputed sample data. Stage 1 (the full initial workspace) and Stage 1.1 (conversation mix with time frames) are done and awaiting owner review. Committed on branch `luna-retention-workspaces`.

**Readers.**
- A new Claude session continuing the frontend: read sections 1 to 4, 12 and 13.
- The technical partner and their Claude connecting the backend and Hermes: start with sections 1, 5 to 11, then 14.

---

## 1. What Luna is, and what she is not

Luna reads customer direct messages and tells the brand owner what matters in them: who is ready to buy, who is unhappy, and which patterns keep coming up.

**Luna does:**
- read Instagram DM threads (WhatsApp later);
- write an analysis for each conversation (summary, intent, products, sentiment, signals, suggested next step);
- open **cases**: sales opportunities and at-risk customers, one per conversation and kind;
- produce **insights**: patterns across conversations, each tied to the conversations behind it;
- feed Retention, which turns some of her cases into follow-ups (see `docs/RETENTION.md`).

**Luna never:**
- replies to or messages a customer (no composer, no outbound API calls, no drafts sent anywhere);
- changes a case status. Statuses are a person's decision;
- marks a sale as converted. She can point to a possible matching order; a person confirms it;
- touches orders, refunds, discounts or the store.

This is the KREW rule in practice: nothing that touches customers, money or the live store happens without a recorded human decision. For Luna the simplest enforcement is that her service credentials are **read-only** on messaging platforms.

---

## 2. Where it lives in the app

- **URL:** `/krew/luna/workspace` is Luna's **Intelligence** tab. It sits inside the standard agent page (same profile header and top tabs as every agent; owner rule: keep the frame stable).
- **Navigation:** a side column on desktop, a "Sections" menu on phones. Same pattern as Tracker, different content.

| Section | Route | Purpose |
|---|---|---|
| Customer pulse | `/krew/luna/workspace` | What the owner needs to know this week |
| Opportunities and attention | `/krew/luna/workspace/cases?view=opportunities\|attention` | The lightweight CRM: sales opportunities and at-risk customers |
| Conversations | `/krew/luna/workspace/conversations` | Read-only DM explorer with Luna's analysis |
| Insights | `/krew/luna/workspace/insights` | Patterns across conversations |

- **Detail sheet:** every record opens in the same focused, near full-screen sheet (`ProductSheet`, reused from Tracker), over whichever section you are in. The open record is in the URL so links and reloads reopen it:
  - `?conversation=<id>`: thread plus Luna's read;
  - `?case=<id>`: the case with its controls, the thread (evidence messages highlighted) and Luna's read;
  - `?insight=<id>`: the insight and its supporting conversations; `&conversation=<id>` drills into one, with a trail back.
- **Header figures:** the agent header for Luna now shows conversations this week, open sales opportunities, customers needing attention and overall sentiment, computed from the same records as the workspace.

---

## 3. The four sections

### Customer pulse (landing page)
1. **Luna's read of the week:** one sentence (precomputed `headline`), then four figures, each clickable: conversations analyzed (last 7 days, from the classified volume, with the change on last week), open sales opportunities (high intent count, possible value), customers needing attention (high priority count), overall sentiment (label and a small split bar).
2. **What you need to know:** the focus of the page. Cards built from:
   - customers with an active at-risk case who have waited more than 12 hours for a reply;
   - every insight Luna marked `important` (for example "Six customers waiting for the Natural Siwa throw");
   - interested buyers (new, medium or high intent) nobody has followed up.
   Each card opens the records behind it.
3. **Waiting on you** and **Ready to buy:** the top four active cases of each kind, as compact customer rows.
4. **Conversation activity** (customer messages per day, 14 days) and **Top topics** (this week; each opens Conversations filtered by topic).

### Opportunities and attention
- Two views, switched by two summary tiles: **Sales opportunities** and **At-risk customers**.
- Search (customer, handle, product, case text), status filter with counts, sort (intent, most recent, value; or priority, most recent). All in the URL.
- Opportunity rows: customer and platform, the opportunity and product, purchase intent (three-bar meter), last activity, follow-up status. A "Possible order found" note appears when Luna matched an order.
- At-risk rows: customer, issue, summary, priority, last activity, resolution status. Active high-priority rows get a thin red marker; "Waiting 2d for a reply" shows in amber. The rest of the interface stays neutral.
- Opening a row shows the case panel: what Luna found, why, the controls (section 6), the person's decision, history, and the Retention line (the linked follow-up and its state, or why there is none, with "Open in Retention").

### Conversations
- Read-only list, grouped by day: customer, platform, handle, last message (Arabic shown right to left automatically), topics, sentiment, open cases, a red dot when the conversation needs attention.
- Search across names, handles, message text and summaries. Filters: All, Needs attention, Opportunities, Negative; topic; product (from Insights).
- The detail shows the thread exactly as it happened (attachments as labelled placeholders) and Luna's read: summary, intent, sentiment, products, topics, language, what she noticed, suggested next step, and the linked case. **No reply box, by design.**

### Insights
- **What your DMs are about** (first card): a donut of every DM Luna classified, by what it is about (pre-purchase questions, order status, compliments, complaints, returns and exchanges), with a 7, 30 or 90 day switch and the change on the previous period of the same length. The same card, titled "Customer conversations", is on the main Overview page, so both always show the same figures.
- Insight cards (restock demand, sizing confusion, delivery, price objections, damage, product feedback, praise), each with its count and change on last week. Clicking opens the supporting conversations.
- **Most mentioned products:** conversations per product, with negatives and open sales; opens Conversations filtered by product.
- **Common questions:** count, whether the site already answers it, and the conversations that asked (expand inline).
- **Sentiment:** this week against last week by tone, with one plain sentence on what moved.

---

## 4. UX direction (owner rules plus Luna's own)

- Stable frame, focused sheets, calm layouts, restrained colour (see `docs/TRACKER.md` section 4; they apply here too).
- Luna is about people: customer initials avatars on quiet tints, conversation threads, compact customer rows. No financial dashboard layout.
- Colour has a job: Luna's violet accent for opportunities and intent; red only for active high-priority problems and negative sentiment dots; amber for "waiting for a reply"; green for converted, resolved and positive.
- Copy says "Luna suggests; you decide" wherever a status can change.

---

## 5. Data model (`FRONT/src/data/luna/types.ts`)

| Type | Meaning | Written by |
|---|---|---|
| `LunaCustomer` | A person who messaged the brand. `identities[]` (channel, platform id, handle) so one customer can have Instagram and later WhatsApp. Optional `shopifyCustomerId`, `ordersCount`, `city`. | Ingestion; matching by Luna or a person |
| `LunaConversation` | One DM thread: `channel`, `externalThreadId`, `messages[]`, `analysis`. | Ingestion |
| `LunaMessage` | `from` (customer or brand), `author` (staff member), `text`, `at`, optional `attachment` (image, shared post, story reply). | Ingestion |
| `ConversationAnalysis` | Luna's read: `summary`, `intent`, `topics[]`, `products[]` (Shopify product id plus variant text), `sentiment`, `language`, `signals[]`, `nextStep`, `analyzedAt`. Replaced whenever new messages arrive. | Luna |
| `SalesOpportunity` | A customer showing purchase intent. `intent` (high, medium, low), `explanation`, `productIds`, `productLabel`, `evidence[]` (message ids), `estimatedValue`, optional `orderMatch`, `status`, plus the person's `orderRef`, `reason`, `note`. | Luna creates; a person sets status |
| `AtRiskCase` | A customer with a problem. `issue` (delivery, unanswered, damaged, wrong item, repeated dissatisfaction, product problem), `priority`, `summary`, `evidence[]`, `unansweredCount`, `status`, plus `reason`, `note`. | Luna creates; a person sets status |
| `CaseEvent` | Case history: detected, updated by Luna, status changed (from, to, note), `by` luna or you. | Server |
| `LunaInsight` | A pattern: `kind`, `title`, `detail`, optional `productId`, **`conversationIds[]`**, `previousCount`, `important`, `suggestedAction`, `relevantAgent`. | Luna |
| `CommonQuestion` | A recurring question with its `conversationIds[]` and whether the site answers it. | Luna |
| `VolumeDay` (`data/luna/volume.ts`) | DMs Luna classified per day by category (`pre_purchase`, `order_status`, `compliments`, `complaints`, `returns`). Drives the "what your DMs are about" chart, the Pulse count and the header count. 180 days, so every range has a previous period. | Luna (an aggregate of conversation classifications) |
| `LunaDataset` | Everything for one workspace, plus Luna's `headline` and `lastScanAt`. | |

Enums and labels: `components/luna/labels.ts` (topics, intents, sentiment, statuses, issues, insight kinds, close and dismiss reasons).

---

## 6. Relationships and case logic

```
Workspace
 └─ Customer ──< ChannelIdentity (instagram id, later whatsapp number)
     └─ Conversation (one per channel thread) ──< Message
          ├─ Analysis (1:1, replaced on each new message)
          ├─ SalesOpportunity (0..1 open at a time)  ──< CaseEvent
          └─ AtRiskCase      (0..1 open per issue)  ──< CaseEvent
 Insight ──< conversationIds  (many to many with Conversation)
 CommonQuestion ──< conversationIds
 Product (Shopify id, shared with Tracker's catalogue) <── Analysis.products, cases.productIds, Insight.productId
```

### Cases, not messages
- A case belongs to one conversation. **Deduplicate by `(conversationId, type, issue)`**: while a case is active, new messages in the same thread update it (`lastActivityAt`, `evidence`, `summary`, possibly `intent` or `priority`, recorded as `updated_by_luna`) instead of opening another one.
- A new case on the same thread is allowed only after the previous one is closed, converted, resolved or dismissed and something new happens (for example a second order goes wrong).
- `evidence[]` names the messages that justify the case. The sheet highlights them ("Luna used this").

### Sales opportunity status
```
new ──► followed_up ──► converted   (needs an order number or a note; never set by Luna)
  │            │
  └────────────┴──────► closed      (needs a reason)
converted / closed ──► new          (Reopen)
```
- **Converted needs evidence.** The person enters the order number or a short note on how they know. If Luna found a likely order (`orderMatch`: order ref, amount, time, and how it was matched), the sheet shows it and pre-fills it, but the person still confirms.
- Close reasons: Not interested, Bought elsewhere, Out of stock, Price, No reply, Asked not to be contacted.

### At-risk case status
```
open ──► in_progress ──► resolved   (optional note: what was done)
  │            │
  └────────────┴──────► dismissed   (needs a reason)
resolved / dismissed ──► open       (Reopen)
```
- Dismiss reasons: Not a real issue, Customer is happy, Handled elsewhere, Duplicate.

### What makes a case (Luna's detection rules, to be implemented in the agent)
The prototype data is precomputed; these are the intended rules:
- **Opportunity:** the customer confirms a product, size or variant, and asks about price, payment, delivery or availability, without an order following. Intent high when they confirmed specifics and asked a closing question (delivery, payment); medium when interested with an open question; low when they raised a price objection or are waiting for a sale.
- **At risk:** delivery problem past the promised date; two or more customer messages with no reply over 12 hours; damaged or wrong item; a second complaint in the same thread; a possible product reaction (skincare). Priority high when the customer is waiting without a reply, has a deadline, asked for a refund, or reports a reaction.
- A thread that ends with the customer's "thanks" is not unanswered. "Needs attention" in the UI means an **active at-risk case**, never silence alone.

---

## 7. Insights and their conversations

- Every insight carries `conversationIds`; **the count shown is the length of that list**, so a number is always something you can open.
- `previousCount` is Luna's comparable count for the previous 7 days (history the backend must keep per insight key, for example `restock:siwa-throw:Natural`).
- Insights are regenerated by Luna on a schedule (suggested: with the daily report, plus on spikes). An insight should keep a stable id per pattern so links keep working and the change on last week is meaningful.
- `relevantAgent` names who could act (Store Agent for product pages, Ivy for bundles). Luna only shares; any change goes through that agent's approval flow.
- **Derived in the frontend from records** (`lib/luna.ts`), which the backend can compute the same way: pulse figures, sentiment split and score, message activity, topic counts, product mentions.
  - Sentiment score = 50 + (positive − negative) ÷ total × 50 over conversations active in the window. Labels: 65+ mostly positive, 50+ balanced, 38+ mixed, otherwise mostly negative.

---

## 8. What the Instagram integration must provide

Via the Instagram Messaging API (Meta Graph API, Instagram professional account linked to a Facebook Page):

| Need | Source |
|---|---|
| New messages in near real time | `messages` webhook subscription |
| Thread history on connect (backfill) | Conversations endpoint with messages, paged |
| Per message | message id, thread id, sender id (Instagram-scoped id), timestamp, text, attachments (image URLs, shared posts, story replies and mentions), whether it came from the business |
| Customer | IGSID, username, name where permitted; profile picture optional |
| Which staff member replied | Not provided by Instagram for every reply path; `author` is optional |
| Echoes of the brand's own replies | `message_echoes`, so "unanswered" can be computed |
| Read state | `messaging_seen` (optional) |

Permissions: `instagram_basic`, `instagram_manage_messages`, `pages_manage_metadata`, plus App Review. Luna needs **no send permission**; keep the token used by Luna's ingestion without it if Meta's scopes allow, and in any case route no send call from Luna's service.

Also needed from Shopify (already connected for Tracker): products and variants (to resolve product mentions to ids), customers (matching), and orders (to suggest `orderMatch`).

Ingestion should be idempotent on message id, store raw messages, and trigger re-analysis of the thread (debounced, for example 2 minutes after the last message) rather than per message.

---

## 9. WhatsApp later

- The model already carries `channel` on conversations and `identities[]` on customers. A WhatsApp thread becomes another conversation for the same customer when the identities are linked.
- Differences to plan for: phone number as identity (match to Shopify by phone); WhatsApp Business API webhooks; template-only outbound after 24 hours (relevant to Retention, not Luna); voice notes (transcription would be new); group chats out of scope.
- Customer matching across channels should be a person-confirmable suggestion, never a silent merge.
- The current Settings card shows WhatsApp with "needs attention" (token). Luna's UI shows only Instagram; it filters nothing by channel yet.

Comments and reviews are out of scope for Luna's workspace.

---

## 10. Handoff to Retention

Retention V1 is built: **`docs/RETENTION.md`** is the source of truth for which Luna cases become follow-ups, when they are ready, and what Retention writes back. In short:
- Retention reads Luna's customers, conversations, messages and cases by id; it stores only its own layer (reason, timing, message, status, outcome).
- Readiness is derived from Luna's live case status: a recovery follow-up waits until Luna's at-risk case is resolved; a purchase follow-up stops when the opportunity is converted or closed as not interested, and waits while Luna has an unconfirmed possible order.
- The only write back to Luna is a person recording **Bought** on a follow-up, which converts the Luna opportunity with the order number.
- Luna's case panel shows the linked follow-up, or why there is none.

---

## 11. Who reads, creates and changes what

| Record | Luna reads | Luna creates | Luna updates | A person |
|---|---|---|---|---|
| Messages, conversations | yes | no (ingestion does) | no | reads only in KREW (replies in Instagram) |
| Analysis | yes | yes | yes, on new messages | reads |
| Opportunities | yes | yes | evidence, summary, intent, last activity, `orderMatch` | sets every status; adds order ref, reason, note |
| At-risk cases | yes | yes | evidence, summary, priority, last activity | sets every status; adds reason, note |
| Insights, common questions | yes | yes | yes | reads |
| Customer identity links | yes | suggests | no | confirms (later) |
| Retention follow-up | yes | no | no | reads; its readiness follows the Luna case status |

Luna must not change a status a person set. If new messages arrive on a converted or closed opportunity, or a resolved case, Luna adds evidence and a `updated_by_luna` event and, if the situation is new, raises a new case.

---

## 12. Frontend architecture

```
data/luna/types.ts      shapes (draft API contract)
data/luna/mock.ts       precomputed sample per workspace (sahra, noor), built once per session
        │
store/luna.ts           a person's case decisions per workspace (zustand, localStorage "krew-luna-demo")
        │               follows KREW "Reset demo data" through seededAt
components/luna/use-luna.ts
        │  useLunaData() merges seed + decisions; useCaseActions() writes; useLunaSheet() reads/writes the open record in the URL
lib/luna.ts             pure derivations: pulse figures, sentiment, activity, topics, product mentions, attention
        │
pages/agent/luna/**     LunaWorkspace (shell), PulseSection, CasesSection, ConversationsSection, InsightsSection, LunaSheet
components/luna/**      Thread, Analysis, CasePanel, parts (avatars, intent meter, priority mark, status), labels, sections
```

- `pages/agent/modules.tsx`: `AgentModule` renders `LunaWorkspace` for Luna; the old placeholder `LunaModule` was removed (its `moduleData(...).luna` seed is no longer read by any screen).
- `AgentWorkspacePage.tsx`: Luna's header figures now come from `pulseStats` over the same records.
- Not changed: Tracker, `store/krew.ts`, any other agent.

---

## 13. Sample data

- **Sahra Home** (Cairo, ships to the Gulf): 36 Instagram threads in Egyptian Arabic, Arabizi ("3ayza", "imta"), English and mixed. Covers strong intent (Mariam, King Dune set), abandoned discussions (Yasmin, Oasis bowl), a corporate order (30 Ember mugs, followed up), a possible order match (Dina, SH-10498, to confirm), restock requests (six for the Natural Siwa throw), sizing confusion (Dune sizes, mug capacity), unresolved complaints (gift order stuck in Riyadh, three unanswered messages, broken mugs, a shedding throw being handled), resolved complaints (Faisal's lost parcel resent, Salma's wrong bowl exchanged, Omar's late order with a follow-up), a dismissed complaint, price objections, product feedback and praise. 9 opportunities, 8 at-risk cases, 8 insights, 5 common questions. Six threads are from last week to give comparisons a baseline.
- **Noor Skin** (Dubai): 13 threads in English and Gulf Arabic. Barrier mist restock, a possible serum reaction (high priority), late delivery outside Dubai, routine questions. 4 opportunities, 3 cases, 5 insights.
- Product ids match Tracker's catalogue (`data/tracker/mock.ts`). Prices in the sample are USD, as in Tracker.
- Timestamps are relative to page load, so the sample always looks current.

---

## 14. Backend operations

Suggested REST shape under `/workspaces/:wsId/luna`. Everything except the status changes is read-only for the web app.

| Operation | Prototype | Suggested endpoint |
|---|---|---|
| Conversation mix by period | `conversationMix(ws, days)` | `GET /conversations/mix?days=7\|30\|90` → counts per category for the period and the previous one |
| Pulse figures and headline | `pulseStats`, `messageActivity`, `topicCounts`, `dataset.headline` | `GET /pulse?days=7` |
| List conversations | `ConversationsSection` filters | `GET /conversations?q=&show=attention\|opportunities\|negative&topic=&product=&channel=&cursor=` |
| One conversation with messages and analysis | `LunaSheet` | `GET /conversations/:id` |
| List cases | `CasesSection` | `GET /cases?type=opportunity\|risk&status=&q=&sort=` |
| One case with history | `CasePanel` | `GET /cases/:id` (includes events) |
| Change status | `useCaseActions` → `setCaseStatus` | `POST /cases/:id/status { status, orderRef?, reason?, note? }` (server validates transitions and requirements: converted needs orderRef or note; closed and dismissed need a reason; writes the event and `by`) |
| Insights | `InsightsSection` | `GET /insights?window=7d`, `GET /insights/:id` (with conversation summaries) |
| Common questions | `InsightsSection` | `GET /questions` |
| Product mentions | `productMentions` | `GET /products/mentions?window=7d` |
| Ingestion (internal) | none | Instagram webhook → store message → schedule thread analysis |
| Luna writes (internal) | none | agent bridge: upsert analysis, upsert case by dedupe key, upsert insight by pattern key |

Every status change goes to the audit log. Realtime: push case and conversation updates so the Pulse and lists refresh without reload.

---

## 15. Verification

- `npm run build` is clean; `oxlint` shows no new warnings in Luna files (one `Date.now` purity warning in `CasePanel` follows the existing `Timeline` pattern).
- Browser journey (Playwright with system Chrome, script kept outside the repo), all passing, no console errors:
  - Pulse renders; a finding opens its insight; the insight lists six conversations and drills into one thread with Luna's read; no reply input exists.
  - Opportunity: Mark followed up; Converted without evidence is refused; with an order number it converts; the Pulse count drops from 7 to 6; it survives a reload.
  - A possible order match is shown but the opportunity stays New until confirmed.
  - At-risk: Resolve with a note. (Since Retention V1: the case panel shows the linked follow-up, which becomes ready.)
  - Conversations: search and the Needs attention filter; Insights product link opens Conversations filtered by product.
  - 390 px wide: no sideways scroll on any section; the case sheet stacks controls above the thread.
- Found and fixed during the check: threads ending with a customer "thanks" were counted as waiting for a reply; attention now comes only from active at-risk cases. The week-over-week conversation count was dropped from the Pulse because the sample is too small for it to mean anything.

---

## 16. Assumptions and open questions

**Assumptions in the prototype**
1. Analysis, cases and insights are precomputed sample text. No model runs.
2. "This week" means conversations with activity in the last 7 days.
3. One customer per Instagram identity; no cross-channel matching yet.
4. `orderMatch` is sample data. The real match would compare Shopify customer name, phone, email or Instagram handle and order time after the chat.
5. Estimated values use list prices; they are labelled "possible".
7. **Volume versus detailed sample.** The conversation mix and the "conversations analyzed" count come from a classified volume (624 DMs in Sahra's last 7 days, matching the brand's existing weekly figures). The threads you can open are a representative sample of it, so record-based counts (cases, insights, product mentions, sentiment) are smaller. In production both come from the same conversation table: the mix is a count of `analysis.intent` mapped to the five categories (buy, ask before buying and restock → pre-purchase; track order → order status; feedback → compliments; complain → complaints; return or exchange → returns).
6. The header figures for Luna changed from the old seeded KPIs to the workspace's own figures. The hire `kpi` used on My Krew cards still comes from the KREW seed.

**Open questions for the backend partner**
1. Where does Luna's analysis run: a Hermes agent per workspace triggered by ingestion, or a batch job? How is cost bounded on busy accounts?
2. How far back to backfill on connect (suggest 30 days), and how long to retain raw messages (privacy policy, deletion requests from customers)?
3. Is staff `author` available for replies sent from the Instagram app, Meta Business Suite and third-party inboxes?
4. What counts as "unanswered" when the brand replies outside Instagram (phone, WhatsApp)? Suggest a person can mark a case in progress, as in the UI.
5. Matching DMs to Shopify customers and orders: which fields, what confidence, and who confirms?
6. Retention outreach outside Instagram's 24-hour window: which channel and consent basis?
7. Should Luna's important insights also post to the Agent Feed and the Manager briefing? (Likely yes, as `FeedPost` type `insight` linking to `?insight=`.)
8. Arabic analysis quality, especially Arabizi and mixed threads, needs a review set before launch.
9. Do brands want several people working cases (assignee field)? Not built; easy to add to the case.

---

## 17. Changelog

| Date | Change |
|---|---|
| 2026-10-29 | Retention V1: sample threads s10, s17, s18, s21 extended and risk-s06, s18, s21 statuses updated so Luna agrees with Retention; case panel links to Retention; placeholder `retentionHandoff` removed |
| 2026-10-29 | Stage 1.1: "What your DMs are about" chart with a 7, 30 or 90 day switch, shared by Luna's Insights and the Overview card; Pulse and header conversation counts now use the same classified volume |
| 2026-10-29 | Stage 1: Luna workspace with Customer pulse, Opportunities and attention, Conversations and Insights; shared sample data for Sahra and Noor; case status store; Retention handoff derivation; this document |
