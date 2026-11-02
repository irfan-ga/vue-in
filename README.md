# Vue-In Bank

A mini retail net-banking app — accounts, statements, fund transfer, beneficiaries
— built as a deliberate learning product in Vue 3 + TypeScript.

The goal is not a novel UI. It is the skill set a frontend engineer actually needs
on a financial codebase that is already in development: multi-step forms, exact
money arithmetic, transaction state machines, idempotency, session handling, and
failure paths that are handled rather than hoped away.

> **Status:** pre-development. The repository is set up — stack, conventions,
> mock-backend plumbing and roadmap are in place. No features are built yet.
> Phase 1 is next; see [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Why this app, and not a todo list

Financial frontend work concentrates in a small number of unglamorous areas:

| Area | What it actually means |
| ---- | ---------------------- |
| Forms | Multi-step, conditional fields, sync + async validation, server-error reconciliation, IFSC/PAN/account formats |
| Money | Never floats. Integer paise. `en-IN` lakh/crore grouping (`₹1,23,456.78`) |
| Tables | Server-side pagination, sort and filter over large result sets |
| Transaction state | `initiated → pending → success/failed`, polling, idempotency, double-submit prevention |
| Auth | Token refresh rotation, idle timeout, step-up re-auth, RBAC route guards |
| Failure handling | Timeouts, 500s, and the partial failure where the transfer succeeded but the response was lost |
| Testing | Regulated code is tested code |
| Accessibility | Frequently a compliance requirement, not a nicety |

A retail transfer flow exercises every row in that table. That is why it is the
product being built here.

## Stack

Deliberately small. Nothing is added until something is blocked without it
(see [`docs/adr/`](docs/adr/)).

- **Vue 3 + TypeScript** (`<script setup>`), **Vite**, **vue-router**
- **Pinia** — client state
- **Pinia Colada** — server state: caching, retries, invalidation ([ADR 0002](docs/adr/0002-pinia-colada-for-server-state.md))
- **VeeValidate + zod** — forms and schema validation, types inferred from the schema
- **Tailwind CSS v4** — CSS-first config, no `tailwind.config.js`
- **MSW** — the development backend, from day one ([ADR 0004](docs/adr/0004-msw-as-the-development-backend.md))
- **Vitest** + `@vue/test-utils`, **Playwright** + `@axe-core/playwright`

## Getting started

Requires Node `>=22.18` (see `.nvmrc`) and pnpm.

```sh
pnpm install
pnpm dev
```

Non-secret defaults are committed in `.env`, so the dev server starts with MSW
intercepting API calls and the app runs with no backend at all.

To override anything locally, `cp .env.example .env.local` and edit — `.env.local`
is git-ignored. Setting `VITE_ENABLE_MSW=false` there points the app at a real API
via `VITE_API_BASE_URL`.

For end-to-end tests, install browsers once:

```sh
pnpm exec playwright install
```

## Commands

| Command | Does |
| ------- | ---- |
| `pnpm dev` | Dev server with hot reload and MSW |
| `pnpm build` | Type-check, then production build |
| `pnpm preview` | Serve the production build locally |
| `pnpm type-check` | `vue-tsc` across app, node and test configs |
| `pnpm lint` | oxlint + eslint, both with `--fix` |
| `pnpm format` | Prettier over `src/` |
| `pnpm test:unit` | Vitest in watch mode |
| `pnpm test:unit:run` | Vitest once |
| `pnpm test:unit:coverage` | Vitest with a coverage report |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm verify` | Type-check + lint + unit tests — the pre-push gate |
| `pnpm msw:init` | Regenerate the MSW service worker after an msw upgrade |

## Documentation

| Document | Read it for |
| -------- | ----------- |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | The five phases, in ROI order, with a Definition of Done each |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Layers, directory layout, the server/client state split, caching policy |
| [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) | TypeScript, Vue, forms, testing, a11y and git conventions |
| [`docs/adr/`](docs/adr/) | Why the stack is what it is, including the trade-offs accepted |
| [`docs/OSS-LOG.md`](docs/OSS-LOG.md) | Open-source PRs — the separate skill of joining someone else's codebase |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Workflow, branch and commit format, review expectations |
| [`CLAUDE.md`](CLAUDE.md) | Condensed context for AI assistants |

## House rules

Three that explain most review comments:

1. **Money is integer paise.** Floats never touch a currency value.
2. **Every query states its own `staleTime`.** A stale balance is fine; a stale
   pending-transaction status is a correctness bug.
3. **Loading, empty, error, success.** A screen missing its error state is not done.

The rest are in [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md).

## License

[MIT](LICENSE)
