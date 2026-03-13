import { describe, expect, it } from 'vitest';
import { createDynastyMortalityEngine, GRACE_PERIOD_DEFAULT_US } from '../dynasty-mortality.js';

describe('dynasty mortality simulation', () => {
  it('simulates inactivity, grace period, and terminal death transition', () => {
    let now = 1_000_000;
    let id = 0;
    const events: string[] = [];

    const engine = createDynastyMortalityEngine({
      clock: { nowMicroseconds: () => now },
      idGenerator: { next: () => 'm-' + String(id++) },
      notifications: { notify: (event) => events.push(event.type) },
    });

    engine.registerDynasty('m1');
    engine.setDormant('m1', 'inactivity window reached');
    engine.startGracePeriod('m1', GRACE_PERIOD_DEFAULT_US);

    now += GRACE_PERIOD_DEFAULT_US + 1;
    const grace = engine.checkGracePeriod('m1');

    expect(typeof grace).toBe('object');
    if (typeof grace === 'object') {
      expect(grace.expired).toBe(true);
    }

    engine.declareDeath('m1');
    expect(engine.getRecord('m1')?.state).toBe('DECEASED');
    expect(events).toContain('grace_expired');
  });
});
