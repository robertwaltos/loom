import { describe, it, expect } from 'vitest';
import { createCommandBus } from '../command-bus.js';
import type { Command } from '../command-bus.js';

function makeCommand(overrides?: Partial<Command>): Command {
  return {
    type: 'entity.spawn',
    payload: { entityId: 'e-1' },
    issuedBy: 'player-1',
    issuedAt: 1_000_000,
    correlationId: 'corr-1',
    ...overrides,
  };
}

describe('CommandBus — registration', () => {
  it('registers a handler', () => {
    const bus = createCommandBus();
    bus.register('entity.spawn', () => ({ success: true, data: null }));
    expect(bus.hasHandler('entity.spawn')).toBe(true);
  });

  it('unregisters a handler', () => {
    const bus = createCommandBus();
    bus.register('entity.spawn', () => ({ success: true, data: null }));
    expect(bus.unregister('entity.spawn')).toBe(true);
    expect(bus.hasHandler('entity.spawn')).toBe(false);
  });

  it('returns false when unregistering unknown type', () => {
    const bus = createCommandBus();
    expect(bus.unregister('unknown')).toBe(false);
  });
});

describe('CommandBus — dispatch', () => {
  it('dispatches to registered handler', () => {
    const bus = createCommandBus();
    bus.register('entity.spawn', (cmd) => ({
      success: true,
      data: { spawned: cmd.payload },
    }));

    const result = bus.dispatch(makeCommand());
    expect(result.success).toBe(true);
  });

  it('returns error for unhandled command type', () => {
    const bus = createCommandBus();
    const result = bus.dispatch(makeCommand({ type: 'unknown.action' }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('UNHANDLED');
    }
  });

  it('handler receives command data', () => {
    const bus = createCommandBus();
    const captured: Command[] = [];

    bus.register('entity.spawn', (cmd) => {
      captured.push(cmd);
      return { success: true, data: null };
    });

    bus.dispatch(makeCommand({ issuedBy: 'admin' }));
    expect(captured[0]?.issuedBy).toBe('admin');
  });

  it('propagates handler failures', () => {
    const bus = createCommandBus();
    bus.register('entity.spawn', () => ({
      success: false,
      error: 'Entity already exists',
      code: 'DUPLICATE',
    }));

    const result = bus.dispatch(makeCommand());
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('DUPLICATE');
    }
  });
});

describe('CommandBus — middleware', () => {
  it('executes middleware before handler', () => {
    const bus = createCommandBus();
    const order: string[] = [];

    bus.use((_cmd, next) => {
      order.push('middleware');
      return next();
    });
    bus.register('test', () => {
      order.push('handler');
      return { success: true, data: null };
    });

    bus.dispatch(makeCommand({ type: 'test' }));
    expect(order).toEqual(['middleware', 'handler']);
  });

  it('middleware can short-circuit', () => {
    const bus = createCommandBus();
    const handlerCalled: boolean[] = [];

    bus.use(() => ({ success: false, error: 'Blocked', code: 'BLOCKED' }));
    bus.register('test', () => {
      handlerCalled.push(true);
      return { success: true, data: null };
    });

    const result = bus.dispatch(makeCommand({ type: 'test' }));
    expect(result.success).toBe(false);
    expect(handlerCalled).toHaveLength(0);
  });

  it('chains multiple middlewares in order', () => {
    const bus = createCommandBus();
    const order: string[] = [];

    bus.use((_cmd, next) => {
      order.push('first');
      return next();
    });
    bus.use((_cmd, next) => {
      order.push('second');
      return next();
    });
    bus.register('test', () => {
      order.push('handler');
      return { success: true, data: null };
    });

    bus.dispatch(makeCommand({ type: 'test' }));
    expect(order).toEqual(['first', 'second', 'handler']);
  });

  it('middleware can modify result', () => {
    const bus = createCommandBus();

    bus.use((_cmd, next) => {
      const result = next();
      if (result.success) {
        return { success: true, data: 'enriched' };
      }
      return result;
    });
    bus.register('test', () => ({ success: true, data: 'original' }));

    const result = bus.dispatch(makeCommand({ type: 'test' }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('enriched');
    }
  });
});

describe('CommandBus — stats', () => {
  it('tracks dispatch counts', () => {
    const bus = createCommandBus();
    bus.register('ok', () => ({ success: true, data: null }));
    bus.register('fail', () => ({ success: false, error: 'e', code: 'E' }));

    bus.dispatch(makeCommand({ type: 'ok' }));
    bus.dispatch(makeCommand({ type: 'fail' }));
    bus.dispatch(makeCommand({ type: 'missing' }));

    const stats = bus.getStats();
    expect(stats.totalDispatched).toBe(3);
    expect(stats.totalSucceeded).toBe(1);
    expect(stats.totalFailed).toBe(1);
    expect(stats.totalUnhandled).toBe(1);
  });

  it('counts handlers and middlewares', () => {
    const bus = createCommandBus();
    bus.register('a', () => ({ success: true, data: null }));
    bus.register('b', () => ({ success: true, data: null }));
    bus.use((_c, n) => n());

    const stats = bus.getStats();
    expect(stats.handlerCount).toBe(2);
    expect(stats.middlewareCount).toBe(1);
  });

  it('starts with zero stats', () => {
    const bus = createCommandBus();
    const stats = bus.getStats();
    expect(stats.totalDispatched).toBe(0);
    expect(stats.handlerCount).toBe(0);
  });
});

describe('CommandBus — handler replacement', () => {
  it('replaces existing handler for same type', () => {
    const bus = createCommandBus();
    bus.register('test', () => ({ success: true, data: 'first' }));
    bus.register('test', () => ({ success: true, data: 'second' }));

    const result = bus.dispatch(makeCommand({ type: 'test' }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('second');
    }
  });
});
