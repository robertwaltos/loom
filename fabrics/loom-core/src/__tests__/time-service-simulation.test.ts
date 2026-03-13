import { describe, expect, it } from 'vitest';
import { createTimeService, DEFAULT_TIME_CONFIG } from '../time-service.js';

describe('time-service simulation', () => {
  it('simulates long-horizon conversion between real and in-game calendars', () => {
    const time = createTimeService();
    const launch = DEFAULT_TIME_CONFIG.launchDateMs;
    const realDays = 365.25 * 5;
    const future = launch + realDays * 24 * 3600 * 1000;

    const date = time.getInGameDate(future);
    const elapsedYears = time.getInGameYearsElapsed(future);
    const inGameDays = time.realDaysToInGame(30);
    const roundTripRealDays = time.inGameDaysToReal(inGameDays);

    expect(date.year).toBeGreaterThan(1);
    expect(elapsedYears).toBeGreaterThan(15);
    expect(inGameDays).toBe(90);
    expect(roundTripRealDays).toBe(30);
  });
});
