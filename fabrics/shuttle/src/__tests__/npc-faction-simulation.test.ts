import { describe, expect, it } from 'vitest';
import { createNpcFactionTracker } from '../npc-faction.js';

describe('npc-faction simulation', () => {
  it('simulates affinity drift and dominant faction emergence', () => {
    const tracker = createNpcFactionTracker();

    tracker.setAffinity('npc-1', 'foundation', 20);
    tracker.adjustAffinity({ entityId: 'npc-1', factionId: 'foundation', delta: 30 });
    tracker.setAffinity('npc-1', 'ascendancy', 70);
    tracker.adjustAffinity({ entityId: 'npc-1', factionId: 'ascendancy', delta: 10 });

    expect(tracker.getAffinityLevel('npc-1', 'ascendancy')).toBe('allied');
    expect(tracker.getDominantFaction('npc-1')).toBe('ascendancy');
  });
});
