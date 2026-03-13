import { describe, expect, it } from 'vitest';
import { createWorldPortalRegistry } from '../world-portal.js';

function makeRegistry() {
  let now = 1_000_000;
  let id = 0;
  return createWorldPortalRegistry({
    clock: { nowMicroseconds: () => now++ },
    idGenerator: { next: () => `portal-${++id}` },
  });
}

describe('world-portal simulation', () => {
  it('tracks a portal lifecycle under heavy usage and instability', () => {
    const portals = makeRegistry();
    const p = portals.create({ worldA: 'w-a', worldB: 'w-b', stability: 0.92 });
    expect(portals.open(p.portalId)).toBe(true);

    portals.use(p.portalId);
    portals.use(p.portalId);
    portals.markUnstable(p.portalId);

    const current = portals.getPortal(p.portalId);
    expect(current?.usageCount).toBe(2);
    expect(current?.status).toBe('unstable');
    expect(portals.getStats().unstablePortals).toBe(1);
  });
});
