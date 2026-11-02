# 0001 — SPA, not Nuxt

**Status:** Accepted

## Context

The app lives entirely behind a login: accounts, statements, transfers. None of it
is publicly indexable and none of it benefits from a shared first paint.

## Decision

Build a client-rendered SPA with Vite and `vue-router`. No SSR.

## Consequences

- SEO and first-contentful-paint advantages of SSR are given up, and are worth
  nothing for authenticated-only screens.
- Hydration mismatches, server/client environment splits and request-scoped state
  cannot distract from the genuinely hard parts (forms, money, failure handling).
- Nuxt remains a planned separate exercise: rebuilding the transfer flow with SSR
  and server routes, after Phase 5. That is the right time to meet hydration —
  as its own topic, not as incidental complexity.
