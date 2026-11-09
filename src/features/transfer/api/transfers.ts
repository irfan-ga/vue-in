import { getJson, postJson, type RequestContext } from '@/lib/http'

import { transferSchema, type Transfer, type TransferRequest } from '../schemas/transfer'
import { ENDPOINTS } from './endpoints'

/**
 * Asks the bank to move money.
 *
 * The idempotency key is a required argument rather than something generated
 * in here on the way past: a key minted per request would be a new one on every
 * retry, which is the exact failure the key exists to prevent (rule 4). The
 * caller holds it for as long as the attempt lives.
 *
 * Resolves with the transfer the bank accepted — which may be the one it
 * accepted a moment ago, replayed, if this is a retry.
 */
export async function startTransfer(
  request: TransferRequest,
  idempotencyKey: string,
  context: RequestContext = {},
): Promise<Transfer> {
  return postJson(ENDPOINTS.transfers, transferSchema, request, { ...context, idempotencyKey })
}

/** The current state of a transfer. Reading is how a pending one is followed. */
export async function fetchTransfer(
  transferId: string,
  context: RequestContext = {},
): Promise<Transfer> {
  return getJson(ENDPOINTS.transfer(transferId), transferSchema, context)
}
