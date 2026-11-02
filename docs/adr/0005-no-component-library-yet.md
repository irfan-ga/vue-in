# 0005 — No component library yet

**Status:** Accepted

## Context

Tailwind handles styling. A component library (PrimeVue, Vuetify, Naive UI) would
also supply behaviour: focus traps, accessible dialogs, data tables.

The learning value of this project is concentrated in building form, modal and
focus behaviour by hand. A library that hides it removes exactly the part worth
practising.

## Decision

Build components in-house for now. Revisit for one specific case: the statement
table, where a mature `DataTable` (PrimeVue) covering server-side pagination,
sorting and virtual scroll is worth a week of effort.

## Consequences

- More code, and accessibility becomes the author's responsibility — which is the
  point, and is also a Phase 5 deliverable.
- Progress is slower on generic widgets than it would be with a library.
- Introducing a library later means reconciling its theme with the Tailwind tokens
  in `src/assets/main.css`. Adopting one for the data table only, rather than
  wholesale, keeps that cost contained.
