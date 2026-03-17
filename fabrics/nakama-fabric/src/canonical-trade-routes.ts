/**
 * Trade Route Registry ΓÇö The inter-world trade network connecting Concord worlds.
 *
 * Bible v1.2: Trade routes are the economic arteries of the Concord. Routes
 * span stellar systems via the Silfen Weave, Survey Corps vessels, or standard
 * transit lanes. Ascendancy influence on key routes was a primary lever of
 * control before the Year 101 withdrawal.
 */

export type RouteStatus = 'ACTIVE' | 'DISRUPTED' | 'SUSPENDED' | 'PROPOSED' | 'CLOSED';
export type RouteCategory = 'RESOURCE' | 'LUXURY' | 'KNOWLEDGE' | 'CULTURAL' | 'EMERGENCY_AID';
export type TransitMethod = 'SILFEN_WEAVE' | 'SURVEY_CORPS_VESSEL' | 'STANDARD_TRANSIT';

export interface TradeRouteRecord {
  readonly routeId: string;
  readonly originWorldId: string;
  readonly destinationWorldId: string;
  readonly category: RouteCategory;
  readonly transitMethod: TransitMethod;
  readonly status: RouteStatus;
  readonly establishedYear: number;
  readonly annualVolumeMicroKalon: bigint;
  readonly primaryGoods: ReadonlyArray<string>;
  readonly ascendancyInfluence: number;
  readonly loreNote: string;
}

export const CANONICAL_TRADE_ROUTES: ReadonlyArray<TradeRouteRecord> = [
  {
    routeId: 'ROUTE-001',
    originWorldId: 'world-01',
    destinationWorldId: 'world-02',
    category: 'RESOURCE',
    transitMethod: 'SILFEN_WEAVE',
    status: 'ACTIVE',
    establishedYear: 3,
    annualVolumeMicroKalon: 15_000_000_000n,
    primaryGoods: ['minerals', 'processed metals'],
    ascendancyInfluence: 40,
    loreNote:
      'First formally registered inter-world trade route in the Concord; established Year 3.',
  },
  {
    routeId: 'ROUTE-002',
    originWorldId: 'world-02',
    destinationWorldId: 'world-05',
    category: 'LUXURY',
    transitMethod: 'SILFEN_WEAVE',
    status: 'ACTIVE',
    establishedYear: 5,
    annualVolumeMicroKalon: 8_000_000_000n,
    primaryGoods: ['artisanal goods', 'archive materials'],
    ascendancyInfluence: 20,
    loreNote: 'Luxury corridor linking world-02 financial hub to the artisan enclaves of world-05.',
  },
  {
    routeId: 'ROUTE-003',
    originWorldId: 'world-03',
    destinationWorldId: 'world-01',
    category: 'KNOWLEDGE',
    transitMethod: 'SURVEY_CORPS_VESSEL',
    status: 'ACTIVE',
    establishedYear: 8,
    annualVolumeMicroKalon: 2_000_000_000n,
    primaryGoods: ['survey data', 'stellar cartography'],
    ascendancyInfluence: 5,
    loreNote:
      'Survey Corps knowledge pipeline from world-03 operations base to Concord governance on world-01.',
  },
  {
    routeId: 'ROUTE-004',
    originWorldId: 'world-01',
    destinationWorldId: 'world-14',
    category: 'CULTURAL',
    transitMethod: 'SILFEN_WEAVE',
    status: 'ACTIVE',
    establishedYear: 15,
    annualVolumeMicroKalon: 3_000_000_000n,
    primaryGoods: ['historical records', 'Bone Chorus research'],
    ascendancyInfluence: 10,
    loreNote:
      'Cultural exchange route supporting archaeological and Bone Chorus research communities of world-14.',
  },
  {
    routeId: 'ROUTE-005',
    originWorldId: 'world-07',
    destinationWorldId: 'world-03',
    category: 'RESOURCE',
    transitMethod: 'SILFEN_WEAVE',
    status: 'ACTIVE',
    establishedYear: 12,
    annualVolumeMicroKalon: 22_000_000_000n,
    primaryGoods: ['raw materials', 'Survey Corps supplies'],
    ascendancyInfluence: 30,
    loreNote:
      'High-volume resource corridor supplying Survey Corps operations with raw materials from world-07 extraction zones.',
  },
  {
    routeId: 'ROUTE-006',
    originWorldId: 'world-01',
    destinationWorldId: 'world-394',
    category: 'EMERGENCY_AID',
    transitMethod: 'SILFEN_WEAVE',
    status: 'SUSPENDED',
    establishedYear: 85,
    annualVolumeMicroKalon: 50_000_000_000n,
    primaryGoods: ['emergency KALON reserves', 'lattice repair equipment'],
    ascendancyInfluence: 0,
    loreNote:
      'Emergency route established during World 394 collapse. Suspended after Ascendancy withdrawal.',
  },
  {
    routeId: 'ROUTE-007',
    originWorldId: 'world-02',
    destinationWorldId: 'world-14',
    category: 'KNOWLEDGE',
    transitMethod: 'SILFEN_WEAVE',
    status: 'ACTIVE',
    establishedYear: 47,
    annualVolumeMicroKalon: 4_500_000_000n,
    primaryGoods: ['archaeology funding', 'research personnel'],
    ascendancyInfluence: 0,
    loreNote:
      'Post-Ascendancy knowledge investment route from world-02 financial sector to world-14 research communities.',
  },
  {
    routeId: 'ROUTE-008',
    originWorldId: 'world-499',
    destinationWorldId: 'world-03',
    category: 'KNOWLEDGE',
    transitMethod: 'SURVEY_CORPS_VESSEL',
    status: 'ACTIVE',
    establishedYear: 92,
    annualVolumeMicroKalon: 1_000_000_000n,
    primaryGoods: ['Ferreira-Asante research reports', 'outer arc data'],
    ascendancyInfluence: 0,
    loreNote:
      'Outer arc intelligence route carrying Ferreira-Asante field data from world-499 to Survey Corps central on world-03.',
  },
  {
    routeId: 'ROUTE-009',
    originWorldId: 'world-01',
    destinationWorldId: 'world-312',
    category: 'RESOURCE',
    transitMethod: 'SILFEN_WEAVE',
    status: 'DISRUPTED',
    establishedYear: 20,
    annualVolumeMicroKalon: 12_000_000_000n,
    primaryGoods: ['reconstruction materials'],
    ascendancyInfluence: 85,
    loreNote:
      'Route heavily controlled by Ascendancy until Year 101 withdrawal. Still disrupted at Year 105.',
  },
  {
    routeId: 'ROUTE-010',
    originWorldId: 'world-14',
    destinationWorldId: 'world-247',
    category: 'CULTURAL',
    transitMethod: 'STANDARD_TRANSIT',
    status: 'SUSPENDED',
    establishedYear: 28,
    annualVolumeMicroKalon: 0n,
    primaryGoods: ['Bone Chorus research attempts'],
    ascendancyInfluence: 0,
    loreNote:
      'Route suspended when World 247 quarantine was established in Year 33. No transit since. Never resumed.',
  },
];

export const ACTIVE_ROUTES_AT_YEAR_105 = 7;

export const TOTAL_ANNUAL_TRADE_VOLUME_MICRO_KALON: bigint = CANONICAL_TRADE_ROUTES.filter(
  (r) => r.status === 'ACTIVE',
).reduce((sum, r) => sum + r.annualVolumeMicroKalon, 0n);

export const HIGHEST_ASCENDANCY_ROUTE_ID = 'ROUTE-009';

export const ROUTE_TO_WORLD_394_ID = 'ROUTE-006';

export function getRoute(id: string): TradeRouteRecord | undefined {
  return CANONICAL_TRADE_ROUTES.find((r) => r.routeId === id);
}

export function getRoutesForWorld(worldId: string): ReadonlyArray<TradeRouteRecord> {
  return CANONICAL_TRADE_ROUTES.filter(
    (r) => r.originWorldId === worldId || r.destinationWorldId === worldId,
  );
}

export function getActiveRoutes(): ReadonlyArray<TradeRouteRecord> {
  return CANONICAL_TRADE_ROUTES.filter((r) => r.status === 'ACTIVE');
}

export function getRoutesByCategory(category: RouteCategory): ReadonlyArray<TradeRouteRecord> {
  return CANONICAL_TRADE_ROUTES.filter((r) => r.category === category);
}

export function computeWorldTradeBalance(worldId: string): bigint {
  return CANONICAL_TRADE_ROUTES.filter(
    (r) => r.status === 'ACTIVE' && r.originWorldId === worldId,
  ).reduce((sum, r) => sum + r.annualVolumeMicroKalon, 0n);
}

export function getHighAscendancyRoutes(threshold: number): ReadonlyArray<TradeRouteRecord> {
  return CANONICAL_TRADE_ROUTES.filter((r) => r.ascendancyInfluence >= threshold);
}
