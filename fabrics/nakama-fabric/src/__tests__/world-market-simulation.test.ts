import { beforeEach, describe, expect, it } from 'vitest';
import { createWorldMarket, type MarketEventType } from '../world-market.js';

describe('world-market simulation', () => {
  const MICRO = 1_000_000n;

  let nowUs: bigint;
  let generated: number;

  const advance = (deltaUs: bigint): void => {
    nowUs += deltaUs;
  };

  const createSim = () =>
    createWorldMarket({
      clock: { nowMicroseconds: () => nowUs },
      idGen: {
        next: () => {
          generated += 1;
          return `sim-world-market-${generated}`;
        },
      },
    });

  const registerIron = (market: ReturnType<typeof createSim>, worldId = 'world-a'): void => {
    expect(market.registerCommodity(worldId, 'iron', 100n * MICRO, 'Iron Ore', 'metal')).toBe('success');
  };

  beforeEach(() => {
    nowUs = 1_000_000n;
    generated = 0;
  });

  it('runs a full market cycle and updates state, history, and report', () => {
    const market = createSim();
    registerIron(market);

    advance(10n);
    expect(market.recordSupply('world-a', 'iron', 'miner-1', 500n)).toBe('success');
    advance(10n);
    expect(market.recordDemand('world-a', 'iron', 800n)).toBe('success');
    advance(10n);
    expect(market.removeDemand('world-a', 'iron', 200n)).toBe('success');

    const state = market.getMarketState('world-a', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.totalSupply).toBe(500n);
      expect(state.totalDemand).toBe(600n);
      expect(state.spotPrice).toBe(120n * MICRO);
    }

    const history = market.getPriceHistory('world-a', 'iron');
    expect(history).toHaveLength(3);
    expect(history[0]?.price).toBe(100n * MICRO);
    expect(history[1]?.price).toBe(160n * MICRO);
    expect(history[2]?.price).toBe(120n * MICRO);

    const report = market.getMarketReport('world-a');
    expect(report.totalCommodities).toBe(1);
    expect(report.totalVolume).toBe(500n);
    expect(report.avgPrice).toBe(120n * MICRO);
  });

  it('rejects invalid amounts and unknown commodities without mutating tracked worlds', () => {
    const market = createSim();
    registerIron(market);

    expect(market.recordSupply('world-a', 'iron', 'miner-1', 0n)).toBe('invalid-amount');
    expect(market.recordDemand('world-a', 'iron', -1n)).toBe('invalid-amount');
    expect(market.recordSupply('world-a', 'unknown', 'miner-1', 1n)).toBe('not-found');
    expect(market.recordDemand('world-z', 'iron', 1n)).toBe('not-found');

    const state = market.getMarketState('world-a', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.totalSupply).toBe(0n);
      expect(state.totalDemand).toBe(0n);
      expect(state.spotPrice).toBe(100n * MICRO);
    }

    expect(market.getPriceHistory('world-a', 'iron')).toHaveLength(0);
  });

  it('applies exact ratio-based pricing for supply and demand changes', () => {
    const market = createSim();
    registerIron(market);

    expect(market.recordSupply('world-a', 'iron', 'miner-1', 400n)).toBe('success');
    expect(market.recordDemand('world-a', 'iron', 100n)).toBe('success');
    expect(market.getSpotPrice('world-a', 'iron')).toBe(25n * MICRO);

    expect(market.recordDemand('world-a', 'iron', 500n)).toBe('success');
    expect(market.getSpotPrice('world-a', 'iron')).toBe(150n * MICRO);
  });

  it('doubles base price with demand and no supply, then recalculates once supply arrives', () => {
    const market = createSim();
    registerIron(market);

    expect(market.recordDemand('world-a', 'iron', 80n)).toBe('success');
    expect(market.getSpotPrice('world-a', 'iron')).toBe(200n * MICRO);

    expect(market.recordSupply('world-a', 'iron', 'miner-2', 200n)).toBe('success');
    expect(market.getSpotPrice('world-a', 'iron')).toBe(40n * MICRO);
  });

  it('raises manipulation alerts at 50 percent control and not below the threshold', () => {
    const market = createSim();
    registerIron(market);

    expect(market.recordSupply('world-a', 'iron', 'actor-a', 499n)).toBe('success');
    expect(market.recordSupply('world-a', 'iron', 'actor-b', 501n)).toBe('success');

    const alerts = market.detectManipulation('world-a', 'iron');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.actorId).toBe('actor-b');
    expect(alerts[0]?.controlPercentage).toBeCloseTo(50.1, 2);

    const report = market.getMarketReport('world-a');
    expect(report.manipulationAlerts).toBe(1);
  });

  it('accumulates alert records across repeated detection sweeps', () => {
    const market = createSim();
    registerIron(market);
    expect(market.recordSupply('world-a', 'iron', 'monopoly', 900n)).toBe('success');
    expect(market.recordSupply('world-a', 'iron', 'small', 100n)).toBe('success');

    const first = market.detectManipulation('world-a', 'iron');
    const second = market.detectManipulation('world-a', 'iron');

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0]?.alertId).toBe('alert-1');
    expect(second[0]?.alertId).toBe('alert-2');
    expect(market.getMarketReport('world-a').manipulationAlerts).toBe(2);
  });

  it('tracks market events per world with deterministic ids and timestamps', () => {
    const market = createSim();

    const queue = [
      ['world-a', 'iron', 'BOOM', 'Foundry demand spike'],
      ['world-b', 'grain', 'GLUT', 'Harvest overflow'],
      ['world-a', 'iron', 'CRASH', 'Speculator unwind'],
    ] as const satisfies ReadonlyArray<readonly [string, string, MarketEventType, string]>;

    const ids: string[] = [];
    for (const [worldId, commodityId, eventType, description] of queue) {
      advance(7n);
      ids.push(market.triggerMarketEvent(worldId, commodityId, eventType, description));
    }

    expect(ids).toEqual(['event-1', 'event-2', 'event-3']);

    const worldAEvents = market.getMarketEvents('world-a');
    expect(worldAEvents).toHaveLength(2);
    expect(worldAEvents[0]?.eventType).toBe('BOOM');
    expect(worldAEvents[1]?.eventType).toBe('CRASH');
    expect((worldAEvents[0]?.timestamp ?? 0n) < (worldAEvents[1]?.timestamp ?? 0n)).toBe(true);

    const worldBEvents = market.getMarketEvents('world-b');
    expect(worldBEvents).toHaveLength(1);
    expect(worldBEvents[0]?.description).toContain('Harvest overflow');
  });

  it('keeps market states and reports isolated across worlds with same commodity ids', () => {
    const market = createSim();
    registerIron(market, 'world-a');
    registerIron(market, 'world-b');

    expect(market.recordSupply('world-a', 'iron', 'a1', 100n)).toBe('success');
    expect(market.recordDemand('world-a', 'iron', 300n)).toBe('success');

    expect(market.recordSupply('world-b', 'iron', 'b1', 200n)).toBe('success');
    expect(market.recordDemand('world-b', 'iron', 100n)).toBe('success');

    expect(market.getSpotPrice('world-a', 'iron')).toBe(300n * MICRO);
    expect(market.getSpotPrice('world-b', 'iron')).toBe(50n * MICRO);

    const reportA = market.getMarketReport('world-a');
    const reportB = market.getMarketReport('world-b');
    expect(reportA.totalVolume).toBe(100n);
    expect(reportB.totalVolume).toBe(200n);
  });

  it('calculates average price across multiple commodities in the same world', () => {
    const market = createSim();

    expect(market.registerCommodity('world-a', 'iron', 100n * MICRO, 'Iron Ore', 'metal')).toBe('success');
    expect(market.registerCommodity('world-a', 'grain', 20n * MICRO, 'Grain', 'food')).toBe('success');

    expect(market.recordDemand('world-a', 'iron', 20n)).toBe('success');
    expect(market.recordSupply('world-a', 'grain', 'farmer', 100n)).toBe('success');
    expect(market.recordDemand('world-a', 'grain', 200n)).toBe('success');

    const ironPrice = market.getSpotPrice('world-a', 'iron');
    const grainPrice = market.getSpotPrice('world-a', 'grain');
    expect(ironPrice).toBe(200n * MICRO);
    expect(grainPrice).toBe(40n * MICRO);

    const report = market.getMarketReport('world-a');
    expect(report.totalCommodities).toBe(2);
    expect(report.avgPrice).toBe(120n * MICRO);
  });

  it('clamps demand at zero and keeps unknown-demand removals as not-found', () => {
    const market = createSim();
    registerIron(market);

    expect(market.removeDemand('world-a', 'missing', 10n)).toBe('not-found');

    expect(market.recordSupply('world-a', 'iron', 'miner-1', 50n)).toBe('success');
    expect(market.recordDemand('world-a', 'iron', 30n)).toBe('success');
    expect(market.removeDemand('world-a', 'iron', 100n)).toBe('success');

    const state = market.getMarketState('world-a', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.totalDemand).toBe(0n);
      expect(state.spotPrice).toBe(100n * MICRO);
    }
  });
});
