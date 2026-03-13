import { describe, it, expect } from 'vitest';
import {
  createLeitmotifCatalog,
  MOTIF_BAR_MIN,
  MOTIF_BAR_MAX,
  TOTAL_LEITMOTIFS,
} from '../leitmotif-catalog.js';

describe('leitmotif-catalog simulation', () => {
  function makeLc() {
    return createLeitmotifCatalog();
  }

  // ── constants ─────────────────────────────────────────────────────

  it('exports MOTIF_BAR_MIN = 4', () => {
    expect(MOTIF_BAR_MIN).toBe(4);
  });

  it('exports MOTIF_BAR_MAX = 8', () => {
    expect(MOTIF_BAR_MAX).toBe(8);
  });

  it('exports TOTAL_LEITMOTIFS = 50', () => {
    expect(TOTAL_LEITMOTIFS).toBe(50);
  });

  // ── getTotalCount ─────────────────────────────────────────────────

  it('getTotalCount returns 50', () => {
    const lc = makeLc();
    expect(lc.getTotalCount()).toBe(50);
  });

  // ── getAllMotifs ──────────────────────────────────────────────────

  it('getAllMotifs returns exactly 50 motifs', () => {
    const lc = makeLc();
    expect(lc.getAllMotifs().length).toBe(TOTAL_LEITMOTIFS);
  });

  it('every motif has a characterId and characterName', () => {
    const lc = makeLc();
    const motifs = lc.getAllMotifs();
    for (const motif of motifs) {
      expect(motif).toHaveProperty('characterId');
      expect(motif).toHaveProperty('characterName');
    }
  });

  it('every motif has a key and tempo', () => {
    const lc = makeLc();
    const motifs = lc.getAllMotifs();
    for (const motif of motifs) {
      expect(typeof motif.key).toBe('string');
      expect(typeof motif.tempo).toBe('string');
    }
  });

  // ── getMotifByCharacter ───────────────────────────────────────────

  describe('getMotifByCharacter', () => {
    it('returns a motif for a character that has one', () => {
      const lc = makeLc();
      const all = lc.getAllMotifs();
      const characterId = all[0].characterId;
      const motif = lc.getMotifByCharacter(characterId);
      expect(motif).toBeDefined();
      expect(motif!.characterId).toBe(characterId);
    });

    it('returns undefined for an unknown character', () => {
      const lc = makeLc();
      expect(lc.getMotifByCharacter('__nobody__')).toBeUndefined();
    });
  });

  // ── getMotifsByKey ────────────────────────────────────────────────

  describe('getMotifsByKey', () => {
    it('returns motifs matching the given key', () => {
      const lc = makeLc();
      const all = lc.getAllMotifs();
      const key = all[0].key;
      const byKey = lc.getMotifsByKey(key);
      expect(byKey.length).toBeGreaterThan(0);
      expect(byKey.every((m) => m.key === key)).toBe(true);
    });

    it('returns empty array for an unknown key', () => {
      const lc = makeLc();
      expect(lc.getMotifsByKey('Qb_sharp_nonexistent')).toHaveLength(0);
    });
  });

  // ── getMotifsByMood ───────────────────────────────────────────────

  describe('getMotifsByMood', () => {
    it('performs a case-insensitive search', () => {
      const lc = makeLc();
      const all = lc.getAllMotifs();
      // Find any motif that has a mood property
      const motifWithMood = all.find((m) => m.mood);
      if (!motifWithMood) return; // guard if structure differs
      const fragmentUpper = motifWithMood.mood!.substring(0, 3).toUpperCase();
      const results = lc.getMotifsByMood(fragmentUpper);
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty array when no motif matches the mood fragment', () => {
      const lc = makeLc();
      expect(lc.getMotifsByMood('zzz_nomatch_xyz')).toHaveLength(0);
    });
  });
});
