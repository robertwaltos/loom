import { describe, expect, it } from 'vitest';
import { createPortalRegistrySystem } from '../portal-registry.js';

function makeSystem() {
  let i = 0;
  return createPortalRegistrySystem({
    clock: { now: () => 1_000_000n },
    idGen: { generate: () => `id-${++i}` },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });
}

describe('portal-registry simulation', () => {
  it('opens portals, records traversals, and reflects lifecycle transitions', () => {
    const system = makeSystem();
    const portal = system.openPortal('earth', 'mars', 70, 500n);
    expect(typeof portal).toBe('object');
    if (typeof portal === 'string') return;

    const t1 = system.recordTraversal(portal.portalId, 'ship-1', 'FORWARD');
    expect(t1.success).toBe(true);
    const boosted = system.updateStability(portal.portalId, 20);
    expect(boosted.success).toBe(true);
    expect(system.getPortal(portal.portalId)?.status).toBe('UNSTABLE');

    system.closePortal(portal.portalId);
    expect(system.recordTraversal(portal.portalId, 'ship-2', 'FORWARD').success).toBe(false);
  });
});
