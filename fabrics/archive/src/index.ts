/**
 * @loom/archive — Document storage, state persistence.
 *
 * Currently provides: The Chronicle (append-only hash chain).
 * Future: Foundation Archive sync, full-text search, state snapshots.
 */

export { createChronicle } from './chronicle.js';
export type {
  Chronicle,
  ChronicleEntry,
  ChronicleCategory,
  RecordParams,
  ChronicleFilter,
  ChainVerification,
} from './chronicle.js';
export { computeEntryHash } from './chronicle-hasher.js';
export type { HashInput } from './chronicle-hasher.js';
export { ChronicleError } from './chronicle-errors.js';
export type { ChronicleErrorCode } from './chronicle-errors.js';
export { entryNotFound, chainIntegrityViolated, archiveSealed } from './chronicle-errors.js';
