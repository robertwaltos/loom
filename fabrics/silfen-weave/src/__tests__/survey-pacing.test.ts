import { describe, it, expect } from 'vitest';
import {
  SURVEY_PACING,
  getPhaseForRealYear,
  getWorldsTargetAtRealYear,
} from '../survey-pacing.js';

describe('SURVEY_PACING constants', () => {
  it('has correct starting and total worlds', () => {
    expect(SURVEY_PACING.STARTING_WORLDS).toBe(20);
    expect(SURVEY_PACING.TOTAL_WORLDS).toBe(600);
    expect(SURVEY_PACING.WORLDS_TO_UNLOCK).toBe(580);
  });

  it('spans 35 real years', () => {
    expect(SURVEY_PACING.CONCORD_DURATION_REAL_YEARS).toBe(35);
  });

  it('has 5 phases covering 0-35 years', () => {
    expect(SURVEY_PACING.PHASE_PACING).toHaveLength(5);
    expect(SURVEY_PACING.PHASE_PACING[0].realYearStart).toBe(0);
    expect(SURVEY_PACING.PHASE_PACING[4].realYearEnd).toBe(35);
  });

  it('final phase target equals TOTAL_WORLDS', () => {
    const lastPhase = SURVEY_PACING.PHASE_PACING[4];
    expect(lastPhase.worldsTarget).toBe(600);
  });
});

describe('getPhaseForRealYear', () => {
  it('returns phase 0 for year 0', () => {
    const phase = getPhaseForRealYear(0);
    expect(phase?.realYearStart).toBe(0);
    expect(phase?.realYearEnd).toBe(3);
  });

  it('returns phase 1 for year 3', () => {
    const phase = getPhaseForRealYear(3);
    expect(phase?.realYearStart).toBe(3);
    expect(phase?.realYearEnd).toBe(8);
  });

  it('returns phase 2 for year 10', () => {
    const phase = getPhaseForRealYear(10);
    expect(phase?.realYearStart).toBe(8);
    expect(phase?.realYearEnd).toBe(15);
  });

  it('returns last phase for year 30', () => {
    const phase = getPhaseForRealYear(30);
    expect(phase?.realYearEnd).toBe(35);
  });

  it('returns undefined for year >= 35 (Concord complete)', () => {
    expect(getPhaseForRealYear(35)).toBeUndefined();
    expect(getPhaseForRealYear(40)).toBeUndefined();
  });
});

describe('getWorldsTargetAtRealYear', () => {
  it('returns STARTING_WORLDS at year 0', () => {
    expect(getWorldsTargetAtRealYear(0)).toBe(SURVEY_PACING.STARTING_WORLDS);
  });

  it('reaches phase 0 target by year 3', () => {
    expect(getWorldsTargetAtRealYear(3)).toBe(60);
  });

  it('reaches TOTAL_WORLDS at the end of the Concord (year 35)', () => {
    expect(getWorldsTargetAtRealYear(35)).toBe(600);
  });

  it('is monotonically non-decreasing', () => {
    let prev = 0;
    for (let year = 0; year <= 35; year++) {
      const target = getWorldsTargetAtRealYear(year);
      expect(target).toBeGreaterThanOrEqual(prev);
      prev = target;
    }
  });

  it('interpolates between phase boundaries', () => {
    const at0 = getWorldsTargetAtRealYear(0);
    const at1 = getWorldsTargetAtRealYear(1);
    const at3 = getWorldsTargetAtRealYear(3);
    expect(at1).toBeGreaterThan(at0);
    expect(at1).toBeLessThan(at3);
  });
});
