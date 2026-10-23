# KREW · frontend prototype

AI workforce for e-commerce. This is the first interactive frontend for the KREW web app (Ivory OS direction). Frontend only: all data is simulated and persisted in the browser.

## Run it

```bash
cd FRONT
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

Reset the demo any time from **Settings → Plan & prototype**, the user menu, or the command palette (Ctrl/⌘ K → "Reset demo data").

## Stack

- Vite + React 19 + TypeScript, React Router 7, Zustand (persisted to `localStorage` under `krew-demo`)
- Tailwind CSS v4 for layout
- Navigation: collapsible sidebar plus a floating section bar (`components/shell/SectionBar.tsx`) whose tabs are configured per route and stored in the URL
- **Arc** (`src/components/arc/*`): primary component system: buttons, inputs, dialogs, drawers, tabs, charts, tables, chat composer, command palette, notification center, timeline, etc.
- **skecher-ui** (`src/components/ui/*`, full library installed): used for apple-mail-tabs (feed filters), sliding-panel (agent workspace tabs), ai-orb (Manager briefing), streaming-text (briefing), ai-chat-box (Ask KREW), 3d-wheel-carousel (marketplace), animated-book + table-of-content (reports), spring-slider (agent independence), dither-credit-card (plan), expandable-mobile-nav (phones)
- **HeroUI v3**: rail tooltips (right placement), Kbd; its theme variables are driven by the same tokens
- **Planes**: ThinkingLoader (agent typing), RippleGrid (hire tile)
- Type: Helvetica Neue / Helvetica only
- Agent characters in `public/agents/` are temporary art cut from a reference sheet (`<id>.jpg` portrait, `<id>-face.jpg` avatar); mapping in `src/data/photos.ts`

## Structure

```
src/
  index.css            Ivory OS tokens (one set drives Arc, HeroUI, skecher, Planes)
  data/                Domain types, agent catalog, seeded workspaces (Sahra Home, Noor Skin), module datasets
  store/krew.ts        Central state + actions (hire, approve/reject, tasks CRUD, messages, Brand DNA, KB, integrations, team, reset)
  lib/responder.ts     Mock agent replies; swap for Hermes Agent later
  components/
    shell/             Sidebar (collapsible rail), top bar, command menu, Ask KREW, mobile nav, toasts
    agent/ feed/ approvals/ reports/ common/
  pages/               Overview, My Krew, agent workspace (+ per-agent modules), Feed, Messages, Approvals, Reports, Marketplace, Settings
```

To connect real APIs, replace the store actions' bodies (and the seed) with calls to the backend. Components only read `useWorkspace()` and call store actions.

## Notes

- Arc and skecher files are owned source and were adapted where needed (compact apple-mail-tabs, monochrome spring-slider, `flow` mode for sliding-panel, brand props on the dither card, no Next.js imports).
- Arc's registry is installed via the shadcn CLI (`@uiarc` in `components.json`). If `uiarc.dev` times out on your network, check DNS: the registry is served from Cloudflare.
