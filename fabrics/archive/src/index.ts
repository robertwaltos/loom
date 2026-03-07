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
export { calculateChronicleDepth, DEFAULT_DEPTH_CONFIG } from './depth-scoring.js';
export type { DepthScoringConfig, DepthScore } from './depth-scoring.js';
export { createStateSnapshotEngine } from './state-snapshot.js';
export type {
  StateSnapshotEngine,
  StateSnapshotDeps,
  StateSnapshot,
  CaptureParams,
  SnapshotFilter,
  SnapshotRestoreResult,
  SnapshotHasher,
  SnapshotIdGenerator,
} from './state-snapshot.js';
