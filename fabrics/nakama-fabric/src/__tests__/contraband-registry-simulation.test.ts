import { beforeEach, describe, expect, it } from 'vitest';
import { createContrabandRegistry, type ContrabandRegistryDeps } from '../contraband-registry.js';

describe('contraband-registry simulation', () => {
  let nowUs: bigint;
  let idCounter: number;
  let infoLogCount: number;
  let warnLogCount: number;

  const deps = (): ContrabandRegistryDeps => ({
    clock: { nowMicroseconds: () => nowUs },
    idGen: {
      generate: () => {
        idCounter += 1;
        return `sim-contraband-${idCounter}`;
      },
    },
    logger: {
      info: () => {
        infoLogCount += 1;
      },
      warn: () => {
        warnLogCount += 1;
      },
    },
  });

  beforeEach(() => {
    nowUs = 2_000_000n;
    idCounter = 0;
    infoLogCount = 0;
    warnLogCount = 0;
  });

  it('builds prohibition catalog per world and answers prohibition checks accurately', () => {
    const registry = createContrabandRegistry(deps());

    registry.addProhibitionRule({
      worldId: 'w-1',
      itemType: 'bioweapon',
      reason: 'treaty violation',
      penaltyMicroKalon: 9_000_000n,
    });
    registry.addProhibitionRule({
      worldId: 'w-1',
      itemType: 'counterfeit-currency',
      reason: 'economic sabotage',
      penaltyMicroKalon: 3_000_000n,
    });

    expect(registry.isProhibited({ worldId: 'w-1', itemType: 'bioweapon' })).toBe(true);
    expect(registry.isProhibited({ worldId: 'w-1', itemType: 'ore' })).toBe(false);
    expect(registry.listProhibitedGoods({ worldId: 'w-1' })).toHaveLength(2);
    expect(registry.listProhibitedGoods({ worldId: 'w-2' })).toHaveLength(0);
  });

  it('tracks route risk escalation to extreme under repeated failures', () => {
    const registry = createContrabandRegistry(deps());

    for (let i = 0; i < 8; i += 1) {
      nowUs += 1n;
      registry.recordSmuggleAttempt({
        fromWorldId: 'w-a',
        toWorldId: 'w-b',
        itemType: 'bioweapon',
        success: false,
      });
    }

    expect(
      registry.getRouteRisk({ fromWorldId: 'w-a', toWorldId: 'w-b', itemType: 'bioweapon' }),
    ).toBe('EXTREME');
  });

  it('drops route risk to negligible with strong success history', () => {
    const registry = createContrabandRegistry(deps());

    for (let i = 0; i < 25; i += 1) {
      nowUs += 1n;
      registry.recordSmuggleAttempt({
        fromWorldId: 'w-a',
        toWorldId: 'w-c',
        itemType: 'counterfeit-currency',
        success: true,
      });
    }

    expect(
      registry.getRouteRisk({ fromWorldId: 'w-a', toWorldId: 'w-c', itemType: 'counterfeit-currency' }),
    ).toBe('NEGLIGIBLE');
  });

  it('maintains separate route ledgers by item type and destination pair', () => {
    const registry = createContrabandRegistry(deps());

    const routeOne = registry.recordSmuggleAttempt({
      fromWorldId: 'hub',
      toWorldId: 'ring-1',
      itemType: 'bioweapon',
      success: true,
    });
    const routeTwo = registry.recordSmuggleAttempt({
      fromWorldId: 'hub',
      toWorldId: 'ring-1',
      itemType: 'counterfeit-currency',
      success: true,
    });
    const routeThree = registry.recordSmuggleAttempt({
      fromWorldId: 'hub',
      toWorldId: 'ring-2',
      itemType: 'bioweapon',
      success: true,
    });

    expect(routeOne.routeId).not.toBe(routeTwo.routeId);
    expect(routeOne.routeId).not.toBe(routeThree.routeId);
  });

  it('applies sequential seizure multiplier per world when recording repeated seizures', () => {
    const registry = createContrabandRegistry(deps());

    const first = registry.recordSeizure({
      worldId: 'w-seize',
      dynastyId: 'smuggler-1',
      itemType: 'ore',
      quantity: 2,
      baseValueMicroKalon: 1_000n,
      routeId: null,
      enforcerDynastyId: 'marshal-1',
    });

    const second = registry.recordSeizure({
      worldId: 'w-seize',
      dynastyId: 'smuggler-2',
      itemType: 'ore',
      quantity: 2,
      baseValueMicroKalon: 1_000n,
      routeId: null,
      enforcerDynastyId: 'marshal-1',
    });

    expect(first.seizure.estimatedValueMicroKalon).toBe(5_000n);
    expect(second.seizure.estimatedValueMicroKalon).toBe(10_000n);
  });

  it('computes total seizure value per world without cross-world leakage', () => {
    const registry = createContrabandRegistry(deps());

    registry.recordSeizure({
      worldId: 'w-t1',
      dynastyId: 'smuggler-a',
      itemType: 'ore',
      quantity: 1,
      baseValueMicroKalon: 2_000n,
      routeId: null,
      enforcerDynastyId: 'marshal-a',
    });

    registry.recordSeizure({
      worldId: 'w-t1',
      dynastyId: 'smuggler-b',
      itemType: 'ore',
      quantity: 1,
      baseValueMicroKalon: 2_000n,
      routeId: null,
      enforcerDynastyId: 'marshal-a',
    });

    registry.recordSeizure({
      worldId: 'w-t2',
      dynastyId: 'smuggler-c',
      itemType: 'ore',
      quantity: 1,
      baseValueMicroKalon: 2_000n,
      routeId: null,
      enforcerDynastyId: 'marshal-b',
    });

    expect(registry.getTotalSeizureValue({ worldId: 'w-t1' })).toBe(15_000n);
    expect(registry.getTotalSeizureValue({ worldId: 'w-t2' })).toBe(5_000n);
  });

  it('returns seizure reports newest-first and respects limit windows', () => {
    const registry = createContrabandRegistry(deps());

    nowUs = 10n;
    registry.recordSeizure({
      worldId: 'w-report',
      dynastyId: 'd1',
      itemType: 'item-a',
      quantity: 1,
      baseValueMicroKalon: 1_000n,
      routeId: null,
      enforcerDynastyId: 'e1',
    });

    nowUs = 20n;
    registry.recordSeizure({
      worldId: 'w-report',
      dynastyId: 'd2',
      itemType: 'item-b',
      quantity: 1,
      baseValueMicroKalon: 1_000n,
      routeId: null,
      enforcerDynastyId: 'e1',
    });

    nowUs = 30n;
    registry.recordSeizure({
      worldId: 'w-report',
      dynastyId: 'd3',
      itemType: 'item-c',
      quantity: 1,
      baseValueMicroKalon: 1_000n,
      routeId: null,
      enforcerDynastyId: 'e1',
    });

    const latestTwo = registry.getSeizureReport({ worldId: 'w-report', limit: 2 });
    expect(latestTwo).toHaveLength(2);
    expect(latestTwo[0]?.itemType).toBe('item-c');
    expect(latestTwo[1]?.itemType).toBe('item-b');
  });

  it('registers contraband items with deterministic ids and preserved attributes', () => {
    const registry = createContrabandRegistry(deps());

    const registered = registry.registerContrabandItem({
      itemType: 'nanodrug',
      description: 'Neural stimulant',
      baseValueMicroKalon: 77_000n,
      riskLevel: 'HIGH',
    });

    expect(registered.itemId).toBe('sim-contraband-1');
    expect(registered.item.itemType).toBe('nanodrug');
    expect(registered.item.baseValueMicroKalon).toBe(77_000n);
    expect(registered.item.riskLevel).toBe('HIGH');
  });

  it('filters routes by risk bucket after mixed route performance histories', () => {
    const registry = createContrabandRegistry(deps());

    for (let i = 0; i < 5; i += 1) {
      registry.recordSmuggleAttempt({
        fromWorldId: 'x',
        toWorldId: 'y',
        itemType: 'route-safe',
        success: true,
      });
    }

    for (let i = 0; i < 5; i += 1) {
      registry.recordSmuggleAttempt({
        fromWorldId: 'x',
        toWorldId: 'z',
        itemType: 'route-danger',
        success: false,
      });
    }

    const negligible = registry.getRoutesByRisk({ risk: 'NEGLIGIBLE' });
    const extreme = registry.getRoutesByRisk({ risk: 'EXTREME' });

    expect(negligible.some((route) => route.itemType === 'route-safe')).toBe(true);
    expect(extreme.some((route) => route.itemType === 'route-danger')).toBe(true);
  });

  it('emits info logs for route/rule/item events and warn logs for seizures', () => {
    const registry = createContrabandRegistry(deps());

    registry.addProhibitionRule({
      worldId: 'w-log',
      itemType: 'bio',
      reason: 'ban',
      penaltyMicroKalon: 1n,
    });
    registry.recordSmuggleAttempt({
      fromWorldId: 'w-log',
      toWorldId: 'w-log-2',
      itemType: 'bio',
      success: true,
    });
    registry.registerContrabandItem({
      itemType: 'bio',
      description: 'desc',
      baseValueMicroKalon: 1n,
      riskLevel: 'MODERATE',
    });
    registry.recordSeizure({
      worldId: 'w-log',
      dynastyId: 'd',
      itemType: 'bio',
      quantity: 1,
      baseValueMicroKalon: 1n,
      routeId: null,
      enforcerDynastyId: 'e',
    });

    expect(infoLogCount).toBeGreaterThanOrEqual(3);
    expect(warnLogCount).toBe(1);
  });
});
