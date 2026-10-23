<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Aaliqadr: rules for agents

The specification is in `docs/` (start at `docs/00-README.md`). These rules exist because each prevents a known failure.

## Architecture
- **Cache Components is on.** Catalogue reads go through `src/server/queries/*` (`"use cache"` + `cacheLife` + `cacheTag`). Anything reading `cookies()`, `headers()` or `searchParams` must sit inside `<Suspense>`. `dynamicParams` is not allowed; call `notFound()` instead. `generateStaticParams` must never return an empty array.
- **Mutations are Server Actions** in `src/actions/`; route handlers only for external callers (webhooks, cron, auth, uploads). Invalidate with `updateTag` (actions) or `revalidateTag(tag, "max")` (route handlers).
- **Layering:** components never import `server/models` or `server/db`. Every file under `src/server/` starts with `import "server-only"` (except pure modules that tests import).
- **Env:** read only via `src/env.ts`. No fallback values. Use `requireConfigured(...)` before touching an integration.

## Money & data
- Money is integer **paise** (`priceP`). Format only with `formatPrice`; GST split only with `splitInclusiveGst` (`src/lib/money.ts`).
- The browser never sends a price. Server prices from the catalogue (`src/server/services/pricing.ts`).
- Orders snapshot product data; ledgers and histories are append-only.

## Design system
- The 12 sign themes come from `src/config/zodiac.ts` → `npm run zodiac:css`. Never hard-code a sign colour in a component; use the `--z-*` tokens / Tailwind `bg-bg text-fg text-primary …`.
- Wrap a themed page in `<ZodiacScope sign>`; cards may carry `data-zodiac` for their own colours.
- New palette values must pass `tests/zodiac.test.ts` (WCAG AA).
- Use the `<Logo>` component (vector paths); never rebuild the wordmark with a font.
- JS budget per page: ≤ 170 KB gzip first load (docs/09 §9). Prefer CSS and server components; reveal animations use `components/motion/Reveal` (IntersectionObserver + CSS), not an animation library.
- Dynamic links use `routes.*` from `src/lib/routes.ts` (typed routes).
- Parallax: wrap layers in `components/motion/Parallax` (CSS scroll-driven, no JS). Any ancestor that crops must use `overflow-clip`, never `overflow-hidden` (hidden creates a scroll container and freezes the timeline).

## Before you finish
`npm run lint && npm run typecheck && npm test && npm run build`
