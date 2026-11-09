# lib/

Framework-agnostic utilities. No Vue imports, no feature imports — dependencies
point inward only, which also makes everything here trivially unit-testable.

Built:

| Module     | Responsibility                                                                    |
| ---------- | --------------------------------------------------------------------------------- |
| `money.ts` | the `Paise` branded integer, lakh/crore formatting, parsing typed rupees to paise |

Planned:

| Module      | Responsibility                                           |
| ----------- | -------------------------------------------------------- |
| `logger.ts` | the only sanctioned alternative to `console.*` (rule 23) |

See `docs/adr/0003-money-as-integer-paise.md` — currency is an integer number of
paise everywhere, formatted only at the display edge. `money.ts` makes that a
type rather than a convention: `Paise` is a branded number, so an unchecked
`number` will not compile where money is expected, and the only ways in are
`toPaise` (a checked integer, for data already validated at an API boundary) and
`parseRupees` (text a user typed).

There is deliberately no rupee-float entry point. Rupees arrive as text and leave
as text; the float never exists.

**When the compiler rejects money, the fallback is usually the bug.**
`formatPaise(accounts[0]?.balance ?? 0)` does not compile, and the fix is neither
a zero constant nor a cast — it is deciding what should happen when there is no
account, which is the question the `?? 0` was hiding. A balance of zero and "no
such account" are different facts, and `₹0.00` is the wrong way to say the
second. `as Paise` appears once in this repository, inside `toPaise`; anywhere
else it silently removes the only guarantee the type carries.
