# Roadmap

Vue-In Bank is a learning product: a mini retail net-banking app built to develop
the skills a Vue engineer needs on an in-flight financial codebase. Phases are
ordered by return on investment, not by what is fun to build.

The two phases that matter most are **Phase 2** (the transfer flow) and
**Phase 5** (hardening). Phase 2 is a microcosm of the whole domain. Phase 5 is
the difference between a portfolio project and evidence of professional judgement.

Each phase ships only when its Definition of Done is fully met. Half-finished
phases are worth less than one complete one.

---

## Phase 1 — Accounts and transaction statement

Data display, done properly.

- [x] Account list with balances
- [x] Statement table with server-side pagination, sort and date-range filter
- [x] `lib/money.ts` — integer paise storage, `Intl.NumberFormat('en-IN')` display
- [x] Skeleton loaders, empty state, error state, retry
- [x] MSW handlers returning realistic latency, 500s and retry-then-succeed

**Teaches:** server state, the money discipline, table patterns.

**Definition of Done:** no float arithmetic anywhere near a currency value;
`₹1,23,456.78` grouping verified by a unit test; every request state
(loading / empty / error / success) reachable in the UI from an MSW scenario.

**Status: met.** Money is a branded integer, so a float cannot reach a currency
value without failing to compile. The grouping is pinned by a unit test, and
every state is reachable in the browser — loading and error through
`?scenario=`, empty by opening the dormant account — with the journey covered
end to end in `e2e/accounts.spec.ts`.

---

## Phase 2 — Fund transfer (the core; spend the most time here)

- [ ] Steps: beneficiary → amount → review → OTP → result
- [ ] Validation: IFSC format, account number format, per-transaction and daily limits, balance check
- [ ] An explicit state machine for the transaction lifecycle
- [ ] Idempotency key per attempt; disable-on-submit; double-submit prevention
- [ ] Poll pending status; handle timeout
- [ ] Handle "response lost but the transfer succeeded"

**Teaches:** complex multi-step forms, async validation, state machines, idempotency.

**Definition of Done:** the lifecycle is a named state machine, not a pile of
booleans; the same idempotency key survives a retry; killing the network between
submit and response leaves the UI in a defensible state, proven by a test.

---

## Phase 3 — Auth and session

- [ ] Login
- [ ] Access + refresh token rotation via an HTTP interceptor
- [ ] Idle timeout with warning modal, then auto-logout
- [ ] Route guards and RBAC (customer vs. ops user)
- [ ] Step-up re-authentication before a high-value transfer

**Teaches:** `router.beforeEach`, interceptors, where tokens may and may not be stored.

**Definition of Done:** a concurrent burst of 401s triggers exactly one refresh;
no protected route renders before the guard resolves.

---

## Phase 4 — Beneficiaries and document upload

- [ ] Beneficiary CRUD with optimistic updates and rollback on failure
- [ ] File upload: type and size validation, progress, retry
- [ ] Conditional field logic (domestic vs. international beneficiary)

**Teaches:** cache invalidation, optimistic UI, conditional form schemas.

**Definition of Done:** a failed mutation restores the previous list exactly;
the form schema changes shape with the beneficiary type rather than hiding fields.

---

## Phase 5 — Hardening (do not skip)

- [ ] Vitest unit + component tests
- [ ] Playwright E2E: the transfer happy path and three distinct failure paths
- [ ] Keyboard navigation, labels, focus management, axe audit
- [ ] Global error boundary + structured error reporting
- [ ] Bundle analysis, lazy routes, a stated performance budget

**Teaches:** the part regulated teams actually care about.

**Definition of Done:** the three failure-path E2E tests exist and fail loudly if
error handling regresses; axe reports no violations on the transfer flow; the
performance budget is written down in this repo and currently met.

---

## Alongside: contribute to an open-source Vue project

Joining an in-progress codebase is a separate skill from building one, and the
project above does not teach it. Ship three small PRs to an active Vue repo
(VueUse, PrimeVue, FormKit, a Nuxt module) during Phases 2-5.

What it trains: reading before writing, matching conventions over preferences,
small reviewable PRs, writing the test that proves the fix, and git fluency
(`blame`, `bisect`, interactive rebase).

Track them in `docs/OSS-LOG.md`.

---

## Indicative pace

Evenings and weekends, with prior React experience:

| Weeks | Work |
| ----- | ---- |
| 1-2   | Phases 1-2 |
| 3-4   | Phases 3-4 + first OSS PR |
| 5-6   | Phase 5 + two more OSS PRs |
| 7+    | Rebuild the transfer flow in Nuxt (SSR, server routes) as a separate exercise |
