# Conventions

Conventions exist so that reviews argue about correctness instead of taste.
When this file and a personal preference disagree, this file wins.

## Non-negotiables

The thirty-two numbered rules live in [`CLAUDE.md`](../CLAUDE.md) and are
canonical: correctness (1-9), architecture and boundaries (10-19), hygiene and
change discipline (20-32). They are deliberately not repeated here — one copy,
one place to keep true.

This document covers the detail *around* those rules: style, idiom and the
reasoning behind them. Where the two appear to disagree, `CLAUDE.md` wins and the
discrepancy is a bug in this file.

## TypeScript

- `strict` is on, plus `noUncheckedIndexedAccess`. Do not weaken either.
- No `any`. Use `unknown` and narrow. If an external type is genuinely unknowable,
  parse it with zod rather than asserting.
- Types that describe server data are **inferred from zod schemas**
  (`z.infer<typeof schema>`), never hand-written alongside them.
- `type` for object shapes and unions; `interface` only when declaration merging
  is actually needed.

## Vue

- `<script setup lang="ts">` everywhere. Options API is not used.
- Props and emits are typed with the generic form: `defineProps<Props>()`.
- Component file names are `PascalCase.vue`. Composables are `useThing.ts`.
- One component per file. A component over ~200 lines is a smell; extract.
- Order blocks `<script setup>`, `<template>`, `<style scoped>`.
- Prefer `computed` over watchers. A `watch` that only derives a value is a bug
  waiting to happen.
- No business logic in templates. If it needs a comment, it belongs in the script.

## State

- Server data → Pinia Colada (`useQuery` / `useMutation`).
- Client-only data → Pinia store, setup syntax only (`defineStore('name', () => {...})`).
- Never cache server data in a Pinia store "so it is easier to get at".

## Forms

- VeeValidate + zod via `@vee-validate/zod`. The zod schema is the single source
  of both validation and types.
- Server-side field errors are reconciled back onto the form via `setErrors`,
  not shown as a detached toast.
- Submit buttons are disabled while in flight. Every single one.

## Styling

- Tailwind utility classes in the template. No CSS-in-JS.
- Design tokens live in `src/assets/main.css` under `@theme`. Use token names
  (`text-brand`), not raw hex values, in components.
- No component library for now; see `docs/adr/0005-no-component-library-yet.md`.

## Testing

| Kind | Tool | What it covers |
| ---- | ---- | -------------- |
| Unit | Vitest | `lib/` logic, schemas, state machines, money |
| Component | Vitest + `@vue/test-utils` | component behaviour against MSW handlers |
| E2E | Playwright | whole flows, including failure paths |

- Tests live in `__tests__/` next to the code they cover.
- Name a test after the behaviour, not the function:
  `it('rejects a transfer above the daily limit')`.
- Test the failure paths. Happy-path-only coverage is how this project would fail
  to prove anything.
- Never assert against a snapshot of the whole DOM.

## Accessibility

- Every input has an associated `<label>`. Placeholders are not labels.
- Keyboard reachable: every interactive element, in a sensible tab order.
- Focus is managed across the steps of the transfer flow and moved into modals.
- Errors are announced, not only coloured red.

## Git

- Branches: `feat/transfer-otp-step`, `fix/statement-pagination`, `chore/ci-cache`.
- Commits follow Conventional Commits: `feat(transfer): add idempotency key per attempt`.
- Small, reviewable commits with a message that says **why**, not what.
- Rebase to keep history linear. Never force-push `main`.

## Definition of Done for any change

- [ ] Types pass (`pnpm type-check`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Tests pass, including a new test for the change (`pnpm test:unit`)
- [ ] Loading, empty and error states exist for anything async
- [ ] Keyboard reachable, inputs labelled
- [ ] No float currency, no inherited `staleTime`
