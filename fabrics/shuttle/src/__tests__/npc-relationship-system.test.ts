import { describe, it, expect, beforeEach } from 'vitest';
import type {
  NpcRelationshipSystemState,
  NpcRelationshipSystemDeps,
} from '../npc-relationship-system.js';
import {
  createNpcRelationshipState,
  createRelationship,
  adjustRelationshipScore,
  setRelationshipType,
  getRelationship,
  getRelationshipEvents,
  getRelationshipSummary,
  listRelationships,
} from '../npc-relationship-system.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockDeps(): NpcRelationshipSystemDeps {
  let time = 1_000_000n;
  let counter = 0;
  return {
    clock: {
      now: () => {
        time = time + 1000n;
        return time;
      },
    },
    idGen: { generate: () => 'rel-' + String(++counter) },
    logger: { info: () => undefined, error: () => undefined },
  };
}

// ============================================================================
// TESTS: CREATE RELATIONSHIP
// ============================================================================

describe('NpcRelationshipSystem - Create Relationship', () => {
  let state: NpcRelationshipSystemState;

  beforeEach(() => {
    state = createNpcRelationshipState(createMockDeps());
  });

  it('should create a relationship with initial score 0 by default', () => {
    const result = createRelationship(state, 'npc-1', 'npc-2');
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.score).toBe(0);
      expect(result.type).toBe('NEUTRAL');
    }
  });

  it('should create a relationship with specified initial score', () => {
    const result = createRelationship(state, 'npc-1', 'npc-2', 50);
    if (typeof result === 'object') expect(result.score).toBe(50);
  });

  it('should return self-relationship when entityAId equals entityBId', () => {
    const result = createRelationship(state, 'npc-1', 'npc-1');
    expect(result).toBe('self-relationship');
  });

  it('should return already-exists on duplicate creation', () => {
    createRelationship(state, 'npc-1', 'npc-2');
    const result = createRelationship(state, 'npc-1', 'npc-2');
    expect(result).toBe('already-exists');
  });

  it('should return already-exists for reversed pair as well (bidirectional)', () => {
    createRelationship(state, 'npc-1', 'npc-2');
    const result = createRelationship(state, 'npc-2', 'npc-1');
    expect(result).toBe('already-exists');
  });

  it('should clamp initial score to 100 maximum', () => {
    const result = createRelationship(state, 'npc-1', 'npc-2', 150);
    if (typeof result === 'object') expect(result.score).toBe(100);
  });

  it('should clamp initial score to -100 minimum', () => {
    const result = createRelationship(state, 'npc-1', 'npc-2', -150);
    if (typeof result === 'object') expect(result.score).toBe(-100);
  });

  it('should assign unique relationshipIds', () => {
    const r1 = createRelationship(state, 'a', 'b');
    const r2 = createRelationship(state, 'c', 'd');
    if (typeof r1 === 'object' && typeof r2 === 'object') {
      expect(r1.relationshipId).not.toBe(r2.relationshipId);
    }
  });
});

// ============================================================================
// TESTS: BIDIRECTIONALITY
// ============================================================================

describe('NpcRelationshipSystem - Bidirectionality', () => {
  let state: NpcRelationshipSystemState;

  beforeEach(() => {
    state = createNpcRelationshipState(createMockDeps());
    createRelationship(state, 'npc-1', 'npc-2', 30);
  });

  it('should getRelationship(A, B) == getRelationship(B, A)', () => {
    const ab = getRelationship(state, 'npc-1', 'npc-2');
    const ba = getRelationship(state, 'npc-2', 'npc-1');
    expect(ab?.relationshipId).toBe(ba?.relationshipId);
  });

  it('should adjustScore via either direction', () => {
    adjustRelationshipScore(state, 'npc-2', 'npc-1', 10, 'helped out');
    const rel = getRelationship(state, 'npc-1', 'npc-2');
    expect(rel?.score).toBe(40);
  });
});

// ============================================================================
// TESTS: ADJUST SCORE
// ============================================================================

describe('NpcRelationshipSystem - Adjust Score', () => {
  let state: NpcRelationshipSystemState;

  beforeEach(() => {
    state = createNpcRelationshipState(createMockDeps());
    createRelationship(state, 'npc-1', 'npc-2', 0);
  });

  it('should increase score by positive delta', () => {
    const result = adjustRelationshipScore(state, 'npc-1', 'npc-2', 25, 'gifted food');
    if (result.success) expect(result.relationship.score).toBe(25);
  });

  it('should decrease score by negative delta', () => {
    adjustRelationshipScore(state, 'npc-1', 'npc-2', -40, 'betrayal');
    const rel = getRelationship(state, 'npc-1', 'npc-2');
    expect(rel?.score).toBe(-40);
  });

  it('should clamp score at 100 maximum silently', () => {
    const result = adjustRelationshipScore(state, 'npc-1', 'npc-2', 200, 'love');
    if (result.success) expect(result.relationship.score).toBe(100);
  });

  it('should clamp score at -100 minimum silently', () => {
    const result = adjustRelationshipScore(state, 'npc-1', 'npc-2', -200, 'hatred');
    if (result.success) expect(result.relationship.score).toBe(-100);
  });

  it('should return relationship-not-found for non-existent pair', () => {
    const result = adjustRelationshipScore(state, 'npc-3', 'npc-4', 10, 'test');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('relationship-not-found');
  });

  it('should increment interactionCount on adjustScore', () => {
    adjustRelationshipScore(state, 'npc-1', 'npc-2', 5, 'wave');
    adjustRelationshipScore(state, 'npc-1', 'npc-2', 5, 'wave again');
    const rel = getRelationship(state, 'npc-1', 'npc-2');
    expect(rel?.interactionCount).toBe(2);
  });
});

// ============================================================================
// TESTS: SET TYPE
// ============================================================================

describe('NpcRelationshipSystem - Set Type', () => {
  let state: NpcRelationshipSystemState;

  beforeEach(() => {
    state = createNpcRelationshipState(createMockDeps());
    createRelationship(state, 'npc-1', 'npc-2', 0);
  });

  it('should change type to ALLY', () => {
    const result = setRelationshipType(state, 'npc-1', 'npc-2', 'ALLY');
    expect(result.success).toBe(true);
    const rel = getRelationship(state, 'npc-1', 'npc-2');
    expect(rel?.type).toBe('ALLY');
  });

  it('should change type to ENEMY', () => {
    setRelationshipType(state, 'npc-1', 'npc-2', 'ENEMY');
    const rel = getRelationship(state, 'npc-1', 'npc-2');
    expect(rel?.type).toBe('ENEMY');
  });

  it('should return relationship-not-found for missing pair', () => {
    const result = setRelationshipType(state, 'x', 'y', 'RIVAL');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('relationship-not-found');
  });
});

// ============================================================================
// TESTS: EVENTS AND SUMMARY
// ============================================================================

describe('NpcRelationshipSystem - Events and Summary', () => {
  let state: NpcRelationshipSystemState;

  beforeEach(() => {
    state = createNpcRelationshipState(createMockDeps());
    createRelationship(state, 'npc-1', 'npc-2', 20);
    createRelationship(state, 'npc-1', 'npc-3', -10);
  });

  it('should record events for adjustScore calls', () => {
    adjustRelationshipScore(state, 'npc-1', 'npc-2', 10, 'helped');
    adjustRelationshipScore(state, 'npc-1', 'npc-2', -5, 'small conflict');
    const events = getRelationshipEvents(state, 'npc-1', 'npc-2', 10);
    expect(events.length).toBe(2);
  });

  it('should respect limit in getRelationshipEvents', () => {
    for (let i = 0; i < 5; i++) {
      adjustRelationshipScore(state, 'npc-1', 'npc-2', 1, 'tick ' + String(i));
    }
    const events = getRelationshipEvents(state, 'npc-1', 'npc-2', 3);
    expect(events.length).toBe(3);
  });

  it('should return empty events for non-existent pair', () => {
    const events = getRelationshipEvents(state, 'x', 'y', 10);
    expect(events.length).toBe(0);
  });

  it('should compute summary with correct totals', () => {
    setRelationshipType(state, 'npc-1', 'npc-2', 'ALLY');
    setRelationshipType(state, 'npc-1', 'npc-3', 'ENEMY');
    const summary = getRelationshipSummary(state, 'npc-1');
    expect(summary.totalRelationships).toBe(2);
    expect(summary.allies).toBe(1);
    expect(summary.enemies).toBe(1);
    expect(summary.rivals).toBe(0);
  });

  it('should compute correct averageScore in summary', () => {
    // npc-1 has score 20 with npc-2 and -10 with npc-3
    const summary = getRelationshipSummary(state, 'npc-1');
    expect(summary.averageScore).toBe(5); // (20 + -10) / 2
  });

  it('should return zero summary for entity with no relationships', () => {
    const summary = getRelationshipSummary(state, 'npc-99');
    expect(summary.totalRelationships).toBe(0);
    expect(summary.averageScore).toBe(0);
  });

  it('should list all relationships for an entity', () => {
    const list = listRelationships(state, 'npc-1');
    expect(list.length).toBe(2);
  });

  it('should list relationships where entity is either A or B', () => {
    createRelationship(state, 'npc-5', 'npc-1', 5);
    const list = listRelationships(state, 'npc-1');
    expect(list.length).toBe(3);
  });
});
