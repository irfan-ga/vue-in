# 0004 — MSW as the development backend

**Status:** Accepted

## Context

There is no backend, and the skills this project exists to build are mostly about
what happens when a request does *not* succeed: timeouts, 500s, and the partial
failure where a transfer went through but the response was lost.

A static JSON fixture or a happy-path mock cannot teach any of that. It is how
side projects end up with no error states.

## Decision

Mock Service Worker (`msw`) is the development backend from day one, not a test
fixture added later.

- `src/mocks/handlers.ts` is the single definition of the fake bank API.
- The same handlers run in the browser during `pnpm dev` (`src/mocks/browser.ts`)
  and in Node during Vitest (`src/mocks/node.ts`).
- Handlers deliberately model latency, 500s, retry-then-succeed, and the
  lost-response case.

## Consequences

- Error handling gets written while the feature is written, because the unhappy
  path is one toggle away rather than hypothetical.
- Tests and the dev server cannot drift apart: they share one contract.
- The mock is not a real backend. Nothing here proves the app works against a real
  one, and the handlers must be kept honest about status codes and shapes.
- `public/mockServiceWorker.js` is generated and committed, and is refreshed with
  `pnpm msw:init` after an msw upgrade.
- Mocking is gated on `VITE_ENABLE_MSW`, not `import.meta.env.DEV`, because
  Playwright runs against the production preview build on CI and that build needs
  a backend too. The cost is that msw ships in the production bundle as a
  lazy-loaded chunk (~385 kB raw / ~150 kB gzipped, measured). That is acceptable
  while there is no real API; when one arrives, switch the gate to `DEV` so the
  chunk is tree-shaken out of production.
- MSW 3 offers a Vite plugin (`msw/vite`) with a `virtual:msw` auto-integration.
  It is deliberately not used: it is development-only, which is exactly the case
  the preview build breaks. Reconsider once a real backend exists.
- MSW 3 renamed `onUnhandledRequest` to `onUnhandledFrame`. Older snippets found
  online will silently do nothing.
