import { describe, it, expect } from 'vitest';
import {
  createDynastyMortalityEngine,
  GRACE_PERIOD_DEFAULT_US,
  MAX_DORMANCY_DURATION_US,
} from '../dynasty-mortality.js';
import type {
  MortalityDeps,
  MortalityEvent,
  DynastyMortalityEngine,
  MortalityTransition,
  GracePeriodStatus,
} from '../dynasty-mortality.js';

// ─── Test Helpers ────────────────────────────────────────────────────

function createMockDeps(): MortalityDeps & {
  readonly events: MortalityEvent[];
  setTime: (us: number) => void;
} {
  let currentTime = 1_000_000;
  let idCounter = 0;
  const events: MortalityEvent[] = [];

  return {
    events,
    setTime: (us: number) => {
      currentTime = us;
    },
    clock: {
      nowMicroseconds: () => currentTime,
    },
    idGenerator: {
      next: () => {
        idCounter += 1;
        return 'id-' + String(idCounter);
      },
    },
    notifications: {
      notify: (event: MortalityEvent) => {
        events.push(event);
      },
    },
  };
}

function createEngine(): {
  engine: DynastyMortalityEngine;
  deps: ReturnType<typeof createMockDeps>;
} {
  const deps = createMockDeps();
  const engine = createDynastyMortalityEngine(deps);
  return { engine, deps };
}

function isTransition(result: MortalityTransition | string): result is MortalityTransition {
  return typeof result !== 'string';
}

function isGraceStatus(result: GracePeriodStatus | string): result is GracePeriodStatus {
  return typeof result !== 'string';
}

// ─── Registration ────────────────────────────────────────────────────

describe('DynastyMortalityEngine - registerDynasty', () => {
  it('registers a dynasty in ACTIVE state', () => {
    const { engine } = createEngine();
    const record = engine.registerDynasty('d-1');

    expect(record.dynastyId).toBe('d-1');
    expect(record.state).toBe('ACTIVE');
    expect(record.gracePeriod).toBeNull();
  });

  it('overwrites a previously registered dynasty', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    const record = engine.registerDynasty('d-1');

    expect(record.state).toBe('ACTIVE');
  });

  it('registers multiple dynasties independently', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.registerDynasty('d-2');
    engine.registerDynasty('d-3');

    const stats = engine.getStats();
    expect(stats.totalRegistered).toBe(3);
    expect(stats.activeCount).toBe(3);
  });
});

// ─── setDormant ──────────────────────────────────────────────────────

describe('DynastyMortalityEngine - setDormant', () => {
  it('transitions ACTIVE to DORMANT', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');

    const result = engine.setDormant('d-1', 'Player inactive');

    expect(isTransition(result)).toBe(true);
    if (isTransition(result)) {
      expect(result.from).toBe('ACTIVE');
      expect(result.to).toBe('DORMANT');
      expect(result.reason).toBe('Player inactive');
      expect(result.dynastyId).toBe('d-1');
    }
  });

  it('returns error for unknown dynasty', () => {
    const { engine } = createEngine();
    const result = engine.setDormant('unknown', 'reason');
    expect(result).toBe('DYNASTY_NOT_FOUND');
  });

  it('returns error when already DORMANT', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'first');

    const result = engine.setDormant('d-1', 'second');
    expect(result).toBe('INVALID_TRANSITION');
  });

  it('returns error when DECEASED', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.declareDeath('d-1');

    const result = engine.setDormant('d-1', 'too late');
    expect(result).toBe('INVALID_TRANSITION');
  });

  it('emits state_changed event', () => {
    const { engine, deps } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'Player inactive');

    const stateEvents = deps.events.filter((e) => e.type === 'state_changed');
    expect(stateEvents).toHaveLength(1);
    expect(stateEvents[0]?.payload['from']).toBe('ACTIVE');
    expect(stateEvents[0]?.payload['to']).toBe('DORMANT');
  });
});

// ─── reactivate ──────────────────────────────────────────────────────

describe('DynastyMortalityEngine - reactivate', () => {
  it('transitions DORMANT back to ACTIVE', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'inactive');

    const result = engine.reactivate('d-1');

    expect(isTransition(result)).toBe(true);
    if (isTransition(result)) {
      expect(result.from).toBe('DORMANT');
      expect(result.to).toBe('ACTIVE');
    }
  });

  it('returns error for unknown dynasty', () => {
    const { engine } = createEngine();
    expect(engine.reactivate('unknown')).toBe('DYNASTY_NOT_FOUND');
  });

  it('returns error when already ACTIVE', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    expect(engine.reactivate('d-1')).toBe('INVALID_TRANSITION');
  });

  it('returns error when DECEASED', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.declareDeath('d-1');
    expect(engine.reactivate('d-1')).toBe('INVALID_TRANSITION');
  });

  it('clears grace period on reactivation', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'inactive');
    engine.startGracePeriod('d-1', GRACE_PERIOD_DEFAULT_US);
    engine.reactivate('d-1');

    const record = engine.getRecord('d-1');
    expect(record?.gracePeriod).toBeNull();
    expect(record?.state).toBe('ACTIVE');
  });
});

// ─── declareDeath ────────────────────────────────────────────────────

describe('DynastyMortalityEngine - declareDeath', () => {
  it('transitions ACTIVE to DECEASED', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');

    const result = engine.declareDeath('d-1');

    expect(isTransition(result)).toBe(true);
    if (isTransition(result)) {
      expect(result.from).toBe('ACTIVE');
      expect(result.to).toBe('DECEASED');
    }
  });

  it('transitions DORMANT to DECEASED', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'inactive');

    const result = engine.declareDeath('d-1');

    expect(isTransition(result)).toBe(true);
    if (isTransition(result)) {
      expect(result.from).toBe('DORMANT');
      expect(result.to).toBe('DECEASED');
    }
  });

  it('returns error for unknown dynasty', () => {
    const { engine } = createEngine();
    expect(engine.declareDeath('unknown')).toBe('DYNASTY_NOT_FOUND');
  });

  it('returns error when already DECEASED', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.declareDeath('d-1');
    expect(engine.declareDeath('d-1')).toBe('INVALID_TRANSITION');
  });

  it('clears grace period on death', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'inactive');
    engine.startGracePeriod('d-1', GRACE_PERIOD_DEFAULT_US);
    engine.declareDeath('d-1');

    const record = engine.getRecord('d-1');
    expect(record?.gracePeriod).toBeNull();
  });
});

// ─── Grace Period ────────────────────────────────────────────────────

describe('DynastyMortalityEngine - startGracePeriod', () => {
  it('starts grace period on DORMANT dynasty', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'inactive');

    const result = engine.startGracePeriod('d-1', GRACE_PERIOD_DEFAULT_US);

    expect(isGraceStatus(result)).toBe(true);
    if (isGraceStatus(result)) {
      expect(result.dynastyId).toBe('d-1');
      expect(result.durationUs).toBe(GRACE_PERIOD_DEFAULT_US);
      expect(result.expired).toBe(false);
      expect(result.remainingUs).toBe(GRACE_PERIOD_DEFAULT_US);
    }
  });

  it('returns error for unknown dynasty', () => {
    const { engine } = createEngine();
    expect(engine.startGracePeriod('unknown', GRACE_PERIOD_DEFAULT_US)).toBe('DYNASTY_NOT_FOUND');
  });

  it('returns error when ACTIVE', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    expect(engine.startGracePeriod('d-1', GRACE_PERIOD_DEFAULT_US)).toBe('INVALID_STATE');
  });

  it('returns error when grace already active', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'inactive');
    engine.startGracePeriod('d-1', GRACE_PERIOD_DEFAULT_US);

    expect(engine.startGracePeriod('d-1', GRACE_PERIOD_DEFAULT_US)).toBe('GRACE_ALREADY_ACTIVE');
  });

  it('emits grace_started event', () => {
    const { engine, deps } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'inactive');
    engine.startGracePeriod('d-1', GRACE_PERIOD_DEFAULT_US);

    const graceEvents = deps.events.filter((e) => e.type === 'grace_started');
    expect(graceEvents).toHaveLength(1);
  });
});

describe('DynastyMortalityEngine - checkGracePeriod', () => {
  it('returns grace status with remaining time', () => {
    const { engine, deps } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'inactive');
    engine.startGracePeriod('d-1', 100_000_000);

    deps.setTime(1_000_000 + 50_000_000);
    const result = engine.checkGracePeriod('d-1');

    expect(isGraceStatus(result)).toBe(true);
    if (isGraceStatus(result)) {
      expect(result.expired).toBe(false);
      expect(result.remainingUs).toBe(50_000_000);
    }
  });

  it('reports expired grace period', () => {
    const { engine, deps } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'inactive');
    engine.startGracePeriod('d-1', 100_000_000);

    deps.setTime(1_000_000 + 200_000_000);
    const result = engine.checkGracePeriod('d-1');

    expect(isGraceStatus(result)).toBe(true);
    if (isGraceStatus(result)) {
      expect(result.expired).toBe(true);
      expect(result.remainingUs).toBe(0);
    }
  });

  it('returns error for unknown dynasty', () => {
    const { engine } = createEngine();
    expect(engine.checkGracePeriod('unknown')).toBe('DYNASTY_NOT_FOUND');
  });

  it('returns error when no grace period active', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    expect(engine.checkGracePeriod('d-1')).toBe('NO_GRACE_PERIOD');
  });

  it('emits grace_expired event when expired', () => {
    const { engine, deps } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'inactive');
    engine.startGracePeriod('d-1', 100_000_000);

    deps.setTime(1_000_000 + 200_000_000);
    engine.checkGracePeriod('d-1');

    const expiredEvents = deps.events.filter((e) => e.type === 'grace_expired');
    expect(expiredEvents).toHaveLength(1);
  });

  it('emits grace_checked event when not expired', () => {
    const { engine, deps } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'inactive');
    engine.startGracePeriod('d-1', 100_000_000);

    deps.setTime(1_000_000 + 50_000_000);
    engine.checkGracePeriod('d-1');

    const checkedEvents = deps.events.filter((e) => e.type === 'grace_checked');
    expect(checkedEvents).toHaveLength(1);
  });
});

// ─── getRecord ───────────────────────────────────────────────────────

describe('DynastyMortalityEngine - getRecord', () => {
  it('returns record for registered dynasty', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');

    const record = engine.getRecord('d-1');
    expect(record).toBeDefined();
    expect(record?.dynastyId).toBe('d-1');
    expect(record?.state).toBe('ACTIVE');
  });

  it('returns undefined for unregistered dynasty', () => {
    const { engine } = createEngine();
    expect(engine.getRecord('missing')).toBeUndefined();
  });

  it('reflects current state after transitions', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'inactive');

    const record = engine.getRecord('d-1');
    expect(record?.state).toBe('DORMANT');
  });
});

// ─── listByState ─────────────────────────────────────────────────────

describe('DynastyMortalityEngine - listByState', () => {
  it('lists dynasties in a given state', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.registerDynasty('d-2');
    engine.registerDynasty('d-3');
    engine.setDormant('d-2', 'idle');
    engine.declareDeath('d-3');

    expect(engine.listByState('ACTIVE')).toHaveLength(1);
    expect(engine.listByState('DORMANT')).toHaveLength(1);
    expect(engine.listByState('DECEASED')).toHaveLength(1);
  });

  it('returns empty array when no dynasties in state', () => {
    const { engine } = createEngine();
    expect(engine.listByState('DECEASED')).toHaveLength(0);
  });

  it('returns readonly records', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');

    const list = engine.listByState('ACTIVE');
    expect(list).toHaveLength(1);
    expect(list[0]?.dynastyId).toBe('d-1');
  });
});

// ─── getTransitionHistory ────────────────────────────────────────────

describe('DynastyMortalityEngine - getTransitionHistory', () => {
  it('returns empty array for new dynasty', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');

    expect(engine.getTransitionHistory('d-1')).toHaveLength(0);
  });

  it('returns all transitions in order', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'idle');
    engine.reactivate('d-1');
    engine.setDormant('d-1', 'idle again');
    engine.declareDeath('d-1');

    const history = engine.getTransitionHistory('d-1');
    expect(history).toHaveLength(4);
    expect(history[0]?.to).toBe('DORMANT');
    expect(history[1]?.to).toBe('ACTIVE');
    expect(history[2]?.to).toBe('DORMANT');
    expect(history[3]?.to).toBe('DECEASED');
  });

  it('returns empty array for unregistered dynasty', () => {
    const { engine } = createEngine();
    expect(engine.getTransitionHistory('unknown')).toHaveLength(0);
  });

  it('records have unique transition IDs', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.setDormant('d-1', 'idle');
    engine.reactivate('d-1');

    const history = engine.getTransitionHistory('d-1');
    const ids = history.map((t) => t.transitionId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── getStats ────────────────────────────────────────────────────────

describe('DynastyMortalityEngine - getStats', () => {
  it('returns zeroed stats initially', () => {
    const { engine } = createEngine();
    const stats = engine.getStats();

    expect(stats.totalRegistered).toBe(0);
    expect(stats.activeCount).toBe(0);
    expect(stats.dormantCount).toBe(0);
    expect(stats.deceasedCount).toBe(0);
    expect(stats.totalTransitions).toBe(0);
    expect(stats.totalGracePeriodsStarted).toBe(0);
  });

  it('tracks all counters correctly', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.registerDynasty('d-2');
    engine.registerDynasty('d-3');

    engine.setDormant('d-1', 'idle');
    engine.startGracePeriod('d-1', GRACE_PERIOD_DEFAULT_US);
    engine.declareDeath('d-2');
    engine.setDormant('d-3', 'inactive');
    engine.reactivate('d-3');

    const stats = engine.getStats();
    expect(stats.totalRegistered).toBe(3);
    expect(stats.activeCount).toBe(1);
    expect(stats.dormantCount).toBe(1);
    expect(stats.deceasedCount).toBe(1);
    expect(stats.totalTransitions).toBe(4);
    expect(stats.totalGracePeriodsStarted).toBe(1);
  });
});

// ─── Constants ───────────────────────────────────────────────────────

describe('DynastyMortalityEngine - constants', () => {
  it('exports GRACE_PERIOD_DEFAULT_US as 30 days in microseconds', () => {
    const thirtyDaysUs = 30 * 24 * 60 * 60 * 1_000_000;
    expect(GRACE_PERIOD_DEFAULT_US).toBe(thirtyDaysUs);
  });

  it('exports MAX_DORMANCY_DURATION_US as 180 days in microseconds', () => {
    const oneEightyDaysUs = 180 * 24 * 60 * 60 * 1_000_000;
    expect(MAX_DORMANCY_DURATION_US).toBe(oneEightyDaysUs);
  });
});

// ─── Full Lifecycle ──────────────────────────────────────────────────

describe('DynastyMortalityEngine - full lifecycle', () => {
  it('supports ACTIVE → DORMANT → ACTIVE → DORMANT → DECEASED', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');

    expect(engine.getRecord('d-1')?.state).toBe('ACTIVE');

    engine.setDormant('d-1', 'first dormancy');
    expect(engine.getRecord('d-1')?.state).toBe('DORMANT');

    engine.reactivate('d-1');
    expect(engine.getRecord('d-1')?.state).toBe('ACTIVE');

    engine.setDormant('d-1', 'second dormancy');
    expect(engine.getRecord('d-1')?.state).toBe('DORMANT');

    engine.declareDeath('d-1');
    expect(engine.getRecord('d-1')?.state).toBe('DECEASED');

    const history = engine.getTransitionHistory('d-1');
    expect(history).toHaveLength(4);
  });

  it('DECEASED is terminal - no further transitions', () => {
    const { engine } = createEngine();
    engine.registerDynasty('d-1');
    engine.declareDeath('d-1');

    expect(engine.setDormant('d-1', 'nope')).toBe('INVALID_TRANSITION');
    expect(engine.reactivate('d-1')).toBe('INVALID_TRANSITION');
    expect(engine.declareDeath('d-1')).toBe('INVALID_TRANSITION');
  });
});
