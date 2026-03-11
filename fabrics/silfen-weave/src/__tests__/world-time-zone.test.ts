import { describe, it, expect } from 'vitest';
import { createWorldTimeZoneService } from '../world-time-zone.js';
import type { WorldTimeZoneDeps } from '../world-time-zone.js';

function createDeps(): { deps: WorldTimeZoneDeps; advance: (micro: number) => void } {
  let time = 0;
  return {
    deps: { clock: { nowMicroseconds: () => time } },
    advance: (micro: number) => {
      time += micro;
    },
  };
}

const DAY = 86_400_000_000; // 24h in microseconds

describe('WorldTimeZoneService — configure and getLocalTime', () => {
  it('returns undefined for unconfigured world', () => {
    const { deps } = createDeps();
    const svc = createWorldTimeZoneService(deps);
    expect(svc.getLocalTime('unknown')).toBeUndefined();
  });

  it('returns local time for configured world at time zero', () => {
    const { deps } = createDeps();
    const svc = createWorldTimeZoneService(deps);
    svc.configure({ worldId: 'w1', dayLengthMicro: DAY, offsetMicro: 0 });
    const lt = svc.getLocalTime('w1');
    expect(lt).toBeDefined();
    expect(lt?.worldId).toBe('w1');
    expect(lt?.localTimeMicro).toBe(0);
    expect(lt?.dayProgress).toBe(0);
    expect(lt?.dayNumber).toBe(0);
  });

  it('computes day progress correctly at midday', () => {
    const { deps, advance } = createDeps();
    const svc = createWorldTimeZoneService(deps);
    svc.configure({ worldId: 'w1', dayLengthMicro: DAY, offsetMicro: 0 });
    advance(DAY / 2);
    const lt = svc.getLocalTime('w1');
    expect(lt?.dayProgress).toBeCloseTo(0.5, 5);
    expect(lt?.isDay).toBe(true);
  });
});

describe('WorldTimeZoneService — day/night cycle', () => {
  it('reports night before 0.25 progress', () => {
    const { deps, advance } = createDeps();
    const svc = createWorldTimeZoneService(deps);
    svc.configure({ worldId: 'w1', dayLengthMicro: DAY, offsetMicro: 0 });
    advance(DAY / 10); // 0.1 progress
    expect(svc.isDaytime('w1')).toBe(false);
  });

  it('reports day at 0.25 progress', () => {
    const { deps, advance } = createDeps();
    const svc = createWorldTimeZoneService(deps);
    svc.configure({ worldId: 'w1', dayLengthMicro: DAY, offsetMicro: 0 });
    advance(DAY / 4); // 0.25 progress
    expect(svc.isDaytime('w1')).toBe(true);
  });

  it('reports night at 0.75 progress', () => {
    const { deps, advance } = createDeps();
    const svc = createWorldTimeZoneService(deps);
    svc.configure({ worldId: 'w1', dayLengthMicro: DAY, offsetMicro: 0 });
    advance((DAY * 3) / 4); // 0.75 progress
    expect(svc.isDaytime('w1')).toBe(false);
  });

  it('returns undefined isDaytime for unknown world', () => {
    const { deps } = createDeps();
    const svc = createWorldTimeZoneService(deps);
    expect(svc.isDaytime('unknown')).toBeUndefined();
  });
});

describe('WorldTimeZoneService — day number and offset', () => {
  it('increments day number after full day cycle', () => {
    const { deps, advance } = createDeps();
    const svc = createWorldTimeZoneService(deps);
    svc.configure({ worldId: 'w1', dayLengthMicro: DAY, offsetMicro: 0 });
    advance(DAY * 3 + DAY / 2);
    expect(svc.getDayNumber('w1')).toBe(3);
  });

  it('applies offset to local time calculation', () => {
    const { deps } = createDeps();
    const svc = createWorldTimeZoneService(deps);
    const offset = DAY / 4;
    svc.configure({ worldId: 'w1', dayLengthMicro: DAY, offsetMicro: offset });
    const lt = svc.getLocalTime('w1');
    expect(lt?.localTimeMicro).toBe(offset);
    expect(lt?.dayProgress).toBeCloseTo(0.25, 5);
  });

  it('returns undefined getDayNumber for unknown world', () => {
    const { deps } = createDeps();
    const svc = createWorldTimeZoneService(deps);
    expect(svc.getDayNumber('unknown')).toBeUndefined();
  });
});

describe('WorldTimeZoneService — stats', () => {
  it('reports tracked worlds count', () => {
    const { deps } = createDeps();
    const svc = createWorldTimeZoneService(deps);
    expect(svc.getStats().trackedWorlds).toBe(0);
    svc.configure({ worldId: 'w1', dayLengthMicro: DAY, offsetMicro: 0 });
    svc.configure({ worldId: 'w2', dayLengthMicro: DAY * 2, offsetMicro: 0 });
    expect(svc.getStats().trackedWorlds).toBe(2);
  });
});
