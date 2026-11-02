# composables/

Shared composables, usable from more than one feature — focus trapping, idle
detection, pagination state, media queries.

Feature-specific behaviour (queries, mutations, state machines) belongs in
`features/<name>/composables/`. Check `@vueuse/core` before writing a new one.
