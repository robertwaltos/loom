import { describe, it, expect } from 'vitest';
import {
  createVisitorCharacters,
  TOTAL_RECURRING_VISITORS,
  TOTAL_LEGENDARY_FIGURES,
  COMPASS_MODE_COUNT,
} from '../visitor-characters.js';

describe('visitor-characters simulation', () => {
  function makeVc() {
    return createVisitorCharacters();
  }

  // ── constants ─────────────────────────────────────────────────────

  it('exports TOTAL_RECURRING_VISITORS = 9', () => {
    expect(TOTAL_RECURRING_VISITORS).toBe(9);
  });

  it('exports TOTAL_LEGENDARY_FIGURES = 12', () => {
    expect(TOTAL_LEGENDARY_FIGURES).toBe(12);
  });

  it('exports COMPASS_MODE_COUNT = 4', () => {
    expect(COMPASS_MODE_COUNT).toBe(4);
  });

  // ── data coverage ─────────────────────────────────────────────────

  it('getRecurringVisitors returns 9 visitors', () => {
    const vc = makeVc();
    expect(vc.getRecurringVisitors().length).toBe(TOTAL_RECURRING_VISITORS);
  });

  it('getLegendaryFigures returns 12 figures', () => {
    const vc = makeVc();
    expect(vc.getLegendaryFigures().length).toBe(TOTAL_LEGENDARY_FIGURES);
  });

  it('getCompass returns an object with a modes array', () => {
    const vc = makeVc();
    const compass = vc.getCompass();
    expect(compass).toBeDefined();
    expect(compass).toHaveProperty('modes');
    expect(compass.modes.length).toBe(COMPASS_MODE_COUNT);
  });

  // ── getVisitorById ────────────────────────────────────────────────

  it('getVisitorById returns a recurring visitor', () => {
    const vc = makeVc();
    const all = vc.getRecurringVisitors();
    const visitor = all[0]!;
    const found = vc.getVisitorById(visitor.characterId);
    expect(found).toBeDefined();
    expect((found as typeof visitor).characterId).toBe(visitor.characterId);
  });

  it('getVisitorById returns a legendary figure', () => {
    const vc = makeVc();
    const legends = vc.getLegendaryFigures();
    const legend = legends[0]!;
    const found = vc.getVisitorById(legend.characterId);
    expect(found).toBeDefined();
    expect((found as typeof legend).characterId).toBe(legend.characterId);
  });

  it('getVisitorById returns undefined for an unknown id', () => {
    const vc = makeVc();
    expect(vc.getVisitorById('__nobody__')).toBeUndefined();
  });

  // ── getVisitorsForWorld ───────────────────────────────────────────

  it('getVisitorsForWorld returns an array', () => {
    const vc = makeVc();
    const all = vc.getRecurringVisitors();
    // Use the first world from the first visitor's worldIds
    const worldId = all[0].worldIds[0];
    const result = vc.getVisitorsForWorld(worldId);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  // ── resolveCompassMode ────────────────────────────────────────────

  describe('resolveCompassMode', () => {
    it('returns one of the four compass mode ids', () => {
      const vc = makeVc();
      const compass = vc.getCompass();
      const validModes = compass.modes.map((m: { mode: string }) => m.mode);
      const state = {
        kindlerId: 'kindler-1',
        seenLegendaryIds: new Set<string>(),
        metRecurringIds: new Set<string>(),
        lastVisitMs: Date.now(),
        currentWorldId: 'any',
        isLost: false,
        recentDiscovery: false,
        isInForgettingWell: false,
        sparkLevel: 50,
      };
      const result = vc.resolveCompassMode(state);
      expect(validModes).toContain(result.mode);
    });

    it('returns celebrating mode when recentAchievement is true', () => {
      const vc = makeVc();
      const state = {
        kindlerId: 'kindler-1',
        seenLegendaryIds: new Set<string>(),
        metRecurringIds: new Set<string>(),
        lastVisitMs: Date.now(),
        currentWorldId: 'any',
        isLost: false,
        recentDiscovery: true,
        isInForgettingWell: false,
        sparkLevel: 50,
      };
      const result = vc.resolveCompassMode(state);
      expect(result.mode).toBe('celebrating');
    });

    it('returns challenge mode when in the Forgetting Well', () => {
      const vc = makeVc();
      const state = {
        kindlerId: 'kindler-1',
        seenLegendaryIds: new Set<string>(),
        metRecurringIds: new Set<string>(),
        lastVisitMs: Date.now(),
        currentWorldId: 'forgetting-well',
        isLost: false,
        recentDiscovery: false,
        isInForgettingWell: true,
        sparkLevel: 50,
      };
      const result = vc.resolveCompassMode(state);
      expect(result.mode).toBe('challenge');
    });
  });

  // ── isLegendaryFirstVisit ─────────────────────────────────────────

  describe('isLegendaryFirstVisit', () => {
    it('returns true when character has not been seen before', () => {
      const vc = makeVc();
      const legends = vc.getLegendaryFigures();
      const legendId = legends[0]!.characterId;
      const state = {
        kindlerId: 'kindler-1',
        seenLegendaryIds: new Set<string>(),
        metRecurringIds: new Set<string>(),
        lastVisitMs: Date.now(),
        currentWorldId: 'any',
        isLost: false,
        recentDiscovery: false,
        isInForgettingWell: false,
        sparkLevel: 50,
      };
      expect(vc.isLegendaryFirstVisit(legendId, state)).toBe(true);
    });

    it('returns false when character has already been seen', () => {
      const vc = makeVc();
      const legends = vc.getLegendaryFigures();
      const legendId = legends[0]!.characterId;
      const state = {
        kindlerId: 'kindler-1',
        seenLegendaryIds: new Set([legendId]),
        metRecurringIds: new Set<string>(),
        lastVisitMs: Date.now(),
        currentWorldId: 'any',
        isLost: false,
        recentDiscovery: false,
        isInForgettingWell: false,
        sparkLevel: 50,
      };
      expect(vc.isLegendaryFirstVisit(legendId, state)).toBe(false);
    });
  });
});
