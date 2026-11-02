# Contributing

This repository is a learning project, but it is run like a team repository on
purpose: the habits are part of what is being practised.

## Workflow

```sh
git switch -c feat/transfer-otp-step
# work, in small commits
pnpm verify          # type-check + lint + unit tests
git push -u origin HEAD
```

Open a pull request against `main`, even when working alone. Reviewing your own
diff in the PR view catches things the editor hides.

## Branches

`<type>/<short-description>`, kebab-case:

- `feat/statement-date-filter`
- `fix/balance-rounding`
- `chore/ci-pnpm-cache`
- `docs/adr-idempotency`
- `test/transfer-failure-paths`

## Commits

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat(transfer): carry an idempotency key across retries
fix(statement): keep sort order when the page changes
test(money): assert en-IN lakh grouping
```

Scope is the feature or area. The body explains **why** — the diff already shows
what. Keep commits small enough to revert individually.

## Pull requests

A PR should answer three questions without the reviewer having to ask:

1. What problem does this solve?
2. Why this approach, and what was rejected?
3. How do I know it works?

Point 3 means a test, not a screenshot. For a bug fix, the test that fails before
the change and passes after is the single strongest thing a PR can contain.

Keep PRs small. A 200-line PR gets a real review; a 2000-line PR gets an approval.

## Before marking anything done

- [ ] `pnpm verify` passes
- [ ] A test covers the change, including a failure path if one exists
- [ ] Loading, empty and error states exist for anything async
- [ ] Inputs are labelled and the flow is keyboard reachable
- [ ] No float currency values; every query sets its own `staleTime`
- [ ] New or changed endpoints have MSW handlers, including a failure scenario

The non-negotiables are in [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md).

## Changing a decision

The stack and structure choices are recorded in [`docs/adr/`](docs/adr/). To
change one, add a new ADR that supersedes the old one and links back. Do not edit
an accepted ADR to say something different — the reasoning at the time is the
useful part.
