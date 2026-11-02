# CLAUDE.md

Context for AI assistants working in this repository. Humans should read
`README.md`, `docs/ARCHITECTURE.md` and `docs/CONVENTIONS.md` — this file is a
condensed index of the same decisions.

## What this is

Vue-In Bank: a mini retail net-banking app (accounts, statements, fund transfer,
beneficiaries), built as a learning product to develop the skills needed to
contribute to an in-flight financial codebase. Correctness and failure handling
matter here; novel layouts and animation do not.

## Stack

| Concern | Choice |
| ------- | ------ |
| Framework | Vue 3 + TypeScript, `<script setup>` |
| Build | Vite |
| Routing | vue-router |
| Client state | Pinia (setup stores) |
| Server state | Pinia Colada (`@pinia/colada`) |
| Forms | VeeValidate + zod (`@vee-validate/zod`) |
| Styling | Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`) |
| Mock backend | MSW — the dev backend, not just a test fixture |
| Unit tests | Vitest + `@vue/test-utils` |
| E2E | Playwright (+ `@axe-core/playwright`) |

Package manager is **pnpm**. Do not generate `package-lock.json` or `yarn.lock`.

## Commands

```sh
pnpm dev                 # dev server, MSW enabled
pnpm build               # type-check + production build
pnpm type-check          # vue-tsc
pnpm lint                # oxlint + eslint, both with --fix
pnpm format              # prettier
pnpm test:unit           # vitest (watch)
pnpm test:unit:run       # vitest once — use this in automation
pnpm test:unit:coverage  # vitest with coverage
pnpm test:e2e            # playwright
pnpm verify              # type-check + lint + unit tests; run before declaring done
```

## Rules that are not negotiable

1. **Money is an integer number of paise.** Never a float. Format only at the
   display edge with `lib/money.ts` and `Intl.NumberFormat('en-IN')` — Indian
   grouping is `₹1,23,456.78`, not `₹123,456.78`.
2. **Every Colada query sets `staleTime` explicitly.** The library default is 5s;
   it is never inherited for financial data. A stale balance is tolerable, a stale
   pending-transaction status is a bug.
3. **Server state belongs to Colada, client state to Pinia.** Never cache server
   data in a Pinia store for convenience.
4. **Money-moving requests carry an idempotency key** that is stable across retries
   of the same user intent.
5. **Four states for every async surface:** loading, empty, error, success. A screen
   without an error state is not finished.
6. **A fix ships with the test that proves it.**
7. **Components do not call `fetch`.** They call composables; composables call
   `features/*/api`; API functions return zod-parsed data.
8. **Types for server data are inferred from zod schemas**, never written twice.
9. No `any`. `strict` and `noUncheckedIndexedAccess` stay on.
10. Dependencies point inward: `lib/` never imports from `features/`, and features
    never import each other's internals.

## Layout

```
src/
├── assets/      Tailwind entry + @theme tokens
├── components/  shared presentational components
├── composables/ shared composables
├── features/    accounts/ transfer/ auth/ beneficiaries/
├── lib/         money, http, format — framework-agnostic
├── mocks/       MSW handlers + browser worker + node server
├── router/      routes and guards
├── stores/      global client state
├── test/        Vitest setup and helpers
└── types/       cross-feature types
```

Within a feature: `api/ components/ composables/ schemas/ stores/ types/ __tests__/`.

## Working notes for assistants

- **Read before writing.** This repo deliberately mirrors the experience of joining
  an existing codebase; match the conventions already present rather than
  introducing a preferred structure.
- **Do not add dependencies** without being asked. The small stack is a decision
  (`docs/adr/`), not an oversight. No component library yet — see ADR 0005.
- **Do not create `tailwind.config.js`.** Tailwind v4 is configured in CSS via
  `@theme` in `src/assets/main.css`.
- **When adding a feature, add its MSW handlers at the same time**, including at
  least one failure scenario. A happy-path-only handler is incomplete.
- **Phase order is in `docs/ROADMAP.md`.** Phases 2 (transfer flow) and 5
  (hardening) carry the most value; do not quietly skip Phase 5 work.
- If a decision here looks wrong, say so and record it as a new ADR rather than
  silently diverging.
