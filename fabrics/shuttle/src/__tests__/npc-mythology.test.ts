import { describe, it, expect, beforeEach } from 'vitest';
import type { NpcMythologyState, NpcMythologyDeps } from '../npc-mythology.js';
import {
  createNpcMythologyState,
  registerNpc,
  createMyth,
  believeMyth,
  createTradition,
  practiceTradition,
  observeTradition,
  getBeliefProfile,
  getMyth,
  listMythsByCategory,
} from '../npc-mythology.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockDeps(): NpcMythologyDeps {
  let time = 1_000_000n;
  let counter = 0;
  return {
    clock: {
      now: () => {
        time += 1000n;
        return time;
      },
    },
    idGen: { generate: () => 'myth-' + String(++counter) },
    logger: { info: () => undefined, error: () => undefined },
  };
}

// ============================================================================
// TESTS: REGISTER NPC
// ============================================================================

describe('NpcMythology - registerNpc', () => {
  let state: NpcMythologyState;

  beforeEach(() => {
    state = createNpcMythologyState(createMockDeps());
  });

  it('should register a new npc successfully', () => {
    const result = registerNpc(state, 'npc-1');
    expect(result.success).toBe(true);
  });

  it('should return already-registered for duplicate npc', () => {
    registerNpc(state, 'npc-1');
    const result = registerNpc(state, 'npc-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-registered');
  });

  it('should initialize empty belief profile', () => {
    registerNpc(state, 'npc-1');
    const profile = getBeliefProfile(state, 'npc-1');
    expect(profile?.myths.length).toBe(0);
    expect(profile?.traditions.length).toBe(0);
    expect(profile?.devoutness).toBe(0);
  });
});

// ============================================================================
// TESTS: CREATE MYTH
// ============================================================================

describe('NpcMythology - createMyth', () => {
  let state: NpcMythologyState;

  beforeEach(() => {
    state = createNpcMythologyState(createMockDeps());
  });

  it('should always succeed and return a Myth', () => {
    const myth = createMyth(state, 'The First Weaving', 'CREATION', 'world-alpha', 8);
    expect(myth.title).toBe('The First Weaving');
    expect(myth.category).toBe('CREATION');
    expect(myth.worldId).toBe('world-alpha');
    expect(myth.devotionScore).toBe(8);
    expect(myth.believedBy).toEqual([]);
  });

  it('should generate a unique mythId', () => {
    const m1 = createMyth(state, 'Myth One', 'HERO', 'world-1', 5);
    const m2 = createMyth(state, 'Myth Two', 'HERO', 'world-1', 5);
    expect(m1.mythId).not.toBe(m2.mythId);
  });

  it('should retrieve myth by id via getMyth', () => {
    const myth = createMyth(state, 'The Void', 'COSMIC', 'world-x', 10);
    const retrieved = getMyth(state, myth.mythId);
    expect(retrieved?.title).toBe('The Void');
  });

  it('should return undefined for unknown mythId', () => {
    expect(getMyth(state, 'nonexistent')).toBeUndefined();
  });
});

// ============================================================================
// TESTS: BELIEVE MYTH
// ============================================================================

describe('NpcMythology - believeMyth', () => {
  let state: NpcMythologyState;

  beforeEach(() => {
    state = createNpcMythologyState(createMockDeps());
    registerNpc(state, 'npc-1');
  });

  it('should add npc to myth.believedBy', () => {
    const myth = createMyth(state, 'The Fall', 'APOCALYPSE', 'world-1', 7);
    believeMyth(state, 'npc-1', myth.mythId);
    const updated = getMyth(state, myth.mythId);
    expect(updated?.believedBy).toContain('npc-1');
  });

  it('should add mythId to npc belief profile', () => {
    const myth = createMyth(state, 'The Ancestor', 'ANCESTOR', 'world-1', 6);
    believeMyth(state, 'npc-1', myth.mythId);
    const profile = getBeliefProfile(state, 'npc-1');
    expect(profile?.myths).toContain(myth.mythId);
  });

  it('should return already-believes if npc already believes the myth', () => {
    const myth = createMyth(state, 'Trickster God', 'TRICKSTER', 'world-1', 4);
    believeMyth(state, 'npc-1', myth.mythId);
    const result = believeMyth(state, 'npc-1', myth.mythId);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-believes');
  });

  it('should return npc-not-found for unregistered npc', () => {
    const myth = createMyth(state, 'Nature Spirit', 'NATURE', 'world-1', 3);
    const result = believeMyth(state, 'ghost', myth.mythId);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });

  it('should return myth-not-found for unknown myth', () => {
    const result = believeMyth(state, 'npc-1', 'nonexistent-myth');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('myth-not-found');
  });
});

// ============================================================================
// TESTS: TRADITION
// ============================================================================

describe('NpcMythology - traditions', () => {
  let state: NpcMythologyState;

  beforeEach(() => {
    state = createNpcMythologyState(createMockDeps());
    registerNpc(state, 'npc-1');
  });

  it('should create a tradition with no practitioners and null lastObservedAt', () => {
    const trad = createTradition(state, 'Dawn Prayer', 'DAILY');
    expect(trad.name).toBe('Dawn Prayer');
    expect(trad.frequency).toBe('DAILY');
    expect(trad.practitionerIds).toEqual([]);
    expect(trad.lastObservedAt).toBeNull();
  });

  it('should add npc to practitionerIds on practiceTradition', () => {
    const trad = createTradition(state, 'Harvest Rite', 'SEASONAL');
    practiceTradition(state, 'npc-1', trad.traditionId);
    expect(trad.practitionerIds).toContain('npc-1');
  });

  it('should return already-registered if npc already practices tradition', () => {
    const trad = createTradition(state, 'Solstice Song', 'ANNUAL');
    practiceTradition(state, 'npc-1', trad.traditionId);
    const result = practiceTradition(state, 'npc-1', trad.traditionId);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-registered');
  });

  it('should return npc-not-found if npc not registered', () => {
    const trad = createTradition(state, 'Initiation', 'ONCE');
    const result = practiceTradition(state, 'ghost', trad.traditionId);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });

  it('should set lastObservedAt on observeTradition', () => {
    const trad = createTradition(state, 'Weekly Gather', 'WEEKLY');
    observeTradition(state, trad.traditionId);
    expect(trad.lastObservedAt).not.toBeNull();
  });

  it('should return tradition-not-found for observeTradition with unknown id', () => {
    const result = observeTradition(state, 'nonexistent');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('tradition-not-found');
  });
});

// ============================================================================
// TESTS: BELIEF PROFILE DEVOUTNESS
// ============================================================================

describe('NpcMythology - BeliefProfile devoutness', () => {
  let state: NpcMythologyState;

  beforeEach(() => {
    state = createNpcMythologyState(createMockDeps());
    registerNpc(state, 'npc-1');
  });

  it('should compute devoutness based on myths and traditions', () => {
    const m1 = createMyth(state, 'Origin', 'CREATION', 'w', 5);
    const m2 = createMyth(state, 'End', 'APOCALYPSE', 'w', 5);
    const t1 = createTradition(state, 'Rite', 'DAILY');
    believeMyth(state, 'npc-1', m1.mythId);
    believeMyth(state, 'npc-1', m2.mythId);
    practiceTradition(state, 'npc-1', t1.traditionId);
    const profile = getBeliefProfile(state, 'npc-1');
    // 2*0.1 + 1*0.15 = 0.35
    expect(profile?.devoutness).toBeCloseTo(0.35);
  });

  it('should clamp devoutness at 1', () => {
    for (let i = 0; i < 10; i++) {
      const m = createMyth(state, 'Myth ' + String(i), 'HERO', 'w', 5);
      believeMyth(state, 'npc-1', m.mythId);
      const t = createTradition(state, 'Trad ' + String(i), 'DAILY');
      practiceTradition(state, 'npc-1', t.traditionId);
    }
    const profile = getBeliefProfile(state, 'npc-1');
    expect(profile?.devoutness).toBe(1);
  });

  it('should return undefined getBeliefProfile for unregistered npc', () => {
    expect(getBeliefProfile(state, 'ghost')).toBeUndefined();
  });
});

// ============================================================================
// TESTS: LIST MYTHS BY CATEGORY
// ============================================================================

describe('NpcMythology - listMythsByCategory', () => {
  let state: NpcMythologyState;

  beforeEach(() => {
    state = createNpcMythologyState(createMockDeps());
    createMyth(state, 'Genesis', 'CREATION', 'w1', 10);
    createMyth(state, 'Beginning', 'CREATION', 'w2', 9);
    createMyth(state, 'Ragnarok', 'APOCALYPSE', 'w1', 8);
  });

  it('should return myths filtered by category', () => {
    const creation = listMythsByCategory(state, 'CREATION');
    expect(creation.length).toBe(2);
  });

  it('should return empty for category with no myths', () => {
    const trickster = listMythsByCategory(state, 'TRICKSTER');
    expect(trickster.length).toBe(0);
  });

  it('should return correct myths for APOCALYPSE category', () => {
    const apocalypse = listMythsByCategory(state, 'APOCALYPSE');
    expect(apocalypse.length).toBe(1);
    expect(apocalypse[0]?.title).toBe('Ragnarok');
  });
});
