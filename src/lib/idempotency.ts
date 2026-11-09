/**
 * An idempotency key identifies a user's **intent**, not a request.
 *
 * Every retry of the same intent carries the same key, so a server that already
 * accepted it replays the original outcome instead of moving the money a second
 * time (rule 4). A fresh key means a fresh transfer — which is why this is not
 * called from inside the request path, where a retry would quietly mint a new
 * one and defeat the whole mechanism. It is called once, when the customer
 * commits to the transfer, and the key is held for as long as that attempt
 * lives.
 *
 * `crypto.randomUUID` needs a secure context: localhost and https, which is
 * everywhere this app runs.
 */
export function createIdempotencyKey(): string {
  return crypto.randomUUID()
}
