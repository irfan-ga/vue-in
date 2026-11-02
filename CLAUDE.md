# CLAUDE.md

Context for AI assistants working in this repository. `README.md`,
`docs/ARCHITECTURE.md` and `docs/CONVENTIONS.md` carry the detail and the
reasoning; **the numbered rule list below is canonical**, and those documents link
here rather than restating it, so there is only ever one copy to keep true.

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

Three groups: **A** keeps the money correct, **B** keeps the architecture from
rotting, **C** keeps the repository from silting up. Cite them by number in
review ("rule 17"). None of them is a preference to be traded against
convenience — if one genuinely must break, see *When a rule has to break* below.

### A. Correctness

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
9. **No `any`.** `strict` and `noUncheckedIndexedAccess` stay on.

### B. Architecture and boundaries

10. **Dependency direction is one-way.** Inside a feature:
    `components → composables → api/schemas → lib`. Never upward. `src/lib/`
    imports nothing but other `lib/` modules — no Vue, no Pinia, no feature code —
    which is also what keeps it testable without mounting anything.
11. **Features never import each other.** Not even a single type. The moment two
    features need the same thing, it is promoted to `components/`, `composables/`,
    `lib/` or `types/` **in that same change** — never cross-imported "for now",
    because "for now" is how a feature folder stops meaning anything.
12. **No barrel files.** No `index.ts` whose only job is re-exporting a folder.
    Import from the module's real path. Barrels manufacture import cycles, defeat
    tree-shaking, and turn every rename into a twenty-file diff.
13. **Shared components are presentational.** Anything in `src/components/` takes
    props and emits events. It does not fetch, does not read a store, and does not
    know what a beneficiary is. Container logic belongs to the feature that owns it.
14. **One concept, one home.** Search before adding a helper, constant, type or
    schema. Two functions that both format an account number is a defect with two
    places to fix, and the second one will be missed.
15. **`import.meta.env` appears in exactly one module** — `src/lib/config.ts` —
    which exports typed, validated values. Scattered env reads are how a build
    works in development and breaks in production.
16. **The router wires; it does not decide.** `src/router/` holds the route table,
    lazy imports and guards, and nothing else — no fetching, no business rules.
    Every feature route is `() => import(...)`.
17. **Model impossible states out of existence.** A discriminated union on a status
    field, never a drawer of booleans. If `isLoading` and `isError` can both be
    true at once, the type is wrong, and the UI bug that follows is the type's
    fault rather than the component's.
18. **Parse at the boundary, then trust the types.** zod validates once, at the
    edge. Below that line: no `as`, no `!`, no defensive re-checking. The types are
    the record of what has already been proven.
19. **No speculative structure.** No folder, wrapper, abstraction or config flag
    for a use case that does not exist yet. Abstract on the third occurrence, not
    the first — a premature abstraction is harder to remove than the duplication
    it was meant to prevent.

### C. Hygiene and change discipline

20. **Delete, do not disable.** No commented-out blocks, no unused exports, no
    orphan files nothing imports. Git remembers; the working tree holds only code
    that runs.
21. **Every `TODO` carries an issue reference** — `// TODO(#42): ...`. An
    unreferenced TODO is deleted on sight, because it is a wish, not a plan.
22. **Every lint suppression states its reason on the same line.** A bare
    `eslint-disable` is one person silently deleting a rule for everybody.
23. **No `console.*` in committed code.** Diagnostics go through the logger, so
    they can be routed, filtered or switched off — see Phase 5's structured error
    reporting in `docs/ROADMAP.md`.
24. **No magic numbers or strings.** Transfer limits, statuses, route names, query
    keys and endpoint paths are named constants, one place per feature. A literal
    `100000` inlined in a component is the next policy change becoming an incident.
25. **Budgets, not suggestions:** ≤200 lines per component, ≤40 lines per function,
    ≤3 levels of nesting, ≤7 props. Over budget means extract, not reformat.
26. **One concern per commit, one per PR.** A refactor never rides along with a
    feature. If a rename has to come first, it is its own commit, so the feature
    diff stays reviewable.
27. **Tests travel with the code.** A file that moves or is renamed takes its
    `__tests__` with it in the same change. A suite that no longer matches the
    layout quietly stops being run.
28. **No new dependency without an ADR** — including "it is only a tiny helper".
    Check the standard library and `@vueuse/core` first. Every dependency is a
    permanent maintenance obligation; ADR 0005 is an example of saying no.
29. **Formatting and lint are the machine's business.** Never hand-format, never
    debate it in review. `pnpm verify` is the arbiter and must pass before anything
    is called done.
30. **The core stays small.** `src/lib/` and `src/types/` are the foundation:
    changes there need a test and a thought about everything downstream. If `lib/`
    is growing faster than `features/`, domain logic has leaked into it and needs
    pushing back out.

### When a rule has to break

Occasionally one legitimately will. Then: say so in the PR description, and leave
a one-line reason at the code itself. If the same rule breaks twice, the rule is
wrong — supersede it with a new ADR instead of letting silent exceptions pile up.
A rule set that is quietly ignored is worse than none, because the repository
stops telling the truth about its own code.

### What is actually enforced today

- **Machine-checked by `pnpm verify`:** rule 9 and the type-level half of 17-18
  (`type-check`), rule 29 (prettier, oxlint, eslint).
- **Review-checked:** everything else, backed by the checklist in
  `.github/pull_request_template.md`.

Rules 12, 20, 21, 23, 24 and 25 are mechanically checkable and currently are not
checked. Wiring them into the linter is a worthwhile chore — do it as its own
change, with the budgets set to the values above.

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
