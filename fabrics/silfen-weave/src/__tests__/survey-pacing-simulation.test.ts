import { describe, it, expect } from 'vitest';
import { COMPRESSION_RATIO } from '@loom/loom-core';
import {
  SURVEY_PACING,
  getPhaseForRealYear,
  getWorldsTargetAtRealYear,
} from '../survey-pacing.js';

describe('survey-pacing simulation', () => {
  it('defines immutable baseline world counts', () => {
    expect(SURVEY_PACING.STARTING_WORLDS).toBe(20);
    expect(SURVEY_PACING.TOTAL_WORLDS).toBe(600);
    expect(SURVEY_PACING.WORLDS_TO_UNLOCK).toBe(580);
  });

  it('defines concord duration and averaged days per world', () => {
    expect(SURVEY_PACING.CONCORD_DURATION_REAL_YEARS).toBe(35);
    expect(SURVEY_PACING.REAL_DAYS_PER_WORLD_AVG).toBeGreaterThan(0);
    expect(SURVEY_PACING.INGAME_DAYS_PER_WORLD_AVG).toBe(
      SURVEY_PACING.REAL_DAYS_PER_WORLD_AVG * COMPRESSION_RATIO,
    );
  });

  it('contains five pacing phases', () => {
    expect(SURVEY_PACING.PHASE_PACING.length).toBe(5);
  });

  it('finds phase for early year in rush period', () => {
    const phase = getPhaseForRealYear(1.5);
    expect(phase?.rationale).toBe('Early rush');
  });

  it('uses lower-inclusive boundary at year 3', () => {
    const phase = getPhaseForRealYear(3);
    expect(phase?.rationale).toBe('Steady expansion');
  });

  it('uses lower-inclusive boundary at year 8', () => {
    const phase = getPhaseForRealYear(8);
    expect(phase?.rationale).toBe('Mid expansion');
  });

  it('returns undefined outside final phase end', () => {
    expect(getPhaseForRealYear(35)).toBeUndefined();
    expect(getPhaseForRealYear(100)).toBeUndefined();
  });

  it('returns starting worlds for negative years', () => {
    expect(getWorldsTargetAtRealYear(-1)).toBe(20);
  });

  it('returns interpolated target during first phase', () => {
    // Between 20 and 60 over years 0-3: at 1.5 years should be 40
    expect(getWorldsTargetAtRealYear(1.5)).toBe(40);
  });

  it('returns exact target at first phase end boundary', () => {
    expect(getWorldsTargetAtRealYear(3)).toBe(60);
  });

  it('returns prior phase target in steady expansion due to current stepwise logic', () => {
    expect(getWorldsTargetAtRealYear(5.5)).toBe(60);
  });

  it('returns prior phase target in mid expansion due to current stepwise logic', () => {
    expect(getWorldsTargetAtRealYear(11.5)).toBe(150);
  });

  it('returns prior phase target in late expansion due to current stepwise logic', () => {
    expect(getWorldsTargetAtRealYear(17.5)).toBe(300);
  });

  it('returns prior phase target in reckoning due to current stepwise logic', () => {
    expect(getWorldsTargetAtRealYear(27)).toBe(500);
  });

  it('returns final target for years at or beyond year 35', () => {
    expect(getWorldsTargetAtRealYear(35)).toBe(600);
    expect(getWorldsTargetAtRealYear(40)).toBe(600);
  });
});
