import { describe, it, expect } from 'vitest';
import { createWorldPortalRegistry } from '../world-portal.js';
import type { WorldPortalDeps } from '../world-portal.js';

function createDeps(): WorldPortalDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'portal-' + String(id++) },
  };
}

describe('WorldPortalRegistry — create', () => {
  it('creates a portal in closed state', () => {
    const svc = createWorldPortalRegistry(createDeps());
    const snap = svc.create({ worldA: 'w1', worldB: 'w2', stability: 0.9 });
    expect(snap.portalId).toBe('portal-0');
    expect(snap.worldA).toBe('w1');
    expect(snap.worldB).toBe('w2');
    expect(snap.status).toBe('closed');
    expect(snap.usageCount).toBe(0);
  });
});

describe('WorldPortalRegistry — open and close', () => {
  it('opens a closed portal', () => {
    const svc = createWorldPortalRegistry(createDeps());
    const snap = svc.create({ worldA: 'w1', worldB: 'w2', stability: 0.9 });
    expect(svc.open(snap.portalId)).toBe(true);
    expect(svc.getPortal(snap.portalId)?.status).toBe('open');
  });

  it('returns false when opening already open portal', () => {
    const svc = createWorldPortalRegistry(createDeps());
    const snap = svc.create({ worldA: 'w1', worldB: 'w2', stability: 0.9 });
    svc.open(snap.portalId);
    expect(svc.open(snap.portalId)).toBe(false);
  });

  it('closes an open portal', () => {
    const svc = createWorldPortalRegistry(createDeps());
    const snap = svc.create({ worldA: 'w1', worldB: 'w2', stability: 0.9 });
    svc.open(snap.portalId);
    expect(svc.close(snap.portalId)).toBe(true);
    expect(svc.getPortal(snap.portalId)?.status).toBe('closed');
  });

  it('returns false when closing already closed portal', () => {
    const svc = createWorldPortalRegistry(createDeps());
    const snap = svc.create({ worldA: 'w1', worldB: 'w2', stability: 0.9 });
    expect(svc.close(snap.portalId)).toBe(false);
  });
});

describe('WorldPortalRegistry — markUnstable and use', () => {
  it('marks a portal as unstable', () => {
    const svc = createWorldPortalRegistry(createDeps());
    const snap = svc.create({ worldA: 'w1', worldB: 'w2', stability: 0.3 });
    svc.open(snap.portalId);
    expect(svc.markUnstable(snap.portalId)).toBe(true);
    expect(svc.getPortal(snap.portalId)?.status).toBe('unstable');
  });

  it('increments usage on open portal', () => {
    const svc = createWorldPortalRegistry(createDeps());
    const snap = svc.create({ worldA: 'w1', worldB: 'w2', stability: 0.9 });
    svc.open(snap.portalId);
    expect(svc.use(snap.portalId)).toBe(true);
    expect(svc.use(snap.portalId)).toBe(true);
    expect(svc.getPortal(snap.portalId)?.usageCount).toBe(2);
  });

  it('rejects use on closed portal', () => {
    const svc = createWorldPortalRegistry(createDeps());
    const snap = svc.create({ worldA: 'w1', worldB: 'w2', stability: 0.9 });
    expect(svc.use(snap.portalId)).toBe(false);
  });
});

describe('WorldPortalRegistry — getPortalsForWorld', () => {
  it('finds portals connected to a world', () => {
    const svc = createWorldPortalRegistry(createDeps());
    svc.create({ worldA: 'w1', worldB: 'w2', stability: 0.9 });
    svc.create({ worldA: 'w3', worldB: 'w1', stability: 0.7 });
    svc.create({ worldA: 'w2', worldB: 'w3', stability: 0.5 });
    const portals = svc.getPortalsForWorld('w1');
    expect(portals).toHaveLength(2);
  });
});

describe('WorldPortalRegistry — stats', () => {
  it('reports portal status counts', () => {
    const svc = createWorldPortalRegistry(createDeps());
    const a = svc.create({ worldA: 'w1', worldB: 'w2', stability: 0.9 });
    svc.create({ worldA: 'w3', worldB: 'w4', stability: 0.5 });
    const c = svc.create({ worldA: 'w5', worldB: 'w6', stability: 0.3 });
    svc.open(a.portalId);
    svc.open(c.portalId);
    svc.markUnstable(c.portalId);
    const stats = svc.getStats();
    expect(stats.totalPortals).toBe(3);
    expect(stats.openPortals).toBe(1);
    expect(stats.closedPortals).toBe(1);
    expect(stats.unstablePortals).toBe(1);
  });
});
