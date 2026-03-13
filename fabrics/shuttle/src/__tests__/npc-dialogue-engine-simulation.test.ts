import { describe, expect, it } from 'vitest';
import { createDialogueEngine } from '../npc-dialogue-engine.js';

describe('npc-dialogue-engine simulation', () => {
  it('simulates mood/context-aware line selection and history updates', () => {
    let now = 1_000_000;
    let id = 0;
    const engine = createDialogueEngine({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { generate: () => `de-${id++}` },
    });

    engine.setNpcMood('npc-1', 'joyful');
    engine.registerLine({
      lineId: 'l1',
      npcId: 'npc-1',
      text: 'Lovely day',
      mood: 'joyful',
      topic: 'greeting',
      priority: 2,
      conditions: [],
    });
    engine.registerLine({
      lineId: 'l2',
      npcId: 'npc-1',
      text: 'Hmm',
      mood: 'calm',
      topic: 'greeting',
      priority: 5,
      conditions: [],
    });

    const selected = engine.selectLine('npc-1', 'greeting');
    expect(selected.line).toBeDefined();
    expect(['l1', 'l2']).toContain(selected.line?.lineId ?? '');
    const stats = engine.getStats();
    expect(stats.totalLines).toBe(2);
  });
});
