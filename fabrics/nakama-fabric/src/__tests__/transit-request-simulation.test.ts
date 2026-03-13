import { beforeEach, describe, expect, it } from 'vitest';
import { createTransitRequestService } from '../transit-request.js';
import type { QueuedTransitRequest, TransitRequestDeps } from '../transit-request.js';

describe('transit-request simulation', () => {
  let now = 1_000_000;
  let id = 0;

  const statuses = new Map<string, string>();
  const worlds = new Map<string, { integrity: number }>();
  const dynastyWorld = new Map<string, string>();
  const dynastyEntity = new Map<string, string>();
  const inTransit = new Set<string>();
  const queue: QueuedTransitRequest[] = [];

  const deps = (): TransitRequestDeps => ({
    presence: {
      getStatus: (dynastyId) => statuses.get(dynastyId) ?? 'offline',
      getWorldId: (dynastyId) => dynastyWorld.get(dynastyId),
    },
    worlds: {
      exists: (worldId) => worlds.has(worldId),
      getIntegrity: (worldId) => worlds.get(worldId)?.integrity ?? 0,
    },
    entities: {
      getEntityForDynasty: (dynastyId) => dynastyEntity.get(dynastyId),
      isInTransit: (entityId) => inTransit.has(entityId),
    },
    queue: {
      enqueue: (request) => {
        queue.push(request);
      },
      getPendingCount: () => queue.length,
    },
    idGenerator: { next: () => `tx-${++id}` },
    clock: { nowMicroseconds: () => ++now },
  });

  beforeEach(() => {
    now = 1_000_000;
    id = 0;
    statuses.clear();
    worlds.clear();
    dynastyWorld.clear();
    dynastyEntity.clear();
    inTransit.clear();
    queue.length = 0;

    worlds.set('earth', { integrity: 95 });
    worlds.set('mars', { integrity: 82 });
    worlds.set('void', { integrity: 5 });

    statuses.set('dyn-1', 'online');
    dynastyWorld.set('dyn-1', 'earth');
    dynastyEntity.set('dyn-1', 'ent-1');
  });

  it('simulates a successful request lifecycle and queue record shape', () => {
    const service = createTransitRequestService(deps());

    const result = service.requestTransit({ dynastyId: 'dyn-1', destinationWorldId: 'mars' });
    expect(result.ok).toBe(true);
    expect(service.getPendingCount()).toBe(1);

    const queued = queue[0];
    expect(queued?.requestId).toBe('tx-1');
    expect(queued?.sourceWorldId).toBe('earth');
    expect(queued?.destinationWorldId).toBe('mars');
  });

  it('simulates rejection matrix for offline, same-world, and low-integrity destinations', () => {
    const service = createTransitRequestService(deps());

    statuses.set('dyn-1', 'offline');
    const offline = service.requestTransit({ dynastyId: 'dyn-1', destinationWorldId: 'mars' });
    expect(offline.ok ? 'ok' : offline.error.code).toBe('dynasty_offline');

    statuses.set('dyn-1', 'online');
    const sameWorld = service.requestTransit({ dynastyId: 'dyn-1', destinationWorldId: 'earth' });
    expect(sameWorld.ok ? 'ok' : sameWorld.error.code).toBe('same_world');

    const lowIntegrity = service.requestTransit({ dynastyId: 'dyn-1', destinationWorldId: 'void' });
    expect(lowIntegrity.ok ? 'ok' : lowIntegrity.error.code).toBe('integrity_too_low');

    expect(service.getStats()).toEqual({ totalRequests: 3, approvedRequests: 0, rejectedRequests: 3 });
  });

  it('simulates transit contention when an entity is already moving', () => {
    const service = createTransitRequestService(deps());
    inTransit.add('ent-1');

    const result = service.requestTransit({ dynastyId: 'dyn-1', destinationWorldId: 'mars' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('already_in_transit');
    }

    inTransit.delete('ent-1');
    const retried = service.requestTransit({ dynastyId: 'dyn-1', destinationWorldId: 'mars' });
    expect(retried.ok).toBe(true);
  });
});
