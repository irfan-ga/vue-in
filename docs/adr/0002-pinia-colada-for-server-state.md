# 0002 — Pinia Colada for server state

**Status:** Accepted

## Context

Loading, error, retry, caching and invalidation are the majority of what a banking
UI does. Hand-rolling them inside Pinia stores is the most common mistake in a Vue
app of this shape.

Two credible options: TanStack Query (Vue Query) and Pinia Colada. The project
already depends on Pinia. Colada is built on Pinia, so it adds a layer rather than
a second parallel state container; TanStack Query would mean running two.

Colada is at 1.4.x with Pinia 4 support, which settles the earlier maturity concern.

## Decision

Use Pinia Colada (`@pinia/colada`) for all server state. Pinia stores keep
client-only state.

## Consequences

- One state container, not two. Devtools, plugins and conventions stay consistent.
- A smaller ecosystem and fewer Stack Overflow answers than TanStack Query. The
  docs are the primary reference.
- **Colada's default `staleTime` is 5 seconds, and this project never inherits it.**
  Every query sets `staleTime` explicitly. A balance that is five seconds stale is
  usually fine; a *transaction status* that is five seconds stale during a pending
  transfer is a correctness bug. Being deliberate per query is the point.
- As a safety net, `src/main.ts` lowers the *global* default to `staleTime: 0`, so
  that forgetting to set one costs an extra request rather than showing a stale
  balance. That is a backstop, not a substitute for setting it per query.
- Colada has no built-in `retry` option; retries come from a separate plugin
  (`@pinia/colada-plugin-retry`). Add it when Phase 1 needs retry-with-backoff,
  not before.
- The concepts transfer to TanStack Query almost one-to-one, so this does not close
  the door on the better-known library.
