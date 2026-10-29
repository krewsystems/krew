# KREW repository

Read `docs/KREW_CONTEXT.md` first: it explains the product, the domain model, the flows and the backend plan.

- `FRONT/` is the frontend prototype; its rules are in `FRONT/CLAUDE.md`.
- Tracker (finance agent) workspace: read `docs/TRACKER.md` before working on it. It is a living document; update it at the end of each stage. The backend handoff contract for Tracker is `docs/TRACKER_BACKEND.md`; keep it in step when rules or operations change.
- Luna (customer intelligence) workspace: read `docs/LUNA.md` before working on it, and update it at the end of each stage. Luna is read-only toward customers: no reply or send features.
- Retention (follow-up) workspace: read `docs/RETENTION.md` before working on it, and update it at the end of each stage. V1 uses DM signals from Luna only (no Shopify history) and never sends messages.
- The API contract is `FRONT/src/data/types.ts`. The simulated backend is `FRONT/src/store/krew.ts` (every action there is an operation the real backend must support).
- Non-negotiable: nothing that touches customers, money or the live store executes without a recorded human approval.
- Keep things simple. Prefer one API service and one database to start.
