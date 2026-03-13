import { describe, expect, it } from 'vitest';
import { createSettlementEngine } from '../settlement-engine.js';
import { createFakeClock } from '../clock.js';

describe('settlement-engine simulation', () => {
  it('simulates founding, growth, trade, infrastructure upgrades, and world events', () => {
    const clock = createFakeClock(1_000_000);
    const engine = createSettlementEngine(clock);

    const a = engine.foundSettlement({
      name: 'Haven',
      worldId: 'terra',
      x: 0,
      y: 0,
      biome: 'GRASSLAND',
      waterAccess: true,
      resourceCount: 8,
    });
    const b = engine.foundSettlement({
      name: 'Forge',
      worldId: 'terra',
      x: 2,
      y: 2,
      biome: 'FOREST',
      waterAccess: false,
      resourceCount: 4,
    });

    engine.upgradeInfrastructure(a.settlementId, 'roads');
    engine.upgradeInfrastructure(a.settlementId, 'commerce');
    for (let i = 0; i < 200; i++) engine.tickGrowth(a.settlementId, 60_000);

    const route = engine.addTradeRoute(a.settlementId, b.settlementId);
    const event = engine.triggerEvent(a.settlementId, 'FESTIVAL');
    const stats = engine.getStats();

    expect(route).toBeDefined();
    expect(event?.eventType).toBe('FESTIVAL');
    expect(engine.getTradeRoutes(a.settlementId).length).toBeGreaterThan(0);
    expect(stats.totalSettlements).toBe(2);
    expect(stats.averageHappiness).toBeGreaterThan(0);
  });
});
