# features/

The bulk of the app. One folder per feature, each self-contained:

```
features/<name>/
├── api/           one function per endpoint; returns zod-parsed data
├── components/    components and views for this feature
├── composables/   queries, mutations, state machines, form logic
├── schemas/       zod schemas — the source of both validation and types
├── stores/        feature-local client state (only if genuinely needed)
├── types/         types not inferred from a schema
└── __tests__/     unit and component tests
```

Planned features, in roadmap order: `accounts`, `transfer`, `auth`,
`beneficiaries`.

Rules: a feature never imports another feature's internals, and a component never
calls `fetch` — it calls a composable. See `docs/ARCHITECTURE.md`.
