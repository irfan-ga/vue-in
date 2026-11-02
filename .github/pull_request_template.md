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
- [ ] A decision worth remembering is recorded in `docs/adr/`
