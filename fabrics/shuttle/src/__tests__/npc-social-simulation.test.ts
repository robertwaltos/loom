import { describe, expect, it } from 'vitest';
import { createNpcSocialNetwork } from '../npc-social.js';

describe('npc-social simulation', () => {
  it('simulates friendship strengthening through repeated positive events', () => {
    let now = 1_000_000;
    let id = 0;
    const net = createNpcSocialNetwork({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
      idGenerator: { next: () => `social-${++id}` },
    });

    net.formRelationship({
      fromNpcId: 'npc-1',
      toNpcId: 'npc-2',
      relationshipType: 'friend',
      initialStrength: 0.4,
    });
    net.recordEvent({ fromNpcId: 'npc-1', toNpcId: 'npc-2', kind: 'gift' });
    net.recordEvent({ fromNpcId: 'npc-1', toNpcId: 'npc-2', kind: 'gift' });

    const rel = net.getRelationship('npc-1', 'npc-2');
    expect(rel?.strength).toBeGreaterThan(0.4);
  });
});
