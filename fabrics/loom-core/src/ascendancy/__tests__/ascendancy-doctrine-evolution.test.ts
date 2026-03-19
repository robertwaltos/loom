import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDominantStrategy,
  buildDoctrineEvolutionCycle,
  issueDoctrineWarning,
  isCycleActive,
  computeCycleDepth,
  ASCENDANCY_COUNTER_MAP,
  DOCTRINE_CYCLE_DAYS,
} from '../ascendancy-doctrine-evolution.js';
import type {
  DoctrineEvolutionState,
  DoctrineWarning,
} from '../ascendancy-doctrine-evolution.js';
import type {
  PlayerPatternProfile,
  DefenseStrategy,
} from '../ascendancy-player-pattern-tracker.js';

function makeProfile(overrides: Partial<PlayerPatternProfile> = {}): PlayerPatternProfile {
  return {
    profileId: 'prof-1',
    calculatedAt: new Date('2025-06-15T00:00:00Z'),
    windowDays: 30,
    topStrategies: [['SHIELD_WALL', 10], ['GUERRILLA', 5]],
    topWeaponClass: 'KINETIC_RAILGUN',
    avgAlertToMobilizationMs: 3000,
    mostActiveWorldId: 'world-1',
    leastActiveWorldId: 'world-2',
    totalObservations: 15,
    ...overrides,
  };
}

describe('ASCENDANCY_COUNTER_MAP', () => {
  it('should have entries for all 8 defense strategies', () => {
    const strategies: DefenseStrategy[] = [
      'SHIELD_WALL', 'GUERRILLA', 'ECONOMIC_FORTRESS',
      'DIPLOMATIC_PIVOT', 'LATTICE_EXPLOIT', 'TOTAL_WITHDRAWAL',
      'AMBUSH_CORRIDOR', 'OTHER',
    ];
    for (const s of strategies) {
      const counter = ASCENDANCY_COUNTER_MAP[s];
      expect(counter).toBeDefined();
      expect(counter.activatesAfterDays).toBe(30);
    }
  });

  it('should counter SHIELD_WALL with SIEGE_ATTRITION', () => {
    expect(ASCENDANCY_COUNTER_MAP.SHIELD_WALL.counterStrategy).toBe('SIEGE_ATTRITION');
  });

  it('should counter GUERRILLA with LATTICE_TRACE_SWEEP', () => {
    expect(ASCENDANCY_COUNTER_MAP.GUERRILLA.counterStrategy).toBe('LATTICE_TRACE_SWEEP');
  });

  it('should have descriptions for all counters', () => {
    const strategies: DefenseStrategy[] = [
      'SHIELD_WALL', 'GUERRILLA', 'ECONOMIC_FORTRESS',
      'DIPLOMATIC_PIVOT', 'LATTICE_EXPLOIT', 'TOTAL_WITHDRAWAL',
      'AMBUSH_CORRIDOR', 'OTHER',
    ];
    for (const s of strategies) {
      expect(ASCENDANCY_COUNTER_MAP[s].description.length).toBeGreaterThan(0);
    }
  });
});

describe('DOCTRINE_CYCLE_DAYS', () => {
  it('should be 30', () => {
    expect(DOCTRINE_CYCLE_DAYS).toBe(30);
  });
});

describe('getDominantStrategy', () => {
  it('should return first strategy from top strategies', () => {
    const profile = makeProfile({
      topStrategies: [['GUERRILLA', 20], ['SHIELD_WALL', 10]],
    });
    expect(getDominantStrategy(profile)).toBe('GUERRILLA');
  });

  it('should return OTHER when topStrategies is empty', () => {
    const profile = makeProfile({ topStrategies: [] });
    expect(getDominantStrategy(profile)).toBe('OTHER');
  });
});

describe('buildDoctrineEvolutionCycle', () => {
  const now = new Date('2025-06-15T00:00:00Z');

  it('should set cycleId from params', () => {
    const cycle = buildDoctrineEvolutionCycle({
      cycleId: 'cycle-1',
      profile: makeProfile(),
      priorCycleIds: [],
      now,
    });
    expect(cycle.cycleId).toBe('cycle-1');
  });

  it('should determine dominant strategy from profile', () => {
    const cycle = buildDoctrineEvolutionCycle({
      cycleId: 'cycle-2',
      profile: makeProfile({ topStrategies: [['ECONOMIC_FORTRESS', 15]] }),
      priorCycleIds: [],
      now,
    });
    expect(cycle.dominantPlayerStrategy).toBe('ECONOMIC_FORTRESS');
  });

  it('should select the correct counter for dominant strategy', () => {
    const cycle = buildDoctrineEvolutionCycle({
      cycleId: 'cycle-3',
      profile: makeProfile({ topStrategies: [['LATTICE_EXPLOIT', 8]] }),
      priorCycleIds: [],
      now,
    });
    expect(cycle.incomingCounter.counterStrategy).toBe('FREQUENCY_DAMPENER');
  });

  it('should set activatesAt to 30 days from now', () => {
    const cycle = buildDoctrineEvolutionCycle({
      cycleId: 'cycle-4',
      profile: makeProfile(),
      priorCycleIds: [],
      now,
    });
    const diffMs = cycle.activatesAt.getTime() - now.getTime();
    expect(diffMs).toBe(30 * 86400000);
  });

  it('should copy priorCycleIds', () => {
    const cycle = buildDoctrineEvolutionCycle({
      cycleId: 'cycle-5',
      profile: makeProfile(),
      priorCycleIds: ['prev-1', 'prev-2'],
      now,
    });
    expect(cycle.priorCycleIds).toEqual(['prev-1', 'prev-2']);
  });

  it('should set cycleStartDate to now', () => {
    const cycle = buildDoctrineEvolutionCycle({
      cycleId: 'cycle-6',
      profile: makeProfile(),
      priorCycleIds: [],
      now,
    });
    expect(cycle.cycleStartDate.getTime()).toBe(now.getTime());
  });
});

describe('issueDoctrineWarning', () => {
  const now = new Date('2025-06-15T00:00:00Z');
  let cycle: DoctrineEvolutionState;

  beforeEach(() => {
    cycle = buildDoctrineEvolutionCycle({
      cycleId: 'cycle-w',
      profile: makeProfile(),
      priorCycleIds: [],
      now,
    });
  });

  it('should set warningId from params', () => {
    const warning = issueDoctrineWarning({
      warningId: 'warn-1',
      dynastyId: 'd1',
      cycle,
      source: 'PALE_CIRCUIT',
      now,
    });
    expect(warning.warningId).toBe('warn-1');
  });

  it('should set dynastyId', () => {
    const warning = issueDoctrineWarning({
      warningId: 'warn-2',
      dynastyId: 'd-abc',
      cycle,
      source: 'SCHOLAR_NPC',
      now,
    });
    expect(warning.dynastyId).toBe('d-abc');
  });

  it('should carry the incoming counter from the cycle', () => {
    const warning = issueDoctrineWarning({
      warningId: 'warn-3',
      dynastyId: 'd1',
      cycle,
      source: 'PALE_CIRCUIT',
      now,
    });
    expect(warning.incomingCounter.counterStrategy).toBe(
      ASCENDANCY_COUNTER_MAP.SHIELD_WALL.counterStrategy
    );
  });

  it('should set source correctly', () => {
    const warning = issueDoctrineWarning({
      warningId: 'warn-4',
      dynastyId: 'd1',
      cycle,
      source: 'SCHOLAR_NPC',
      now,
      sourceNpcId: 42,
    });
    expect(warning.source).toBe('SCHOLAR_NPC');
    expect(warning.sourceNpcId).toBe(42);
  });

  it('should set activatesAt from cycle', () => {
    const warning = issueDoctrineWarning({
      warningId: 'warn-5',
      dynastyId: 'd1',
      cycle,
      source: 'PALE_CIRCUIT',
      now,
    });
    expect(warning.activatesAt.getTime()).toBe(cycle.activatesAt.getTime());
  });
});

describe('isCycleActive', () => {
  const now = new Date('2025-06-15T00:00:00Z');
  let cycle: DoctrineEvolutionState;

  beforeEach(() => {
    cycle = buildDoctrineEvolutionCycle({
      cycleId: 'cycle-a',
      profile: makeProfile(),
      priorCycleIds: [],
      now,
    });
  });

  it('should return false before activation date', () => {
    const before = new Date('2025-07-01T00:00:00Z');
    expect(isCycleActive(cycle, before)).toBe(false);
  });

  it('should return true at activation date', () => {
    expect(isCycleActive(cycle, cycle.activatesAt)).toBe(true);
  });

  it('should return true after activation date', () => {
    const after = new Date(cycle.activatesAt.getTime() + 86400000);
    expect(isCycleActive(cycle, after)).toBe(true);
  });
});

describe('computeCycleDepth', () => {
  it('should return 1 for empty prior cycles', () => {
    expect(computeCycleDepth([])).toBe(1);
  });

  it('should return priorCycleIds.length + 1', () => {
    expect(computeCycleDepth(['c1', 'c2', 'c3'])).toBe(4);
  });

  it('should return 2 for single prior cycle', () => {
    expect(computeCycleDepth(['c1'])).toBe(2);
  });
});
