import { describe, expect, it } from 'vitest';
import { createNpcRoutineEngine } from '../npc-routine.js';

describe('npc-routine simulation', () => {
  it('simulates assignment progression from rest to active patrol phase', () => {
    const HOUR = 3_600_000_000;
    let tick = 0;
    let id = 0;
    const engine = createNpcRoutineEngine({
      clock: {
        nowMicroseconds: () => {
          tick++;
          return tick === 1 ? 0 : 5 * HOUR;
        },
      },
      idGenerator: { next: () => `rt-${id++}` },
    });

    const routine = engine.createRoutine({
      name: 'guard-day',
      cycleDurationMicro: 24 * HOUR,
      steps: [
        { startOffsetMicro: 0, durationMicro: 4 * HOUR, activity: 'rest', location: 'barracks' },
        {
          startOffsetMicro: 4 * HOUR,
          durationMicro: 2 * HOUR,
          activity: 'patrol',
          location: 'north-gate',
        },
      ],
    });

    engine.assign('npc-1', routine.routineId);
    const updated = engine.tick('npc-1');
    expect(updated?.currentActivity).toBe('patrol');
  });
});
