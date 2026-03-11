import { describe, it, expect, vi } from 'vitest';
import { createSystemRegistry } from '../system-registry.js';
import type { SystemContext } from '../system-registry.js';
import { createSilentLogger } from '../logger.js';

function makeContext(overrides: Partial<SystemContext> = {}): SystemContext {
  return { deltaMs: 16.67, tickNumber: 1, wallTimeMicroseconds: 1_000_000, ...overrides };
}

function createRegistry() {
  return createSystemRegistry({ logger: createSilentLogger() });
}

describe('SystemRegistry registration', () => {
  it('registers and lists systems', () => {
    const registry = createRegistry();
    registry.register('physics', vi.fn(), 10);
    registry.register('ai', vi.fn(), 20);

    const systems = registry.listSystems();
    expect(systems).toHaveLength(2);
    expect(systems[0]?.name).toBe('physics');
    expect(systems[1]?.name).toBe('ai');
  });

  it('throws on duplicate registration', () => {
    const registry = createRegistry();
    registry.register('physics', vi.fn());
    expect(() => {
      registry.register('physics', vi.fn());
    }).toThrow('already registered');
  });

  it('unregisters systems', () => {
    const registry = createRegistry();
    registry.register('physics', vi.fn());
    expect(registry.unregister('physics')).toBe(true);
    expect(registry.isRegistered('physics')).toBe(false);
  });

  it('returns false for unregistering unknown system', () => {
    const registry = createRegistry();
    expect(registry.unregister('nope')).toBe(false);
  });
});

describe('SystemRegistry execution', () => {
  it('runs systems in priority order', () => {
    const registry = createRegistry();
    const order: string[] = [];

    registry.register(
      'ai',
      () => {
        order.push('ai');
      },
      20,
    );
    registry.register(
      'physics',
      () => {
        order.push('physics');
      },
      10,
    );
    registry.register(
      'render',
      () => {
        order.push('render');
      },
      30,
    );

    registry.runAll(makeContext());
    expect(order).toEqual(['physics', 'ai', 'render']);
  });

  it('skips disabled systems', () => {
    const registry = createRegistry();
    const fn = vi.fn();
    registry.register('physics', fn);
    registry.disable('physics');

    registry.runAll(makeContext());
    expect(fn).not.toHaveBeenCalled();
  });

  it('re-enables disabled systems', () => {
    const registry = createRegistry();
    const fn = vi.fn();
    registry.register('physics', fn);
    registry.disable('physics');
    registry.enable('physics');

    registry.runAll(makeContext());
    expect(fn).toHaveBeenCalledOnce();
  });

  it('passes context to systems', () => {
    const registry = createRegistry();
    const fn = vi.fn();
    registry.register('test', fn);

    const ctx = makeContext({ deltaMs: 33.33, tickNumber: 42 });
    registry.runAll(ctx);
    expect(fn).toHaveBeenCalledWith(ctx);
  });
});

describe('SystemRegistry error handling', () => {
  it('catches system errors without breaking other systems', () => {
    const errorFn = vi.fn();
    const logger = { ...createSilentLogger(), error: errorFn };
    const registry = createSystemRegistry({ logger });

    const second = vi.fn();
    registry.register(
      'broken',
      () => {
        throw new Error('boom');
      },
      10,
    );
    registry.register('healthy', second, 20);

    registry.runAll(makeContext());
    expect(second).toHaveBeenCalledOnce();
    expect(errorFn).toHaveBeenCalledOnce();
  });

  it('throws when enabling unknown system', () => {
    const registry = createRegistry();
    expect(() => {
      registry.enable('nope');
    }).toThrow('not registered');
  });
});
