import { describe, expect, it } from 'vitest';
import {
  createNpcCareerPathState,
  registerNpcCareer,
  hire,
  promote,
  terminate,
  getCareerPath,
  getJobHistory,
} from '../npc-career-path.js';

describe('npc-career-path simulation', () => {
  it('simulates multi-job progression and earnings accumulation', () => {
    let now = 1_000_000n;
    let id = 0;
    const state = createNpcCareerPathState({
      clock: { now: () => (now += 1_000n) },
      idGen: { generate: () => `cp-${++id}` },
      logger: { info: () => undefined, error: () => undefined },
    });

    registerNpcCareer(state, 'npc-1');
    hire(state, 'npc-1', 'MERCHANT', 'Guild', 'world-1', 200n);
    promote(state, 'npc-1', 4);
    terminate(state, 'npc-1');
    hire(state, 'npc-1', 'SCHOLAR', 'Academy', 'world-2', 500n);
    terminate(state, 'npc-1');

    const career = getCareerPath(state, 'npc-1');
    expect(career?.totalJobsHeld).toBe(2);
    expect(career?.totalEarnedKalon).toBe(700n);
    expect(getJobHistory(state, 'npc-1').length).toBe(2);
  });
});
