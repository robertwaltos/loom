/**
 * Kindler Repository Tests — in-memory mock validation
 */
import { describe, it, expect } from 'vitest';
import { createMockKindlerRepository } from '../repository.js';
import type { KindlerProfile, SparkLogEntry, KindlerProgress, KindlerSession } from '../types.js';

// ─── Test Fixtures ────────────────────────────────────────────────

const now = Date.now();

function makeProfile(id = 'k-001', parentId = 'parent-001'): KindlerProfile {
  return {
    id,
    parentAccountId: parentId,
    displayName: 'Ember',
    ageTier: 2,
    avatarId: 'avatar-flame',
    sparkLevel: 0.2,
    currentChapter: 'first_light',
    worldsVisited: [],
    worldsRestored: [],
    guidesMetCount: 0,
    createdAt: now,
  };
}

function makeSparkEntry(kindlerId: string): SparkLogEntry {
  return {
    id: 'spark-001',
    kindlerId,
    sparkLevel: 0.2,
    delta: 0.05,
    cause: 'lesson_completed',
    timestamp: now,
  };
}

function makeProgress(kindlerId: string): KindlerProgress {
  return {
    id: 'prog-001',
    kindlerId,
    entryId: 'entry-barometer',
    completedAt: now,
    adventureType: 'field_trip',
    score: 90,
  };
}

function makeSession(kindlerId: string): KindlerSession {
  return {
    id: 'sess-001',
    kindlerId,
    startedAt: now,
    endedAt: null,
    worldsVisited: [],
    guidesInteracted: [],
    entriesCompleted: [],
    sparkDelta: 0,
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('KindlerRepository (mock)', () => {
  it('save and findById', async () => {
    const repo = createMockKindlerRepository();
    const profile = makeProfile();
    await repo.save(profile);
    const found = await repo.findById(profile.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(profile.id);
    expect(found?.displayName).toBe('Ember');
  });

  it('findById returns null for unknown id', async () => {
    const repo = createMockKindlerRepository();
    const result = await repo.findById('does-not-exist');
    expect(result).toBeNull();
  });

  it('findByParentId returns only matching profiles', async () => {
    const repo = createMockKindlerRepository();
    await repo.save(makeProfile('k-001', 'parent-A'));
    await repo.save(makeProfile('k-002', 'parent-A'));
    await repo.save(makeProfile('k-003', 'parent-B'));
    const forA = await repo.findByParentId('parent-A');
    expect(forA).toHaveLength(2);
    const forB = await repo.findByParentId('parent-B');
    expect(forB).toHaveLength(1);
  });

  it('save overwrites existing profile (upsert)', async () => {
    const repo = createMockKindlerRepository();
    const profile = makeProfile();
    await repo.save(profile);
    const updated: KindlerProfile = { ...profile, sparkLevel: 0.5 };
    await repo.save(updated);
    const found = await repo.findById(profile.id);
    expect(found?.sparkLevel).toBe(0.5);
  });

  it('saveProgress and loadProgress', async () => {
    const repo = createMockKindlerRepository();
    const progress = makeProgress('k-001');
    await repo.saveProgress(progress);
    const list = await repo.loadProgress('k-001');
    expect(list).toHaveLength(1);
    expect(list[0]?.entryId).toBe('entry-barometer');
  });

  it('loadProgress returns empty array for unknown kindler', async () => {
    const repo = createMockKindlerRepository();
    const list = await repo.loadProgress('nobody');
    expect(list).toHaveLength(0);
  });

  it('appendSparkEntry and loadSparkLog', async () => {
    const repo = createMockKindlerRepository();
    const entry = makeSparkEntry('k-001');
    await repo.appendSparkEntry(entry);
    const log = await repo.loadSparkLog('k-001');
    expect(log).toHaveLength(1);
    expect(log[0]?.cause).toBe('lesson_completed');
  });

  it('loadSparkLog respects limit', async () => {
    const repo = createMockKindlerRepository();
    for (let i = 0; i < 5; i++) {
      await repo.appendSparkEntry({ ...makeSparkEntry('k-001'), id: `spark-${i}` });
    }
    const limited = await repo.loadSparkLog('k-001', 3);
    expect(limited).toHaveLength(3);
  });

  it('saveSession and loadSession', async () => {
    const repo = createMockKindlerRepository();
    const session = makeSession('k-001');
    await repo.saveSession(session);
    const loaded = await repo.loadSession('sess-001');
    expect(loaded).not.toBeNull();
    expect(loaded?.kindlerId).toBe('k-001');
    expect(loaded?.endedAt).toBeNull();
  });

  it('loadSession returns null for unknown session', async () => {
    const repo = createMockKindlerRepository();
    const result = await repo.loadSession('no-such-session');
    expect(result).toBeNull();
  });

  it('saveSessionReport stores and exposes report', async () => {
    const repo = createMockKindlerRepository();
    const report = {
      id: 'report-001',
      sessionId: 'sess-001',
      kindlerId: 'k-001',
      summary: 'Great session exploring Cloud Kingdom.',
      worldsExplored: ['cloud-kingdom'],
      subjectsAddressed: ['Weather'],
      generatedAt: now,
    };
    await repo.saveSessionReport(report);
    expect(repo._reports.has('report-001')).toBe(true);
  });

  it('multiple spark entries accumulate', async () => {
    const repo = createMockKindlerRepository();
    for (let i = 0; i < 10; i++) {
      await repo.appendSparkEntry({
        id: `e-${i}`,
        kindlerId: 'k-001',
        sparkLevel: 0.1 + i * 0.05,
        delta: 0.05,
        cause: 'lesson_completed',
        timestamp: now + i * 1000,
      });
    }
    const all = await repo.loadSparkLog('k-001', 100);
    expect(all).toHaveLength(10);
  });
});
