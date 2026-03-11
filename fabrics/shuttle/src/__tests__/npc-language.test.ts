import { describe, it, expect, beforeEach } from 'vitest';
import type { NpcLanguageState, NpcLanguageDeps } from '../npc-language.js';
import {
  createNpcLanguageState,
  defineLanguage,
  registerNpc,
  learnLanguage,
  improveFluency,
  canCommunicate,
  getLanguageStats,
  listKnownLanguages,
  listSpeakers,
} from '../npc-language.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockDeps(): NpcLanguageDeps {
  let time = 1_000_000n;
  let counter = 0;
  return {
    clock: {
      now: () => {
        time += 1000n;
        return time;
      },
    },
    idGen: { generate: () => 'lang-' + String(++counter) },
    logger: { info: () => undefined, error: () => undefined },
  };
}

function setupWithLanguage(state: NpcLanguageState) {
  defineLanguage(state, 'terran-common', 'Terran Common', 'TERRAN', 3, null);
  defineLanguage(state, 'silfen-high', 'Silfen High', 'SILFEN', 8, null);
}

// ============================================================================
// TESTS: DEFINE LANGUAGE
// ============================================================================

describe('NpcLanguage - defineLanguage', () => {
  let state: NpcLanguageState;

  beforeEach(() => {
    state = createNpcLanguageState(createMockDeps());
  });

  it('should define a new language successfully', () => {
    const result = defineLanguage(state, 'terran', 'Terran', 'TERRAN', 5, null);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.languageId).toBe('terran');
      expect(result.name).toBe('Terran');
      expect(result.family).toBe('TERRAN');
      expect(result.complexity).toBe(5);
      expect(result.dialectOf).toBeNull();
    }
  });

  it('should define a dialect language with dialectOf reference', () => {
    defineLanguage(state, 'terran', 'Terran', 'TERRAN', 5, null);
    const result = defineLanguage(state, 'terran-old', 'Old Terran', 'TERRAN', 7, 'terran');
    expect(typeof result).toBe('object');
    if (typeof result === 'object') expect(result.dialectOf).toBe('terran');
  });

  it('should return already-registered for duplicate languageId', () => {
    defineLanguage(state, 'terran', 'Terran', 'TERRAN', 5, null);
    const result = defineLanguage(state, 'terran', 'Terran2', 'TERRAN', 5, null);
    expect(result).toBe('already-registered');
  });

  it('should return invalid-fluency if complexity < 1', () => {
    const result = defineLanguage(state, 'bad', 'Bad', 'TERRAN', 0, null);
    expect(result).toBe('invalid-fluency');
  });

  it('should return invalid-fluency if complexity > 10', () => {
    const result = defineLanguage(state, 'bad', 'Bad', 'TERRAN', 11, null);
    expect(result).toBe('invalid-fluency');
  });
});

// ============================================================================
// TESTS: REGISTER NPC
// ============================================================================

describe('NpcLanguage - registerNpc', () => {
  let state: NpcLanguageState;

  beforeEach(() => {
    state = createNpcLanguageState(createMockDeps());
    setupWithLanguage(state);
  });

  it('should register npc with native language at fluency 100', () => {
    const result = registerNpc(state, 'npc-1', 'terran-common');
    expect(result.success).toBe(true);
    const langs = listKnownLanguages(state, 'npc-1');
    expect(langs.length).toBe(1);
    expect(langs[0]?.fluency).toBe(100);
    expect(langs[0]?.native).toBe(true);
  });

  it('should return language-not-found for unknown native language', () => {
    const result = registerNpc(state, 'npc-1', 'ancient-void');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('language-not-found');
  });

  it('should return already-registered for duplicate npc', () => {
    registerNpc(state, 'npc-1', 'terran-common');
    const result = registerNpc(state, 'npc-1', 'terran-common');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-registered');
  });
});

// ============================================================================
// TESTS: LEARN LANGUAGE
// ============================================================================

describe('NpcLanguage - learnLanguage', () => {
  let state: NpcLanguageState;

  beforeEach(() => {
    state = createNpcLanguageState(createMockDeps());
    setupWithLanguage(state);
    registerNpc(state, 'npc-1', 'terran-common');
  });

  it('should add a new language proficiency', () => {
    const result = learnLanguage(state, 'npc-1', 'silfen-high', 40);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.languageId).toBe('silfen-high');
      expect(result.fluency).toBe(40);
      expect(result.native).toBe(false);
    }
  });

  it('should return already-known if npc already has language', () => {
    const result = learnLanguage(state, 'npc-1', 'terran-common', 50);
    expect(result).toBe('already-known');
  });

  it('should return npc-not-found for unregistered npc', () => {
    const result = learnLanguage(state, 'ghost', 'silfen-high', 30);
    expect(result).toBe('npc-not-found');
  });

  it('should return language-not-found for unknown language', () => {
    const result = learnLanguage(state, 'npc-1', 'unknown-lang', 30);
    expect(result).toBe('language-not-found');
  });

  it('should return invalid-fluency for out-of-range initial fluency', () => {
    const result = learnLanguage(state, 'npc-1', 'silfen-high', 110);
    expect(result).toBe('invalid-fluency');
  });
});

// ============================================================================
// TESTS: IMPROVE FLUENCY
// ============================================================================

describe('NpcLanguage - improveFluency', () => {
  let state: NpcLanguageState;

  beforeEach(() => {
    state = createNpcLanguageState(createMockDeps());
    setupWithLanguage(state);
    registerNpc(state, 'npc-1', 'terran-common');
    learnLanguage(state, 'npc-1', 'silfen-high', 50);
  });

  it('should increase fluency by gain', () => {
    const result = improveFluency(state, 'npc-1', 'silfen-high', 20);
    expect(result.success).toBe(true);
    if (result.success) expect(result.newFluency).toBe(70);
  });

  it('should clamp fluency at 100', () => {
    const result = improveFluency(state, 'npc-1', 'silfen-high', 100);
    expect(result.success).toBe(true);
    if (result.success) expect(result.newFluency).toBe(100);
  });

  it('should return npc-not-found for unregistered npc', () => {
    const result = improveFluency(state, 'ghost', 'silfen-high', 10);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });

  it('should return language-not-found if npc does not know language', () => {
    const result = improveFluency(state, 'npc-1', 'ancient-void', 10);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('language-not-found');
  });
});

// ============================================================================
// TESTS: CAN COMMUNICATE
// ============================================================================

describe('NpcLanguage - canCommunicate', () => {
  let state: NpcLanguageState;

  beforeEach(() => {
    state = createNpcLanguageState(createMockDeps());
    setupWithLanguage(state);
    registerNpc(state, 'npc-a', 'terran-common');
    registerNpc(state, 'npc-b', 'terran-common');
    registerNpc(state, 'npc-c', 'silfen-high');
  });

  it('should return true if both share a language above minFluency', () => {
    expect(canCommunicate(state, 'npc-a', 'npc-b', 80)).toBe(true);
  });

  it('should return false if npcs share no common language', () => {
    expect(canCommunicate(state, 'npc-a', 'npc-c', 50)).toBe(false);
  });

  it('should return false if one npc does not meet minFluency', () => {
    learnLanguage(state, 'npc-a', 'silfen-high', 30);
    learnLanguage(state, 'npc-c', 'terran-common', 20);
    expect(canCommunicate(state, 'npc-a', 'npc-c', 50)).toBe(false);
  });

  it('should return false for unregistered npc', () => {
    expect(canCommunicate(state, 'npc-a', 'ghost', 50)).toBe(false);
  });
});

// ============================================================================
// TESTS: STATS AND QUERIES
// ============================================================================

describe('NpcLanguage - stats and queries', () => {
  let state: NpcLanguageState;

  beforeEach(() => {
    state = createNpcLanguageState(createMockDeps());
    setupWithLanguage(state);
    registerNpc(state, 'npc-1', 'terran-common');
    registerNpc(state, 'npc-2', 'terran-common');
    learnLanguage(state, 'npc-1', 'silfen-high', 60);
  });

  it('should return correct totalSpeakers from getLanguageStats', () => {
    const stats = getLanguageStats(state, 'terran-common');
    expect(stats?.totalSpeakers).toBe(2);
  });

  it('should compute correct averageFluency', () => {
    const stats = getLanguageStats(state, 'terran-common');
    expect(stats?.averageFluency).toBe(100);
  });

  it('should return undefined for unknown languageId in getLanguageStats', () => {
    expect(getLanguageStats(state, 'ghost-lang')).toBeUndefined();
  });

  it('should listKnownLanguages for npc with multiple languages', () => {
    const langs = listKnownLanguages(state, 'npc-1');
    expect(langs.length).toBe(2);
  });

  it('should listKnownLanguages returns empty for unregistered npc', () => {
    expect(listKnownLanguages(state, 'ghost')).toEqual([]);
  });

  it('should listSpeakers without minFluency', () => {
    const speakers = listSpeakers(state, 'terran-common');
    expect(speakers.length).toBe(2);
  });

  it('should listSpeakers with minFluency filter', () => {
    learnLanguage(state, 'npc-2', 'silfen-high', 20);
    const speakers = listSpeakers(state, 'silfen-high', 50);
    expect(speakers).toContain('npc-1');
    expect(speakers).not.toContain('npc-2');
  });
});
