# 0007 — Tooling deliberately deferred

**Status:** Accepted

## Context

A standard industry toolchain also includes pre-commit hooks, dead-code
detection, error monitoring and performance budgets. All were considered before
starting Phase 1 and none were adopted.

The repository is empty of features. Most of these tools measure or protect
something that does not exist yet, and a check that reports nothing useful teaches
people to ignore it — or worse, to suppress it, which is how rule 22 erodes.

## Decision

Defer each, with a stated trigger rather than "later":

| Tool | Deferred because | Adopt when |
| ---- | ---------------- | ---------- |
| `husky` + `lint-staged` | `pnpm verify` takes 8.9s, so there is nothing for touched-files-only checking to save. Solo contributor, so no shared hook discipline to enforce. | `verify` passes ~30s, a second contributor joins, or a new rule is introduced that existing code violates and needs ratcheting in on touched files |
| `knip` | Five dependencies have zero imports today (`vee-validate`, `@vee-validate/zod`, `zod`, `@vueuse/core`, `@axe-core/playwright`), all pre-installed for later phases. knip would flag every one, and suppressing them is worse than not running it | Phase 5, or the first time a feature is deleted or renamed |
| `@sentry/vue` | No deployment, no users, and no backend. Nothing to observe | First deploy with real users; it fills Phase 5's "structured error reporting" |
| `@lhci/cli` | A performance budget needs a page worth measuring | Phase 5, against a real statement table and transfer flow |
| `eslint-plugin-vuejs-accessibility` | No components to lint. oxlint has no Vue a11y rules, so this is the eventual answer, not a maybe | Phase 1's first forms, at the latest Phase 5's a11y pass |
| axe in Playwright | `@axe-core/playwright` is **already installed and unused** — no dependency needed, only a test | End of Phase 1, once there is a screen to audit |

## Not deferred — structurally inapplicable

Monorepo dependency tooling (`syncpack`, `manypkg`, and the rest of that family)
exists to reconcile many `package.json` files. This repository has one, and no
`pnpm-workspace.yaml`. There is nothing for them to compare.

The single-package equivalents are already in place: `packageManager` and
`engines` pin the toolchain, and `pnpm dedupe --check` reports duplicate
resolutions in the lockfile.

Note that `syncpack lint-semver-ranges` *would* flag this project's mixed ranges
(35 `^`, 4 `~`, 1 exact) — and would be wrong to. The mix is deliberate: `~` on
`oxlint` and `eslint-plugin-oxlint`, which must stay version-matched, and on
`eslint-plugin-vue` and `typescript`, whose minors break; exact on `prettier`,
because any change there reformats the codebase and floods every diff.

**Adopt when** the repository actually gains a second package — the most likely
route being the Week 7+ Nuxt rebuild in `docs/ROADMAP.md`, if that lands here as a
workspace rather than its own repository. At that point `manypkg` for structure
and `syncpack` for version alignment both become worth having.

## Consequences

- Phase 1 starts now rather than after another round of tooling.
- Each row has a trigger, so the question does not need re-deciding from scratch.
  If a trigger fires and the tool is still absent, that is a gap, not a choice.
- The risk is that triggers go unnoticed — nothing watches them. The `verify`
  timing one in particular is easy to miss as the suite grows, so it is worth
  re-reading this table at each phase boundary.
