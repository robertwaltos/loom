/**
 * Foundation Archive — Simulation Tests
 *
 * Tests the 4-layer archival system: world snapshots, incremental diffs,
 * permanent chronicles, and dynasty legacies.
 *
 * Phase 9.20 — World State Persistence
 * Thread: test/archive/foundation-archive
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import {
  createFoundationArchive,
  type ArchiveStoragePort,
  type ChronicleEntry,
  type DynastyLegacy,
  type ArchiveConfig,
} from '../foundation-archive.js';

// ─── Fake Ports ─────────────────────────────────────────────────

function createFakeClock(startUs = 1_000_000n) {
  let now = startUs;
  return {
    nowMicroseconds: () => {
      const val = now;
      now += 1_000_000n; // +1 second per call
      return val;
    },
    advance: (us: bigint) => { now += us; },
  };
}

function createFakeIds(prefix = 'id') {
  let counter = 0;
  return {
    next: () => `${prefix}-${++counter}`,
  };
}

function createInMemoryStorage(): ArchiveStoragePort {
  const snapshotStore = new Map<string, Uint8Array>();
  const diffStore = new Map<string, Uint8Array>();
  const chronicles: ChronicleEntry[] = [];
  const legacies = new Map<string, DynastyLegacy>();

  return {
    writeSnapshot: async (id, data) => { snapshotStore.set(id, data); },
    readSnapshot: async (id) => snapshotStore.get(id),
    writeDiff: async (fromId, toId, data) => { diffStore.set(`${fromId}→${toId}`, data); },
    readDiff: async (fromId, toId) => diffStore.get(`${fromId}→${toId}`),
    writeChronicle: async (entry) => { chronicles.push(entry); },
    queryChronicles: async (worldId, limit) =>
      chronicles.filter(e => e.worldId === worldId).slice(0, limit),
    writeLegacy: async (legacy) => { legacies.set(legacy.dynastyId, legacy); },
    readLegacy: async (dynastyId) => legacies.get(dynastyId),
  };
}

function makeStateData(content: string): Uint8Array {
  return new TextEncoder().encode(content);
}

// ─── Tests ──────────────────────────────────────────────────────

describe('FoundationArchive', () => {
  function setup(configOverrides?: Partial<ArchiveConfig>) {
    const clock = createFakeClock();
    const ids = createFakeIds();
    const storage = createInMemoryStorage();
    const config: ArchiveConfig = {
      snapshotIntervalUs: 3_600_000_000n,
      maxSnapshotsPerWorld: 168,
      enableCompression: true,
      diffRetentionDays: 30,
      chronicleMaxPerWorld: 10_000,
      ...configOverrides,
    };
    const archive = createFoundationArchive({ clock, idGenerator: ids, storage, config });
    return { archive, clock, ids, storage };
  }

  // ─── Snapshots ──────────────────────────────────────────────

  describe('snapshots', () => {
    it('creates a snapshot with correct metadata', async () => {
      const { archive } = setup();
      const data = makeStateData('world-state-v1');

      const snap = await archive.createSnapshot('world-1', data, 42, 3, 5_000_000_000n);

      expect(snap.snapshotId).toBe('id-1');
      expect(snap.worldId).toBe('world-1');
      expect(snap.version).toBe(1);
      expect(snap.entityCount).toBe(42);
      expect(snap.dynastyCount).toBe(3);
      expect(snap.totalKalon).toBe(5_000_000_000n);
      expect(snap.sizeBytes).toBe(data.length);
      expect(snap.compressed).toBe(true);
      expect(snap.checksum).toMatch(/^[0-9a-f]{8}$/);
    });

    it('increments version for same world', async () => {
      const { archive } = setup();

      const s1 = await archive.createSnapshot('world-1', makeStateData('v1'), 10, 1, 100n);
      const s2 = await archive.createSnapshot('world-1', makeStateData('v2'), 15, 2, 200n);

      expect(s1.version).toBe(1);
      expect(s2.version).toBe(2);
    });

    it('retrieves stored snapshot with data', async () => {
      const { archive } = setup();
      const data = makeStateData('recoverable-state');

      const snap = await archive.createSnapshot('world-1', data, 5, 1, 100n);
      const result = await archive.getSnapshot(snap.snapshotId);

      expect(result).toBeDefined();
      expect(result!.snapshot.snapshotId).toBe(snap.snapshotId);
      expect(new TextDecoder().decode(result!.data)).toBe('recoverable-state');
    });

    it('returns undefined for unknown snapshot', async () => {
      const { archive } = setup();
      const result = await archive.getSnapshot('nonexistent');
      expect(result).toBeUndefined();
    });

    it('lists snapshots for a world', async () => {
      const { archive } = setup();
      await archive.createSnapshot('world-1', makeStateData('a'), 1, 0, 0n);
      await archive.createSnapshot('world-1', makeStateData('b'), 2, 0, 0n);
      await archive.createSnapshot('world-2', makeStateData('c'), 3, 0, 0n);

      const w1Snaps = await archive.listSnapshots('world-1');
      const w2Snaps = await archive.listSnapshots('world-2');
      const w3Snaps = await archive.listSnapshots('world-3');

      expect(w1Snaps).toHaveLength(2);
      expect(w2Snaps).toHaveLength(1);
      expect(w3Snaps).toHaveLength(0);
    });

    it('computes deterministic FNV-1a checksum', async () => {
      const { archive } = setup();
      const data = makeStateData('deterministic');

      const s1 = await archive.createSnapshot('world-1', data, 1, 0, 0n);
      const s2 = await archive.createSnapshot('world-1', data, 1, 0, 0n);

      expect(s1.checksum).toBe(s2.checksum);
    });

    it('produces different checksums for different data', async () => {
      const { archive } = setup();

      const s1 = await archive.createSnapshot('world-1', makeStateData('alpha'), 1, 0, 0n);
      const s2 = await archive.createSnapshot('world-1', makeStateData('beta'), 1, 0, 0n);

      expect(s1.checksum).not.toBe(s2.checksum);
    });

    it('enforces max snapshots per world via rotation', async () => {
      const { archive } = setup({ maxSnapshotsPerWorld: 3 });

      const s1 = await archive.createSnapshot('world-1', makeStateData('1'), 1, 0, 0n);
      await archive.createSnapshot('world-1', makeStateData('2'), 2, 0, 0n);
      await archive.createSnapshot('world-1', makeStateData('3'), 3, 0, 0n);
      await archive.createSnapshot('world-1', makeStateData('4'), 4, 0, 0n);

      const list = await archive.listSnapshots('world-1');
      expect(list).toHaveLength(3);
      // Oldest snapshot should have been evicted
      const evicted = await archive.getSnapshot(s1.snapshotId);
      expect(evicted).toBeUndefined();
    });
  });

  // ─── Diffs ──────────────────────────────────────────────────

  describe('diffs', () => {
    it('creates diff between two snapshots', async () => {
      const { archive } = setup();
      const s1 = await archive.createSnapshot('world-1', makeStateData('v1'), 10, 2, 1000n);
      const s2 = await archive.createSnapshot('world-1', makeStateData('v2'), 15, 3, 1500n);

      const diffData = makeStateData('diff-payload');
      const diff = await archive.createDiff(s1.snapshotId, s2.snapshotId, diffData);

      expect(diff.fromSnapshotId).toBe(s1.snapshotId);
      expect(diff.toSnapshotId).toBe(s2.snapshotId);
      expect(diff.worldId).toBe('world-1');
      expect(diff.entitiesAdded).toBe(5); // 15 - 10
      expect(diff.kalonDelta).toBe(500n); // 1500 - 1000
      expect(diff.sizeBytes).toBe(diffData.length);
    });

    it('handles diff when from-snapshot is unknown', async () => {
      const { archive } = setup();
      const s2 = await archive.createSnapshot('world-1', makeStateData('v2'), 8, 1, 500n);
      const diffData = makeStateData('orphan-diff');

      const diff = await archive.createDiff('unknown', s2.snapshotId, diffData);

      expect(diff.worldId).toBe('world-1');
      expect(diff.entitiesAdded).toBe(8); // 8 - 0
    });
  });

  // ─── Chronicles ─────────────────────────────────────────────

  describe('chronicles', () => {
    it('records a chronicle entry with generated id and timestamp', async () => {
      const { archive } = setup();

      const entry = await archive.recordChronicle({
        worldId: 'world-1',
        category: 'founding',
        title: 'The First Settlement',
        narrative: 'Settlers arrived at the eastern shore.',
        participants: ['dynasty-1', 'dynasty-2'],
        worldAge: 1,
        metadata: { region: 'east' },
      });

      expect(entry.entryId).toBe('id-1');
      expect(entry.worldId).toBe('world-1');
      expect(entry.category).toBe('founding');
      expect(entry.timestampUs).toBe(1_000_000n);
      expect(entry.participants).toEqual(['dynasty-1', 'dynasty-2']);
    });

    it('records dynasty-scoped chronicle entries', async () => {
      const { archive } = setup();

      const entry = await archive.recordChronicle({
        worldId: 'world-1',
        dynastyId: 'dynasty-99',
        category: 'achievement',
        title: 'First Million KALON',
        narrative: 'Dynasty Zenith accumulated 1,000,000 KALON.',
        participants: ['dynasty-99'],
        worldAge: 50,
        metadata: { milestone: true },
      });

      expect(entry.dynastyId).toBe('dynasty-99');
    });

    it('queries chronicles by world', async () => {
      const { archive } = setup();

      await archive.recordChronicle({
        worldId: 'world-1',
        category: 'conquest',
        title: 'Battle of the Plains',
        narrative: 'A fierce battle raged.',
        participants: [],
        worldAge: 10,
        metadata: {},
      });
      await archive.recordChronicle({
        worldId: 'world-2',
        category: 'trade',
        title: 'Great Trade Route',
        narrative: 'Trade flourished.',
        participants: [],
        worldAge: 20,
        metadata: {},
      });

      const w1 = await archive.getWorldChronicles('world-1');
      const w2 = await archive.getWorldChronicles('world-2');

      expect(w1).toHaveLength(1);
      expect(w1[0]!.title).toBe('Battle of the Plains');
      expect(w2).toHaveLength(1);
      expect(w2[0]!.title).toBe('Great Trade Route');
    });

    it('respects limit when querying chronicles', async () => {
      const { archive } = setup();

      for (let i = 0; i < 5; i++) {
        await archive.recordChronicle({
          worldId: 'world-1',
          category: 'discovery',
          title: `Discovery ${i}`,
          narrative: `Found thing ${i}.`,
          participants: [],
          worldAge: i,
          metadata: {},
        });
      }

      const limited = await archive.getWorldChronicles('world-1', 3);
      expect(limited).toHaveLength(3);
    });

    it('covers all chronicle categories', async () => {
      const { archive } = setup();
      const categories = [
        'founding', 'conquest', 'discovery', 'trade', 'diplomacy',
        'catastrophe', 'achievement', 'succession', 'extinction',
      ] as const;

      for (const cat of categories) {
        const entry = await archive.recordChronicle({
          worldId: 'world-1',
          category: cat,
          title: `Event: ${cat}`,
          narrative: `A ${cat} event occurred.`,
          participants: [],
          worldAge: 0,
          metadata: {},
        });
        expect(entry.category).toBe(cat);
      }

      const all = await archive.getWorldChronicles('world-1');
      expect(all).toHaveLength(9);
    });
  });

  // ─── Dynasty Legacy ─────────────────────────────────────────

  describe('dynasty legacy', () => {
    it('archives a dynasty with end timestamp', async () => {
      const { archive } = setup();

      const legacy = await archive.archiveDynasty({
        dynastyId: 'dyn-1',
        dynastyName: 'House Starfall',
        foundedAtUs: 500_000n,
        endReason: 'extinction',
        peakPopulation: 1200,
        totalKalonEarned: 50_000_000_000n,
        worldsInhabited: ['world-1', 'world-3'],
        chronicleEntries: 84,
        achievements: ['first-city', 'master-trader'],
        finalSnapshot: 'snap-42',
      });

      expect(legacy.dynastyId).toBe('dyn-1');
      expect(legacy.dynastyName).toBe('House Starfall');
      expect(legacy.endedAtUs).toBe(1_000_000n);
      expect(legacy.endReason).toBe('extinction');
      expect(legacy.peakPopulation).toBe(1200);
      expect(legacy.achievements).toEqual(['first-city', 'master-trader']);
    });

    it('retrieves archived dynasty legacy', async () => {
      const { archive } = setup();

      await archive.archiveDynasty({
        dynastyId: 'dyn-2',
        dynastyName: 'House Ironveil',
        foundedAtUs: 100_000n,
        endReason: 'merger',
        peakPopulation: 500,
        totalKalonEarned: 10_000_000_000n,
        worldsInhabited: ['world-2'],
        chronicleEntries: 30,
        achievements: ['peacemaker'],
        finalSnapshot: 'snap-99',
      });

      const result = await archive.getDynastyLegacy('dyn-2');
      expect(result).toBeDefined();
      expect(result!.dynastyName).toBe('House Ironveil');
      expect(result!.endReason).toBe('merger');
    });

    it('returns undefined for unknown dynasty', async () => {
      const { archive } = setup();
      const result = await archive.getDynastyLegacy('nonexistent');
      expect(result).toBeUndefined();
    });

    it('covers all end reasons', async () => {
      const { archive } = setup();
      const reasons = ['extinction', 'merger', 'voluntary', 'conquest'] as const;

      for (const reason of reasons) {
        const legacy = await archive.archiveDynasty({
          dynastyId: `dyn-${reason}`,
          dynastyName: `House ${reason}`,
          foundedAtUs: 0n,
          endReason: reason,
          peakPopulation: 1,
          totalKalonEarned: 0n,
          worldsInhabited: [],
          chronicleEntries: 0,
          achievements: [],
          finalSnapshot: 'snap-0',
        });
        expect(legacy.endReason).toBe(reason);
      }
    });
  });

  // ─── Stats ──────────────────────────────────────────────────

  describe('stats', () => {
    it('starts with zero stats', () => {
      const { archive } = setup();
      const stats = archive.getStats();

      expect(stats.totalSnapshots).toBe(0);
      expect(stats.totalChronicleEntries).toBe(0);
      expect(stats.totalLegacies).toBe(0);
      expect(stats.storageSizeBytes).toBe(0);
    });

    it('aggregates all operations', async () => {
      const { archive } = setup();

      // 2 snapshots
      const s1 = await archive.createSnapshot('w', makeStateData('aaa'), 1, 0, 0n);
      const s2 = await archive.createSnapshot('w', makeStateData('bbb'), 2, 0, 0n);
      // 1 diff
      await archive.createDiff(s1.snapshotId, s2.snapshotId, makeStateData('diff'));
      // 1 chronicle
      await archive.recordChronicle({
        worldId: 'w',
        category: 'founding',
        title: 'Start',
        narrative: 'Beginning.',
        participants: [],
        worldAge: 0,
        metadata: {},
      });
      // 1 legacy
      await archive.archiveDynasty({
        dynastyId: 'd1',
        dynastyName: 'House Test',
        foundedAtUs: 0n,
        endReason: 'voluntary',
        peakPopulation: 10,
        totalKalonEarned: 0n,
        worldsInhabited: [],
        chronicleEntries: 0,
        achievements: [],
        finalSnapshot: s2.snapshotId,
      });

      const stats = archive.getStats();
      expect(stats.totalSnapshots).toBe(2);
      expect(stats.totalChronicleEntries).toBe(1);
      expect(stats.totalLegacies).toBe(1);
      expect(stats.storageSizeBytes).toBeGreaterThan(0);
    });
  });

  // ─── Default Config ─────────────────────────────────────────

  describe('default config', () => {
    it('works without explicit config', async () => {
      const clock = createFakeClock();
      const ids = createFakeIds();
      const storage = createInMemoryStorage();
      const archive = createFoundationArchive({ clock, idGenerator: ids, storage });

      const snap = await archive.createSnapshot('w', makeStateData('test'), 1, 0, 0n);
      expect(snap.compressed).toBe(true); // default enableCompression=true
    });
  });
});
