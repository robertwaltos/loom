import { describe, expect, it } from 'vitest';
import { createNakamaSystem } from '../nakama-system.js';

describe('nakama-system simulation', () => {
  it('simulates ECS tick bridge invoking orchestrator every frame', () => {
    let ticks = 0;
    const system = createNakamaSystem({
      orchestrator: {
        tick: () => {
          ticks++;
          return {
            idleSwept: 0,
            continuityTransitions: 0,
            integrityChanges: 0,
            mortalityNotifications: 0,
            tickNumber: ticks,
          };
        },
      },
    });

    system({ deltaMs: 33, tickNumber: 1, wallTimeMicroseconds: 33_000 });
    system({ deltaMs: 33, tickNumber: 2, wallTimeMicroseconds: 66_000 });

    expect(ticks).toBe(2);
  });
});
