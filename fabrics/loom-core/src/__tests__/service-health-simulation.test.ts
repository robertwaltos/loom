import { describe, expect, it } from 'vitest';
import { createServiceHealthAggregator } from '../service-health.js';

describe('service-health simulation', () => {
  it('simulates service registration, incident reporting, and aggregate health rollup', () => {
    let now = 1_000;
    const health = createServiceHealthAggregator({
      clock: { nowMicroseconds: () => now++ },
    });

    health.register({ serviceId: 'api', name: 'API' });
    health.register({ serviceId: 'db', name: 'Database' });
    health.register({ serviceId: 'cache', name: 'Cache' });

    health.report({ serviceId: 'cache', level: 'degraded', message: 'evictions rising' });
    health.report({ serviceId: 'db', level: 'unhealthy', message: 'connection failures' });

    const aggregate = health.aggregate();
    const stats = health.getStats();

    expect(aggregate.overall).toBe('unhealthy');
    expect(aggregate.services).toHaveLength(3);
    expect(stats.degradedCount).toBe(1);
    expect(stats.unhealthyCount).toBe(1);
  });
});
