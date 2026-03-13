import { describe, expect, it } from 'vitest';
import { createNpcEmotionModel } from '../npc-emotion.js';

describe('npc-emotion simulation', () => {
  it('simulates stimuli accumulation and decay to calm state', () => {
    const model = createNpcEmotionModel({
      clock: { nowMicroseconds: () => 1_000_000 },
    });

    model.registerEntity('npc-1');
    model.applyStimulus({ entityId: 'npc-1', emotion: 'fear', intensityDelta: 60, decayRatePerSecond: 10 });
    model.applyStimulus({ entityId: 'npc-1', emotion: 'fear', intensityDelta: 20, decayRatePerSecond: 10 });
    expect(model.getDominantEmotion('npc-1')?.type).toBe('fear');

    model.tick(8_000_000);
    expect(model.getDominantEmotion('npc-1')).toBeUndefined();
  });
});
