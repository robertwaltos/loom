/**
 * @loom/archive — Document storage, state persistence.
 *
 * Chronicle: Append-only SHA-256 hash chain.
 * Chronicle Search: Full-text inverted index over Chronicle entries.
 * State Snapshots: Point-in-time world state capture.
 * Data Export: Structured export bundles for analytics pipelines.
 * State Recovery: Coordinated point-in-time recovery from snapshots.
 * Document Store: Key-value document storage with versioning.
 * Notification Channel: Pub/sub event notification dispatch with topic filtering.
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
export { createDataExporter } from './data-export.js';
export type {
  DataExporter,
  DataExportDeps,
  ExportBundle,
  ExportEntry,
  ExportSource,
  ExportFormat,
  ExportFilter,
  ExportMetadata,
  ExportStats,
  ChronicleExportPort,
  ChroniclePortEntry,
  ChroniclePortFilter,
  SnapshotExportPort,
  SnapshotPortEntry,
  SnapshotPortFilter,
} from './data-export.js';
export { createStateRecoveryService } from './state-recovery.js';
export type {
  StateRecoveryService,
  StateRecoveryDeps,
  RecoveryResult,
  RecoveryStatus,
  RecoveryRequest,
  RecoveryCandidate,
  RecoveryStats,
  RecoverySnapshotPort,
  RecoveryHasherPort,
  RecoveryApplyPort,
  RecoveryIdGenerator,
} from './state-recovery.js';
export { createDocumentStore } from './document-store.js';
export type {
  DocumentStore,
  DocumentStoreDeps,
  Document,
  PutDocumentParams,
  DocumentFilter,
  DocumentStats,
} from './document-store.js';
export { createNotificationChannel } from './notification-channel.js';
export type {
  NotificationChannel,
  NotificationChannelDeps,
  Notification,
  Subscriber,
  SubscribeParams,
  NotificationCallback,
  PublishParams,
  PublishResult,
  NotificationStats,
} from './notification-channel.js';
