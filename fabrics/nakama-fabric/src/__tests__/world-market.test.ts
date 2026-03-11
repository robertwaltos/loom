import { describe, it, expect } from 'vitest';
import { createWorldMarket } from '../world-market.js';

function createTestMarket() {
  let time = 1_000_000n;
  let idCount = 0;
  return createWorldMarket({
    clock: { nowMicroseconds: () => time },
    idGen: { next: () => 'id-' + String((idCount = idCount + 1)) },
  });
}

const MICRO = 1_000_000n;

describe('WorldMarket commodity registration', () => {
  it('registers a commodity', () => {
    const market = createTestMarket();
    const result = market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    expect(result).toBe('success');
  });

  it('retrieves registered commodity', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    const commodity = market.getCommodity('world-1', 'iron');
    expect(commodity).not.toBe('not-found');
    if (commodity !== 'not-found') {
      expect(commodity.commodityId).toBe('iron');
      expect(commodity.baseCost).toBe(100n * MICRO);
    }
  });

  it('prevents duplicate commodity registration', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    const result = market.registerCommodity('world-1', 'iron', 200n * MICRO, 'Iron Ore', 'metal');
    expect(result).toBe('already-registered');
  });

  it('returns not-found for unregistered commodity', () => {
    const market = createTestMarket();
    const commodity = market.getCommodity('world-1', 'gold');
    expect(commodity).toBe('not-found');
  });

  it('commodity includes name and category', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'wheat', 50n * MICRO, 'Wheat Grain', 'food');
    const commodity = market.getCommodity('world-1', 'wheat');
    expect(commodity).not.toBe('not-found');
    if (commodity !== 'not-found') {
      expect(commodity.name).toBe('Wheat Grain');
      expect(commodity.category).toBe('food');
    }
  });

  it('same commodity on different worlds are separate', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.registerCommodity('world-2', 'iron', 150n * MICRO, 'Iron Ore', 'metal');
    const c1 = market.getCommodity('world-1', 'iron');
    const c2 = market.getCommodity('world-2', 'iron');
    expect(c1).not.toBe('not-found');
    expect(c2).not.toBe('not-found');
    if (c1 !== 'not-found' && c2 !== 'not-found') {
      expect(c1.baseCost).toBe(100n * MICRO);
      expect(c2.baseCost).toBe(150n * MICRO);
    }
  });
});

describe('WorldMarket supply recording', () => {
  it('records supply for commodity', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    const result = market.recordSupply('world-1', 'iron', 'player-1', 500n);
    expect(result).toBe('success');
  });

  it('supply increases total supply', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 500n);
    const state = market.getMarketState('world-1', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.totalSupply).toBe(500n);
    }
  });

  it('multiple supplies accumulate', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 500n);
    market.recordSupply('world-1', 'iron', 'player-2', 300n);
    const state = market.getMarketState('world-1', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.totalSupply).toBe(800n);
    }
  });

  it('same actor supplies accumulate', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 500n);
    market.recordSupply('world-1', 'iron', 'player-1', 200n);
    const state = market.getMarketState('world-1', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.totalSupply).toBe(700n);
    }
  });

  it('rejects negative supply', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    const result = market.recordSupply('world-1', 'iron', 'player-1', -100n);
    expect(result).toBe('invalid-amount');
  });

  it('rejects zero supply', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    const result = market.recordSupply('world-1', 'iron', 'player-1', 0n);
    expect(result).toBe('invalid-amount');
  });

  it('supply fails for unregistered commodity', () => {
    const market = createTestMarket();
    const result = market.recordSupply('world-1', 'gold', 'player-1', 100n);
    expect(result).toBe('not-found');
  });
});

describe('WorldMarket demand recording', () => {
  it('records demand for commodity', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    const result = market.recordDemand('world-1', 'iron', 300n);
    expect(result).toBe('success');
  });

  it('demand increases total demand', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordDemand('world-1', 'iron', 300n);
    const state = market.getMarketState('world-1', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.totalDemand).toBe(300n);
    }
  });

  it('multiple demands accumulate', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordDemand('world-1', 'iron', 300n);
    market.recordDemand('world-1', 'iron', 200n);
    const state = market.getMarketState('world-1', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.totalDemand).toBe(500n);
    }
  });

  it('rejects negative demand', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    const result = market.recordDemand('world-1', 'iron', -100n);
    expect(result).toBe('invalid-amount');
  });

  it('rejects zero demand', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    const result = market.recordDemand('world-1', 'iron', 0n);
    expect(result).toBe('invalid-amount');
  });

  it('demand fails for unregistered commodity', () => {
    const market = createTestMarket();
    const result = market.recordDemand('world-1', 'gold', 100n);
    expect(result).toBe('not-found');
  });

  it('removes demand from total', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordDemand('world-1', 'iron', 500n);
    market.removeDemand('world-1', 'iron', 200n);
    const state = market.getMarketState('world-1', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.totalDemand).toBe(300n);
    }
  });

  it('removing demand clamps at zero', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordDemand('world-1', 'iron', 100n);
    market.removeDemand('world-1', 'iron', 500n);
    const state = market.getMarketState('world-1', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.totalDemand).toBe(0n);
    }
  });
});

describe('WorldMarket price discovery', () => {
  it('spot price starts at base cost', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    const state = market.getMarketState('world-1', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.spotPrice).toBe(100n * MICRO);
    }
  });

  it('price increases when demand exceeds supply', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 100n);
    market.recordDemand('world-1', 'iron', 200n);
    const state = market.getMarketState('world-1', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.spotPrice).toBeGreaterThan(100n * MICRO);
    }
  });

  it('price decreases when supply exceeds demand', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 200n);
    market.recordDemand('world-1', 'iron', 100n);
    const state = market.getMarketState('world-1', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.spotPrice).toBeLessThan(100n * MICRO);
    }
  });

  it('price doubles when demand but no supply', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordDemand('world-1', 'iron', 100n);
    const state = market.getMarketState('world-1', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.spotPrice).toBe(200n * MICRO);
    }
  });

  it('retrieves spot price directly', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 100n);
    market.recordDemand('world-1', 'iron', 150n);
    const price = market.getSpotPrice('world-1', 'iron');
    expect(price).not.toBe('not-found');
    if (price !== 'not-found') {
      expect(price).toBeGreaterThan(100n * MICRO);
    }
  });

  it('spot price returns not-found for unregistered commodity', () => {
    const market = createTestMarket();
    const price = market.getSpotPrice('world-1', 'gold');
    expect(price).toBe('not-found');
  });

  it('price updates on supply change', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 100n);
    market.recordDemand('world-1', 'iron', 100n);
    const price1 = market.getSpotPrice('world-1', 'iron');
    market.recordSupply('world-1', 'iron', 'player-2', 100n);
    const price2 = market.getSpotPrice('world-1', 'iron');
    expect(price1).not.toBe('not-found');
    expect(price2).not.toBe('not-found');
    if (price1 !== 'not-found' && price2 !== 'not-found') {
      expect(price2).toBeLessThan(price1);
    }
  });

  it('price updates on demand change', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 100n);
    market.recordDemand('world-1', 'iron', 100n);
    const price1 = market.getSpotPrice('world-1', 'iron');
    market.recordDemand('world-1', 'iron', 100n);
    const price2 = market.getSpotPrice('world-1', 'iron');
    expect(price1).not.toBe('not-found');
    expect(price2).not.toBe('not-found');
    if (price1 !== 'not-found' && price2 !== 'not-found') {
      expect(price2).toBeGreaterThan(price1);
    }
  });
});

describe('WorldMarket manipulation detection', () => {
  it('detects manipulation when actor controls over 30 percent', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 400n);
    market.recordSupply('world-1', 'iron', 'player-2', 100n);
    const alerts = market.detectManipulation('world-1', 'iron');
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('no manipulation when all actors below 30 percent', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 250n);
    market.recordSupply('world-1', 'iron', 'player-2', 250n);
    market.recordSupply('world-1', 'iron', 'player-3', 250n);
    const alerts = market.detectManipulation('world-1', 'iron');
    expect(alerts.length).toBe(0);
  });

  it('manipulation alert includes actor ID', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'monopolist', 800n);
    market.recordSupply('world-1', 'iron', 'other', 200n);
    const alerts = market.detectManipulation('world-1', 'iron');
    expect(alerts.length).toBeGreaterThan(0);
    const alert = alerts[0];
    expect(alert).toBeDefined();
    if (alert !== undefined) {
      expect(alert.actorId).toBe('monopolist');
    }
  });

  it('manipulation alert includes control percentage', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 500n);
    market.recordSupply('world-1', 'iron', 'player-2', 500n);
    const alerts = market.detectManipulation('world-1', 'iron');
    expect(alerts.length).toBeGreaterThan(0);
    const alert = alerts[0];
    expect(alert).toBeDefined();
    if (alert !== undefined) {
      expect(alert.controlPercentage).toBeCloseTo(50, 0);
    }
  });

  it('no manipulation with zero supply', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    const alerts = market.detectManipulation('world-1', 'iron');
    expect(alerts.length).toBe(0);
  });

  it('manipulation for unregistered commodity returns empty', () => {
    const market = createTestMarket();
    const alerts = market.detectManipulation('world-1', 'gold');
    expect(alerts.length).toBe(0);
  });
});

describe('WorldMarket events', () => {
  it('triggers market event', () => {
    const market = createTestMarket();
    const eventId = market.triggerMarketEvent('world-1', 'iron', 'BOOM', 'Iron boom period');
    expect(eventId).toContain('event-');
  });

  it('retrieves market events for world', () => {
    const market = createTestMarket();
    market.triggerMarketEvent('world-1', 'iron', 'BOOM', 'Iron boom');
    market.triggerMarketEvent('world-1', 'wheat', 'SHORTAGE', 'Wheat shortage');
    const events = market.getMarketEvents('world-1');
    expect(events.length).toBe(2);
  });

  it('filters events by world', () => {
    const market = createTestMarket();
    market.triggerMarketEvent('world-1', 'iron', 'BOOM', 'Event 1');
    market.triggerMarketEvent('world-2', 'iron', 'BUST', 'Event 2');
    const events = market.getMarketEvents('world-1');
    expect(events.length).toBe(1);
    const event = events[0];
    expect(event).toBeDefined();
    if (event !== undefined) {
      expect(event.worldId).toBe('world-1');
    }
  });

  it('event includes timestamp', () => {
    const market = createTestMarket();
    market.triggerMarketEvent('world-1', 'iron', 'SPIKE', 'Price spike');
    const events = market.getMarketEvents('world-1');
    const event = events[0];
    expect(event).toBeDefined();
    if (event !== undefined) {
      expect(event.timestamp).toBeGreaterThan(0n);
    }
  });

  it('event includes description', () => {
    const market = createTestMarket();
    market.triggerMarketEvent('world-1', 'iron', 'CRASH', 'Market crash due to oversupply');
    const events = market.getMarketEvents('world-1');
    const event = events[0];
    expect(event).toBeDefined();
    if (event !== undefined) {
      expect(event.description).toBe('Market crash due to oversupply');
    }
  });

  it('returns empty events for world with no events', () => {
    const market = createTestMarket();
    const events = market.getMarketEvents('world-999');
    expect(events.length).toBe(0);
  });
});

describe('WorldMarket reports', () => {
  it('generates market report for world', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.registerCommodity('world-1', 'wheat', 50n * MICRO, 'Wheat', 'food');
    const report = market.getMarketReport('world-1');
    expect(report.totalCommodities).toBe(2);
  });

  it('report includes total volume', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 500n);
    const report = market.getMarketReport('world-1');
    expect(report.totalVolume).toBe(500n);
  });

  it('report includes average price', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.registerCommodity('world-1', 'wheat', 50n * MICRO, 'Wheat', 'food');
    const report = market.getMarketReport('world-1');
    expect(report.avgPrice).toBeGreaterThan(0n);
  });

  it('report includes active events count', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.triggerMarketEvent('world-1', 'iron', 'BOOM', 'Boom');
    market.triggerMarketEvent('world-1', 'iron', 'BUST', 'Bust');
    const report = market.getMarketReport('world-1');
    expect(report.activeEvents).toBe(2);
  });

  it('report includes manipulation alerts count', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'monopolist', 400n);
    market.recordSupply('world-1', 'iron', 'other', 100n);
    market.detectManipulation('world-1', 'iron');
    const report = market.getMarketReport('world-1');
    expect(report.manipulationAlerts).toBeGreaterThan(0);
  });

  it('report for world with no commodities', () => {
    const market = createTestMarket();
    const report = market.getMarketReport('world-empty');
    expect(report.totalCommodities).toBe(0);
    expect(report.totalVolume).toBe(0n);
  });
});

describe('WorldMarket price history', () => {
  it('tracks price history', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 100n);
    market.recordDemand('world-1', 'iron', 100n);
    const history = market.getPriceHistory('world-1', 'iron');
    expect(history.length).toBeGreaterThan(0);
  });

  it('price point includes timestamp', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 100n);
    const history = market.getPriceHistory('world-1', 'iron');
    const point = history[0];
    expect(point).toBeDefined();
    if (point !== undefined) {
      expect(point.timestamp).toBeGreaterThan(0n);
    }
  });

  it('price point includes supply and demand', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 200n);
    market.recordDemand('world-1', 'iron', 150n);
    const history = market.getPriceHistory('world-1', 'iron');
    const point = history[history.length - 1];
    expect(point).toBeDefined();
    if (point !== undefined) {
      expect(point.supply).toBe(200n);
      expect(point.demand).toBe(150n);
    }
  });

  it('returns empty history for unregistered commodity', () => {
    const market = createTestMarket();
    const history = market.getPriceHistory('world-1', 'gold');
    expect(history.length).toBe(0);
  });

  it('history accumulates over multiple price changes', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 100n);
    market.recordDemand('world-1', 'iron', 100n);
    market.recordSupply('world-1', 'iron', 'player-2', 100n);
    market.recordDemand('world-1', 'iron', 50n);
    const history = market.getPriceHistory('world-1', 'iron');
    expect(history.length).toBeGreaterThanOrEqual(4);
  });
});

describe('WorldMarket edge cases', () => {
  it('handles very large supply', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 1_000_000_000n);
    const state = market.getMarketState('world-1', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.totalSupply).toBe(1_000_000_000n);
    }
  });

  it('handles very large demand', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordDemand('world-1', 'iron', 1_000_000_000n);
    const state = market.getMarketState('world-1', 'iron');
    expect(state).not.toBe('not-found');
    if (state !== 'not-found') {
      expect(state.totalDemand).toBe(1_000_000_000n);
    }
  });

  it('handles zero base cost commodity', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'water', 0n, 'Water', 'resource');
    const commodity = market.getCommodity('world-1', 'water');
    expect(commodity).not.toBe('not-found');
    if (commodity !== 'not-found') {
      expect(commodity.baseCost).toBe(0n);
    }
  });

  it('multiple worlds tracked independently', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.registerCommodity('world-2', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 500n);
    market.recordSupply('world-2', 'iron', 'player-1', 300n);
    const state1 = market.getMarketState('world-1', 'iron');
    const state2 = market.getMarketState('world-2', 'iron');
    expect(state1).not.toBe('not-found');
    expect(state2).not.toBe('not-found');
    if (state1 !== 'not-found' && state2 !== 'not-found') {
      expect(state1.totalSupply).toBe(500n);
      expect(state2.totalSupply).toBe(300n);
    }
  });

  it('price calculation handles extreme ratios', () => {
    const market = createTestMarket();
    market.registerCommodity('world-1', 'iron', 100n * MICRO, 'Iron Ore', 'metal');
    market.recordSupply('world-1', 'iron', 'player-1', 1n);
    market.recordDemand('world-1', 'iron', 1_000_000n);
    const price = market.getSpotPrice('world-1', 'iron');
    expect(price).not.toBe('not-found');
    if (price !== 'not-found') {
      expect(price).toBeGreaterThan(100n * MICRO);
    }
  });
});
