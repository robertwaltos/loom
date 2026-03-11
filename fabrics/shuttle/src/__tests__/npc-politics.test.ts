import { describe, it, expect, beforeEach } from 'vitest';
import type { NpcPoliticsState, NpcPoliticsDeps } from '../npc-politics.js';
import {
  createNpcPoliticsState,
  registerNpc,
  createFaction,
  joinFaction,
  leaveFaction,
  contributeInfluence,
  castVote,
  getNpcProfile,
  getFaction,
  listFactions,
  getVoteHistory,
} from '../npc-politics.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockDeps(): NpcPoliticsDeps {
  let time = 1_000_000n;
  let counter = 0;
  return {
    clock: {
      now: () => {
        time += 1000n;
        return time;
      },
    },
    idGen: { generate: () => 'vote-' + String(++counter) },
    logger: { info: () => undefined, error: () => undefined },
  };
}

function setupFaction(state: NpcPoliticsState) {
  createFaction(state, 'faction-left', 'The Left Alliance', 'LEFT', 'world-1');
  createFaction(state, 'faction-right', 'The Right Order', 'RIGHT', 'world-1');
}

// ============================================================================
// TESTS: REGISTER NPC
// ============================================================================

describe('NpcPolitics - registerNpc', () => {
  let state: NpcPoliticsState;

  beforeEach(() => {
    state = createNpcPoliticsState(createMockDeps());
  });

  it('should register an npc with a stance', () => {
    const result = registerNpc(state, 'npc-1', 'CENTER');
    expect(result.success).toBe(true);
  });

  it('should return already-registered for duplicate npc', () => {
    registerNpc(state, 'npc-1', 'CENTER');
    const result = registerNpc(state, 'npc-1', 'LEFT');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-registered');
  });

  it('should initialize profile with no faction and zero influence', () => {
    registerNpc(state, 'npc-1', 'FAR_LEFT');
    const profile = getNpcProfile(state, 'npc-1');
    expect(profile?.affiliatedFactionId).toBeNull();
    expect(profile?.influenceContributed).toBe(0);
    expect(profile?.politicalActivity).toBe(0);
    expect(profile?.stance).toBe('FAR_LEFT');
  });
});

// ============================================================================
// TESTS: CREATE FACTION
// ============================================================================

describe('NpcPolitics - createFaction', () => {
  let state: NpcPoliticsState;

  beforeEach(() => {
    state = createNpcPoliticsState(createMockDeps());
  });

  it('should create a faction successfully', () => {
    const result = createFaction(state, 'faction-1', 'The Bloc', 'CENTER_LEFT', 'world-1');
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.name).toBe('The Bloc');
      expect(result.stance).toBe('CENTER_LEFT');
      expect(result.memberCount).toBe(0);
      expect(result.influenceScore).toBe(0);
    }
  });

  it('should return already-registered for duplicate factionId', () => {
    createFaction(state, 'faction-1', 'The Bloc', 'CENTER', 'world-1');
    const result = createFaction(state, 'faction-1', 'Duplicate', 'CENTER', 'world-1');
    expect(result).toBe('already-registered');
  });

  it('should list factions by worldId', () => {
    createFaction(state, 'f1', 'World One Left', 'LEFT', 'world-1');
    createFaction(state, 'f2', 'World Two Right', 'RIGHT', 'world-2');
    const w1Factions = listFactions(state, 'world-1');
    expect(w1Factions.length).toBe(1);
    expect(w1Factions[0]?.factionId).toBe('f1');
  });

  it('should list all factions when no worldId provided', () => {
    createFaction(state, 'f1', 'Faction A', 'LEFT', 'world-1');
    createFaction(state, 'f2', 'Faction B', 'RIGHT', 'world-2');
    expect(listFactions(state).length).toBe(2);
  });
});

// ============================================================================
// TESTS: JOIN FACTION
// ============================================================================

describe('NpcPolitics - joinFaction', () => {
  let state: NpcPoliticsState;

  beforeEach(() => {
    state = createNpcPoliticsState(createMockDeps());
    setupFaction(state);
    registerNpc(state, 'npc-1', 'LEFT');
  });

  it('should join a faction and increment memberCount', () => {
    joinFaction(state, 'npc-1', 'faction-left');
    const faction = getFaction(state, 'faction-left');
    expect(faction?.memberCount).toBe(1);
  });

  it('should set affiliatedFactionId on npc profile', () => {
    joinFaction(state, 'npc-1', 'faction-left');
    const profile = getNpcProfile(state, 'npc-1');
    expect(profile?.affiliatedFactionId).toBe('faction-left');
  });

  it('should return already-affiliated if npc already in a faction', () => {
    joinFaction(state, 'npc-1', 'faction-left');
    const result = joinFaction(state, 'npc-1', 'faction-right');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-affiliated');
  });

  it('should return npc-not-found for unregistered npc', () => {
    const result = joinFaction(state, 'ghost', 'faction-left');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });

  it('should return faction-not-found for unknown faction', () => {
    const result = joinFaction(state, 'npc-1', 'faction-nonexistent');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('faction-not-found');
  });
});

// ============================================================================
// TESTS: LEAVE FACTION
// ============================================================================

describe('NpcPolitics - leaveFaction', () => {
  let state: NpcPoliticsState;

  beforeEach(() => {
    state = createNpcPoliticsState(createMockDeps());
    setupFaction(state);
    registerNpc(state, 'npc-1', 'LEFT');
    joinFaction(state, 'npc-1', 'faction-left');
  });

  it('should clear affiliatedFactionId and decrement memberCount', () => {
    leaveFaction(state, 'npc-1');
    const profile = getNpcProfile(state, 'npc-1');
    const faction = getFaction(state, 'faction-left');
    expect(profile?.affiliatedFactionId).toBeNull();
    expect(faction?.memberCount).toBe(0);
  });

  it('should return not-affiliated if npc has no faction', () => {
    leaveFaction(state, 'npc-1');
    const result = leaveFaction(state, 'npc-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('not-affiliated');
  });

  it('should return npc-not-found for unregistered npc', () => {
    const result = leaveFaction(state, 'ghost');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });
});

// ============================================================================
// TESTS: CONTRIBUTE INFLUENCE
// ============================================================================

describe('NpcPolitics - contributeInfluence', () => {
  let state: NpcPoliticsState;

  beforeEach(() => {
    state = createNpcPoliticsState(createMockDeps());
    setupFaction(state);
    registerNpc(state, 'npc-1', 'LEFT');
    joinFaction(state, 'npc-1', 'faction-left');
  });

  it('should add to npc influenceContributed and faction influenceScore', () => {
    contributeInfluence(state, 'npc-1', 20);
    const profile = getNpcProfile(state, 'npc-1');
    const faction = getFaction(state, 'faction-left');
    expect(profile?.influenceContributed).toBe(20);
    expect(faction?.influenceScore).toBe(20);
  });

  it('should cap faction influenceScore at 100', () => {
    contributeInfluence(state, 'npc-1', 150);
    const faction = getFaction(state, 'faction-left');
    expect(faction?.influenceScore).toBe(100);
  });

  it('should return invalid-influence for amount <= 0', () => {
    const result = contributeInfluence(state, 'npc-1', 0);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-influence');
  });

  it('should return not-affiliated if npc has no faction', () => {
    leaveFaction(state, 'npc-1');
    const result = contributeInfluence(state, 'npc-1', 10);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('not-affiliated');
  });

  it('should return npc-not-found for unregistered npc', () => {
    const result = contributeInfluence(state, 'ghost', 10);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });
});

// ============================================================================
// TESTS: CAST VOTE
// ============================================================================

describe('NpcPolitics - castVote', () => {
  let state: NpcPoliticsState;

  beforeEach(() => {
    state = createNpcPoliticsState(createMockDeps());
    setupFaction(state);
    registerNpc(state, 'npc-1', 'CENTER');
    joinFaction(state, 'npc-1', 'faction-left');
  });

  it('should always succeed and return a PolicyVote', () => {
    const vote = castVote(state, 'npc-1', 'Free Trade Act', true);
    expect(vote.topic).toBe('Free Trade Act');
    expect(vote.support).toBe(true);
    expect(vote.npcId).toBe('npc-1');
    expect(vote.factionId).toBe('faction-left');
  });

  it('should accumulate votes in getVoteHistory', () => {
    castVote(state, 'npc-1', 'Topic A', true);
    castVote(state, 'npc-1', 'Topic B', false);
    const history = getVoteHistory(state, 'npc-1', 10);
    expect(history.length).toBe(2);
  });

  it('should respect limit in getVoteHistory', () => {
    for (let i = 0; i < 5; i++) castVote(state, 'npc-1', 'Topic ' + String(i), true);
    const history = getVoteHistory(state, 'npc-1', 3);
    expect(history.length).toBe(3);
  });

  it('should set factionId to null if npc has no faction', () => {
    registerNpc(state, 'npc-solo', 'CENTER');
    const vote = castVote(state, 'npc-solo', 'Open Borders', false);
    expect(vote.factionId).toBeNull();
  });

  it('should increase politicalActivity with votes', () => {
    for (let i = 0; i < 5; i++) castVote(state, 'npc-1', 'Topic ' + String(i), true);
    const profile = getNpcProfile(state, 'npc-1');
    expect(profile?.politicalActivity).toBeCloseTo(0.5);
  });

  it('should return undefined getNpcProfile for unregistered npc', () => {
    expect(getNpcProfile(state, 'ghost')).toBeUndefined();
  });

  it('should return undefined getFaction for unknown faction', () => {
    expect(getFaction(state, 'nonexistent')).toBeUndefined();
  });
});
