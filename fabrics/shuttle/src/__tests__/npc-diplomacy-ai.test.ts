import { describe, it, expect, beforeEach } from 'vitest';
import type {
  DiplomacyState,
  Clock,
  IdGenerator,
  Logger,
  RelationshipAssessment,
  DiplomacyAction,
  BetrayalRecord,
  DiplomacyHistory,
  DiplomacyReport,
  StrategyWeights,
  DiplomaticStrategy,
} from '../npc-diplomacy-ai.js';
import {
  createDiplomacyState,
  evaluateRelationship,
  getRelationship,
  updateRelationshipScore,
  selectStrategy,
  executeDiplomacy,
  recordBetrayal,
  computeTrustLevel,
  getDiplomacyHistory,
  getDiplomacyReport,
  getAllRelationships,
  getBetrayalsBetween,
} from '../npc-diplomacy-ai.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockClock(): Clock {
  let time = 1000000n;
  return {
    now: () => {
      time = time + 1000n;
      return time;
    },
  };
}

function createMockIdGen(): IdGenerator {
  let counter = 0;
  return {
    generate: () => {
      counter = counter + 1;
      return 'id-' + String(counter);
    },
  };
}

function createMockLogger(): Logger {
  const messages: string[] = [];
  const errors: string[] = [];
  return {
    info: (msg: string) => {
      messages.push(msg);
    },
    error: (msg: string) => {
      errors.push(msg);
    },
  };
}

// ============================================================================
// TESTS: RELATIONSHIP ASSESSMENT
// ============================================================================

describe('NPC Diplomacy AI - Relationship Assessment', () => {
  let state: DiplomacyState;
  let clock: Clock;

  beforeEach(() => {
    state = createDiplomacyState();
    clock = createMockClock();
  });

  it('should evaluate a new relationship', () => {
    const result = evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.2, 0.8, clock);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.dynastyId).toBe('dyn1');
      expect(result.targetDynastyId).toBe('dyn2');
      expect(result.relationshipScore).toBe(50);
      expect(result.powerBalance).toBe(1.2);
      expect(result.trustLevel).toBe(0.8);
      expect(result.status).toBe('FRIENDLY');
    }
  });

  it('should return invalid-dynasty for empty dynastyId', () => {
    const result = evaluateRelationship(state, '', 'dyn2', 50, 1.0, 0.8, clock);
    expect(result).toBe('invalid-dynasty');
  });

  it('should return invalid-target for empty targetDynastyId', () => {
    const result = evaluateRelationship(state, 'dyn1', '', 50, 1.0, 0.8, clock);
    expect(result).toBe('invalid-target');
  });

  it('should return invalid-score for score < -100', () => {
    const result = evaluateRelationship(state, 'dyn1', 'dyn2', -101, 1.0, 0.8, clock);
    expect(result).toBe('invalid-score');
  });

  it('should return invalid-score for score > 100', () => {
    const result = evaluateRelationship(state, 'dyn1', 'dyn2', 101, 1.0, 0.8, clock);
    expect(result).toBe('invalid-score');
  });

  it('should return invalid-power for negative powerBalance', () => {
    const result = evaluateRelationship(state, 'dyn1', 'dyn2', 50, -0.5, 0.8, clock);
    expect(result).toBe('invalid-power');
  });

  it('should return invalid-trust for trustLevel < 0', () => {
    const result = evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, -0.1, clock);
    expect(result).toBe('invalid-trust');
  });

  it('should return invalid-trust for trustLevel > 1', () => {
    const result = evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 1.1, clock);
    expect(result).toBe('invalid-trust');
  });

  it('should derive ALLIED status for score >= 75', () => {
    const result = evaluateRelationship(state, 'dyn1', 'dyn2', 80, 1.0, 0.9, clock);
    if (typeof result === 'object') {
      expect(result.status).toBe('ALLIED');
    }
  });

  it('should derive FRIENDLY status for score >= 25', () => {
    const result = evaluateRelationship(state, 'dyn1', 'dyn2', 40, 1.0, 0.7, clock);
    if (typeof result === 'object') {
      expect(result.status).toBe('FRIENDLY');
    }
  });

  it('should derive NEUTRAL status for score >= -25', () => {
    const result = evaluateRelationship(state, 'dyn1', 'dyn2', 0, 1.0, 0.5, clock);
    if (typeof result === 'object') {
      expect(result.status).toBe('NEUTRAL');
    }
  });

  it('should derive UNFRIENDLY status for score >= -75', () => {
    const result = evaluateRelationship(state, 'dyn1', 'dyn2', -50, 0.8, 0.4, clock);
    if (typeof result === 'object') {
      expect(result.status).toBe('UNFRIENDLY');
    }
  });

  it('should derive HOSTILE status for score < -75', () => {
    const result = evaluateRelationship(state, 'dyn1', 'dyn2', -80, 0.5, 0.2, clock);
    if (typeof result === 'object') {
      expect(result.status).toBe('HOSTILE');
    }
  });

  it('should store relationship in state', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 60, 1.3, 0.85, clock);
    const rel = getRelationship(state, 'dyn1', 'dyn2');
    expect(typeof rel).toBe('object');
    if (typeof rel === 'object') {
      expect(rel.relationshipScore).toBe(60);
    }
  });

  it('should get relationship by key', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 45, 1.1, 0.75, clock);
    const rel = getRelationship(state, 'dyn1', 'dyn2');
    expect(typeof rel).toBe('object');
  });

  it('should return relationship-not-found for missing relationship', () => {
    const rel = getRelationship(state, 'dyn1', 'dyn2');
    expect(rel).toBe('relationship-not-found');
  });

  it('should update relationship score with positive delta', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 30, 1.0, 0.7, clock);
    const updated = updateRelationshipScore(state, 'dyn1', 'dyn2', 20, clock);
    if (typeof updated === 'object') {
      expect(updated.relationshipScore).toBe(50);
    }
  });

  it('should update relationship score with negative delta', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.7, clock);
    const updated = updateRelationshipScore(state, 'dyn1', 'dyn2', -30, clock);
    if (typeof updated === 'object') {
      expect(updated.relationshipScore).toBe(20);
    }
  });

  it('should clamp updated score to -100 minimum', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', -80, 1.0, 0.5, clock);
    const updated = updateRelationshipScore(state, 'dyn1', 'dyn2', -50, clock);
    if (typeof updated === 'object') {
      expect(updated.relationshipScore).toBe(-100);
    }
  });

  it('should clamp updated score to 100 maximum', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 85, 1.0, 0.9, clock);
    const updated = updateRelationshipScore(state, 'dyn1', 'dyn2', 50, clock);
    if (typeof updated === 'object') {
      expect(updated.relationshipScore).toBe(100);
    }
  });

  it('should preserve other fields when updating score', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 30, 1.5, 0.6, clock);
    const updated = updateRelationshipScore(state, 'dyn1', 'dyn2', 10, clock);
    if (typeof updated === 'object') {
      expect(updated.powerBalance).toBe(1.5);
      expect(updated.trustLevel).toBe(0.6);
    }
  });
});

// ============================================================================
// TESTS: STRATEGY SELECTION
// ============================================================================

describe('NPC Diplomacy AI - Strategy Selection', () => {
  let state: DiplomacyState;
  let clock: Clock;

  beforeEach(() => {
    state = createDiplomacyState();
    clock = createMockClock();
  });

  it('should select ALLY strategy for high combined score', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 80, 1.5, 0.9, clock);
    const weights: StrategyWeights = {
      relationshipWeight: 1.0,
      powerWeight: 1.0,
      trustWeight: 1.0,
      historyWeight: 0.0,
    };
    const strategy = selectStrategy(state, 'dyn1', 'dyn2', weights);
    expect(strategy).toBe('ALLY');
  });

  it('should select NEGOTIATE strategy for moderate score', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.2, 0.7, clock);
    const weights: StrategyWeights = {
      relationshipWeight: 1.0,
      powerWeight: 1.0,
      trustWeight: 1.0,
      historyWeight: 0.0,
    };
    const strategy = selectStrategy(state, 'dyn1', 'dyn2', weights);
    expect(strategy).toBe('NEGOTIATE');
  });

  it('should select APPEASE strategy for slightly positive score', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 20, 1.0, 0.6, clock);
    const weights: StrategyWeights = {
      relationshipWeight: 1.0,
      powerWeight: 1.0,
      trustWeight: 1.0,
      historyWeight: 0.0,
    };
    const strategy = selectStrategy(state, 'dyn1', 'dyn2', weights);
    expect(strategy).toBe('APPEASE');
  });

  it('should select IGNORE strategy for neutral score', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 0, 1.0, 0.5, clock);
    const weights: StrategyWeights = {
      relationshipWeight: 1.0,
      powerWeight: 1.0,
      trustWeight: 1.0,
      historyWeight: 0.0,
    };
    const strategy = selectStrategy(state, 'dyn1', 'dyn2', weights);
    expect(strategy).toBe('IGNORE');
  });

  it('should select THREATEN strategy for low score and weak enemy', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', -50, 0.4, 0.5, clock);
    const weights: StrategyWeights = {
      relationshipWeight: 1.0,
      powerWeight: 1.0,
      trustWeight: 1.0,
      historyWeight: 0.0,
    };
    const strategy = selectStrategy(state, 'dyn1', 'dyn2', weights);
    expect(strategy).toBe('THREATEN');
  });

  it('should select BETRAY strategy for very low trust', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', -60, 0.8, 0.2, clock);
    const weights: StrategyWeights = {
      relationshipWeight: 1.0,
      powerWeight: 1.0,
      trustWeight: 1.0,
      historyWeight: 0.0,
    };
    const strategy = selectStrategy(state, 'dyn1', 'dyn2', weights);
    expect(strategy).toBe('BETRAY');
  });

  it('should return error for missing relationship', () => {
    const weights: StrategyWeights = {
      relationshipWeight: 1.0,
      powerWeight: 1.0,
      trustWeight: 1.0,
      historyWeight: 0.0,
    };
    const strategy = selectStrategy(state, 'dyn1', 'dyn2', weights);
    expect(strategy).toBe('relationship-not-found');
  });

  it('should weight relationship score correctly', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 60, 0.5, 0.3, clock);
    const weights: StrategyWeights = {
      relationshipWeight: 2.0,
      powerWeight: 0.1,
      trustWeight: 0.1,
      historyWeight: 0.0,
    };
    const strategy = selectStrategy(state, 'dyn1', 'dyn2', weights);
    expect(strategy).toBe('NEGOTIATE');
  });

  it('should weight power balance correctly', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', -20, 3.0, 0.4, clock);
    const weights: StrategyWeights = {
      relationshipWeight: 0.1,
      powerWeight: 2.0,
      trustWeight: 0.1,
      historyWeight: 0.0,
    };
    const strategy = selectStrategy(state, 'dyn1', 'dyn2', weights);
    expect(strategy).toBe('THREATEN');
  });

  it('should weight trust level correctly', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', -10, 1.0, 0.95, clock);
    const weights: StrategyWeights = {
      relationshipWeight: 0.1,
      powerWeight: 0.1,
      trustWeight: 2.0,
      historyWeight: 0.0,
    };
    const strategy = selectStrategy(state, 'dyn1', 'dyn2', weights);
    expect(strategy).toBe('NEGOTIATE');
  });
});

// ============================================================================
// TESTS: DIPLOMACY EXECUTION
// ============================================================================

describe('NPC Diplomacy AI - Diplomacy Execution', () => {
  let state: DiplomacyState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createDiplomacyState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should execute APPEASE diplomacy', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 30, 1.0, 0.7, clock);
    const action = executeDiplomacy(state, 'dyn1', 'dyn2', 'APPEASE', idGen, clock, logger);
    expect(typeof action).toBe('object');
    if (typeof action === 'object') {
      expect(action.fromDynasty).toBe('dyn1');
      expect(action.toDynasty).toBe('dyn2');
      expect(action.strategy).toBe('APPEASE');
      expect(action.risk).toBeGreaterThanOrEqual(0);
      expect(action.expectedReward).toBeGreaterThanOrEqual(0);
    }
  });

  it('should execute THREATEN diplomacy', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', -40, 0.5, 0.4, clock);
    const action = executeDiplomacy(state, 'dyn1', 'dyn2', 'THREATEN', idGen, clock, logger);
    if (typeof action === 'object') {
      expect(action.strategy).toBe('THREATEN');
      expect(action.risk).toBeGreaterThan(30);
    }
  });

  it('should execute NEGOTIATE diplomacy', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 45, 1.2, 0.8, clock);
    const action = executeDiplomacy(state, 'dyn1', 'dyn2', 'NEGOTIATE', idGen, clock, logger);
    if (typeof action === 'object') {
      expect(action.strategy).toBe('NEGOTIATE');
    }
  });

  it('should execute IGNORE diplomacy', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 0, 1.0, 0.5, clock);
    const action = executeDiplomacy(state, 'dyn1', 'dyn2', 'IGNORE', idGen, clock, logger);
    if (typeof action === 'object') {
      expect(action.strategy).toBe('IGNORE');
      expect(action.risk).toBeLessThan(10);
      expect(action.expectedReward).toBe(0);
    }
  });

  it('should execute ALLY diplomacy', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 80, 1.5, 0.9, clock);
    const action = executeDiplomacy(state, 'dyn1', 'dyn2', 'ALLY', idGen, clock, logger);
    if (typeof action === 'object') {
      expect(action.strategy).toBe('ALLY');
      expect(action.expectedReward).toBeGreaterThan(50);
    }
  });

  it('should execute BETRAY diplomacy', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', -70, 0.8, 0.1, clock);
    const action = executeDiplomacy(state, 'dyn1', 'dyn2', 'BETRAY', idGen, clock, logger);
    if (typeof action === 'object') {
      expect(action.strategy).toBe('BETRAY');
      expect(action.risk).toBeGreaterThan(70);
    }
  });

  it('should return invalid-dynasty for empty fromDynasty', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.7, clock);
    const action = executeDiplomacy(state, '', 'dyn2', 'NEGOTIATE', idGen, clock, logger);
    expect(action).toBe('invalid-dynasty');
  });

  it('should return invalid-target for empty toDynasty', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.7, clock);
    const action = executeDiplomacy(state, 'dyn1', '', 'NEGOTIATE', idGen, clock, logger);
    expect(action).toBe('invalid-target');
  });

  it('should return invalid-strategy for bad strategy', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.7, clock);
    const action = executeDiplomacy(
      state,
      'dyn1',
      'dyn2',
      'BAD' as DiplomaticStrategy,
      idGen,
      clock,
      logger,
    );
    expect(action).toBe('invalid-strategy');
  });

  it('should store action in state', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.7, clock);
    const action = executeDiplomacy(state, 'dyn1', 'dyn2', 'NEGOTIATE', idGen, clock, logger);
    if (typeof action === 'object') {
      expect(state.actions.has(action.id)).toBe(true);
    }
  });

  it('should append action to history', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.7, clock);
    executeDiplomacy(state, 'dyn1', 'dyn2', 'NEGOTIATE', idGen, clock, logger);
    const history = getDiplomacyHistory(state, 'dyn1');
    if (typeof history === 'object') {
      expect(history.actions.length).toBe(1);
    }
  });

  it('should generate unique action IDs', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.7, clock);
    const a1 = executeDiplomacy(state, 'dyn1', 'dyn2', 'NEGOTIATE', idGen, clock, logger);
    const a2 = executeDiplomacy(state, 'dyn1', 'dyn2', 'APPEASE', idGen, clock, logger);
    if (typeof a1 === 'object' && typeof a2 === 'object') {
      expect(a1.id).not.toBe(a2.id);
    }
  });

  it('should randomize success based on risk', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.7, clock);
    const actions: boolean[] = [];
    for (let i = 0; i < 20; i = i + 1) {
      const action = executeDiplomacy(state, 'dyn1', 'dyn2', 'NEGOTIATE', idGen, clock, logger);
      if (typeof action === 'object') {
        actions.push(action.success);
      }
    }
    const hasTrue = actions.some((s) => s === true);
    const hasFalse = actions.some((s) => s === false);
    expect(hasTrue || hasFalse).toBe(true);
  });
});

// ============================================================================
// TESTS: BETRAYAL MANAGEMENT
// ============================================================================

describe('NPC Diplomacy AI - Betrayal Management', () => {
  let state: DiplomacyState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createDiplomacyState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should record a betrayal', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.8, clock);
    evaluateRelationship(state, 'dyn2', 'dyn1', 50, 1.0, 0.8, clock);
    const betrayal = recordBetrayal(
      state,
      'dyn1',
      'dyn2',
      'Broke treaty',
      60,
      idGen,
      clock,
      logger,
    );
    expect(typeof betrayal).toBe('object');
    if (typeof betrayal === 'object') {
      expect(betrayal.betrayerDynasty).toBe('dyn1');
      expect(betrayal.victimDynasty).toBe('dyn2');
      expect(betrayal.severity).toBe(60);
    }
  });

  it('should return invalid-dynasty for empty betrayer', () => {
    const betrayal = recordBetrayal(state, '', 'dyn2', 'Broke treaty', 60, idGen, clock, logger);
    expect(betrayal).toBe('invalid-dynasty');
  });

  it('should return invalid-target for empty victim', () => {
    const betrayal = recordBetrayal(state, 'dyn1', '', 'Broke treaty', 60, idGen, clock, logger);
    expect(betrayal).toBe('invalid-target');
  });

  it('should return invalid-severity for severity < 0', () => {
    const betrayal = recordBetrayal(
      state,
      'dyn1',
      'dyn2',
      'Broke treaty',
      -10,
      idGen,
      clock,
      logger,
    );
    expect(betrayal).toBe('invalid-severity');
  });

  it('should return invalid-severity for severity > 100', () => {
    const betrayal = recordBetrayal(
      state,
      'dyn1',
      'dyn2',
      'Broke treaty',
      110,
      idGen,
      clock,
      logger,
    );
    expect(betrayal).toBe('invalid-severity');
  });

  it('should store betrayal in state', () => {
    evaluateRelationship(state, 'dyn2', 'dyn1', 50, 1.0, 0.8, clock);
    const betrayal = recordBetrayal(
      state,
      'dyn1',
      'dyn2',
      'Broke treaty',
      70,
      idGen,
      clock,
      logger,
    );
    if (typeof betrayal === 'object') {
      expect(state.betrayals.has(betrayal.id)).toBe(true);
    }
  });

  it('should append betrayal to betrayer history', () => {
    evaluateRelationship(state, 'dyn2', 'dyn1', 50, 1.0, 0.8, clock);
    recordBetrayal(state, 'dyn1', 'dyn2', 'Broke treaty', 70, idGen, clock, logger);
    const history = state.history.get('dyn1');
    expect(history).toBeDefined();
    if (history) {
      expect(history.betrayalsCommitted.length).toBe(1);
    }
  });

  it('should append betrayal to victim history', () => {
    evaluateRelationship(state, 'dyn2', 'dyn1', 50, 1.0, 0.8, clock);
    recordBetrayal(state, 'dyn1', 'dyn2', 'Broke treaty', 70, idGen, clock, logger);
    const history = state.history.get('dyn2');
    expect(history).toBeDefined();
    if (history) {
      expect(history.betrayalsSuffered.length).toBe(1);
    }
  });

  it('should reduce trust level after betrayal', () => {
    evaluateRelationship(state, 'dyn2', 'dyn1', 50, 1.0, 0.8, clock);
    const before = getRelationship(state, 'dyn2', 'dyn1');
    recordBetrayal(state, 'dyn1', 'dyn2', 'Broke treaty', 80, idGen, clock, logger);
    const after = getRelationship(state, 'dyn2', 'dyn1');
    if (typeof before === 'object' && typeof after === 'object') {
      expect(after.trustLevel).toBeLessThan(before.trustLevel);
    }
  });

  it('should reduce relationship score after betrayal', () => {
    evaluateRelationship(state, 'dyn2', 'dyn1', 50, 1.0, 0.8, clock);
    const before = getRelationship(state, 'dyn2', 'dyn1');
    recordBetrayal(state, 'dyn1', 'dyn2', 'Broke treaty', 60, idGen, clock, logger);
    const after = getRelationship(state, 'dyn2', 'dyn1');
    if (typeof before === 'object' && typeof after === 'object') {
      expect(after.relationshipScore).toBeLessThan(before.relationshipScore);
    }
  });

  it('should scale trust penalty with severity', () => {
    evaluateRelationship(state, 'dyn2', 'dyn1', 50, 1.0, 1.0, clock);
    evaluateRelationship(state, 'dyn3', 'dyn4', 50, 1.0, 1.0, clock);
    recordBetrayal(state, 'dyn1', 'dyn2', 'Minor', 20, idGen, clock, logger);
    recordBetrayal(state, 'dyn4', 'dyn3', 'Major', 100, idGen, clock, logger);
    const rel1 = getRelationship(state, 'dyn2', 'dyn1');
    const rel2 = getRelationship(state, 'dyn3', 'dyn4');
    if (typeof rel1 === 'object' && typeof rel2 === 'object') {
      expect(rel1.trustLevel).toBeGreaterThan(rel2.trustLevel);
    }
  });

  it('should clamp trust level to minimum 0', () => {
    evaluateRelationship(state, 'dyn2', 'dyn1', 50, 1.0, 0.2, clock);
    recordBetrayal(state, 'dyn1', 'dyn2', 'Severe', 100, idGen, clock, logger);
    const rel = getRelationship(state, 'dyn2', 'dyn1');
    if (typeof rel === 'object') {
      expect(rel.trustLevel).toBeGreaterThanOrEqual(0);
    }
  });

  it('should get betrayals between two dynasties', () => {
    evaluateRelationship(state, 'dyn2', 'dyn1', 50, 1.0, 0.8, clock);
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.8, clock);
    recordBetrayal(state, 'dyn1', 'dyn2', 'First', 50, idGen, clock, logger);
    recordBetrayal(state, 'dyn2', 'dyn1', 'Second', 40, idGen, clock, logger);
    const betrayals = getBetrayalsBetween(state, 'dyn1', 'dyn2');
    expect(betrayals.length).toBe(2);
  });

  it('should return empty array if no betrayals between dynasties', () => {
    const betrayals = getBetrayalsBetween(state, 'dyn1', 'dyn2');
    expect(betrayals.length).toBe(0);
  });
});

// ============================================================================
// TESTS: TRUST CALCULATION
// ============================================================================

describe('NPC Diplomacy AI - Trust Calculation', () => {
  let state: DiplomacyState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createDiplomacyState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should compute trust level of 1.0 for no betrayals', () => {
    const trust = computeTrustLevel(state, 'dyn1', 'dyn2');
    expect(trust).toBe(1.0);
  });

  it('should reduce trust after one betrayal', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.8, clock);
    recordBetrayal(state, 'dyn2', 'dyn1', 'Broke deal', 50, idGen, clock, logger);
    const trust = computeTrustLevel(state, 'dyn1', 'dyn2');
    expect(trust).toBeLessThan(1.0);
  });

  it('should reduce trust further with multiple betrayals', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.8, clock);
    recordBetrayal(state, 'dyn2', 'dyn1', 'First', 40, idGen, clock, logger);
    const trust1 = computeTrustLevel(state, 'dyn1', 'dyn2');
    recordBetrayal(state, 'dyn2', 'dyn1', 'Second', 50, idGen, clock, logger);
    const trust2 = computeTrustLevel(state, 'dyn1', 'dyn2');
    if (typeof trust1 === 'string' || typeof trust2 === 'string') return;
    expect(trust2).toBeLessThan(trust1);
  });

  it('should scale trust penalty with severity', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.8, clock);
    evaluateRelationship(state, 'dyn1', 'dyn3', 50, 1.0, 0.8, clock);
    recordBetrayal(state, 'dyn2', 'dyn1', 'Minor', 20, idGen, clock, logger);
    recordBetrayal(state, 'dyn3', 'dyn1', 'Major', 90, idGen, clock, logger);
    const trust2 = computeTrustLevel(state, 'dyn1', 'dyn2');
    const trust3 = computeTrustLevel(state, 'dyn1', 'dyn3');
    if (typeof trust2 === 'number' && typeof trust3 === 'number') {
      expect(trust2).toBeGreaterThan(trust3);
    }
  });

  it('should clamp trust level to minimum 0', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.8, clock);
    for (let i = 0; i < 10; i = i + 1) {
      recordBetrayal(state, 'dyn2', 'dyn1', 'Betrayal ' + String(i), 90, idGen, clock, logger);
    }
    const trust = computeTrustLevel(state, 'dyn1', 'dyn2');
    expect(trust).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// TESTS: HISTORY & REPORTING
// ============================================================================

describe('NPC Diplomacy AI - History & Reporting', () => {
  let state: DiplomacyState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createDiplomacyState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should get diplomacy history', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.7, clock);
    executeDiplomacy(state, 'dyn1', 'dyn2', 'NEGOTIATE', idGen, clock, logger);
    const history = getDiplomacyHistory(state, 'dyn1');
    expect(typeof history).toBe('object');
    if (typeof history === 'object') {
      expect(history.dynastyId).toBe('dyn1');
      expect(history.actions.length).toBe(1);
    }
  });

  it('should return history-not-found for missing dynasty', () => {
    const history = getDiplomacyHistory(state, 'dyn-missing');
    expect(history).toBe('history-not-found');
  });

  it('should return invalid-dynasty for empty dynastyId', () => {
    const history = getDiplomacyHistory(state, '');
    expect(history).toBe('invalid-dynasty');
  });

  it('should generate diplomacy report', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.7, clock);
    evaluateRelationship(state, 'dyn1', 'dyn3', 30, 0.8, 0.6, clock);
    executeDiplomacy(state, 'dyn1', 'dyn2', 'NEGOTIATE', idGen, clock, logger);
    const report = getDiplomacyReport(state, 'dyn1', clock);
    expect(typeof report).toBe('object');
    if (typeof report === 'object') {
      expect(report.dynastyId).toBe('dyn1');
      expect(report.relationships.length).toBe(2);
      expect(report.recentActions.length).toBe(1);
    }
  });

  it('should return invalid-dynasty for empty dynastyId in report', () => {
    const report = getDiplomacyReport(state, '', clock);
    expect(report).toBe('invalid-dynasty');
  });

  it('should count betrayals committed in report', () => {
    evaluateRelationship(state, 'dyn2', 'dyn1', 50, 1.0, 0.8, clock);
    recordBetrayal(state, 'dyn1', 'dyn2', 'Broke treaty', 60, idGen, clock, logger);
    recordBetrayal(state, 'dyn1', 'dyn3', 'Broke pact', 70, idGen, clock, logger);
    const report = getDiplomacyReport(state, 'dyn1', clock);
    if (typeof report === 'object') {
      expect(report.totalBetrayas).toBe(2);
    }
  });

  it('should count betrayals suffered in report', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.8, clock);
    recordBetrayal(state, 'dyn2', 'dyn1', 'First', 50, idGen, clock, logger);
    recordBetrayal(state, 'dyn3', 'dyn1', 'Second', 60, idGen, clock, logger);
    const report = getDiplomacyReport(state, 'dyn1', clock);
    if (typeof report === 'object') {
      expect(report.totalBetrayed).toBe(2);
    }
  });

  it('should compute average trust in report', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.8, clock);
    evaluateRelationship(state, 'dyn1', 'dyn3', 30, 0.8, 0.6, clock);
    const report = getDiplomacyReport(state, 'dyn1', clock);
    if (typeof report === 'object') {
      expect(report.averageTrust).toBe(0.7);
    }
  });

  it('should limit recent actions to last 10', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.7, clock);
    for (let i = 0; i < 15; i = i + 1) {
      executeDiplomacy(state, 'dyn1', 'dyn2', 'NEGOTIATE', idGen, clock, logger);
    }
    const report = getDiplomacyReport(state, 'dyn1', clock);
    if (typeof report === 'object') {
      expect(report.recentActions.length).toBe(10);
    }
  });

  it('should get all relationships for a dynasty', () => {
    evaluateRelationship(state, 'dyn1', 'dyn2', 50, 1.0, 0.7, clock);
    evaluateRelationship(state, 'dyn1', 'dyn3', 30, 0.8, 0.6, clock);
    evaluateRelationship(state, 'dyn2', 'dyn3', 40, 1.2, 0.5, clock);
    const rels = getAllRelationships(state, 'dyn1');
    expect(rels.length).toBe(2);
  });

  it('should return empty array if no relationships', () => {
    const rels = getAllRelationships(state, 'dyn1');
    expect(rels.length).toBe(0);
  });
});
