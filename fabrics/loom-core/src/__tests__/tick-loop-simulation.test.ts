import { describe, expect, it } from 'vitest';
import { createTickLoop } from '../tick-loop.js';
import { createSystemRegistry } from '../system-registry.js';
import { createFakeClock } from '../clock.js';
import { createSilentLogger } from '../logger.js';

describe('tick-loop simulation', () => {
  it('simulates heartbeat ticks driving registered systems with advancing time', () => {
    const clock = createFakeClock(1_000_000);
    const logger = createSilentLogger();
    const systems = createSystemRegistry({ logger });
    const loop = createTickLoop({ systems, clock, logger, tickRateHz: 30, budgetMs: 5 });

    const deltas: number[] = [];
    systems.register('collector', (ctx) => {
      deltas.push(ctx.deltaMs);
    }, 10);

    clock.advance(16_000);
    loop.tickOnce();
    clock.advance(17_000);
    loop.tickOnce();
    clock.advance(15_000);
    loop.tickOnce();

    const stats = loop.stats();
    expect(stats.tickNumber).toBe(3);
    expect(deltas[0]).toBeGreaterThan(1000);
    expect(deltas.slice(1)).toEqual([17, 15]);
    expect(stats.averageTickDurationMs).toBeGreaterThanOrEqual(0);
  });
});
