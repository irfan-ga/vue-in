# 0003 — Money as integer paise

**Status:** Accepted

## Context

Binary floating point cannot represent `0.1`. `0.1 + 0.2 !== 0.3`. Accumulated
over a statement, rounding drift produces balances that do not reconcile — the
single most embarrassing class of bug in financial software.

Indian currency formatting is also not the default: digits group as
`₹1,23,456.78` (lakh/crore), not `₹123,456.78`.

## Decision

- Currency is stored, transported and computed as an **integer number of paise**.
- Conversion to a display string happens only at the presentation edge, in
  `lib/money.ts`, using `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- Parsing user input converts to paise immediately, at the boundary.

## Consequences

- Arithmetic is exact and reconciles.
- Every currency value needs an explicit conversion at the edge; a raw paise
  integer rendered by accident is visibly wrong (100× too large), which is a
  far better failure mode than silent drift.
- A unit test asserts the `en-IN` grouping, because it is easy to regress to the
  default locale without anyone noticing.
- If multi-currency is ever needed, the minor unit is no longer always 2 decimal
  places, and the money type would need to carry its currency.
