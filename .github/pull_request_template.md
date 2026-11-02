## What and why

<!-- What problem does this solve? Link the roadmap phase or issue. -->

## Approach

<!-- Why this way? What did you consider and reject? -->

## How I know it works

<!--
A test, not a screenshot. For a bug fix: the test that fails before this change
and passes after.
-->

## Checklist

- [ ] `pnpm verify` passes
- [ ] A test covers this change, including a failure path where one exists
- [ ] Loading, empty and error states exist for anything async
- [ ] Inputs are labelled; the flow is keyboard reachable
- [ ] No float currency values; every query sets its own `staleTime`
- [ ] New or changed endpoints have MSW handlers, including a failure scenario
- [ ] No cross-feature imports, no barrel files, no new `import.meta.env` reads (rules 11, 12, 15)
- [ ] Statuses modelled as a union rather than booleans; no `as` or `!` below the zod boundary (rules 17, 18)
- [ ] Within budget: component ≤200 lines, function ≤40, nesting ≤3, props ≤7 (rule 25)
- [ ] No dead code, no bare suppressions, no `console.*`, no magic numbers (rules 20, 22, 23, 24)
- [ ] One concern only — no refactor riding along with a feature (rule 26)
- [ ] A decision worth remembering is recorded in `docs/adr/`
