import { describe, expect, it } from 'vitest';
import { createRelationshipTracker } from '../npc-relationship.js';

describe('npc-relationship simulation', () => {
  it('simulates relationship growth through repeated positive interactions', () => {
    let now = 1_000_000;
    const tracker = createRelationshipTracker({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });

    tracker.form({
      fromEntityId: 'npc-guard',
      toEntityId: 'player-1',
      type: 'stranger',
      initialDisposition: 5,
    });
    tracker.recordInteraction('npc-guard', 'player-1');
    tracker.adjustDisposition('npc-guard', 'player-1', 20);
    tracker.setType('npc-guard', 'player-1', 'ally');

    const rel = tracker.getRelationship('npc-guard', 'player-1');
    expect(rel?.type).toBe('ally');
    expect(rel?.disposition).toBe(25);
  });
});
