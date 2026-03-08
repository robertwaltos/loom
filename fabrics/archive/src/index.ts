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
 * Archive Index: Metadata index with tag, category, and date-range queries.
 * Document Vault: Versioned document storage with full edit history.
 * Retention Policy: Data lifecycle and age-based cleanup rules.
 * Migration Engine: Schema and data version migration with rollback.
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
export { createArchiveIndex } from './archive-index.js';
export type {
  ArchiveIndex,
  ArchiveIndexDeps,
  IndexRecord,
  AddRecordParams,
  IndexQuery,
  IndexStats,
} from './archive-index.js';
export { createDocumentVault } from './document-vault.js';
export type {
  DocumentVault,
  DocumentVaultDeps,
  Document as VaultDocument,
  DocumentVersion,
  CreateDocumentParams as VaultCreateDocumentParams,
  VaultStats,
} from './document-vault.js';
export { createRetentionPolicyService } from './retention-policy.js';
export type {
  RetentionPolicyService,
  RetentionPolicyDeps,
  RetentionRule,
  CreateRetentionRuleParams,
  TrackedRecord,
  TrackRecordParams,
  RetentionSweepResult,
  RetentionStats,
} from './retention-policy.js';
export { createMigrationEngine } from './migration-engine.js';
export type {
  MigrationEngine,
  MigrationEngineDeps,
  MigrationDefinition,
  MigrationDirection,
  RegisterMigrationParams,
  MigrationRecord,
  MigrationResult,
  MigrationEngineStats,
} from './migration-engine.js';
export { createBackupScheduler } from './backup-scheduler.js';
export type {
  BackupScheduler,
  BackupSchedulerDeps,
  BackupJob,
  CreateJobParams as BackupCreateJobParams,
  BackupRun,
  BackupSchedulerStats,
} from './backup-scheduler.js';
export { createAuditLogService } from './audit-log.js';
export type {
  AuditLogService,
  AuditLogDeps,
  AuditEntry,
  AuditOutcome,
  RecordAuditParams,
  AuditQuery,
  AuditLogStats,
} from './audit-log.js';
export { createDataCompactor } from './data-compactor.js';
export type {
  DataCompactorService,
  DataCompactorDeps,
  CompactorSource,
  CompactorRegisterParams,
  CompactionRun,
  CompactionConfig,
  DataCompactorStats,
} from './data-compactor.js';
