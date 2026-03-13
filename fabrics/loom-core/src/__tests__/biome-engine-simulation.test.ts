import { describe, expect, it } from 'vitest';
import { createBiomeEngine } from '../biome-engine.js';

describe('biome-engine simulation', () => {
  it('simulates contrasting region classification and habitability analysis', () => {
    const engine = createBiomeEngine();

    const desert = engine.classifyBiome({
      temperature: 0.85,
      precipitation: 0.1,
      elevation: 0.45,
      latitude: 0.25,
    });
    const jungle = engine.classifyBiome({
      temperature: 0.82,
      precipitation: 0.82,
      elevation: 0.42,
      latitude: 0.2,
    });

    expect(desert).toBe('DESERT');
    expect(jungle).toBe('JUNGLE');
    expect(engine.computeHabitability(jungle, true)).toBeGreaterThan(
      engine.computeHabitability(desert, false),
    );
  });
});
