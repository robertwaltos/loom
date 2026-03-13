import { describe, expect, it } from 'vitest';
import { createEntityGroupManager } from '../entity-group.js';

describe('entity-group simulation', () => {
  it('simulates squad group membership changes during combat prep', () => {
    let now = 1_000_000;
    const mgr = createEntityGroupManager({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });

    mgr.createGroup({ groupId: 'squad-alpha' });
    mgr.addMember('squad-alpha', 'npc-1');
    mgr.addMember('squad-alpha', 'npc-2');
    mgr.removeMember('squad-alpha', 'npc-2');

    expect(mgr.isMember('squad-alpha', 'npc-1')).toBe(true);
    expect(mgr.isMember('squad-alpha', 'npc-2')).toBe(false);
    expect(mgr.getStats().totalMemberships).toBe(1);
  });
});
