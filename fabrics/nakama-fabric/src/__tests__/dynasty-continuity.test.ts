import { describe, it, expect } from 'vitest';
import { createContinuityEngine } from '../dynasty-continuity.js';
import type { ContinuityEngine, ContinuityState } from '../dynasty-continuity.js';
import type { SubscriptionTier } from '../dynasty.js';

const US_PER_DAY = 24 * 60 * 60 * 1_000_000;

function createTestClock(initialDays = 0) {
  let time = initialDays * US_PER_DAY;
  return {
    nowMicroseconds: () => time,
    advanceDays(days: number) { time += days * US_PER_DAY; },
  };
}

function createTestEngine(initialDays = 0) {
  const clock = createTestClock(initialDays);
  const engine = createContinuityEngine({ clock });
  return { engine, clock };
}

function progressToRedistribution(
  engine: ContinuityEngine,
  clock: ReturnType<typeof createTestClock>,
  dynastyId: string,
  tier: SubscriptionTier = 'free',
) {
  engine.initializeRecord(dynastyId, tier);
  clock.advanceDays(180);
  while (engine.getRecord(dynastyId).state !== 'redistribution') {
    engine.evaluateInactivity(dynastyId);
  }
}

function progressToCompleted(
  engine: ContinuityEngine,
  clock: ReturnType<typeof createTestClock>,
  dynastyId: string,
  tier: SubscriptionTier = 'free',
) {
  progressToRedistribution(engine, clock, dynastyId, tier);
  engine.completeRedistribution(dynastyId);
}

// ─── Initialization ──────────────────────────────────────────────────

describe('ContinuityEngine initialization', () => {
  it('creates record in active state', () => {
    const { engine } = createTestEngine();
    const record = engine.initializeRecord('house-atreides', 'accord');
    expect(record.state).toBe('active');
    expect(record.dynastyId).toBe('house-atreides');
    expect(record.subscriptionTier).toBe('accord');
    expect(record.heirDynastyIds).toEqual([]);
    expect(record.completedAt).toBeNull();
    expect(record.vigilSince).toBeNull();
    expect(record.activatingHeirId).toBeNull();
  });

  it('rejects duplicate records', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    expect(() => engine.initializeRecord('house-atreides', 'free'))
      .toThrow('already exists');
  });

  it('throws for unknown dynasty on get', () => {
    const { engine } = createTestEngine();
    expect(() => engine.getRecord('nope')).toThrow('not found');
  });

  it('returns undefined for unknown dynasty on tryGet', () => {
    const { engine } = createTestEngine();
    expect(engine.tryGetRecord('nope')).toBeUndefined();
  });

  it('counts records', () => {
    const { engine } = createTestEngine();
    expect(engine.count()).toBe(0);
    engine.initializeRecord('d1', 'free');
    engine.initializeRecord('d2', 'accord');
    expect(engine.count()).toBe(2);
  });
});

// ─── Login Recovery (dormant states) ─────────────────────────────────

describe('ContinuityEngine login recovery from dormant states', () => {
  it('recovers from dormant_30', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(31);
    engine.evaluateInactivity('house-atreides');

    const transition = engine.recordLogin('house-atreides');
    expect(transition).not.toBeNull();
    expect(transition?.from).toBe('dormant_30');
    expect(transition?.to).toBe('active');
  });

  it('recovers from dormant_60', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(61);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');

    const transition = engine.recordLogin('house-atreides');
    expect(transition?.from).toBe('dormant_60');
    expect(transition?.to).toBe('active');
  });

  it('recovers from grace_window', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'accord');
    clock.advanceDays(61);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');

    const transition = engine.recordLogin('house-atreides');
    expect(transition?.from).toBe('grace_window');
    expect(transition?.to).toBe('active');
  });

  it('recovers from continuity_triggered', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(92);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');

    const transition = engine.recordLogin('house-atreides');
    expect(transition?.from).toBe('continuity_triggered');
    expect(transition?.to).toBe('active');
  });
});

// ─── Login Recovery (non-recoverable) ────────────────────────────────

describe('ContinuityEngine login non-recoverable states', () => {
  it('returns null for active state login', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    expect(engine.recordLogin('house-atreides')).toBeNull();
  });

  it('returns null for completed state login', () => {
    const { engine, clock } = createTestEngine();
    progressToCompleted(engine, clock, 'house-atreides');
    expect(engine.recordLogin('house-atreides')).toBeNull();
  });

  it('returns null for terminal states', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    engine.declareVigil('house-atreides');
    expect(engine.recordLogin('house-atreides')).toBeNull();
  });
});

// ─── Free Tier Early Dormancy ────────────────────────────────────────

describe('ContinuityEngine free tier early dormancy', () => {
  it('progresses active → dormant_30 at day 30', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(29);
    expect(engine.evaluateInactivity('house-atreides')).toBeNull();

    clock.advanceDays(1);
    const transition = engine.evaluateInactivity('house-atreides');
    expect(transition?.to).toBe('dormant_30');
  });

  it('progresses dormant_30 → dormant_60 at day 60', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(60);
    engine.evaluateInactivity('house-atreides');

    const transition = engine.evaluateInactivity('house-atreides');
    expect(transition?.to).toBe('dormant_60');
  });

  it('enforces Day 91 protection for free tier', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(90);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    expect(engine.evaluateInactivity('house-atreides')).toBeNull();

    clock.advanceDays(1);
    const transition = engine.evaluateInactivity('house-atreides');
    expect(transition?.to).toBe('continuity_triggered');
  });

  it('skips grace_window for free tier', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(91);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    expect(engine.getRecord('house-atreides').state).toBe('continuity_triggered');
  });
});

// ─── Free Tier Late Continuity ────────────────────────────────────────

describe('ContinuityEngine free tier late continuity', () => {
  it('progresses continuity_triggered → redistribution at day 180', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(179);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    expect(engine.evaluateInactivity('house-atreides')).toBeNull();

    clock.advanceDays(1);
    expect(engine.evaluateInactivity('house-atreides')?.to).toBe('redistribution');
  });

  it('completes redistribution → completed', () => {
    const { engine, clock } = createTestEngine();
    progressToRedistribution(engine, clock, 'house-atreides');

    const transition = engine.completeRedistribution('house-atreides');
    expect(transition.to).toBe('completed');
    expect(engine.getRecord('house-atreides').completedAt).not.toBeNull();
  });
});

// ─── Paying Tier Progression ─────────────────────────────────────────

describe('ContinuityEngine paying tier progression', () => {
  it('accord enters grace_window after dormant_60', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'accord');
    clock.advanceDays(60);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    expect(engine.evaluateInactivity('house-atreides')?.to).toBe('grace_window');
  });

  it('accord triggers continuity at day 91 (Day 91 protection)', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'accord');
    clock.advanceDays(60);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');

    clock.advanceDays(30);
    expect(engine.evaluateInactivity('house-atreides')).toBeNull();

    clock.advanceDays(1);
    expect(engine.evaluateInactivity('house-atreides')?.to).toBe('continuity_triggered');
  });

  it('patron triggers continuity at day 120 (60+60)', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'patron');
    clock.advanceDays(60);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');

    clock.advanceDays(59);
    expect(engine.evaluateInactivity('house-atreides')).toBeNull();

    clock.advanceDays(1);
    expect(engine.evaluateInactivity('house-atreides')?.to).toBe('continuity_triggered');
  });

  it('herald triggers continuity at day 150 (60+90)', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'herald');
    clock.advanceDays(60);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');

    clock.advanceDays(89);
    expect(engine.evaluateInactivity('house-atreides')).toBeNull();

    clock.advanceDays(1);
    expect(engine.evaluateInactivity('house-atreides')?.to).toBe('continuity_triggered');
  });
});

// ─── Tier Update ─────────────────────────────────────────────────────

describe('ContinuityEngine subscription tier update', () => {
  it('changes tier on existing record', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    engine.updateSubscriptionTier('house-atreides', 'herald');
    expect(engine.getRecord('house-atreides').subscriptionTier).toBe('herald');
  });

  it('affects grace window calculation after upgrade', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(60);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');

    engine.updateSubscriptionTier('house-atreides', 'patron');
    expect(engine.evaluateInactivity('house-atreides')?.to).toBe('grace_window');
  });
});

// ─── Heir Management ─────────────────────────────────────────────────

describe('ContinuityEngine heir management', () => {
  it('registers heirs', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    engine.registerHeir('house-atreides', 'paul-atreides');
    engine.registerHeir('house-atreides', 'alia-atreides');
    expect(engine.getRecord('house-atreides').heirDynastyIds)
      .toEqual(['paul-atreides', 'alia-atreides']);
  });

  it('duplicate heir registration is idempotent', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    engine.registerHeir('house-atreides', 'paul-atreides');
    engine.registerHeir('house-atreides', 'paul-atreides');
    expect(engine.getRecord('house-atreides').heirDynastyIds).toEqual(['paul-atreides']);
  });

  it('removes heirs', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    engine.registerHeir('house-atreides', 'paul-atreides');
    engine.registerHeir('house-atreides', 'alia-atreides');
    engine.removeHeir('house-atreides', 'paul-atreides');
    expect(engine.getRecord('house-atreides').heirDynastyIds).toEqual(['alia-atreides']);
  });

  it('removing non-existent heir is a no-op', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    engine.removeHeir('house-atreides', 'nope');
    expect(engine.getRecord('house-atreides').heirDynastyIds).toEqual([]);
  });
});

// ─── Vigil (valid transitions) ───────────────────────────────────

describe('ContinuityEngine vigil entry', () => {
  it('enters vigil from active', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    const transition = engine.declareVigil('house-atreides');
    expect(transition.to).toBe('vigil');
    expect(engine.getRecord('house-atreides').vigilSince).not.toBeNull();
  });

  it('enters vigil from dormant_30', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(31);
    engine.evaluateInactivity('house-atreides');
    expect(engine.declareVigil('house-atreides').from).toBe('dormant_30');
  });

  it('enters vigil from continuity_triggered', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(91);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    expect(engine.declareVigil('house-atreides').from).toBe('continuity_triggered');
  });

  it('enters vigil from redistribution', () => {
    const { engine, clock } = createTestEngine();
    progressToRedistribution(engine, clock, 'house-atreides');
    expect(engine.declareVigil('house-atreides').from).toBe('redistribution');
  });
});

// ─── Vigil (rejection and terminal) ──────────────────────────────

describe('ContinuityEngine vigil rejection', () => {
  it('rejects vigil from completed', () => {
    const { engine, clock } = createTestEngine();
    progressToCompleted(engine, clock, 'house-atreides');
    expect(() => engine.declareVigil('house-atreides')).toThrow('terminal state');
  });

  it('rejects vigil from vigil', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    engine.declareVigil('house-atreides');
    expect(() => engine.declareVigil('house-atreides')).toThrow('terminal state');
  });

  it('rejects vigil from legacy_npc', () => {
    const { engine, clock } = createTestEngine();
    progressToCompleted(engine, clock, 'house-atreides');
    engine.convertToLegacyNpc('house-atreides');
    expect(() => engine.declareVigil('house-atreides')).toThrow('terminal state');
  });

  it('vigil is terminal — no further evaluation transitions', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    engine.declareVigil('house-atreides');
    clock.advanceDays(365);
    const relevant = engine.evaluateAll().filter((t) => t.dynastyId === 'house-atreides');
    expect(relevant).toHaveLength(0);
  });
});

// ─── Heir Activation ─────────────────────────────────────────────────

describe('ContinuityEngine heir activation', () => {
  it('activates registered heir from completed state', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    engine.registerHeir('house-atreides', 'paul-atreides');
    clock.advanceDays(180);
    while (engine.getRecord('house-atreides').state !== 'redistribution') {
      engine.evaluateInactivity('house-atreides');
    }
    engine.completeRedistribution('house-atreides');

    const transition = engine.activateHeir('house-atreides', 'paul-atreides');
    expect(transition.to).toBe('heir_activated');
    expect(engine.getRecord('house-atreides').activatingHeirId).toBe('paul-atreides');
  });

  it('rejects unregistered heir', () => {
    const { engine, clock } = createTestEngine();
    progressToCompleted(engine, clock, 'house-atreides');
    expect(() => engine.activateHeir('house-atreides', 'nope')).toThrow('not registered');
  });

  it('rejects heir activation from non-completed state', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    engine.registerHeir('house-atreides', 'paul-atreides');
    expect(() => engine.activateHeir('house-atreides', 'paul-atreides'))
      .toThrow('Invalid continuity transition');
  });

  it('heir_activated is terminal', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    engine.registerHeir('house-atreides', 'paul-atreides');
    clock.advanceDays(180);
    while (engine.getRecord('house-atreides').state !== 'redistribution') {
      engine.evaluateInactivity('house-atreides');
    }
    engine.completeRedistribution('house-atreides');
    engine.activateHeir('house-atreides', 'paul-atreides');

    clock.advanceDays(365);
    const relevant = engine.evaluateAll().filter((t) => t.dynastyId === 'house-atreides');
    expect(relevant).toHaveLength(0);
  });
});

// ─── Legacy NPC Conversion ───────────────────────────────────────────

describe('ContinuityEngine legacy NPC', () => {
  it('manually converts completed to legacy_npc', () => {
    const { engine, clock } = createTestEngine();
    progressToCompleted(engine, clock, 'house-atreides');
    expect(engine.convertToLegacyNpc('house-atreides').to).toBe('legacy_npc');
  });

  it('auto-converts after 2 years via evaluateAll', () => {
    const { engine, clock } = createTestEngine();
    progressToCompleted(engine, clock, 'house-atreides');

    clock.advanceDays(729);
    expect(engine.evaluateAll().filter((t) => t.dynastyId === 'house-atreides'))
      .toHaveLength(0);

    clock.advanceDays(1);
    const relevant = engine.evaluateAll().filter((t) => t.dynastyId === 'house-atreides');
    expect(relevant).toHaveLength(1);
    expect(relevant[0]?.to).toBe('legacy_npc');
  });

  it('rejects from non-completed state', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    expect(() => engine.convertToLegacyNpc('house-atreides'))
      .toThrow('Invalid continuity transition');
  });
});

// ─── Redistribution ──────────────────────────────────────────────────

describe('ContinuityEngine redistribution', () => {
  it('rejects completeRedistribution from non-redistribution state', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    expect(() => engine.completeRedistribution('house-atreides'))
      .toThrow('Invalid continuity transition');
  });

  it('redistribution does not auto-transition', () => {
    const { engine, clock } = createTestEngine();
    progressToRedistribution(engine, clock, 'house-atreides');
    clock.advanceDays(100);
    expect(engine.evaluateInactivity('house-atreides')).toBeNull();
  });
});

// ─── evaluateAll Batch Processing ────────────────────────────────────

describe('ContinuityEngine evaluateAll', () => {
  it('processes multiple records in single evaluation', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('d1', 'free');
    engine.initializeRecord('d2', 'free');
    engine.initializeRecord('d3', 'free');
    clock.advanceDays(31);
    const transitions = engine.evaluateAll();
    expect(transitions).toHaveLength(3);
    for (const t of transitions) expect(t.to).toBe('dormant_30');
  });

  it('skips terminal states in evaluation', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('d1', 'free');
    engine.initializeRecord('d2', 'free');
    engine.declareVigil('d2');
    clock.advanceDays(31);
    const transitions = engine.evaluateAll();
    expect(transitions).toHaveLength(1);
    expect(transitions[0]?.dynastyId).toBe('d1');
  });

  it('handles mixed states across records', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('active-one', 'free');
    engine.initializeRecord('dormant-one', 'free');
    clock.advanceDays(30);
    engine.evaluateInactivity('dormant-one');
    engine.recordLogin('active-one');

    clock.advanceDays(30);
    const transitions = engine.evaluateAll();
    expect(transitions.some((t) => t.dynastyId === 'active-one' && t.to === 'dormant_30'))
      .toBe(true);
    expect(transitions.some((t) => t.dynastyId === 'dormant-one' && t.to === 'dormant_60'))
      .toBe(true);
  });
});

// ─── listByState ─────────────────────────────────────────────────────

describe('ContinuityEngine listByState', () => {
  it('filters records by state', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('d1', 'free');
    engine.initializeRecord('d2', 'free');
    engine.initializeRecord('d3', 'free');
    clock.advanceDays(31);
    engine.evaluateInactivity('d1');
    expect(engine.listByState('active')).toHaveLength(2);
    expect(engine.listByState('dormant_30')).toHaveLength(1);
  });
});

// ─── daysUntilNextTransition (active/dormant) ────────────────────────

describe('ContinuityEngine timing for active and dormant', () => {
  it('returns 30 for fresh active record', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    expect(engine.daysUntilNextTransition('house-atreides')).toBe(30);
  });

  it('decreases as time passes', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(10);
    expect(engine.daysUntilNextTransition('house-atreides')).toBe(20);
  });

  it('returns days until day 60 for dormant_30', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(30);
    engine.evaluateInactivity('house-atreides');
    expect(engine.daysUntilNextTransition('house-atreides')).toBe(30);
  });

  it('returns 0 for dormant_60 with grace window', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'accord');
    clock.advanceDays(60);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    expect(engine.daysUntilNextTransition('house-atreides')).toBe(0);
  });

  it('returns days until day 91 for free dormant_60', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(60);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    expect(engine.daysUntilNextTransition('house-atreides')).toBe(31);
  });
});

// ─── daysUntilNextTransition (advanced states) ───────────────────────

describe('ContinuityEngine timing for advanced states', () => {
  it('returns days until threshold for grace_window', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'patron');
    clock.advanceDays(60);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    expect(engine.daysUntilNextTransition('house-atreides')).toBe(60);
  });

  it('returns days until day 180 for continuity_triggered', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    clock.advanceDays(91);
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    engine.evaluateInactivity('house-atreides');
    expect(engine.daysUntilNextTransition('house-atreides')).toBe(89);
  });

  it('returns days until heir window expiry for completed', () => {
    const { engine, clock } = createTestEngine();
    progressToCompleted(engine, clock, 'house-atreides');
    expect(engine.daysUntilNextTransition('house-atreides')).toBe(730);
  });

  it('returns null for terminal states', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    engine.declareVigil('house-atreides');
    expect(engine.daysUntilNextTransition('house-atreides')).toBeNull();
  });

  it('returns null for redistribution', () => {
    const { engine, clock } = createTestEngine();
    progressToRedistribution(engine, clock, 'house-atreides');
    expect(engine.daysUntilNextTransition('house-atreides')).toBeNull();
  });
});

// ─── Full Lifecycle: Free Tier ───────────────────────────────────────

describe('ContinuityEngine full lifecycle free tier', () => {
  it('walks through complete death cycle with heir', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-atreides', 'free');
    engine.registerHeir('house-atreides', 'paul-atreides');
    const states: ContinuityState[] = ['active'];

    clock.advanceDays(30);
    engine.evaluateInactivity('house-atreides');
    states.push(engine.getRecord('house-atreides').state);

    clock.advanceDays(30);
    engine.evaluateInactivity('house-atreides');
    states.push(engine.getRecord('house-atreides').state);

    clock.advanceDays(31);
    engine.evaluateInactivity('house-atreides');
    states.push(engine.getRecord('house-atreides').state);

    clock.advanceDays(89);
    engine.evaluateInactivity('house-atreides');
    states.push(engine.getRecord('house-atreides').state);

    engine.completeRedistribution('house-atreides');
    states.push(engine.getRecord('house-atreides').state);

    engine.activateHeir('house-atreides', 'paul-atreides');
    states.push(engine.getRecord('house-atreides').state);

    expect(states).toEqual([
      'active', 'dormant_30', 'dormant_60',
      'continuity_triggered', 'redistribution', 'completed', 'heir_activated',
    ]);
  });
});

// ─── Full Lifecycle: Herald Tier ─────────────────────────────────────

describe('ContinuityEngine full lifecycle herald tier', () => {
  it('walks through complete death cycle with grace window', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('house-corrino', 'herald');

    clock.advanceDays(30);
    engine.evaluateInactivity('house-corrino');
    expect(engine.getRecord('house-corrino').state).toBe('dormant_30');

    clock.advanceDays(30);
    engine.evaluateInactivity('house-corrino');
    engine.evaluateInactivity('house-corrino');
    expect(engine.getRecord('house-corrino').state).toBe('grace_window');

    clock.advanceDays(90);
    engine.evaluateInactivity('house-corrino');
    expect(engine.getRecord('house-corrino').state).toBe('continuity_triggered');

    clock.advanceDays(30);
    engine.evaluateInactivity('house-corrino');
    engine.completeRedistribution('house-corrino');
    expect(engine.getRecord('house-corrino').state).toBe('completed');

    clock.advanceDays(730);
    engine.evaluateAll();
    expect(engine.getRecord('house-corrino').state).toBe('legacy_npc');
  });
});

// ─── Memorial Dynasty Filter ─────────────────────────────────────────

describe('ContinuityEngine Memorial Dynasty filter', () => {
  it('monthly login resets timer — never goes dormant', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('memorial-dynasty', 'free');

    for (let month = 0; month < 6; month++) {
      clock.advanceDays(29);
      expect(engine.evaluateInactivity('memorial-dynasty')).toBeNull();
      engine.recordLogin('memorial-dynasty');
    }

    expect(engine.getRecord('memorial-dynasty').state).toBe('active');
  });
});
