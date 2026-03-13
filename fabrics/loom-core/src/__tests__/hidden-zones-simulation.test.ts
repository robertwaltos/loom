import { describe, it, expect } from 'vitest';
import {
  createHiddenZones,
  SPARK_REWARD_HIDDEN_ZONE,
  IN_BETWEEN_LINGER_MS,
  MIN_ENTRIES_FOR_DREAM_ARCHIVE,
} from '../hidden-zones.js';

describe('hidden-zones simulation', () => {
  function makeHz() {
    return createHiddenZones();
  }

  // ── data coverage ─────────────────────────────────────────────────

  it('returns exactly 5 hidden zones', () => {
    const hz = makeHz();
    expect(hz.getAllZones().length).toBe(5);
  });

  it('exposes the in-between zone', () => {
    const hz = makeHz();
    const zone = hz.getZoneById('the-in-between');
    expect(zone).toBeDefined();
  });

  it('exposes the dream-archive zone', () => {
    const hz = makeHz();
    expect(hz.getZoneById('the-dream-archive')).toBeDefined();
  });

  it('returns undefined for unknown zone id', () => {
    const hz = makeHz();
    expect(hz.getZoneById('__no-such-zone__')).toBeUndefined();
  });

  // ── getTotalSparkAvailable ────────────────────────────────────────

  it('getTotalSparkAvailable returns 75 (5 zones × 15 spark)', () => {
    const hz = makeHz();
    expect(hz.getTotalSparkAvailable()).toBe(75);
  });

  it('exports SPARK_REWARD_HIDDEN_ZONE = 15', () => {
    expect(SPARK_REWARD_HIDDEN_ZONE).toBe(15);
  });

  // ── getDiscoveredCount ───────────────────────────────────────────

  describe('getDiscoveredCount', () => {
    it('returns 0 when nothing is discovered', () => {
      const hz = makeHz();
      const state = { discoveredZoneIds: new Set<string>() };
      expect(hz.getDiscoveredCount(state)).toBe(0);
    });

    it('counts discovered zones correctly', () => {
      const hz = makeHz();
      const state = { discoveredZoneIds: new Set(['the-in-between', 'dream-archive']) };
      expect(hz.getDiscoveredCount(state)).toBe(2);
    });
  });

  // ── checkDiscoveryEligibility ─────────────────────────────────────

  describe('checkDiscoveryEligibility', () => {
    it('returns ineligible for the-in-between when already discovered', () => {
      const hz = makeHz();
      const state = {
        kindlerId: 'kindler-1',
        discoveredZoneIds: new Set<string>(['the-in-between']),
        completedWorldIds: new Set<string>(),
        completedEntryCount: 5,
        totalDistinctWorldsVisited: 5,
      };
      const result = hz.checkDiscoveryEligibility('the-in-between', state);
      expect(result).toBe(false);
    });

    it('returns eligible for the-in-between when not yet discovered', () => {
      const hz = makeHz();
      const state = {
        kindlerId: 'kindler-1',
        discoveredZoneIds: new Set<string>(),
        completedWorldIds: new Set<string>(),
        completedEntryCount: 5,
        totalDistinctWorldsVisited: 5,
      };
      const result = hz.checkDiscoveryEligibility('the-in-between', state);
      expect(result).toBe(true);
    });

    it('returns ineligible for dream-archive when entry count is too low', () => {
      const hz = makeHz();
      const state = {
        kindlerId: 'kindler-1',
        discoveredZoneIds: new Set<string>(),
        completedWorldIds: new Set<string>(),
        completedEntryCount: MIN_ENTRIES_FOR_DREAM_ARCHIVE - 1,
        totalDistinctWorldsVisited: 10,
      };
      const result = hz.checkDiscoveryEligibility('the-dream-archive', state);
      expect(result).toBe(false);
    });

    it('returns eligible for dream-archive when all conditions meet', () => {
      const hz = makeHz();
      const state = {
        kindlerId: 'kindler-1',
        discoveredZoneIds: new Set<string>(),
        completedWorldIds: new Set<string>(),
        completedEntryCount: MIN_ENTRIES_FOR_DREAM_ARCHIVE,
        totalDistinctWorldsVisited: MIN_ENTRIES_FOR_DREAM_ARCHIVE,
      };
      const result = hz.checkDiscoveryEligibility('the-dream-archive', state);
      expect(result).toBe(true);
    });

    it('returns ineligible for an already-discovered zone', () => {
      const hz = makeHz();
      const state = {
        kindlerId: 'kindler-1',
        discoveredZoneIds: new Set<string>(['the-in-between']),
        completedWorldIds: new Set<string>(),
        completedEntryCount: 5,
        totalDistinctWorldsVisited: 5,
      };
      const result = hz.checkDiscoveryEligibility('the-in-between', state);
      expect(result).toBe(false);
    });
  });

  // ── evaluateDiscovery ─────────────────────────────────────────────

  describe('evaluateDiscovery', () => {
    it('discovers in-between when linger elapsed and not yet found', () => {
      const hz = makeHz();
      const state = {
        kindlerId: 'kindler-1',
        discoveredZoneIds: new Set<string>(),
        completedWorldIds: new Set<string>(),
        completedEntryCount: 5,
        totalDistinctWorldsVisited: 5,
      };
      const result = hz.evaluateDiscovery(state);
      const ids = result.filter(z => z.discovered).map(z => z.zoneId);
      expect(ids).toContain('the-in-between');
    });

    it('returns empty when state does not meet any zone conditions', () => {
      const hz = makeHz();
      const state = {
        kindlerId: 'kindler-1',
        discoveredZoneIds: new Set<string>(['the-in-between', 'the-inverse-garden', 'the-whales-library', 'the-unfinished-room', 'the-dream-archive']),
        completedWorldIds: new Set<string>(),
        completedEntryCount: 0,
        totalDistinctWorldsVisited: 0,
      };
      const result = hz.evaluateDiscovery(state);
      expect(result.filter(z => z.discovered)).toHaveLength(0);
    });
  });
});
