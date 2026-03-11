import { describe, it, expect } from 'vitest';
import { createTransitRequestService } from '../transit-request.js';
import type { TransitRequestDeps, QueuedTransitRequest } from '../transit-request.js';

function createMockDeps(overrides?: Partial<TransitRequestDeps>): TransitRequestDeps & {
  readonly queuedRequests: QueuedTransitRequest[];
} {
  let idCounter = 0;
  const queuedRequests: QueuedTransitRequest[] = [];

  return {
    queuedRequests,
    presence: {
      getStatus: () => 'online',
      getWorldId: () => 'earth',
      ...overrides?.presence,
    },
    worlds: {
      exists: () => true,
      getIntegrity: () => 85,
      ...overrides?.worlds,
    },
    entities: {
      getEntityForDynasty: () => 'entity-1',
      isInTransit: () => false,
      ...overrides?.entities,
    },
    queue: {
      enqueue: (req) => {
        queuedRequests.push(req);
      },
      getPendingCount: () => queuedRequests.length,
      ...overrides?.queue,
    },
    idGenerator: {
      next: () => {
        idCounter += 1;
        return 'req-' + String(idCounter);
      },
    },
    clock: { nowMicroseconds: () => 1_000_000 },
  };
}

describe('TransitRequestService — happy path', () => {
  it('queues valid transit request', () => {
    const deps = createMockDeps();
    const service = createTransitRequestService(deps);

    const result = service.requestTransit({
      dynastyId: 'd-1',
      destinationWorldId: 'mars',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.requestId).toBe('req-1');
      expect(result.value.entityId).toBe('entity-1');
      expect(result.value.sourceWorldId).toBe('earth');
      expect(result.value.destinationWorldId).toBe('mars');
    }
    expect(deps.queuedRequests).toHaveLength(1);
  });

  it('returns pending count from queue', () => {
    const deps = createMockDeps();
    const service = createTransitRequestService(deps);

    service.requestTransit({ dynastyId: 'd-1', destinationWorldId: 'mars' });
    service.requestTransit({ dynastyId: 'd-2', destinationWorldId: 'venus' });

    expect(service.getPendingCount()).toBe(2);
  });
});

describe('TransitRequestService — presence validation', () => {
  it('rejects offline dynasty', () => {
    const deps = createMockDeps({
      presence: { getStatus: () => 'offline', getWorldId: () => undefined },
    });
    const service = createTransitRequestService(deps);

    const result = service.requestTransit({
      dynastyId: 'd-1',
      destinationWorldId: 'mars',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('dynasty_offline');
    }
  });

  it('rejects dynasty with no world', () => {
    const deps = createMockDeps({
      presence: { getStatus: () => 'online', getWorldId: () => undefined },
    });
    const service = createTransitRequestService(deps);

    const result = service.requestTransit({
      dynastyId: 'd-1',
      destinationWorldId: 'mars',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('dynasty_no_world');
    }
  });
});

describe('TransitRequestService — entity validation', () => {
  it('rejects when no entity found for dynasty', () => {
    const deps = createMockDeps({
      entities: {
        getEntityForDynasty: () => undefined,
        isInTransit: () => false,
      },
    });
    const service = createTransitRequestService(deps);

    const result = service.requestTransit({
      dynastyId: 'd-1',
      destinationWorldId: 'mars',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('entity_not_found');
    }
  });

  it('rejects entity already in transit', () => {
    const deps = createMockDeps({
      entities: {
        getEntityForDynasty: () => 'entity-1',
        isInTransit: () => true,
      },
    });
    const service = createTransitRequestService(deps);

    const result = service.requestTransit({
      dynastyId: 'd-1',
      destinationWorldId: 'mars',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('already_in_transit');
    }
  });
});

describe('TransitRequestService — world validation', () => {
  it('rejects unknown destination world', () => {
    const deps = createMockDeps({
      worlds: { exists: () => false, getIntegrity: () => 100 },
    });
    const service = createTransitRequestService(deps);

    const result = service.requestTransit({
      dynastyId: 'd-1',
      destinationWorldId: 'unknown-world',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('destination_unknown');
    }
  });

  it('rejects transit to same world', () => {
    const deps = createMockDeps({
      presence: { getStatus: () => 'online', getWorldId: () => 'mars' },
    });
    const service = createTransitRequestService(deps);

    const result = service.requestTransit({
      dynastyId: 'd-1',
      destinationWorldId: 'mars',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('same_world');
    }
  });

  it('rejects transit to low-integrity world', () => {
    const deps = createMockDeps({
      worlds: { exists: () => true, getIntegrity: () => 5 },
    });
    const service = createTransitRequestService(deps);

    const result = service.requestTransit({
      dynastyId: 'd-1',
      destinationWorldId: 'mars',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('integrity_too_low');
    }
  });
});

describe('TransitRequestService — stats', () => {
  it('tracks request statistics', () => {
    const deps = createMockDeps();
    const service = createTransitRequestService(deps);

    service.requestTransit({ dynastyId: 'd-1', destinationWorldId: 'mars' });

    const stats = service.getStats();
    expect(stats.totalRequests).toBe(1);
    expect(stats.approvedRequests).toBe(1);
    expect(stats.rejectedRequests).toBe(0);
  });

  it('tracks rejections separately', () => {
    const deps = createMockDeps({
      presence: { getStatus: () => 'offline', getWorldId: () => undefined },
    });
    const service = createTransitRequestService(deps);

    service.requestTransit({ dynastyId: 'd-1', destinationWorldId: 'mars' });

    const stats = service.getStats();
    expect(stats.totalRequests).toBe(1);
    expect(stats.approvedRequests).toBe(0);
    expect(stats.rejectedRequests).toBe(1);
  });
});
