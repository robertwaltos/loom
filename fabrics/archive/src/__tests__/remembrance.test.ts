import { describe, it, expect } from 'vitest';
import { createRemembrance } from '../remembrance.js';

let idCounter = 0;

function createTestRemembrance() {
  idCounter = 0;
  return createRemembrance({
    idGenerator: { generate: () => `rem-${String(++idCounter).padStart(4, '0')}` },
    clock: { nowMicroseconds: () => 1_000_000 + idCounter * 1000 },
  });
}

describe('Remembrance recording', () => {
  it('records an entry and assigns an ID', async () => {
    const rem = createTestRemembrance();
    const entry = await rem.record({
      category: 'entity.lifecycle',
      worldId: 'kelath-prime',
      subjectId: 'player-1',
      content: 'Dynasty founded on Kelath Prime',
    });

    expect(entry.entryId).toBe('rem-0001');
    expect(entry.index).toBe(0);
    expect(entry.hash).toHaveLength(64);
    expect(entry.previousHash).toBe('0'.repeat(64));
  });

  it('chains entries via previous hash', async () => {
    const rem = createTestRemembrance();
    const first = await rem.record({
      category: 'entity.lifecycle',
      worldId: 'kelath-prime',
      subjectId: 'player-1',
      content: 'First event',
    });
    const second = await rem.record({
      category: 'economy.transaction',
      worldId: 'kelath-prime',
      subjectId: 'player-1',
      content: 'Second event',
    });

    expect(second.previousHash).toBe(first.hash);
    expect(second.index).toBe(1);
  });

  it('increments count', async () => {
    const rem = createTestRemembrance();
    expect(rem.count()).toBe(0);
    await rem.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'test',
    });
    expect(rem.count()).toBe(1);
  });
});

describe('Remembrance retrieval', () => {
  it('retrieves by ID', async () => {
    const rem = createTestRemembrance();
    const entry = await rem.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'test',
    });

    expect(rem.get(entry.entryId)).toBe(entry);
    expect(rem.get('nonexistent')).toBeUndefined();
  });

  it('retrieves by index', async () => {
    const rem = createTestRemembrance();
    const entry = await rem.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'test',
    });

    expect(rem.getByIndex(0)).toBe(entry);
    expect(rem.getByIndex(99)).toBeUndefined();
  });

  it('returns latest entry', async () => {
    const rem = createTestRemembrance();
    await rem.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'first',
    });
    const second = await rem.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'second',
    });

    expect(rem.latest()).toBe(second);
  });
});

describe('Remembrance queries', () => {
  it('filters by category', async () => {
    const rem = createTestRemembrance();
    await rem.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'spawn',
    });
    await rem.record({
      category: 'economy.transaction',
      worldId: 'w1',
      subjectId: 's1',
      content: 'transfer',
    });

    const results = rem.query({ category: 'economy.transaction' });
    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe('economy.transaction');
  });

  it('filters by world', async () => {
    const rem = createTestRemembrance();
    await rem.record({
      category: 'entity.lifecycle',
      worldId: 'kelath-prime',
      subjectId: 's1',
      content: 'test',
    });
    await rem.record({
      category: 'entity.lifecycle',
      worldId: 'void-reach',
      subjectId: 's1',
      content: 'test',
    });

    expect(rem.query({ worldId: 'kelath-prime' })).toHaveLength(1);
  });

  it('filters by subject', async () => {
    const rem = createTestRemembrance();
    await rem.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 'player-1',
      content: 'a',
    });
    await rem.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 'player-2',
      content: 'b',
    });

    expect(rem.query({ subjectId: 'player-1' })).toHaveLength(1);
  });
});

describe('Remembrance chain verification', () => {
  it('verifies a valid chain', async () => {
    const rem = createTestRemembrance();
    await rem.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'first',
    });
    await rem.record({
      category: 'entity.lifecycle',
      worldId: 'w1',
      subjectId: 's1',
      content: 'second',
    });

    const result = await rem.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.entriesChecked).toBe(2);
    expect(result.brokenAt).toBeNull();
  });

  it('reports empty chain as valid', async () => {
    const rem = createTestRemembrance();
    const result = await rem.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.entriesChecked).toBe(0);
  });
});

describe('Remembrance sealing', () => {
  it('rejects entries after sealing', async () => {
    const rem = createTestRemembrance();
    rem.seal();
    await expect(
      rem.record({
        category: 'entity.lifecycle',
        worldId: 'w1',
        subjectId: 's1',
        content: 'too late',
      }),
    ).rejects.toThrow('sealed');
  });
});
