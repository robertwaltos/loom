import { describe, expect, it } from 'vitest';
import { createNpcReligionModule } from '../npc-religion.js';

describe('npc-religion simulation', () => {
  it('simulates founding a faith and adding doctrine plus ritual practice structure', () => {
    let id = 0;
    const module = createNpcReligionModule({
      clock: { nowMicroseconds: () => 1_000_000n },
      idGen: { generate: () => `relg-${++id}` },
      logger: { info: () => undefined, warn: () => undefined },
    });

    const religionId = module.foundReligion('Order of Dawn', 'npc-prophet');
    if (typeof religionId !== 'string') throw new Error('religion creation failed');

    const belief = module.addBelief(religionId, {
      beliefId: 'belief-light',
      name: 'Light Reveals Truth',
      description: 'Clarity comes through discipline and light',
      strength: 0.85,
      category: 'doctrine',
    });
    const ritual = module.addRitual(religionId, {
      ritualId: 'ritual-dawn',
      name: 'Dawn Vigil',
      description: 'Morning communal prayer',
      frequencyMicros: 24n * 3600n * 1_000_000n,
      lastPerformedAtMicros: null,
      participantCount: 0,
      effects: { faith: 5 },
    });

    expect(belief).toBe('belief-light');
    expect(ritual).toBe('ritual-dawn');
  });
});
