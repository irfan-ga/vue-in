# 0006 — Architecture boundaries as lint rules

**Status:** Accepted

## Context

Rule 11 (features never import each other) was enforced with oxlint's
`no-restricted-imports`, matching the patterns `@/features/*` and
`@/features/*/**`.

It did not work. `no-restricted-imports` matches the import **string**, and these
three lines mean the same thing while looking nothing alike:

```ts
import { thing } from '@/features/beta/thing'      // caught
import { thing } from '../beta/thing'              // passed silently
import { thing } from '../../features/beta/thing'  // passed silently
```

Worse than a missing check: a developer or an agent that hits the error on the
first form can "fix" it by switching to the second. The rule taught the
workaround.

It cannot be repaired by adding patterns, because from
`src/features/alpha/api/x.ts` the legitimate `../components/Thing` and the
violating `../beta/thing` are the same shape. Telling them apart requires
resolving the import to a file and asking which element that file belongs to.

## Decision

Enforce the architecture with `eslint-plugin-boundaries`, configured in
`eslint.config.ts`:

- `boundaries/elements` classifies every file into a layer. Features are matched
  per-feature (`src/features/*` with `capture: ['name']`) because rule 11 needs to
  compare one feature against another. Each shared layer is a single element.
- `boundaries/dependencies` with `default: 'disallow'` declares the permitted
  dependency matrix — the layer diagram in `docs/ARCHITECTURE.md`, executable.
- A feature may import its own internals via
  `captured: { name: '{{from.captured.name}}' }`, and nothing from a sibling.

`eslint-import-resolver-typescript` supplies the resolution, reading the `@/*`
mapping from `tsconfig.app.json`.

`src/main.ts` and `src/App.vue` are deliberately left unclassified, so the
bootstrap may wire everything together.

The oxlint `no-restricted-imports` pattern for cross-feature imports was removed.
Two mechanisms for one rule is how the two drift apart; boundaries owns rule 11
alone now. The oxlint barrel-path restrictions stay, since they cover rule 12.

## Consequences

- Rules 10, 11 and 13 are enforced regardless of how an import is spelled, in
  `.ts` and `.vue` alike. Verified against all three forms above, plus
  `component → store` and `lib → feature`, with intra-feature and `feature → lib`
  imports confirmed still passing.
- Two new dev dependencies, and a resolver that must keep working. If the `@/*`
  mapping moves out of `tsconfig.app.json`, the resolver config needs updating or
  boundaries silently reads aliases as npm packages again — which is exactly the
  failure that hid the original hole. **A boundaries config that resolves nothing
  reports nothing**, so changes here want a deliberate violation to prove the
  check is still live.
- The dependency matrix is now a thing to maintain. A new layer means a new
  element and an explicit policy, which is the intended friction: adding a layer
  should require saying what may depend on it.
- Not solved by this: rule 12's barrel-file detection. `boundaries/entry-point`
  restricts *which* file of an element may be imported, which is the opposite
  concern — it cannot see that an `index.ts` exists only to re-export. The check
  in `scripts/check-rules.mjs` stays.
