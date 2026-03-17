/**
 * Trade Route Registry ΓÇö Inter-world trade paths via the Lattice.
 *
 * Trade routes are established by dynasties to move goods between worlds
 * across the Lattice. Routes have status, weekly volume, and Ascendancy
 * risk. Twenty canonical trade goods capture the Concord's economic fabric.
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type RouteStatus =
  | 'ACTIVE' // Goods flowing normally
  | 'DISRUPTED' // Lattice issue ΓÇö reduced capacity
  | 'BLOCKED' // No transit possible (node destroyed/occupied)
  | 'CONTESTED'; // Ascendancy interference ΓÇö high risk

export type GoodCategory =
  | 'ENERGY_SUBSTRATE' // ZPE-derived materials
  | 'BIOLOGICAL' // Food, medicine, organics
  | 'SYNTHESIZED' // Matterwave-produced elements
  | 'CRAFT' // Handmade, artisanal (high value)
  | 'INFORMATION' // Data, maps, survey intel
  | 'CULTURAL'; // Art, ritual objects, chronicles

export interface TradeRoute {
  readonly routeId: string;
  readonly originWorldId: string;
  readonly destinationWorldId: string;
  readonly primaryGood: string;
  readonly secondaryGoods: string[];
  readonly establishedAt: string;
  readonly dynastyId: string;
  readonly status: RouteStatus;
  readonly weeklyVolume: bigint;
  readonly lastTransitAt?: string;
  readonly ascendancyRisk: number; // 0-100
}

export interface TradeGood {
  readonly goodId: string;
  readonly name: string;
  readonly category: GoodCategory;
  readonly baseValuePerUnit: bigint; // micro-KALON
  readonly supplyWorldTypes: string[];
  readonly demandWorldTypes: string[];
  readonly bulkBonus: number; // 0-50% bonus for large shipments
  readonly latticeTransitCost: bigint; // micro-KALON per unit
}

export interface RouteRegistryState {
  readonly routes: Map<string, TradeRoute>;
  readonly idGen: { next(): string };
  readonly clock: { nowIso(): string };
}

// ΓöÇΓöÇΓöÇ Canonical Trade Goods ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export const TRADE_GOODS: ReadonlyMap<string, TradeGood> = new Map([
  [
    'LATTICE_RESONANCE_CRYSTALS',
    {
      goodId: 'LATTICE_RESONANCE_CRYSTALS',
      name: 'Lattice Resonance Crystals',
      category: 'ENERGY_SUBSTRATE',
      baseValuePerUnit: 50_000_000n,
      supplyWorldTypes: ['G'],
      demandWorldTypes: ['K', 'M', 'F', 'A'],
      bulkBonus: 15,
      latticeTransitCost: 2_000_000n,
    },
  ],
  [
    'BONE_CHORUS_HARMONICS',
    {
      goodId: 'BONE_CHORUS_HARMONICS',
      name: 'Bone Chorus Harmonics',
      category: 'CULTURAL',
      baseValuePerUnit: 500_000_000n,
      supplyWorldTypes: ['G'],
      demandWorldTypes: ['G', 'F', 'A', 'K', 'M', 'O'],
      bulkBonus: 0,
      latticeTransitCost: 5_000_000n,
    },
  ],
  [
    'SURVEY_INTEL_PACKAGE',
    {
      goodId: 'SURVEY_INTEL_PACKAGE',
      name: 'Survey Intel Package',
      category: 'INFORMATION',
      baseValuePerUnit: 200_000_000n,
      supplyWorldTypes: ['G', 'F'],
      demandWorldTypes: ['K', 'M', 'O'],
      bulkBonus: 5,
      latticeTransitCost: 1_000_000n,
    },
  ],
  [
    'ALKAHEST_SOIL_SAMPLES',
    {
      goodId: 'ALKAHEST_SOIL_SAMPLES',
      name: 'Alkahest Soil Samples',
      category: 'BIOLOGICAL',
      baseValuePerUnit: 300_000_000n,
      supplyWorldTypes: ['G'],
      demandWorldTypes: ['G', 'F', 'A', 'K', 'M', 'O'],
      bulkBonus: 10,
      latticeTransitCost: 3_000_000n,
    },
  ],
  [
    'ZPE_CAPACITOR',
    {
      goodId: 'ZPE_CAPACITOR',
      name: 'ZPE Capacitor',
      category: 'ENERGY_SUBSTRATE',
      baseValuePerUnit: 80_000_000n,
      supplyWorldTypes: ['G', 'F', 'A'],
      demandWorldTypes: ['K', 'M', 'O'],
      bulkBonus: 20,
      latticeTransitCost: 4_000_000n,
    },
  ],
  [
    'MATTERWAVE_PRECURSORS',
    {
      goodId: 'MATTERWAVE_PRECURSORS',
      name: 'Matterwave Precursors',
      category: 'SYNTHESIZED',
      baseValuePerUnit: 35_000_000n,
      supplyWorldTypes: ['F', 'A', 'G'],
      demandWorldTypes: ['K', 'M', 'O', 'G'],
      bulkBonus: 30,
      latticeTransitCost: 1_500_000n,
    },
  ],
  [
    'REJUVENATION_COMPOUNDS',
    {
      goodId: 'REJUVENATION_COMPOUNDS',
      name: 'Rejuvenation Compounds',
      category: 'BIOLOGICAL',
      baseValuePerUnit: 150_000_000n,
      supplyWorldTypes: ['G', 'F'],
      demandWorldTypes: ['G', 'F', 'A', 'K', 'M', 'O'],
      bulkBonus: 5,
      latticeTransitCost: 2_500_000n,
    },
  ],
  [
    'OUTER_ARC_MINERALS',
    {
      goodId: 'OUTER_ARC_MINERALS',
      name: 'Outer Arc Minerals',
      category: 'SYNTHESIZED',
      baseValuePerUnit: 25_000_000n,
      supplyWorldTypes: ['K', 'M'],
      demandWorldTypes: ['G', 'F', 'A'],
      bulkBonus: 40,
      latticeTransitCost: 1_000_000n,
    },
  ],
  [
    'ANCIENT_CRAFT_OBJECTS',
    {
      goodId: 'ANCIENT_CRAFT_OBJECTS',
      name: 'Ancient Craft Objects',
      category: 'CRAFT',
      baseValuePerUnit: 1_000_000_000n,
      supplyWorldTypes: ['G'],
      demandWorldTypes: ['G', 'F', 'A', 'K', 'M', 'O'],
      bulkBonus: 0,
      latticeTransitCost: 10_000_000n,
    },
  ],
  [
    'WORLD_CHARTER_DOCUMENTS',
    {
      goodId: 'WORLD_CHARTER_DOCUMENTS',
      name: 'World Charter Documents',
      category: 'INFORMATION',
      baseValuePerUnit: 400_000_000n,
      supplyWorldTypes: ['G', 'F'],
      demandWorldTypes: ['K', 'M', 'O', 'A'],
      bulkBonus: 0,
      latticeTransitCost: 2_000_000n,
    },
  ],
  [
    'BEACON_NODE_COMPONENTS',
    {
      goodId: 'BEACON_NODE_COMPONENTS',
      name: 'Beacon Node Components',
      category: 'SYNTHESIZED',
      baseValuePerUnit: 120_000_000n,
      supplyWorldTypes: ['G', 'F', 'A'],
      demandWorldTypes: ['K', 'M', 'O'],
      bulkBonus: 25,
      latticeTransitCost: 5_000_000n,
    },
  ],
  [
    'DYNASTIC_ARCHIVE_CORES',
    {
      goodId: 'DYNASTIC_ARCHIVE_CORES',
      name: 'Dynastic Archive Cores',
      category: 'INFORMATION',
      baseValuePerUnit: 75_000_000n,
      supplyWorldTypes: ['G', 'F'],
      demandWorldTypes: ['G', 'F', 'A', 'K', 'M'],
      bulkBonus: 10,
      latticeTransitCost: 1_000_000n,
    },
  ],
  [
    'CONCORD_RITUAL_OBJECTS',
    {
      goodId: 'CONCORD_RITUAL_OBJECTS',
      name: 'Concord Ritual Objects',
      category: 'CULTURAL',
      baseValuePerUnit: 250_000_000n,
      supplyWorldTypes: ['G'],
      demandWorldTypes: ['F', 'A', 'K', 'M', 'O'],
      bulkBonus: 0,
      latticeTransitCost: 3_000_000n,
    },
  ],
  [
    'STELLAR_CARTOGRAPHY_DATA',
    {
      goodId: 'STELLAR_CARTOGRAPHY_DATA',
      name: 'Stellar Cartography Data',
      category: 'INFORMATION',
      baseValuePerUnit: 180_000_000n,
      supplyWorldTypes: ['G', 'F', 'A'],
      demandWorldTypes: ['K', 'M', 'O'],
      bulkBonus: 8,
      latticeTransitCost: 500_000n,
    },
  ],
  [
    'FRONTIER_MEDICINALS',
    {
      goodId: 'FRONTIER_MEDICINALS',
      name: 'Frontier Medicinals',
      category: 'BIOLOGICAL',
      baseValuePerUnit: 60_000_000n,
      supplyWorldTypes: ['G', 'F', 'K'],
      demandWorldTypes: ['M', 'O', 'A'],
      bulkBonus: 15,
      latticeTransitCost: 1_500_000n,
    },
  ],
  [
    'ASCENDANCY_SALVAGE',
    {
      goodId: 'ASCENDANCY_SALVAGE',
      name: 'Ascendancy Salvage',
      category: 'SYNTHESIZED',
      baseValuePerUnit: 700_000_000n,
      supplyWorldTypes: ['O', 'M', 'K'],
      demandWorldTypes: ['G', 'F', 'A'],
      bulkBonus: 5,
      latticeTransitCost: 20_000_000n,
    },
  ],
  [
    'ARTISAN_WEAVEWORKS',
    {
      goodId: 'ARTISAN_WEAVEWORKS',
      name: 'Artisan Weaveworks',
      category: 'CRAFT',
      baseValuePerUnit: 200_000_000n,
      supplyWorldTypes: ['G', 'F', 'A'],
      demandWorldTypes: ['G', 'F', 'A', 'K', 'M', 'O'],
      bulkBonus: 0,
      latticeTransitCost: 4_000_000n,
    },
  ],
  [
    'DEEP_VOID_TELEMETRY',
    {
      goodId: 'DEEP_VOID_TELEMETRY',
      name: 'Deep Void Telemetry',
      category: 'INFORMATION',
      baseValuePerUnit: 90_000_000n,
      supplyWorldTypes: ['O', 'M'],
      demandWorldTypes: ['G', 'F', 'A'],
      bulkBonus: 12,
      latticeTransitCost: 2_000_000n,
    },
  ],
  [
    'LATTICE_WEAVE_FIBER',
    {
      goodId: 'LATTICE_WEAVE_FIBER',
      name: 'Lattice Weave Fiber',
      category: 'SYNTHESIZED',
      baseValuePerUnit: 45_000_000n,
      supplyWorldTypes: ['G', 'F'],
      demandWorldTypes: ['A', 'K', 'M', 'O'],
      bulkBonus: 35,
      latticeTransitCost: 800_000n,
    },
  ],
  [
    'DYNASTY_SIGIL_STONES',
    {
      goodId: 'DYNASTY_SIGIL_STONES',
      name: 'Dynasty Sigil Stones',
      category: 'CRAFT',
      baseValuePerUnit: 350_000_000n,
      supplyWorldTypes: ['G', 'F', 'A'],
      demandWorldTypes: ['G', 'F', 'A', 'K', 'M', 'O'],
      bulkBonus: 0,
      latticeTransitCost: 5_000_000n,
    },
  ],
]);

// ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createRouteRegistryState(deps: {
  readonly idGen: { next(): string };
  readonly clock: { nowIso(): string };
}): RouteRegistryState {
  return {
    routes: new Map(),
    idGen: deps.idGen,
    clock: deps.clock,
  };
}

// ΓöÇΓöÇΓöÇ Route Operations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function establishRoute(
  state: RouteRegistryState,
  originId: string,
  destinationId: string,
  dynastyId: string,
  primaryGood: string,
): TradeRoute {
  if (originId === destinationId) {
    throw new Error('Origin and destination must differ');
  }
  if (!TRADE_GOODS.has(primaryGood)) {
    throw new Error('Unknown trade good: ' + primaryGood);
  }
  const routeId = state.idGen.next();
  const route: TradeRoute = {
    routeId,
    originWorldId: originId,
    destinationWorldId: destinationId,
    primaryGood,
    secondaryGoods: [],
    establishedAt: state.clock.nowIso(),
    dynastyId,
    status: 'ACTIVE',
    weeklyVolume: 0n,
    ascendancyRisk: 0,
  };
  state.routes.set(routeId, route);
  return route;
}

export function updateRouteStatus(
  state: RouteRegistryState,
  routeId: string,
  status: RouteStatus,
): TradeRoute {
  const existing = state.routes.get(routeId);
  if (existing === undefined) {
    throw new Error('Route not found: ' + routeId);
  }
  const updated: TradeRoute = { ...existing, status };
  state.routes.set(routeId, updated);
  return updated;
}

export function updateRouteVolume(
  state: RouteRegistryState,
  routeId: string,
  weeklyVolume: bigint,
): TradeRoute {
  const existing = state.routes.get(routeId);
  if (existing === undefined) {
    throw new Error('Route not found: ' + routeId);
  }
  const updated: TradeRoute = {
    ...existing,
    weeklyVolume,
    lastTransitAt: state.clock.nowIso(),
  };
  state.routes.set(routeId, updated);
  return updated;
}

export function calculateRouteValue(route: TradeRoute, marketPrices: Map<string, bigint>): bigint {
  if (route.status === 'BLOCKED') return 0n;
  const price = marketPrices.get(route.primaryGood) ?? 0n;
  const good = TRADE_GOODS.get(route.primaryGood);
  if (good === undefined) return 0n;
  let value = route.weeklyVolume * price;
  if (route.status === 'CONTESTED') {
    value = (value * 80n) / 100n; // 20% discount for Ascendancy risk
  }
  if (route.status === 'DISRUPTED') {
    value = (value * 60n) / 100n; // 40% reduction for disruption
  }
  return value;
}

export function getRoutesForWorld(state: RouteRegistryState, worldId: string): TradeRoute[] {
  const result: TradeRoute[] = [];
  for (const route of state.routes.values()) {
    if (route.originWorldId === worldId || route.destinationWorldId === worldId) {
      result.push(route);
    }
  }
  return result;
}

export function getDisruptedRoutes(state: RouteRegistryState): TradeRoute[] {
  const result: TradeRoute[] = [];
  for (const route of state.routes.values()) {
    if (route.status === 'DISRUPTED') result.push(route);
  }
  return result;
}

export function getContestedRoutes(state: RouteRegistryState): TradeRoute[] {
  const result: TradeRoute[] = [];
  for (const route of state.routes.values()) {
    if (route.status === 'CONTESTED') result.push(route);
  }
  return result;
}

export function getTradeGood(goodId: string): TradeGood | undefined {
  return TRADE_GOODS.get(goodId);
}

export function getAllTradeGoods(): TradeGood[] {
  return Array.from(TRADE_GOODS.values());
}
