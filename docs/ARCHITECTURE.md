# Architecture

A single-page app behind a login. No SSR. See `docs/adr/0001-spa-not-nuxt.md`.

## The one idea that organises everything

**Server state and client state are different things and live in different places.**

| State | Example | Home |
| ----- | ------- | ---- |
| Server state | accounts, statement rows, beneficiaries, transaction status | Pinia Colada queries |
| Client state | auth session, UI toggles, multi-step form progress | Pinia stores |

Hand-rolling caching, retries and invalidation inside a Pinia store is the most
common mistake in a Vue app of this shape. Colada owns anything the server is the
source of truth for; Pinia owns everything else.

## Layers

```
┌─────────────────────────────────────────────┐
│ features/*/components   views and widgets   │  Vue SFCs. Presentation + interaction.
├─────────────────────────────────────────────┤
│ features/*/composables  feature behaviour   │  Queries, mutations, state machines, form logic.
├─────────────────────────────────────────────┤
│ features/*/api          transport           │  One function per endpoint. Returns parsed data.
│ features/*/schemas      zod schemas         │  Validation + the inferred types.
├─────────────────────────────────────────────┤
│ lib/                    framework-agnostic  │  money, formatting, http client, idempotency.
└─────────────────────────────────────────────┘
```

These layers are not a drawing. They are declared as `boundaries/elements` and
`boundaries/dependencies` in `eslint.config.ts` and fail the build when crossed —
see `docs/adr/0006-architecture-boundaries-as-lint-rules.md`.

Rules:

- A component never calls `fetch`. It calls a composable.
- An API function never returns `any`. It returns the output of a zod `parse`,
  so the boundary between the server and the app is typed by one source.
- `lib/` imports nothing from `features/`. Dependencies point inward only.
- A feature may not import from another feature's internals. Anything shared is
  promoted to `components/`, `composables/` or `lib/`.

## Directory layout

```
src/
├── assets/            Tailwind entry + design tokens, images
├── components/        shared presentational components (no feature knowledge)
├── composables/       shared composables
├── features/          feature modules — the bulk of the app
│   ├── accounts/
│   ├── transfer/
│   ├── auth/
│   └── beneficiaries/
├── lib/               framework-agnostic utilities (money, http, format)
├── mocks/             MSW handlers, browser worker, node server
├── router/            route table + navigation guards
├── stores/            global client state (auth, ui)
├── test/              Vitest setup and shared test helpers
└── types/             types shared across features
```

Each feature folder follows the same internal shape:

```
features/<name>/
├── api/           endpoint functions
├── components/    feature components and views
├── composables/   queries, mutations, behaviour
├── schemas/       zod schemas
├── stores/        feature-local client state (only if genuinely needed)
├── types/         feature types not inferred from schemas
└── __tests__/     unit and component tests
```

## The mock backend

MSW is not a test fixture here, it is the development backend. It runs in the
browser during `pnpm dev` and in Node during Vitest, from the same handlers in
`src/mocks/handlers.ts`.

This is deliberate: a fake API that can return a 500, stall for three seconds, or
succeed only on retry means error handling gets written while the feature is
written, instead of being bolted on later. Building against a happy-path mock is
how side projects end up with no error states.

### Scenarios

The happy path lives in `src/mocks/handlers.ts`. Everything else — a 503, an
empty list, a four-second stall, a 500 that succeeds on retry — is named in
`src/mocks/scenarios.ts` and applied from either side:

| Where | How |
| ----- | --- |
| A test | `server.use(...scenarios['statement-error'])` |
| The running app | `http://localhost:5180/?scenario=statement-error` |

An unknown name throws instead of being ignored, so a typo is visible rather than
looking like a passing happy path.

### The contract test

`src/mocks/` may not import `src/features/` — the boundaries config enforces it.
The mock is playing the part of a server, and a type shared with the client would
hide a drift between what the server sends and what the client accepts. What
holds the two sides together is
`src/features/accounts/__tests__/contract.spec.ts`, which parses the mock's own
payloads with the real zod schemas and replays its running balances.

See `docs/adr/0004-msw-as-the-development-backend.md`.

## Environment

`src/lib/config.ts` is the only module that reads `import.meta.env` (rule 15). It
validates every variable with zod at module load, so a missing or malformed one
fails the boot with a message naming it rather than surfacing as `undefined`
three screens deep. Nothing there can be a secret: every `VITE_` variable is
inlined into the client bundle and ships in plain text.

The dev and preview ports are pinned with `strictPort` in `vite.config.ts` (5180
and 4180). Vite's default 5173 is shared with every other Vite project on the
machine, and a Playwright run once passed against a different app entirely
because of it.

## Money

Currency is stored and transported as an **integer number of paise**. It is
converted to a display string only at the edge, by `lib/money.ts`, using
`Intl.NumberFormat('en-IN')`. No float ever holds a currency value.

See `docs/adr/0003-money-as-integer-paise.md`.

## Failures

`lib/http.ts` turns everything a request can do wrong into one of five kinds, so
that a component branches on a union instead of reconstructing the situation
from a status code and a couple of booleans (rule 17):

| Kind | Means | What the UI does with it |
| ---- | ----- | ------------------------ |
| `network` | the request never reached a server | say the connection failed, offer a retry |
| `timeout` | over the request budget | offer a retry |
| `cancelled` | superseded or unmounted | nothing: the user did not cause it and must not see it |
| `status` | the server answered, and said no | show its message; branch on 404 vs 400 vs 5xx |
| `malformed` | the response failed its schema | a broken contract, not a user problem — report it |

Every api function returns parsed data or throws `HttpError` carrying one of
these. The message on the error is for developers; user-facing copy belongs to
the component, the only layer that knows what the user was trying to do.

## Caching policy

Colada's default `staleTime` is 5 seconds. That default is never inherited for
financial data — every query sets `staleTime` explicitly, because the right answer
differs per resource:

| Query | Policy | Why |
| ----- | ------ | --- |
| account balance | short stale time, refetch on focus | slightly stale is acceptable |
| statement page | longer stale time | historical rows do not change |
| pending transaction status | `staleTime: 0`, polled | a stale status here is a correctness bug |

See `docs/adr/0002-pinia-colada-for-server-state.md`.
