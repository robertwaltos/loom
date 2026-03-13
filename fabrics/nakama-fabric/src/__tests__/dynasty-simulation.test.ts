import { describe, expect, it } from 'vitest';
import { createDynastyRegistry } from '../dynasty.js';

describe('dynasty simulation', () => {
  it('simulates founding cohorts and lifecycle segmentation', () => {
    let now = 1_000_000;
    const registry = createDynastyRegistry({
      clock: { nowMicroseconds: () => now },
    });

    registry.found({ dynastyId: 'd1', name: 'House Dawn', homeWorldId: 'earth' });
    now += 500;
    registry.found({ dynastyId: 'd2', name: 'House Tide', homeWorldId: 'earth', subscriptionTier: 'patron' });
    now += 500;
    registry.found({ dynastyId: 'd3', name: 'House Ember', homeWorldId: 'mars' });

    registry.setStatus('d3', 'dormant');
    registry.setSubscriptionTier('d1', 'accord');

    expect(registry.count()).toBe(3);
    expect(registry.findByHomeWorld('earth')).toHaveLength(2);
    expect(registry.listByStatus('dormant')).toHaveLength(1);
    expect(registry.findByKalonAccount('dynasty:d2')?.name).toBe('House Tide');
  });

  it('simulates activity heartbeat updates and completion', () => {
    let now = 10_000;
    const registry = createDynastyRegistry({
      clock: { nowMicroseconds: () => now },
    });

    registry.found({ dynastyId: 'legacy', name: 'House Legacy', homeWorldId: 'venus' });
    now += 100_000;
    registry.updateLastActive('legacy');
    now += 100_000;
    registry.setStatus('legacy', 'completed');

    const record = registry.get('legacy');
    expect(record.lastActiveAt).toBe(110_000);
    expect(record.status).toBe('completed');
  });
});
