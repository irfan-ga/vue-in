# lib/

Framework-agnostic utilities. No Vue imports, no feature imports — dependencies
point inward only, which also makes everything here trivially unit-testable.

Planned:

| Module           | Responsibility                                                                        |
| ---------------- | ------------------------------------------------------------------------------------- |
| `money.ts`       | integer-paise arithmetic, `Intl.NumberFormat('en-IN')` formatting, parsing user input |
| `http.ts`        | fetch wrapper: base URL, auth header, error normalisation, timeouts                   |
| `idempotency.ts` | generating and persisting idempotency keys per user intent                            |
| `format.ts`      | dates, account-number masking, IFSC display                                           |

`money.ts` is the first thing to build in Phase 1. See
`docs/adr/0003-money-as-integer-paise.md` — currency is an integer number of
paise everywhere, formatted only at the display edge.
