import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTickLoop } from '../tick-loop.js';
import { createSystemRegistry } from '../system-registry.js';
import { createFakeClock } from '../clock.js';
import { createSilentLogger } from '../logger.js';

function createTestLoop(overrides: { tickRateHz?: number; budgetMs?: number } = {}) {
  const clock = createFakeClock(1_000_000);
  const logger = createSilentLogger();
  const systems = createSystemRegistry({ logger });
  const loop = createTickLoop({
    systems,
    clock,
    logger,
    tickRateHz: overrides.tickRateHz ?? 30,
    budgetMs: overrides.budgetMs ?? 0.5,
  });
  return { loop, systems, clock };
}

describe('TickLoop state management', () => {
  it('starts in idle state', () => {
    const { loop } = createTestLoop();
    expect(loop.state()).toBe('idle');
  });

  it('transitions through lifecycle states', () => {
    const { loop } = createTestLoop();
    loop.start();
    expect(loop.state()).toBe('running');

    loop.pause();
    expect(loop.state()).toBe('paused');

    loop.resume();
    expect(loop.state()).toBe('running');

    loop.stop();
    expect(loop.state()).toBe('idle');
  });
});

describe('TickLoop manual ticking', () => {
  it('executes a single tick manually', () => {
    const { loop, systems, clock } = createTestLoop();
    const fn = vi.fn();
    systems.register('test', fn);

    clock.advance(16_000);
    loop.tickOnce();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('increments tick number on each tick', () => {
    const { loop, clock } = createTestLoop();

    clock.advance(16_000);
    loop.tickOnce();
    clock.advance(16_000);
    loop.tickOnce();

    expect(loop.stats().tickNumber).toBe(2);
  });

  it('provides delta time to systems', () => {
    const { loop, systems, clock } = createTestLoop();
    const fn = vi.fn();
    systems.register('test', fn);

    loop.tickOnce();
    clock.advance(33_000);
    loop.tickOnce();

    const ctx = fn.mock.calls[1]?.[0] as { deltaMs: number } | undefined;
    expect(ctx?.deltaMs).toBe(33);
  });
});

describe('TickLoop stats', () => {
  it('reports initial stats as zero', () => {
    const { loop } = createTestLoop();
    const stats = loop.stats();
    expect(stats.tickNumber).toBe(0);
    expect(stats.lastTickDurationMs).toBe(0);
    expect(stats.peakTickDurationMs).toBe(0);
  });

  it('tracks tick metrics after ticking', () => {
    const { loop, clock } = createTestLoop();
    clock.advance(16_000);
    loop.tickOnce();

    const stats = loop.stats();
    expect(stats.tickNumber).toBe(1);
    expect(stats.lastTickDurationMs).toBeGreaterThanOrEqual(0);
  });
});

describe('TickLoop interval-based ticking', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks at the configured rate', () => {
    vi.useFakeTimers();
    const { loop, systems } = createTestLoop({ tickRateHz: 10 });
    const fn = vi.fn();
    systems.register('counter', fn);

    loop.start();
    vi.advanceTimersByTime(500);
    loop.stop();

    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('does not tick while paused', () => {
    vi.useFakeTimers();
    const { loop, systems } = createTestLoop({ tickRateHz: 10 });
    const fn = vi.fn();
    systems.register('counter', fn);

    loop.start();
    vi.advanceTimersByTime(200);
    const countBeforePause = fn.mock.calls.length;

    loop.pause();
    vi.advanceTimersByTime(500);
    expect(fn.mock.calls.length).toBe(countBeforePause);

    loop.stop();
  });
});
