# KREW: product and system context

This document explains what KREW is, what exists today, and what the backend needs to do. It is written for the backend developer and their AI assistant. Read it before auditing or building anything.

Status (October 2026): the **frontend prototype is built** (`FRONT/`). There is **no backend yet**. All data in the app is simulated and stored in the browser.

---

## 1. What KREW is

KREW is an **AI workforce for e-commerce brands**. Instead of giving a store owner a generic AI assistant to configure, KREW gives them a team of specialised AI agents, each with a name, a job, a personality, tools, a schedule and its own workspace.

The agents watch the business (customer conversations, sales, ads, the Shopify store), report what they find, collaborate with each other, and propose actions. Anything that touches customers, money or the live store **waits for the owner's approval**.

Example of the core idea:

1. Luna (customer intelligence) notices delivery complaints rising for one product.
2. Ivy (growth) checks the affected customers and sizes the revenue at risk.
3. Retention Agent drafts an apology campaign with a discount code.
4. The KREW Manager summarises it in the morning briefing.
5. The owner approves it (in the web app or on Telegram).
6. The campaign is sent; the agent reports the result.

### Business model

- **Now:** managed, done-for-you. The KREW team sets up and configures agents for each client brand. Clients are not technical.
- **Later:** possibly self-service SaaS.
- So the client-facing product must stay simple: no prompt editing, no technical agent configuration.

### Target users

E-commerce brand owners and small teams, mainly in the GCC and Egypt. English first; Arabic/RTL support will come later.

---

## 2. Two ways to use KREW (same workspace)

| Channel | Purpose |
|---|---|
| **Telegram** | Everyday channel. Users message agents, get the morning briefing, receive alerts, and approve or reject actions. |
| **Web app** (this repo) | The visual command centre: overview dashboard, agent workspaces, the Agent Feed, messages, approvals, reports, marketplace, settings. |

Both must read and write **the same data**: a message sent on Telegram appears in the web app's Messages, and an approval done on Telegram updates the web app.

---

## 3. The agents

Agents will run on **Hermes Agent** (separate infrastructure). The backend's job is to host the data, schedules, integrations and approval gate around them, not to invent the agent framework.

### Core agents

| ID | Name | Role | Notes |
|---|---|---|---|
| `manager` | KREW Manager | Team coordination | Daily briefing, routes work between agents, follows up on approved actions. |
| `luna` | Luna | Customer intelligence | Reads customer DMs (Instagram in the prototype; WhatsApp later), analyses each conversation, opens sales-opportunity and at-risk cases, finds patterns. **Never replies to customers.** Read-only. Workspace and contract: `docs/LUNA.md`. |
| `tracker` | Tracker | Financial intelligence | Daily P&L, margin, costs, from Shopify and ad accounts. |
| `ivy` | Ivy | Growth intelligence | Opportunities (bundles, pricing, audiences) with impact estimates. |
| `store` | Store Agent | Shopify operations | Drafts product/collection changes; **publishes only after approval**. |
| `ads` | Ads Agent | Advertising intelligence | Monitors Meta Ads, recommends budget/creative moves; **budget changes need approval**. |
| `retention` | Retention Agent | Customer retention | V1: turns Luna's DM findings into personal follow-ups (recovery after a fixed problem, purchase follow-ups, unfinished conversations). No Shopify history in V1. Prepares messages; **never sends, customer messages need approval**. Workspace and contract: `docs/RETENTION.md`. |

### Marketplace agents (can be "hired")

`echo` (reviews), `atlas` (inventory forecasting), `muse` (content), `scout` (competitor watch), `vera` (product SEO), `nova` (cohort analytics). Some are instant, some need setup by the KREW team.

Full definitions (capabilities, integrations, schedules) are in `FRONT/src/data/agents.ts`. Personalities and profile content are in `FRONT/src/data/personas.ts`.

### Agent identity

Each agent has a display name, accent colour, personality (`concise | warm | analytical | direct`), schedule, and a portrait (currently temporary character art in `FRONT/public/agents/`). Agents speak in first person in the feed and messages.

---

## 4. Core concepts (the domain model)

**The source of truth for shapes is `FRONT/src/data/types.ts`.** The backend API should return these shapes (or something easily mapped to them).

| Concept | What it is |
|---|---|
| **Workspace** | One client brand. All data is scoped to a workspace. One user can access several workspaces (brand switcher). |
| **AgentDefinition** | Catalogue entry for an agent type (global, not per workspace). |
| **Hire** | An agent hired by a workspace: status (`active | paused | setup`), settings, latest headline, KPI, next run. |
| **AgentSettings** | Per-hire: display name, personality, accent, schedule, enabled capabilities, notification channels, approval mode (`always | high-impact | never`), autonomy level. |
| **FeedPost** | Something an agent publishes: `insight`, `alert`, `recommendation`, `collaboration`, `approval`, `report`, `task`. Can embed metrics, a report, an approval, a checklist or a chart. Can be saved by the user. |
| **Approval** | An action proposed by an agent that needs a human decision. Has `title`, first-person `ask`, the concrete `action`, `channel`, `impact`, `estimate`, `risk`, `evidence`, `preview`, `status` (`pending | approved | rejected`), decision time and note. |
| **Task** | Work item for an agent (`todo | in_progress | waiting | done`). Can be created by the agent or by the user; can be linked to an approval. |
| **Report** | Scheduled or on-request report with highlights and sections. |
| **Conversation / ChatMessage** | Direct chat with an agent, the Manager chat, and team rooms. Messages can carry attachments (report, approval, metrics, post). Same threads as Telegram. |
| **AppNotification** | In-app notifications (also delivered on Telegram). |
| **BrandDNA** | The brand's context: description, tone of voice, audience, positioning, goals, service policy, shipping, returns, guidelines. Agents must use it. |
| **KnowledgeEntry** | Facts and policies agents rely on (FAQ, product details), tagged with which agents use them. |
| **Integration** | Shopify, Instagram, Facebook, WhatsApp, Meta Ads, Telegram: connection status, account, last sync, which agents use it. |
| **TeamMember** | People with access to the workspace: `Owner | Admin | Approver | Viewer`. |

---

## 5. Key flows

### 5.1 Agent run → feed

On schedule (cron) or on an event (new conversation, order, ad metric change), an agent runs, then may:
- publish a **FeedPost**,
- create or update **Tasks**,
- create a **Report**,
- create an **Approval** (if it wants to act),
- send a **message** or **notification** (web + Telegram),
- update its Hire `headline`, `kpi`, `lastActiveAt`, `nextRunAt`.

Feed posts should be meaningful updates, not logs of every internal step.

### 5.2 Approval lifecycle (most important rule)

```
agent proposes → Approval(pending) → notify owner (web + Telegram)
owner approves → execute the action on the external system → Approval(approved)
                 → linked Task done → outcome FeedPost → notification → agent message in chat
owner rejects  → Approval(rejected, note) → linked Task back to todo → agent acknowledges
```

- **Nothing that touches customers, money or the live store executes without approval.** This must be enforced in the backend, not only the UI.
- The approval mode setting (`always | high-impact | never`) only relaxes internal or reversible work; customer-facing actions always ask.
- The Manager can approve **low-impact** items on the owner's behalf only when the owner explicitly asks (the UI simulates this). Record who decided.
- Keep an audit trail of every decision.

The UI's simulated version of this is `decideApproval` in `FRONT/src/store/krew.ts`. It shows every side effect the real backend should produce.

### 5.3 Chat

Users chat with any hired agent, with the Manager, or in a team room. Replies come from Hermes agents. Chats can reference a feed post as context (`Ask Luna` on a post opens her chat with that post attached). The same threads exist on Telegram.

### 5.4 Morning briefing

The Manager produces one daily note per workspace (headline, body, list of pending decisions). The Overview page shows it as a personal message with a reply box.

### 5.5 Hiring an agent

From the marketplace. **Instant** agents become `active` immediately. **Setup** agents become `setup` with a progress value; the KREW team completes setup (internal admin action, not built yet).

### 5.6 Brand DNA and knowledge

Edited by the client in Settings. Agents must read the latest version on every run.

### 5.7 Integrations

Simulated in the UI. Real versions need OAuth/API connections, token refresh, and "needs attention" status when tokens expire (the WhatsApp card shows this state).

---

## 6. The frontend today

- **Stack:** Vite, React 19, TypeScript, React Router 7, Zustand, Tailwind v4. UI libraries: Arc (main), skecher-ui, HeroUI v3, Planes.
- **Run:** `cd FRONT && npm install && npm run dev` (http://localhost:5173). `npm run build` must stay clean.
- **Demo data:** two brand workspaces, *Sahra Home* (home and ceramics) and *Noor Skin* (skincare), with connected scenarios. Reset from Settings → Plan.

### Where the "fake backend" lives (what to replace)

| File | Role today | Becomes |
|---|---|---|
| `FRONT/src/data/types.ts` | Domain types | **API contract** |
| `FRONT/src/store/krew.ts` | Zustand store with all actions, persisted to localStorage | API calls (+ realtime updates) |
| `FRONT/src/data/seed-*.ts`, `modules.ts` | Seeded demo data per workspace | Real data from DB / integrations |
| `FRONT/src/lib/responder.ts` | Keyword-based fake agent replies | Hermes agent responses |
| `FRONT/src/data/agents.ts`, `personas.ts` | Agent catalogue and profiles | Can stay static or move to DB |

Components only read `useWorkspace()` and call store actions, so swapping the store internals for API calls should not require rebuilding screens.

### Agent workspaces (each with its own living document)

| Agent | Tab | Document | Separate store (localStorage) |
|---|---|---|---|
| Tracker | Finance | `docs/TRACKER.md`, `docs/TRACKER_BACKEND.md` | `store/tracker.ts` (`krew-tracker-demo`) |
| Luna | Intelligence | `docs/LUNA.md` | `store/luna.ts` (`krew-luna-demo`): case status decisions |
| Retention | Follow-ups | `docs/RETENTION.md` | `store/retention.ts` (`krew-retention-demo`): follow-up decisions |

Each store follows KREW's "Reset demo data" through `seededAt`. Luna and Retention share one set of sample customers and conversations (`data/luna/mock.ts`); Retention references them by id. The Overview's "Customer conversations" card uses Luna's classified volume (`data/luna/volume.ts`), so it matches Luna's Insights.

### Store actions = the operations the backend must support

| Area | Actions in `krew.ts` |
|---|---|
| Workspace | `setWorkspace` |
| Agents | `hireAgent`, `setHireStatus`, `removeHire`, `updateAgentSettings` |
| Approvals | `decideApproval` |
| Feed | `toggleSave` |
| Tasks | `addTask`, `updateTask`, `deleteTask` |
| Messages | `sendMessage`, `addAgentMessage` (agent side), `markConversationRead`, `ensureConversation` |
| Notifications | `setNotificationRead`, `markAllNotificationsRead`, `dismissNotification` |
| Brand | `updateBrand`, `upsertKnowledge`, `deleteKnowledge` |
| Integrations | `setIntegrationStatus` |
| Team | `inviteMember`, `updateMemberRole`, `removeMember` |

Agent workspace stores add their own operations: Tracker (batches, projects, expenses; `docs/TRACKER_BACKEND.md`), Luna (`setCaseStatus`: opportunity and at-risk case statuses; `docs/LUNA.md` section 14) and Retention (edit, approve, mark sent, record outcome, dismiss, reopen a follow-up; `docs/RETENTION.md` section 10).

UI-only state (theme, sidebar) stays in the browser.

---

## 7. Suggested backend shape (keep it simple)

This is a suggestion, not a decision. Audit and adjust.

**Responsibilities**
1. **Auth and tenancy:** users, workspaces, roles. Strict per-workspace data isolation.
2. **Data API:** CRUD for the concepts in section 4, matching `types.ts`.
3. **Realtime:** push new feed posts, messages, notifications and approval changes to the web app (SSE or WebSocket).
4. **Agent bridge to Hermes:** trigger agent runs (schedules + events), receive their outputs (posts, approvals, tasks, reports, messages) through one ingestion path.
5. **Approval gate and executor:** the only component allowed to perform external write actions, and only for approved items.
6. **Integrations:** Shopify, Meta Ads, WhatsApp Business, Instagram/Facebook messaging, Telegram bot. Store tokens securely.
7. **Scheduler:** per-hire schedules (`settings.schedule`), the daily briefing, data syncs.
8. **Audit log:** decisions and executed actions.

**Possible REST surface (all under `/workspaces/:wsId`)**

```
GET    /workspaces                      list workspaces for the user
GET    /:wsId/overview                  briefing + KPIs + daily series
GET    /:wsId/hires   POST /:wsId/hires   PATCH /:wsId/hires/:agentId   DELETE ...
GET    /:wsId/posts?type=&agent=&saved=  POST /:wsId/posts/:id/save
GET    /:wsId/approvals?status=          POST /:wsId/approvals/:id/decision {status, note}
GET/POST/PATCH/DELETE /:wsId/tasks
GET    /:wsId/reports   GET /:wsId/reports/:id
GET    /:wsId/conversations   GET/POST /:wsId/conversations/:id/messages
GET/PATCH /:wsId/notifications
GET/PATCH /:wsId/brand   CRUD /:wsId/knowledge
GET    /:wsId/integrations   POST /:wsId/integrations/:id/connect|disconnect
GET/POST/PATCH/DELETE /:wsId/team
GET    /agents                          marketplace catalogue
```

---

## 8. Rules that must hold

- **Approval gate:** no external write action without a recorded approval (section 5.2).
- **Luna is read-only:** she never messages customers.
- **Tenant isolation:** a workspace never sees another workspace's data.
- **One history across channels:** Telegram and web share conversations, approvals and notifications.
- **Brand DNA is always applied** to agent output that customers might see.
- **Simulated vs real:** the UI marks demo data; real integrations must replace, not mix with, seeded data.

---

## 9. Open questions for the backend partner

1. How do Hermes agents connect: do they call our API, or do we call them? Where does each agent's memory live?
2. Which database and hosting (Postgres + one API service is probably enough to start)?
3. Auth: email login for clients, plus Telegram account linking per team member.
4. How are integration tokens stored and refreshed (KMS/vault)?
5. Event sources: webhooks (Shopify, WhatsApp, Meta) vs polling, and sync frequency.
6. Internal admin tool for the KREW team (agent setup, onboarding, progress), currently not built.
7. Rate limits and cost control for agent runs.
8. What the very first production slice should be. Suggestion: one workspace, Shopify + Telegram, the Manager briefing, Luna (read-only) and the approval flow end to end.
