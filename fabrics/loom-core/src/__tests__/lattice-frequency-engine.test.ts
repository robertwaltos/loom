import { describe, it, expect, beforeEach } from 'vitest';
import {
  LATTICE_BASELINE_HZ,
  WORLD_412_ANOMALY_DELTA_HZ,
  BASE_FREQUENCIES,
  NGOZI_THRESHOLDS,
  getBaseFrequency,
  applyModifierDecay,
  getCurrentFrequency,
  getNgozoAnomalyLevel,
  getNgozoThreshold,
  getWorld412AnomalyHz,
  isWorldFrequencyAnomalous,
} from '../lattice-frequency-engine.js';
import type { FrequencyModifier } from '../lattice-frequency-engine.js';

function makeModifier(
  overrides: Partial<FrequencyModifier> = {},
): FrequencyModifier {
  const appliedAt = new Date('2350-01-01T00:00:00Z');
  const expiresAt = new Date(appliedAt.getTime() + 30 * 86_400_000);
  return {
    modifierId: 'mod-1',
    worldId: 'world-1',
    source: 'player_activity',
    deltaHz: 1.0,
    appliedAt,
    decayRatePerDay: 0.03,
    expiresAt,
    ...overrides,
  };
}

describe('lattice-frequency-engine', () => {
  let now: Date;

  beforeEach(() => {
    now = new Date('2350-01-01T00:00:00Z');
  });

  describe('constants', () => {
    it('should define LATTICE_BASELINE_HZ as 847.3', () => {
      expect(LATTICE_BASELINE_HZ).toBe(847.3);
    });

    it('should define WORLD_412_ANOMALY_DELTA_HZ as 2.7', () => {
      expect(WORLD_412_ANOMALY_DELTA_HZ).toBe(2.7);
    });

    it('should have breach-312 at 0 Hz', () => {
      expect(BASE_FREQUENCIES['breach-312']).toBe(0);
    });

    it('should have 6 Ngozi threshold levels', () => {
      expect(NGOZI_THRESHOLDS.length).toBe(6);
    });
  });

  describe('getBaseFrequency', () => {
    it('should return the frequency for a known world', () => {
      expect(getBaseFrequency('world-1')).toBe(847.3);
    });

    it('should return null for an unknown world', () => {
      expect(getBaseFrequency('world-unknown')).toBeNull();
    });

    it('should return 0 for breach-312', () => {
      expect(getBaseFrequency('breach-312')).toBe(0);
    });

    it('should return correct frequency for world-412', () => {
      expect(getBaseFrequency('world-412')).toBe(844.6);
    });

    it('should return correct frequency for world-499', () => {
      expect(getBaseFrequency('world-499')).toBe(847.3);
    });

    it('should return correct frequency for world-394', () => {
      expect(getBaseFrequency('world-394')).toBe(839.2);
    });
  });

  describe('applyModifierDecay', () => {
    it('should return full deltaHz before appliedAt', () => {
      const mod = makeModifier({ deltaHz: 5.0 });
      const before = new Date(mod.appliedAt.getTime() - 1000);
      expect(applyModifierDecay(mod, before)).toBe(5.0);
    });

    it('should return 0 after expiresAt', () => {
      const mod = makeModifier({ deltaHz: 5.0 });
      const after = new Date(mod.expiresAt.getTime() + 1000);
      expect(applyModifierDecay(mod, after)).toBe(0);
    });

    it('should return half deltaHz at midpoint', () => {
      const appliedAt = new Date('2350-01-01T00:00:00Z');
      const expiresAt = new Date(appliedAt.getTime() + 100_000);
      const mod = makeModifier({ deltaHz: 10.0, appliedAt, expiresAt });
      const midpoint = new Date(appliedAt.getTime() + 50_000);
      expect(applyModifierDecay(mod, midpoint)).toBeCloseTo(5.0, 1);
    });

    it('should return full deltaHz exactly at appliedAt', () => {
      const mod = makeModifier({ deltaHz: 3.0 });
      expect(applyModifierDecay(mod, mod.appliedAt)).toBe(3.0);
    });

    it('should return 0 exactly at expiresAt', () => {
      const mod = makeModifier({ deltaHz: 3.0 });
      expect(applyModifierDecay(mod, mod.expiresAt)).toBe(0);
    });
  });

  describe('getCurrentFrequency', () => {
    it('should return null for unknown world', () => {
      expect(getCurrentFrequency('world-unknown', [], now)).toBeNull();
    });

    it('should return 0 for breach-312 regardless of modifiers', () => {
      const mod = makeModifier({ worldId: 'breach-312', deltaHz: 100 });
      expect(getCurrentFrequency('breach-312', [mod], now)).toBe(0);
    });

    it('should return base frequency with no modifiers', () => {
      expect(getCurrentFrequency('world-1', [], now)).toBe(847.3);
    });

    it('should add active modifier delta to base', () => {
      const mod = makeModifier({
        worldId: 'world-1',
        deltaHz: 2.0,
        appliedAt: now,
        expiresAt: new Date(now.getTime() + 100_000),
      });
      const result = getCurrentFrequency('world-1', [mod], now);
      expect(result).not.toBeNull();
      if (result !== null) {
        expect(result).toBe(849.3);
      }
    });

    it('should ignore expired modifiers', () => {
      const past = new Date(now.getTime() - 200_000);
      const mod = makeModifier({
        worldId: 'world-1',
        deltaHz: 5.0,
        appliedAt: past,
        expiresAt: new Date(past.getTime() + 100_000),
      });
      expect(getCurrentFrequency('world-1', [mod], now)).toBe(847.3);
    });

    it('should ignore modifiers for other worlds', () => {
      const mod = makeModifier({
        worldId: 'world-2',
        deltaHz: 5.0,
        appliedAt: now,
        expiresAt: new Date(now.getTime() + 100_000),
      });
      expect(getCurrentFrequency('world-1', [mod], now)).toBe(847.3);
    });
  });

  describe('getNgozoAnomalyLevel', () => {
    it('should return BASELINE for no delta', () => {
      expect(getNgozoAnomalyLevel(847.3, 847.3)).toBe('BASELINE');
    });

    it('should return MINOR_ANOMALY for delta 0.5', () => {
      expect(getNgozoAnomalyLevel(847.8, 847.3)).toBe('MINOR_ANOMALY');
    });

    it('should return NOTABLE_ANOMALY for delta 1.5', () => {
      expect(getNgozoAnomalyLevel(848.8, 847.3)).toBe('NOTABLE_ANOMALY');
    });

    it('should return SIGNIFICANT for delta 3.0', () => {
      expect(getNgozoAnomalyLevel(850.3, 847.3)).toBe('SIGNIFICANT');
    });

    it('should return CRITICAL for delta 7.0', () => {
      expect(getNgozoAnomalyLevel(854.3, 847.3)).toBe('CRITICAL');
    });

    it('should return CASCADE_RISK for delta 12.0+', () => {
      expect(getNgozoAnomalyLevel(860.0, 847.3)).toBe('CASCADE_RISK');
    });

    it('should return BASELINE for negative delta', () => {
      expect(getNgozoAnomalyLevel(846.0, 847.3)).toBe('BASELINE');
    });
  });

  describe('getNgozoThreshold', () => {
    it('should return BASELINE threshold', () => {
      const t = getNgozoThreshold('BASELINE');
      expect(t.level).toBe('BASELINE');
      expect(t.deltaHz).toBe(0);
    });

    it('should return CASCADE_RISK threshold', () => {
      const t = getNgozoThreshold('CASCADE_RISK');
      expect(t.level).toBe('CASCADE_RISK');
      expect(t.deltaHz).toBe(12.0);
    });
  });

  describe('getWorld412AnomalyHz', () => {
    it('should return 2.7', () => {
      expect(getWorld412AnomalyHz()).toBe(2.7);
    });
  });

  describe('isWorldFrequencyAnomalous', () => {
    it('should return true for breach-312', () => {
      expect(isWorldFrequencyAnomalous('breach-312', [], now)).toBe(true);
    });

    it('should return true for unknown world', () => {
      expect(isWorldFrequencyAnomalous('world-unknown', [], now)).toBe(true);
    });

    it('should return false for a world with no modifiers', () => {
      expect(isWorldFrequencyAnomalous('world-1', [], now)).toBe(false);
    });

    it('should return true when modifier pushes delta above MINOR_ANOMALY threshold', () => {
      const mod = makeModifier({
        worldId: 'world-1',
        deltaHz: 1.0,
        appliedAt: now,
        expiresAt: new Date(now.getTime() + 100_000),
      });
      expect(isWorldFrequencyAnomalous('world-1', [mod], now)).toBe(true);
    });
  });
});
