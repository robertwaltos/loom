import { describe, expect, it } from 'vitest';
import { createServiceRegistry } from '../service-registry.js';

describe('service-registry simulation', () => {
  it('simulates registration, heartbeat, status transitions, discovery, and cleanup', () => {
    let time = 1_000_000;
    let id = 0;
    const registry = createServiceRegistry({
      clock: { nowMicroseconds: () => (time += 10_000) },
      idGenerator: { next: () => 'svc-' + String(++id) },
    });

    const auth = registry.register({ name: 'auth', version: '1.0.0' });
    const authV2 = registry.register({ name: 'auth', version: '2.0.0' });
    const gateway = registry.register({ name: 'gateway', version: '1.1.0' });

    registry.heartbeat(auth.serviceId);
    registry.suspend(gateway.serviceId);
    registry.markDegraded(authV2.serviceId);

    const authServices = registry.findByName('auth');
    const suspended = registry.listByStatus('suspended');
    registry.deregister(gateway.serviceId);

    expect(authServices).toHaveLength(2);
    expect(suspended[0]?.serviceId).toBe(gateway.serviceId);
    expect(registry.getService(gateway.serviceId)).toBeUndefined();
    expect(registry.getStats().totalServices).toBe(2);
  });
});
