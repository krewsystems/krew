# KREW frontend

Read README.md first. Key rules for working here:

- Visual direction is Ivory OS: monochrome, warm ivory canvas, white panels, near-black ink. Helvetica only (400/500, 300 for large numbers). No gradients, glows or purple AI styling.
- Use tokens from `src/index.css` (Tailwind names: `bg-canvas`, `bg-panel`, `text-ink`, `text-ink-2`, `text-ink-3`, `border-line`, `bg-inverse`...). Never raw hex in app code.
- Arc CSS modules are unlayered and beat Tailwind utilities; override Arc surfaces with the important modifier (`p-1.5!`) or CSS variables.
- Prefer Arc components (`src/components/arc`), then skecher-ui (`src/components/ui`), then HeroUI. Read the component's API before using it.
- Copy: sentence case, no em dashes, no eyebrow labels.
- All state goes through `src/store/krew.ts`; the active brand's data comes from `useWorkspace()`.
- `npm run build` must stay clean.

## UI components: Planes

Animated React components distributed as a shadcn registry. Before hand-writing an animated control, carousel, text effect, hero, or login, check the catalog: https://useplanes.com/llms.txt (usage and props: https://useplanes.com/llms-full.txt)

- Free components: `npx shadcn add https://useplanes.com/r/<slug>.json`
