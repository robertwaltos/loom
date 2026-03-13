import { describe, expect, it } from 'vitest';
import { createCommandBus } from '../command-bus.js';

describe('command-bus simulation', () => {
  it('simulates middleware pipeline and successful command dispatch', () => {
    const bus = createCommandBus();
    const order: string[] = [];

    bus.use((_cmd, next) => {
      order.push('mw1');
      return next();
    });
    bus.use((_cmd, next) => {
      order.push('mw2');
      return next();
    });
    bus.register('entity.spawn', () => {
      order.push('handler');
      return { success: true, data: { spawned: true } };
    });

    const result = bus.dispatch({
      type: 'entity.spawn',
      payload: { entityId: 'e-1' },
      issuedBy: 'player-1',
      issuedAt: 1_000_000,
      correlationId: 'corr-1',
    });

    expect(result.success).toBe(true);
    expect(order).toEqual(['mw1', 'mw2', 'handler']);
  });
});
