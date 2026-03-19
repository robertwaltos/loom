import { describe, it, expect, beforeEach } from 'vitest';
import {
  filterToWindow,
  computeTopStrategies,
  computeTopWeaponClass,
  computeAvgResponseTime,
  computeWorldActivityRanking,
  buildPatternProfile,
  PATTERN_WINDOW_DAYS,
} from '../ascendancy-player-pattern-tracker.js';
import type {
  DefenseStrategyObservation,
  DefenseStrategy,
  WeaponClass,
} from '../ascendancy-player-pattern-tracker.js';

function makeObservation(overrides: Partial<DefenseStrategyObservation> = {}): DefenseStrategyObservation {
  return {
    observationId: 'obs-1',
    worldId: 'world-1',
    strategy: 'SHIELD_WALL',
    weaponClass: 'KINETIC_RAILGUN',
    alertToMobilizationMs: 5000,
    recordedAt: new Date('2025-06-10T00:00:00Z'),
    ...overrides,
  };
}

describe('PATTERN_WINDOW_DAYS', () => {
  it('should be 30', () => {
    expect(PATTERN_WINDOW_DAYS).toBe(30);
  });
});

describe('filterToWindow', () => {
  it('should include observations within the window', () => {
    const now = new Date('2025-06-15T00:00:00Z');
    const obs = [makeObservation({ recordedAt: new Date('2025-06-10T00:00:00Z') })];
    const result = filterToWindow(obs, now, 30);
    expect(result.length).toBe(1);
  });

  it('should exclude observations outside the window', () => {
    const now = new Date('2025-06-15T00:00:00Z');
    const obs = [makeObservation({ recordedAt: new Date('2025-01-01T00:00:00Z') })];
    const result = filterToWindow(obs, now, 30);
    expect(result.length).toBe(0);
  });

  it('should use default 30-day window', () => {
    const now = new Date('2025-06-15T00:00:00Z');
    const recent = makeObservation({ observationId: 'r1', recordedAt: new Date('2025-06-01T00:00:00Z') });
    const old = makeObservation({ observationId: 'r2', recordedAt: new Date('2025-01-01T00:00:00Z') });
    const result = filterToWindow([recent, old], now);
    expect(result.length).toBe(1);
  });

  it('should handle empty array', () => {
    const result = filterToWindow([], new Date());
    expect(result.length).toBe(0);
  });
});

describe('computeTopStrategies', () => {
  it('should return top 3 strategies by count', () => {
    const obs: DefenseStrategyObservation[] = [
      makeObservation({ observationId: 'a1', strategy: 'SHIELD_WALL' }),
      makeObservation({ observationId: 'a2', strategy: 'SHIELD_WALL' }),
      makeObservation({ observationId: 'a3', strategy: 'GUERRILLA' }),
      makeObservation({ observationId: 'a4', strategy: 'GUERRILLA' }),
      makeObservation({ observationId: 'a5', strategy: 'GUERRILLA' }),
      makeObservation({ observationId: 'a6', strategy: 'AMBUSH_CORRIDOR' }),
      makeObservation({ observationId: 'a7', strategy: 'TOTAL_WITHDRAWAL' }),
    ];
    const result = computeTopStrategies(obs, 3);
    expect(result.length).toBe(3);
    const first = result[0];
    if (first === undefined) {
      expect.fail('Expected result');
      return;
    }
    expect(first[0]).toBe('GUERRILLA');
    expect(first[1]).toBe(3);
  });

  it('should return empty for no observations', () => {
    const result = computeTopStrategies([]);
    expect(result.length).toBe(0);
  });

  it('should respect topN parameter', () => {
    const obs: DefenseStrategyObservation[] = [
      makeObservation({ observationId: 'b1', strategy: 'SHIELD_WALL' }),
      makeObservation({ observationId: 'b2', strategy: 'GUERRILLA' }),
    ];
    const result = computeTopStrategies(obs, 1);
    expect(result.length).toBe(1);
  });
});

describe('computeTopWeaponClass', () => {
  it('should return UNKNOWN for empty observations', () => {
    expect(computeTopWeaponClass([])).toBe('UNKNOWN');
  });

  it('should return the most common weapon class', () => {
    const obs: DefenseStrategyObservation[] = [
      makeObservation({ observationId: 'w1', weaponClass: 'EMP_BURST' }),
      makeObservation({ observationId: 'w2', weaponClass: 'EMP_BURST' }),
      makeObservation({ observationId: 'w3', weaponClass: 'DRONE_SWARM' }),
    ];
    expect(computeTopWeaponClass(obs)).toBe('EMP_BURST');
  });

  it('should handle single observation', () => {
    const obs = [makeObservation({ weaponClass: 'ORBITAL_LANCE' })];
    expect(computeTopWeaponClass(obs)).toBe('ORBITAL_LANCE');
  });
});

describe('computeAvgResponseTime', () => {
  it('should return 0 for empty observations', () => {
    expect(computeAvgResponseTime([])).toBe(0);
  });

  it('should compute average correctly', () => {
    const obs: DefenseStrategyObservation[] = [
      makeObservation({ observationId: 't1', alertToMobilizationMs: 1000 }),
      makeObservation({ observationId: 't2', alertToMobilizationMs: 3000 }),
    ];
    expect(computeAvgResponseTime(obs)).toBe(2000);
  });

  it('should round to nearest integer', () => {
    const obs: DefenseStrategyObservation[] = [
      makeObservation({ observationId: 't3', alertToMobilizationMs: 1000 }),
      makeObservation({ observationId: 't4', alertToMobilizationMs: 1001 }),
      makeObservation({ observationId: 't5', alertToMobilizationMs: 1002 }),
    ];
    expect(computeAvgResponseTime(obs)).toBe(1001);
  });
});

describe('computeWorldActivityRanking', () => {
  it('should return nulls for empty observations', () => {
    const result = computeWorldActivityRanking([]);
    expect(result.mostActive).toBeNull();
    expect(result.leastActive).toBeNull();
  });

  it('should identify most and least active worlds', () => {
    const obs: DefenseStrategyObservation[] = [
      makeObservation({ observationId: 'r1', worldId: 'w-busy' }),
      makeObservation({ observationId: 'r2', worldId: 'w-busy' }),
      makeObservation({ observationId: 'r3', worldId: 'w-busy' }),
      makeObservation({ observationId: 'r4', worldId: 'w-quiet' }),
    ];
    const result = computeWorldActivityRanking(obs);
    expect(result.mostActive).toBe('w-busy');
    expect(result.leastActive).toBe('w-quiet');
  });

  it('should handle single world', () => {
    const obs = [makeObservation({ worldId: 'w-only' })];
    const result = computeWorldActivityRanking(obs);
    expect(result.mostActive).toBe('w-only');
    expect(result.leastActive).toBe('w-only');
  });
});

describe('buildPatternProfile', () => {
  const now = new Date('2025-06-15T00:00:00Z');

  it('should set profileId', () => {
    const profile = buildPatternProfile({
      profileId: 'prof-1',
      observations: [],
      now,
    });
    expect(profile.profileId).toBe('prof-1');
  });

  it('should use default 30-day window', () => {
    const profile = buildPatternProfile({
      profileId: 'prof-2',
      observations: [],
      now,
    });
    expect(profile.windowDays).toBe(30);
  });

  it('should use custom window days', () => {
    const profile = buildPatternProfile({
      profileId: 'prof-3',
      observations: [],
      now,
      windowDays: 7,
    });
    expect(profile.windowDays).toBe(7);
  });

  it('should count observations within window', () => {
    const obs = [
      makeObservation({ observationId: 'p1', recordedAt: new Date('2025-06-10T00:00:00Z') }),
      makeObservation({ observationId: 'p2', recordedAt: new Date('2025-01-01T00:00:00Z') }),
    ];
    const profile = buildPatternProfile({
      profileId: 'prof-4',
      observations: obs,
      now,
    });
    expect(profile.totalObservations).toBe(1);
  });

  it('should compute top strategies from windowed data', () => {
    const obs = [
      makeObservation({ observationId: 'p3', strategy: 'GUERRILLA', recordedAt: new Date('2025-06-10T00:00:00Z') }),
      makeObservation({ observationId: 'p4', strategy: 'GUERRILLA', recordedAt: new Date('2025-06-11T00:00:00Z') }),
      makeObservation({ observationId: 'p5', strategy: 'SHIELD_WALL', recordedAt: new Date('2025-06-12T00:00:00Z') }),
    ];
    const profile = buildPatternProfile({
      profileId: 'prof-5',
      observations: obs,
      now,
    });
    const top = profile.topStrategies[0];
    if (top === undefined) {
      expect.fail('Expected top strategy');
      return;
    }
    expect(top[0]).toBe('GUERRILLA');
  });

  it('should identify most and least active worlds', () => {
    const obs = [
      makeObservation({ observationId: 'p6', worldId: 'w-a', recordedAt: new Date('2025-06-10T00:00:00Z') }),
      makeObservation({ observationId: 'p7', worldId: 'w-a', recordedAt: new Date('2025-06-11T00:00:00Z') }),
      makeObservation({ observationId: 'p8', worldId: 'w-b', recordedAt: new Date('2025-06-12T00:00:00Z') }),
    ];
    const profile = buildPatternProfile({
      profileId: 'prof-6',
      observations: obs,
      now,
    });
    expect(profile.mostActiveWorldId).toBe('w-a');
    expect(profile.leastActiveWorldId).toBe('w-b');
  });
});
