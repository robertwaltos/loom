import { describe, it, expect } from 'vitest';
import { createNpcEmotionModel } from '../npc-emotion.js';
import type { EmotionModelDeps } from '../npc-emotion.js';

const SECOND = 1_000_000; // 1 second in microseconds

function makeDeps(): EmotionModelDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('NpcEmotionModel — registration', () => {
  it('registers an entity', () => {
    const model = createNpcEmotionModel(makeDeps());
    expect(model.registerEntity('npc-1')).toBe(true);
  });

  it('rejects duplicate registration', () => {
    const model = createNpcEmotionModel(makeDeps());
    model.registerEntity('npc-1');
    expect(model.registerEntity('npc-1')).toBe(false);
  });

  it('removes an entity', () => {
    const model = createNpcEmotionModel(makeDeps());
    model.registerEntity('npc-1');
    expect(model.removeEntity('npc-1')).toBe(true);
    expect(model.getSnapshot('npc-1')).toBeUndefined();
  });

  it('returns false removing unknown entity', () => {
    const model = createNpcEmotionModel(makeDeps());
    expect(model.removeEntity('unknown')).toBe(false);
  });
});

describe('NpcEmotionModel — stimulus', () => {
  it('applies a stimulus to create an emotion', () => {
    const model = createNpcEmotionModel(makeDeps());
    model.registerEntity('npc-1');
    const result = model.applyStimulus({
      entityId: 'npc-1',
      emotion: 'fear',
      intensityDelta: 60,
    });
    expect(result.previousIntensity).toBe(0);
    expect(result.newIntensity).toBe(60);
    expect(result.delta).toBe(60);
  });

  it('accumulates intensity from multiple stimuli', () => {
    const model = createNpcEmotionModel(makeDeps());
    model.registerEntity('npc-1');
    model.applyStimulus({ entityId: 'npc-1', emotion: 'joy', intensityDelta: 30 });
    const result = model.applyStimulus({
      entityId: 'npc-1', emotion: 'joy', intensityDelta: 25,
    });
    expect(result.previousIntensity).toBe(30);
    expect(result.newIntensity).toBe(55);
  });

  it('clamps intensity to 100', () => {
    const model = createNpcEmotionModel(makeDeps());
    model.registerEntity('npc-1');
    const result = model.applyStimulus({
      entityId: 'npc-1', emotion: 'anger', intensityDelta: 150,
    });
    expect(result.newIntensity).toBe(100);
  });

  it('clamps intensity to 0', () => {
    const model = createNpcEmotionModel(makeDeps());
    model.registerEntity('npc-1');
    model.applyStimulus({ entityId: 'npc-1', emotion: 'joy', intensityDelta: 20 });
    const result = model.applyStimulus({
      entityId: 'npc-1', emotion: 'joy', intensityDelta: -50,
    });
    expect(result.newIntensity).toBe(0);
  });

  it('throws for unknown entity', () => {
    const model = createNpcEmotionModel(makeDeps());
    expect(() => model.applyStimulus({
      entityId: 'unknown', emotion: 'fear', intensityDelta: 10,
    })).toThrow('not found');
  });
});

describe('NpcEmotionModel — decay', () => {
  it('decays emotions over time', () => {
    const model = createNpcEmotionModel(makeDeps());
    model.registerEntity('npc-1');
    model.applyStimulus({
      entityId: 'npc-1',
      emotion: 'fear',
      intensityDelta: 50,
      decayRatePerSecond: 10,
    });
    model.tick(2 * SECOND);
    const snap = model.getSnapshot('npc-1');
    const fear = snap?.emotions.find((e) => e.type === 'fear');
    expect(fear?.intensity).toBe(30);
  });

  it('removes emotions that decay to zero', () => {
    const model = createNpcEmotionModel(makeDeps());
    model.registerEntity('npc-1');
    model.applyStimulus({
      entityId: 'npc-1',
      emotion: 'surprise',
      intensityDelta: 10,
      decayRatePerSecond: 20,
    });
    model.tick(1 * SECOND);
    const snap = model.getSnapshot('npc-1');
    expect(snap?.emotions).toHaveLength(0);
  });

  it('returns count of decayed emotions', () => {
    const model = createNpcEmotionModel(makeDeps());
    model.registerEntity('npc-1');
    model.applyStimulus({ entityId: 'npc-1', emotion: 'joy', intensityDelta: 50 });
    model.applyStimulus({ entityId: 'npc-1', emotion: 'trust', intensityDelta: 30 });
    const count = model.tick(1 * SECOND);
    expect(count).toBe(2);
  });
});

describe('NpcEmotionModel — snapshot', () => {
  it('returns emotion snapshot for entity', () => {
    const model = createNpcEmotionModel(makeDeps());
    model.registerEntity('npc-1');
    model.applyStimulus({ entityId: 'npc-1', emotion: 'joy', intensityDelta: 70 });
    model.applyStimulus({ entityId: 'npc-1', emotion: 'fear', intensityDelta: 30 });
    const snap = model.getSnapshot('npc-1');
    expect(snap?.entityId).toBe('npc-1');
    expect(snap?.emotions).toHaveLength(2);
    expect(snap?.takenAt).toBeGreaterThan(0);
  });

  it('returns undefined for unknown entity', () => {
    const model = createNpcEmotionModel(makeDeps());
    expect(model.getSnapshot('unknown')).toBeUndefined();
  });

  it('returns empty emotions for calm entity', () => {
    const model = createNpcEmotionModel(makeDeps());
    model.registerEntity('npc-1');
    const snap = model.getSnapshot('npc-1');
    expect(snap?.emotions).toHaveLength(0);
    expect(snap?.dominantEmotion).toBeUndefined();
  });
});

describe('NpcEmotionModel — dominant emotion', () => {
  it('returns the highest intensity emotion', () => {
    const model = createNpcEmotionModel(makeDeps());
    model.registerEntity('npc-1');
    model.applyStimulus({ entityId: 'npc-1', emotion: 'joy', intensityDelta: 30 });
    model.applyStimulus({ entityId: 'npc-1', emotion: 'anger', intensityDelta: 80 });
    model.applyStimulus({ entityId: 'npc-1', emotion: 'fear', intensityDelta: 50 });
    const dominant = model.getDominantEmotion('npc-1');
    expect(dominant?.type).toBe('anger');
    expect(dominant?.intensity).toBe(80);
  });

  it('returns undefined for unknown entity', () => {
    const model = createNpcEmotionModel(makeDeps());
    expect(model.getDominantEmotion('unknown')).toBeUndefined();
  });

  it('returns undefined when no emotions active', () => {
    const model = createNpcEmotionModel(makeDeps());
    model.registerEntity('npc-1');
    expect(model.getDominantEmotion('npc-1')).toBeUndefined();
  });
});

describe('NpcEmotionModel — stats', () => {
  it('tracks aggregate statistics', () => {
    const model = createNpcEmotionModel(makeDeps());
    model.registerEntity('npc-1');
    model.registerEntity('npc-2');
    model.applyStimulus({ entityId: 'npc-1', emotion: 'joy', intensityDelta: 50 });
    model.applyStimulus({ entityId: 'npc-1', emotion: 'fear', intensityDelta: 30 });
    model.applyStimulus({ entityId: 'npc-2', emotion: 'anger', intensityDelta: 40 });
    model.tick(SECOND);

    const stats = model.getStats();
    expect(stats.totalEntities).toBe(2);
    expect(stats.totalActiveEmotions).toBe(3);
    expect(stats.totalStimuliApplied).toBe(3);
    expect(stats.totalDecayTicks).toBe(1);
  });

  it('starts with zero stats', () => {
    const model = createNpcEmotionModel(makeDeps());
    const stats = model.getStats();
    expect(stats.totalEntities).toBe(0);
    expect(stats.totalActiveEmotions).toBe(0);
  });
});
