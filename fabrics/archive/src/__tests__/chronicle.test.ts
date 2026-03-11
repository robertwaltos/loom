import { describe, it, expect } from 'vitest';
import { createChronicle } from '../chronicle.js';

let idCounter = 0;

function createTestChronicle() {
  idCounter = 0;
  return createChronicle({
    idGenerator: { generate: () => `chr-${String(++idCounter).padStart(4, '0')}` },
    clock: { nowMicroseconds: () => 1_000_000 + idCounter * 1000 },
  });
}

describe('Chronicle recording', () => {
  it('records an entry and assigns an ID', async () => {
    const chronicle = createTestChronicle();
    const entry = await chronicle.record({
      category: 'entity.lifecycle',
      worldId: 'kelath-prime',
      subjectId: 'player-1',
      content: 'Dynasty founded on Kelath Prime',
    });

    expect(entry.entryId).toBe('chr-0001');
    expect(entry.index).toBe(0);
    expect(entry.hash).toHaveLength(64);
    expect(entry.previousHash).toBe('0'.repeat(64));
  });

  it('chains entries via previous hash', async () => {
    const chronicle = createTestChronicle();
    const first = await chronicle.record({
      category: 'entity.lifecycle',
      worldId: 'kelath-prime',
      subjectId: 'player-1',
      content: 'First event',
    });
    const second = await chronicle.record({
      category: 'economy.transaction',
      worldId: 'kelath-prime',
      subjectId: 'player-1',
      content: 'Second event',
    });

    expect(second.previousHash).toBe(first.hash);
    expect(second.index).toBe(1);
  });

  it('increments count', async () => {
    const chronicle = createTestChronicle();
    expect(chronicle.count()).toBe(0);
    await chronicle.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'test',
    });
    expect(chronicle.count()).toBe(1);
  });
});

describe('Chronicle retrieval', () => {
  it('retrieves by ID', async () => {
    const chronicle = createTestChronicle();
    const entry = await chronicle.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'test',
    });

    expect(chronicle.get(entry.entryId)).toBe(entry);
    expect(chronicle.get('nonexistent')).toBeUndefined();
  });

  it('retrieves by index', async () => {
    const chronicle = createTestChronicle();
    const entry = await chronicle.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'test',
    });

    expect(chronicle.getByIndex(0)).toBe(entry);
    expect(chronicle.getByIndex(99)).toBeUndefined();
  });

  it('returns latest entry', async () => {
    const chronicle = createTestChronicle();
    await chronicle.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'first',
    });
    const second = await chronicle.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'second',
    });

    expect(chronicle.latest()).toBe(second);
  });
});

describe('Chronicle queries', () => {
  it('filters by category', async () => {
    const chronicle = createTestChronicle();
    await chronicle.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'spawn',
    });
    await chronicle.record({
      category: 'economy.transaction',
      worldId: 'w1',
      subjectId: 's1',
      content: 'transfer',
    });

    const results = chronicle.query({ category: 'economy.transaction' });
    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe('economy.transaction');
  });

  it('filters by world', async () => {
    const chronicle = createTestChronicle();
    await chronicle.record({
      category: 'entity.lifecycle',
      worldId: 'kelath-prime',
      subjectId: 's1',
      content: 'test',
    });
    await chronicle.record({
      category: 'entity.lifecycle',
      worldId: 'void-reach',
      subjectId: 's1',
      content: 'test',
    });

    expect(chronicle.query({ worldId: 'kelath-prime' })).toHaveLength(1);
  });

  it('filters by subject', async () => {
    const chronicle = createTestChronicle();
    await chronicle.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 'player-1',
      content: 'a',
    });
    await chronicle.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 'player-2',
      content: 'b',
    });

    expect(chronicle.query({ subjectId: 'player-1' })).toHaveLength(1);
  });
});

describe('Chronicle chain verification', () => {
  it('verifies a valid chain', async () => {
    const chronicle = createTestChronicle();
    await chronicle.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'first',
    });
    await chronicle.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'second',
    });

    const result = await chronicle.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.entriesChecked).toBe(2);
    expect(result.brokenAt).toBeNull();
  });

  it('reports empty chain as valid', async () => {
    const chronicle = createTestChronicle();
    const result = await chronicle.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.entriesChecked).toBe(0);
  });
});

describe('Chronicle sealing', () => {
  it('rejects entries after sealing', async () => {
    const chronicle = createTestChronicle();
    chronicle.seal();
    await expect(
      chronicle.record({
        category: 'entity.lifecycle',
        worldId: 'w1',
        subjectId: 's1',
        content: 'too late',
      }),
    ).rejects.toThrow('sealed');
  });
});
