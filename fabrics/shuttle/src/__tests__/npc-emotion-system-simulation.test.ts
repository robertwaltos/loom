import { describe, expect, it } from 'vitest';
import {
  createNpcEmotionState,
  registerNpcEmotion,
  applyEmotionTrigger,
  decayEmotionIntensity,
  getEmotionState,
} from '../npc-emotion-system.js';

describe('npc-emotion-system simulation', () => {
  it('simulates trigger-driven state changes and decay back to neutral', () => {
    let now = 1_000_000n;
    let id = 0;
    const state = createNpcEmotionState({
      clock: { now: () => (now += 1_000n) },
      idGen: { generate: () => `evt-${++id}` },
      logger: { info: () => undefined, error: () => undefined },
    });

    registerNpcEmotion(state, 'npc-1');
    const trigger = applyEmotionTrigger(state, 'npc-1', 'ALLY_DIED');
    expect(trigger.success).toBe(true);
    expect(getEmotionState(state, 'npc-1')?.currentEmotion).toBe('GRIEVING');

    decayEmotionIntensity(state, 'npc-1', 1.0);
    expect(getEmotionState(state, 'npc-1')?.currentEmotion).toBe('NEUTRAL');
  });
});
