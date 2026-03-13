import { describe, expect, it } from 'vitest';
import { createPersonalitySystem } from '../npc-personality.js';

describe('npc-personality simulation', () => {
  it('simulates mood perturbation and decay after a social event', () => {
    let now = 1_000_000;
    let id = 0;
    const sys = createPersonalitySystem({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
      idGenerator: { next: () => `pers-${++id}` },
    });

    sys.registerNpc('npc-1', {
      openness: 0.6,
      conscientiousness: 0.5,
      extraversion: 0.8,
      agreeableness: 0.7,
      neuroticism: 0.2,
    });

    const uplift = sys.applyMoodModifier('npc-1', {
      valenceShift: 0.35,
      arousalShift: 0.25,
      source: 'festival',
    });
    expect(typeof uplift).not.toBe('string');

    const decayed = sys.decayMood('npc-1');
    expect(typeof decayed).not.toBe('string');
  });
});
