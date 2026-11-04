# stores/

Global **client** state: things the user has done or chosen, not things the
server knows. Session and theme, a draft that must survive navigation, an
open/closed panel.

Server data belongs to Pinia Colada, never to a store (rule 3). A store that
holds a list of accounts is a cache with no invalidation strategy, and it will
disagree with the server exactly when it matters.

Feature-local state that only one feature reads lives in
`features/<name>/stores/` instead.
