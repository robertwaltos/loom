/**
 * @loom/archive — Document storage, state persistence.
 *
 * Currently provides: The Remembrance (append-only hash chain).
 * Future: Foundation Archive sync, full-text search, state snapshots.
 */

export { createRemembrance } from './remembrance.js';
export type {
  Remembrance,
  RemembranceEntry,
  RemembranceCategory,
  RecordParams,
  RemembranceFilter,
  ChainVerification,
} from './remembrance.js';
export { computeEntryHash } from './remembrance-hasher.js';
export type { HashInput } from './remembrance-hasher.js';
export { RemembranceError } from './remembrance-errors.js';
export type { RemembranceErrorCode } from './remembrance-errors.js';
export { entryNotFound, chainIntegrityViolated, archiveSealed } from './remembrance-errors.js';
