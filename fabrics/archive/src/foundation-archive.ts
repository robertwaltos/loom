/**
 * Foundation Archive — Long-term state persistence and world
 * snapshot service for the Loom.
 *
 * Provides:
 *   - Full world state snapshots at configurable intervals
 *   - Incremental state diffs between snapshots
 *   - Point-in-time recovery ("time travel" for debugging)
 *   - Chronicle entries (permanent narrative record)
 *   - Dynasty legacy archival (for ended/extinct dynasties)
 *
 * Thread: steel/archive/foundation
 * Tier: 1
 */

// ─── Snapshot Types ─────────────────────────────────────────────

export interface WorldSnapshot {
  readonly snapshotId: string;
  readonly worldId: string;
  readonly createdAtUs: bigint;
  readonly version: number;
  readonly entityCount: number;
  readonly dynastyCount: number;
  readonly totalKalon: bigint;
  readonly checksum: string;
  readonly sizeBytes: number;
  readonly compressed: boolean;
}

export interface SnapshotDiff {
  readonly fromSnapshotId: string;
  readonly toSnapshotId: string;
  readonly worldId: string;
  readonly entitiesAdded: number;
  readonly entitiesRemoved: number;
  readonly entitiesModified: number;
  readonly kalonDelta: bigint;
  readonly sizeBytes: number;
}

// ─── Chronicle Types ────────────────────────────────────────────

export type ChronicleCategory =
  | 'founding'
  | 'conquest'
  | 'discovery'
  | 'trade'
  | 'diplomacy'
  | 'catastrophe'
  | 'achievement'
  | 'succession'
  | 'extinction';

export interface ChronicleEntry {
  readonly entryId: string;
  readonly worldId: string;
  readonly dynastyId?: string;
  readonly category: ChronicleCategory;
  readonly title: string;
  readonly narrative: string;
  readonly participants: ReadonlyArray<string>;
  readonly timestampUs: bigint;
  readonly worldAge: number; // in-game years
  readonly metadata: Record<string, unknown>;
}

// ─── Legacy Archive ─────────────────────────────────────────────

export interface DynastyLegacy {
  readonly dynastyId: string;
  readonly dynastyName: string;
  readonly foundedAtUs: bigint;
  readonly endedAtUs: bigint;
  readonly endReason: 'extinction' | 'merger' | 'voluntary' | 'conquest';
  readonly peakPopulation: number;
  readonly totalKalonEarned: bigint;
  readonly worldsInhabited: ReadonlyArray<string>;
  readonly chronicleEntries: number;
  readonly achievements: ReadonlyArray<string>;
  readonly finalSnapshot: string; // snapshotId at time of end
}

// ─── Ports ──────────────────────────────────────────────────────

export interface ArchiveClockPort {
  readonly nowMicroseconds: () => bigint;
}

export interface ArchiveIdPort {
  readonly next: () => string;
}

export interface ArchiveStoragePort {
  readonly writeSnapshot: (id: string, data: Uint8Array) => Promise<void>;
  readonly readSnapshot: (id: string) => Promise<Uint8Array | undefined>;
  readonly writeDiff: (fromId: string, toId: string, data: Uint8Array) => Promise<void>;
  readonly readDiff: (fromId: string, toId: string) => Promise<Uint8Array | undefined>;
  readonly writeChronicle: (entry: ChronicleEntry) => Promise<void>;
  readonly queryChronicles: (worldId: string, limit: number) => Promise<ReadonlyArray<ChronicleEntry>>;
  readonly writeLegacy: (legacy: DynastyLegacy) => Promise<void>;
  readonly readLegacy: (dynastyId: string) => Promise<DynastyLegacy | undefined>;
}

// ─── Configuration ──────────────────────────────────────────────

export interface ArchiveConfig {
  readonly snapshotIntervalUs: bigint;
  readonly maxSnapshotsPerWorld: number;
  readonly enableCompression: boolean;
  readonly diffRetentionDays: number;
  readonly chronicleMaxPerWorld: number;
}

export const DEFAULT_ARCHIVE_CONFIG: ArchiveConfig = {
  snapshotIntervalUs: 3_600_000_000n, // 1 hour
  maxSnapshotsPerWorld: 168,           // 7 days of hourly snapshots
  enableCompression: true,
  diffRetentionDays: 30,
  chronicleMaxPerWorld: 10_000,
};

// ─── Foundation Archive Service ─────────────────────────────────

export interface FoundationArchive {
  // Snapshots
  readonly createSnapshot: (worldId: string, stateData: Uint8Array, entityCount: number, dynastyCount: number, totalKalon: bigint) => Promise<WorldSnapshot>;
  readonly getSnapshot: (snapshotId: string) => Promise<{ snapshot: WorldSnapshot; data: Uint8Array } | undefined>;
  readonly listSnapshots: (worldId: string) => Promise<ReadonlyArray<WorldSnapshot>>;

  // Diffs
  readonly createDiff: (fromSnapshotId: string, toSnapshotId: string, diffData: Uint8Array) => Promise<SnapshotDiff>;

  // Chronicles
  readonly recordChronicle: (params: Omit<ChronicleEntry, 'entryId' | 'timestampUs'>) => Promise<ChronicleEntry>;
  readonly getWorldChronicles: (worldId: string, limit?: number) => Promise<ReadonlyArray<ChronicleEntry>>;

  // Legacy
  readonly archiveDynasty: (legacy: Omit<DynastyLegacy, 'endedAtUs'>) => Promise<DynastyLegacy>;
  readonly getDynastyLegacy: (dynastyId: string) => Promise<DynastyLegacy | undefined>;

  // Stats
  readonly getStats: () => ArchiveStats;
}

export interface ArchiveStats {
  readonly totalSnapshots: number;
  readonly totalChronicleEntries: number;
  readonly totalLegacies: number;
  readonly storageSizeBytes: number;
}

// ─── Factory ────────────────────────────────────────────────────

export interface FoundationArchiveDeps {
  readonly clock: ArchiveClockPort;
  readonly idGenerator: ArchiveIdPort;
  readonly storage: ArchiveStoragePort;
  readonly config?: ArchiveConfig;
}

export function createFoundationArchive(deps: FoundationArchiveDeps): FoundationArchive {
  const config = deps.config ?? DEFAULT_ARCHIVE_CONFIG;
  const snapshots = new Map<string, WorldSnapshot>();
  const snapshotsByWorld = new Map<string, string[]>();
  let totalChronicles = 0;
  let totalLegacies = 0;
  let totalStorageBytes = 0;

  function computeChecksum(data: Uint8Array): string {
    // Simple FNV-1a hash as checksum
    let hash = 2166136261;
    for (let i = 0; i < data.length; i++) {
      hash ^= data[i] as number;
      hash = (hash * 16777619) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  return {
    async createSnapshot(worldId, stateData, entityCount, dynastyCount, totalKalon) {
      const snapshotId = deps.idGenerator.next();
      const now = deps.clock.nowMicroseconds();

      const snapshot: WorldSnapshot = {
        snapshotId,
        worldId,
        createdAtUs: now,
        version: (snapshotsByWorld.get(worldId)?.length ?? 0) + 1,
        entityCount,
        dynastyCount,
        totalKalon,
        checksum: computeChecksum(stateData),
        sizeBytes: stateData.length,
        compressed: config.enableCompression,
      };

      await deps.storage.writeSnapshot(snapshotId, stateData);
      snapshots.set(snapshotId, snapshot);
      totalStorageBytes += stateData.length;

      // Track per-world snapshots
      const worldSnapshots = snapshotsByWorld.get(worldId) ?? [];
      worldSnapshots.push(snapshotId);

      // Enforce max snapshots
      while (worldSnapshots.length > config.maxSnapshotsPerWorld) {
        const oldest = worldSnapshots.shift();
        if (oldest !== undefined) {
          snapshots.delete(oldest);
        }
      }
      snapshotsByWorld.set(worldId, worldSnapshots);

      return snapshot;
    },

    async getSnapshot(snapshotId) {
      const snapshot = snapshots.get(snapshotId);
      if (snapshot === undefined) return undefined;
      const data = await deps.storage.readSnapshot(snapshotId);
      if (data === undefined) return undefined;
      return { snapshot, data };
    },

    listSnapshots(worldId) {
      const ids = snapshotsByWorld.get(worldId) ?? [];
      const result = ids
        .map(id => snapshots.get(id))
        .filter((s): s is WorldSnapshot => s !== undefined);
      return Promise.resolve(result);
    },

    async createDiff(fromSnapshotId, toSnapshotId, diffData) {
      await deps.storage.writeDiff(fromSnapshotId, toSnapshotId, diffData);
      totalStorageBytes += diffData.length;

      const fromSnapshot = snapshots.get(fromSnapshotId);
      const toSnapshot = snapshots.get(toSnapshotId);

      return {
        fromSnapshotId,
        toSnapshotId,
        worldId: toSnapshot?.worldId ?? fromSnapshot?.worldId ?? '',
        entitiesAdded: (toSnapshot?.entityCount ?? 0) - (fromSnapshot?.entityCount ?? 0),
        entitiesRemoved: 0,
        entitiesModified: 0,
        kalonDelta: (toSnapshot?.totalKalon ?? 0n) - (fromSnapshot?.totalKalon ?? 0n),
        sizeBytes: diffData.length,
      };
    },

    async recordChronicle(params) {
      const entry: ChronicleEntry = {
        ...params,
        entryId: deps.idGenerator.next(),
        timestampUs: deps.clock.nowMicroseconds(),
      };
      await deps.storage.writeChronicle(entry);
      totalChronicles++;
      return entry;
    },

    async getWorldChronicles(worldId, limit) {
      return deps.storage.queryChronicles(worldId, limit ?? 100);
    },

    async archiveDynasty(legacy) {
      const full: DynastyLegacy = {
        ...legacy,
        endedAtUs: deps.clock.nowMicroseconds(),
      };
      await deps.storage.writeLegacy(full);
      totalLegacies++;
      return full;
    },

    async getDynastyLegacy(dynastyId) {
      return deps.storage.readLegacy(dynastyId);
    },

    getStats() {
      return {
        totalSnapshots: snapshots.size,
        totalChronicleEntries: totalChronicles,
        totalLegacies,
        storageSizeBytes: totalStorageBytes,
      };
    },
  };
}
