import { describe, it, expect } from 'vitest';
import {
  createSeasonalContent,
  LUMINANCE_BOOST_NEW_YEAR,
  HOURS_IN_DAY_CYCLE,
  GOLDEN_HOUR_START,
  GOLDEN_HOUR_END,
  NIGHT_START,
  NIGHT_END,
} from '../seasonal-content.js';

describe('seasonal-content simulation', () => {
  function makeSc() {
    return createSeasonalContent();
  }

  // ── data coverage ─────────────────────────────────────────────────

  it('returns 12 monthly events', () => {
    const sc = makeSc();
    expect(sc.getMonthlyEvents().length).toBe(12);
  });

  it('returns 6 time-locked content items', () => {
    const sc = makeSc();
    expect(sc.getAllTimeLockedContent().length).toBe(6);
  });

  it('exports HOURS_IN_DAY_CYCLE = 24', () => {
    expect(HOURS_IN_DAY_CYCLE).toBe(24);
  });

  it('exports GOLDEN_HOUR_START and GOLDEN_HOUR_END', () => {
    expect(GOLDEN_HOUR_START).toBe(17);
    expect(GOLDEN_HOUR_END).toBe(19);
  });

  it('exports NIGHT_START = 21 and NIGHT_END = 5', () => {
    expect(NIGHT_START).toBe(21);
    expect(NIGHT_END).toBe(5);
  });

  // ── computeTimeOfDay ──────────────────────────────────────────────

  describe('computeTimeOfDay', () => {
    it('returns golden-hour during the evening golden window', () => {
      const sc = makeSc();
      expect(sc.computeTimeOfDay(18)).toBe('golden-hour');
    });

    it('returns night during the night window (after NIGHT_START)', () => {
      const sc = makeSc();
      expect(sc.computeTimeOfDay(22)).toBe('night');
    });

    it('returns night during the early-morning night window (before NIGHT_END)', () => {
      const sc = makeSc();
      expect(sc.computeTimeOfDay(3)).toBe('night');
    });

    it('returns afternoon during midday hours', () => {
      const sc = makeSc();
      expect(sc.computeTimeOfDay(12)).toBe('afternoon');
    });
  });

  // ── getActiveEvent ───────────────────────────────────────────────

  describe('getActiveEvent', () => {
    it('returns an event object for a given month number', () => {
      const sc = makeSc();
      // January = month 1 should return an event
      const result = sc.getActiveEvent(1);
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('month');
    });
  });

  // ── computeCalendarState ─────────────────────────────────────────

  describe('computeCalendarState', () => {
    it('returns a calendar state object with currentMonth and timeOfDay', () => {
      const sc = makeSc();
      const ts = new Date('2025-03-15T10:00:00Z').getTime();
      const state = sc.computeCalendarState(ts);
      expect(state).toHaveProperty('currentMonth');
      expect(state).toHaveProperty('timeOfDay');
    });

    it('currentMonth is between 1 and 12', () => {
      const sc = makeSc();
      const ts = new Date('2025-07-04T00:00:00Z').getTime();
      const { currentMonth } = sc.computeCalendarState(ts);
      expect(currentMonth).toBeGreaterThanOrEqual(1);
      expect(currentMonth).toBeLessThanOrEqual(12);
    });
  });

  // ── isWorldAffected ───────────────────────────────────────────────

  describe('isWorldAffected', () => {
    it('returns a boolean for any event-world combination', () => {
      const sc = makeSc();
      const events = sc.getMonthlyEvents();
      const result = sc.isWorldAffected('world-1', events[0].month);
      expect(typeof result).toBe('boolean');
    });
  });

  // ── getGreatRestorationTarget ─────────────────────────────────────

  describe('getGreatRestorationTarget', () => {
    it('returns null when luminanceMap is empty', () => {
      const sc = makeSc();
      const result = sc.getGreatRestorationTarget(new Map());
      expect(result).toBeNull();
    });

    it('returns the world with the lowest luminance', () => {
      const sc = makeSc();
      const map = new Map([
        ['world-a', 80],
        ['world-b', 20],
        ['world-c', 60],
      ]);
      const result = sc.getGreatRestorationTarget(map);
      expect(result).toBe('world-b');
    });
  });
});
