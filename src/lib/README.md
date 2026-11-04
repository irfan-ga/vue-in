# lib/

Framework-agnostic utilities. No Vue imports, no feature imports — dependencies
point inward only, which also makes everything here trivially unit-testable.

Built:

| Module     | Responsibility                                                                    |
| ---------- | --------------------------------------------------------------------------------- |
| `money.ts` | the `Paise` branded integer, lakh/crore formatting, parsing typed rupees to paise |

Planned:

| Module           | Responsibility                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `http.ts`        | fetch wrapper: base URL, auth header, error normalisation, timeouts                         |
| `idempotency.ts` | generating and persisting idempotency keys per user intent                                  |
| `format.ts`      | dates, account-number masking, IFSC display                                                 |
| `config.ts`      | the **only** module that reads `import.meta.env`; exports typed, validated values (rule 15) |
| `logger.ts`      | the only sanctioned alternative to `console.*` (rule 23)                                    |

See `docs/adr/0003-money-as-integer-paise.md` — currency is an integer number of
paise everywhere, formatted only at the display edge. `money.ts` makes that a
type rather than a convention: `Paise` is a branded number, so an unchecked
`number` will not compile where money is expected, and the only ways in are
`toPaise` (a checked integer, for data already validated at an API boundary) and
`parseRupees` (text a user typed).

There is deliberately no rupee-float entry point. Rupees arrive as text and leave
as text; the float never exists.
