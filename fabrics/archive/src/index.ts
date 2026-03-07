/**
 * @loom/archive — Document storage, state persistence.
 *
 * Chronicle: Append-only SHA-256 hash chain.
 * Chronicle Search: Full-text inverted index over Chronicle entries.
 * State Snapshots: Point-in-time world state capture.
 * Future: Foundation Archive sync.
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
export { createChronicleSearchIndex } from './chronicle-search.js';
export type {
  ChronicleSearchIndex,
  SearchResult,
  SearchQuery,
  SearchMode,
  IndexEntry,
  SearchStats,
} from './chronicle-search.js';
