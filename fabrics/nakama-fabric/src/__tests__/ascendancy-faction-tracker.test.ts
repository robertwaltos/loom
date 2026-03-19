import { describe, it, expect } from 'vitest';
import {
  ASCENDANCY_ACTIONS,
  ASCENDANCY_SNAPSHOTS,
  PEAK_INFLUENCE_YEAR,
  UNDETECTED_ACTION_COUNT,
  TOTAL_KALON_SEIZED_MICRO,
  createAscendancyTracker,
  type AscendancyActionType,
} from '../ascendancy-faction-tracker.js';

// ── ASCENDANCY_ACTIONS data integrity ────────────────────────────────────────

describe('ASCENDANCY_ACTIONS', () => {
  it('has at least 20 entries', () => {
    expect(ASCENDANCY_ACTIONS.length).toBeGreaterThanOrEqual(20);
  });

  it('all actionIds are unique', () => {
    const ids = ASCENDANCY_ACTIONS.map((a) => a.actionId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all kalonGainMicro values are BigInt', () => {
    for (const action of ASCENDANCY_ACTIONS) {
      expect(typeof action.kalonGainMicro).toBe('bigint');
    }
  });

  it('all kalonGainMicro are non-negative', () => {
    for (const action of ASCENDANCY_ACTIONS) {
      expect(action.kalonGainMicro).toBeGreaterThanOrEqual(0n);
    }
  });

  it('all actions have a valid type', () => {
    const validTypes: AscendancyActionType[] = [
      'RESOURCE_SEIZURE',
      'DYNASTY_ABSORPTION',
      'ASSEMBLY_VOTE',
      'CHRONICLE_SUPPRESSION',
      'LATTICE_EXPLOITATION',
      'TREATY_MANIPULATION',
      'ECONOMIC_COERCION',
    ];
    for (const action of ASCENDANCY_ACTIONS) {
      expect(validTypes).toContain(action.type);
    }
  });

  it('all years are positive integers', () => {
    for (const action of ASCENDANCY_ACTIONS) {
      expect(action.year).toBeGreaterThan(0);
      expect(Number.isInteger(action.year)).toBe(true);
    }
  });

  it('has at least one failed action', () => {
    expect(ASCENDANCY_ACTIONS.some((a) => !a.wasSuccessful)).toBe(true);
  });

  it('has at least one detected action', () => {
    expect(ASCENDANCY_ACTIONS.some((a) => a.wasDetected)).toBe(true);
  });

  it('action asc-action-006 (Year 23 Emergency Suppression Protocol) is detected', () => {
    const action = ASCENDANCY_ACTIONS.find((a) => a.actionId === 'asc-action-006');
    expect(action?.wasDetected).toBe(true);
  });

  it('Year 45 dynasty-okafor absorption attempt failed', () => {
    const action = ASCENDANCY_ACTIONS.find((a) => a.actionId === 'asc-action-011');
    expect(action?.wasSuccessful).toBe(false);
    expect(action?.year).toBe(45);
  });
});

// ── ASCENDANCY_SNAPSHOTS data integrity ───────────────────────────────────────

describe('ASCENDANCY_SNAPSHOTS', () => {
  it('has at least 10 entries', () => {
    expect(ASCENDANCY_SNAPSHOTS.length).toBeGreaterThanOrEqual(10);
  });

  it('all estimatedWealthMicro are BigInt', () => {
    for (const snap of ASCENDANCY_SNAPSHOTS) {
      expect(typeof snap.estimatedWealthMicro).toBe('bigint');
    }
  });

  it('all assemblyVotingPercent are in 0–100 range', () => {
    for (const snap of ASCENDANCY_SNAPSHOTS) {
      expect(snap.assemblyVotingPercent).toBeGreaterThanOrEqual(0);
      expect(snap.assemblyVotingPercent).toBeLessThanOrEqual(100);
    }
  });

  it('all influence levels are valid', () => {
    const valid = ['DORMANT', 'ACTIVE', 'DOMINANT', 'HEGEMONIC'];
    for (const snap of ASCENDANCY_SNAPSHOTS) {
      expect(valid).toContain(snap.influenceLevel);
    }
  });

  it('peak influence (Year 60-70) is HEGEMONIC', () => {
    const hegemonic = ASCENDANCY_SNAPSHOTS.filter((s) => s.influenceLevel === 'HEGEMONIC');
    expect(hegemonic.length).toBeGreaterThan(0);
    expect(hegemonic.every((s) => s.year >= 60 && s.year <= 70)).toBe(true);
  });
});

// ── Derived Constants ─────────────────────────────────────────────────────────

describe('PEAK_INFLUENCE_YEAR', () => {
  it('is a positive integer', () => {
    expect(PEAK_INFLUENCE_YEAR).toBeGreaterThan(0);
    expect(Number.isInteger(PEAK_INFLUENCE_YEAR)).toBe(true);
  });

  it('corresponds to the snapshot with highest wealth', () => {
    const peak = ASCENDANCY_SNAPSHOTS.reduce((best, s) =>
      s.estimatedWealthMicro > best.estimatedWealthMicro ? s : best,
    );
    expect(PEAK_INFLUENCE_YEAR).toBe(peak.year);
  });
});

describe('UNDETECTED_ACTION_COUNT', () => {
  it('is a non-negative integer', () => {
    expect(UNDETECTED_ACTION_COUNT).toBeGreaterThanOrEqual(0);
  });

  it('matches actual undetected count', () => {
    const actual = ASCENDANCY_ACTIONS.filter((a) => !a.wasDetected).length;
    expect(UNDETECTED_ACTION_COUNT).toBe(actual);
  });
});

describe('TOTAL_KALON_SEIZED_MICRO', () => {
  it('is a BigInt', () => {
    expect(typeof TOTAL_KALON_SEIZED_MICRO).toBe('bigint');
  });

  it('is greater than 0n', () => {
    expect(TOTAL_KALON_SEIZED_MICRO).toBeGreaterThan(0n);
  });

  it('equals sum of all kalonGainMicro', () => {
    const expected = ASCENDANCY_ACTIONS.reduce((sum, a) => sum + a.kalonGainMicro, 0n);
    expect(TOTAL_KALON_SEIZED_MICRO).toBe(expected);
  });
});

// ── createAscendancyTracker service ───────────────────────────────────────────

describe('createAscendancyTracker', () => {
  const tracker = createAscendancyTracker();

  it('getAction returns action for known id', () => {
    const action = tracker.getAction('asc-action-001');
    expect(action).toBeDefined();
    expect(action?.actionId).toBe('asc-action-001');
  });

  it('getAction returns undefined for unknown id', () => {
    expect(tracker.getAction('nonexistent')).toBeUndefined();
  });

  it('getActionsByYear returns all actions for a year', () => {
    const year3 = tracker.getActionsByYear(3);
    expect(year3.every((a) => a.year === 3)).toBe(true);
  });

  it('getActionsByYear returns empty array for year with no actions', () => {
    expect(tracker.getActionsByYear(999)).toHaveLength(0);
  });

  it('getActionsByType filters correctly for RESOURCE_SEIZURE', () => {
    const seizures = tracker.getActionsByType('RESOURCE_SEIZURE');
    expect(seizures.length).toBeGreaterThan(0);
    expect(seizures.every((a) => a.type === 'RESOURCE_SEIZURE')).toBe(true);
  });

  it('getUndetectedActions returns only undetected', () => {
    const undetected = tracker.getUndetectedActions();
    expect(undetected.every((a) => !a.wasDetected)).toBe(true);
    expect(undetected.length).toBe(UNDETECTED_ACTION_COUNT);
  });

  it('getInfluenceAtYear returns correct snapshot', () => {
    const snap = tracker.getInfluenceAtYear(60);
    expect(snap).toBeDefined();
    expect(snap?.influenceLevel).toBe('HEGEMONIC');
  });

  it('getInfluenceAtYear returns undefined for years without snapshots', () => {
    expect(tracker.getInfluenceAtYear(999)).toBeUndefined();
  });

  it('getPeakInfluenceYear matches constant', () => {
    expect(tracker.getPeakInfluenceYear()).toBe(PEAK_INFLUENCE_YEAR);
  });

  it('computeTotalKalonSeizedMicro matches constant', () => {
    expect(tracker.computeTotalKalonSeizedMicro()).toBe(TOTAL_KALON_SEIZED_MICRO);
  });

  it('getFailedActions returns only unsuccessful actions', () => {
    const failed = tracker.getFailedActions();
    expect(failed.every((a) => !a.wasSuccessful)).toBe(true);
    expect(failed.length).toBeGreaterThan(0);
  });
});
