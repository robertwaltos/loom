import { describe, it, expect } from 'vitest';
import { computeEntryHash } from '../chronicle-hasher.js';

describe('ChronicleHasher', () => {
  it('produces a 64-char hex hash', async () => {
    const hash = await computeEntryHash({
      previousHash: '0'.repeat(64),
      entryId: 'entry-1',
      timestamp: 1_000_000,
      category: 'entity.lifecycle',
      content: 'Player spawned on Kelath Prime',
    });
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces deterministic hashes', async () => {
    const input = {
      previousHash: '0'.repeat(64),
      entryId: 'entry-1',
      timestamp: 1_000_000,
      category: 'entity.lifecycle',
      content: 'Player spawned',
    };
    const hash1 = await computeEntryHash(input);
    const hash2 = await computeEntryHash(input);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different content', async () => {
    const base = {
      previousHash: '0'.repeat(64),
      entryId: 'entry-1',
      timestamp: 1_000_000,
      category: 'entity.lifecycle',
    };
    const hash1 = await computeEntryHash({ ...base, content: 'alpha' });
    const hash2 = await computeEntryHash({ ...base, content: 'beta' });
    expect(hash1).not.toBe(hash2);
  });

  it('changes when previous hash changes', async () => {
    const base = {
      entryId: 'entry-1',
      timestamp: 1_000_000,
      category: 'entity.lifecycle',
      content: 'test',
    };
    const hash1 = await computeEntryHash({ ...base, previousHash: '0'.repeat(64) });
    const hash2 = await computeEntryHash({ ...base, previousHash: 'a'.repeat(64) });
    expect(hash1).not.toBe(hash2);
  });
});
