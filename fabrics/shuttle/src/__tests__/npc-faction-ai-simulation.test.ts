import { describe, expect, it } from 'vitest';
import { createNpcFactionAI } from '../npc-faction-ai.js';

describe('npc-faction-ai simulation', () => {
  it('simulates member loyalty and patrol assignment lifecycle', () => {
    let now = 1_000_000;
    let id = 0;
    const ai = createNpcFactionAI({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { generate: () => `fai-${id++}` },
    });

    ai.addMember('npc-1', 'ascendancy', 'soldier');
    ai.adjustLoyalty('npc-1', 20);
    ai.addPatrolRoute({ routeId: 'route-1', factionId: 'ascendancy', waypoints: ['a', 'b', 'c'], priority: 2 });
    const assignment = ai.assignPatrol('npc-1', 'route-1');

    expect(assignment).toBeDefined();
    if (!assignment) return;
    const step = ai.advancePatrol(assignment.assignmentId);
    expect(step?.currentWaypointIndex).toBe(1);
  });
});
