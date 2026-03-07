/**
 * @loom/nakama-fabric — Identity, economy, matchmaking.
 *
 * Currently provides: KALON Ledger (BigInt economy engine).
 * Future: Nakama integration for identity, matchmaking, and presence.
 */

export { createKalonLedger } from './kalon-ledger.js';
export type { KalonLedger, AccountInfo, TransferResult } from './kalon-ledger.js';
export { calculateLevy } from './kalon-levy.js';
export {
  KALON_DECIMALS,
  MICRO_KALON_PER_KALON,
  TOTAL_SUPPLY_KALON,
  TOTAL_SUPPLY_MICRO,
  kalonToMicro,
  microToKalonString,
} from './kalon-constants.js';
export { KalonError } from './kalon-errors.js';
export type { KalonErrorCode } from './kalon-errors.js';
export {
  insufficientBalance,
  accountNotFound,
  accountAlreadyExists,
  invalidAmount,
  selfTransfer,
  supplyExceeded,
  wealthCapExceeded,
} from './kalon-errors.js';
