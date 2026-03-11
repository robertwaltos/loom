/**
 * Resource Scarcity — Track resource availability and scarcity-driven economics.
 *
 * Monitors resource levels per world using threshold-based scarcity classification.
 * Triggers shortage alerts, applies rationing protocols, and calculates
 * price multipliers based on scarcity level.
 *
 * All resource amounts tracked in bigint micro-units (10^6 precision).
 * Scarcity thresholds: ABUNDANT > ADEQUATE > SCARCE > CRITICAL > DEPLETED
 */

export type ScarcityLevel = 'ABUNDANT' | 'ADEQUATE' | 'SCARCE' | 'CRITICAL' | 'DEPLETED';

export type ResourceId = string;
export type WorldId = string;

export interface Resource {
  readonly resourceId: ResourceId;
  readonly worldId: WorldId;
  readonly availableAmount: bigint;
  readonly capacity: bigint;
  readonly scarcityLevel: ScarcityLevel;
  readonly lastUpdated: bigint;
}

export interface ShortageAlert {
  readonly alertId: string;
  readonly resourceId: ResourceId;
  readonly worldId: WorldId;
  readonly previousLevel: ScarcityLevel;
  readonly currentLevel: ScarcityLevel;
  readonly triggeredAt: bigint;
}

export interface RationingProtocol {
  readonly resourceId: ResourceId;
  readonly worldId: WorldId;
  readonly consumptionRate: number;
  readonly activeAt: bigint;
}

export interface PriceMultiplier {
  readonly scarcityLevel: ScarcityLevel;
  readonly multiplier: number;
}

export interface ScarcityReport {
  readonly worldId: WorldId;
  readonly totalResources: number;
  readonly abundantCount: number;
  readonly adequateCount: number;
  readonly scarceCount: number;
  readonly criticalCount: number;
  readonly depletedCount: number;
  readonly activeAlerts: number;
  readonly activeRationing: number;
}

export interface ResourceScarcitySystem {
  registerResource(
    resourceId: ResourceId,
    worldId: WorldId,
    capacity: bigint,
    initialAmount?: bigint,
  ): void;
  updateAvailability(
    resourceId: ResourceId,
    worldId: WorldId,
    newAmount: bigint,
  ):
    | { readonly success: true; readonly alert?: ShortageAlert }
    | { readonly success: false; readonly error: string };
  checkThresholds(
    resourceId: ResourceId,
    worldId: WorldId,
  ): { readonly found: true; readonly scarcityLevel: ScarcityLevel } | { readonly found: false };
  applyRationing(
    resourceId: ResourceId,
    worldId: WorldId,
    rate: number,
  ): { readonly success: true } | { readonly success: false; readonly error: string };
  removeRationing(
    resourceId: ResourceId,
    worldId: WorldId,
  ): { readonly success: true } | { readonly success: false; readonly error: string };
  getPriceMultiplier(scarcityLevel: ScarcityLevel): number;
  getScarcityReport(worldId: WorldId): ScarcityReport;
  getShortageHistory(worldId: WorldId, limit: number): ReadonlyArray<ShortageAlert>;
  getResource(resourceId: ResourceId, worldId: WorldId): Resource | undefined;
  listResources(worldId: WorldId): ReadonlyArray<Resource>;
}

interface ResourceState {
  readonly resources: Map<string, MutableResource>;
  readonly shortageAlerts: MutableShortageAlert[];
  readonly rationingProtocols: Map<string, MutableRationingProtocol>;
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: {
    info(message: string, meta?: Record<string, unknown>): void;
  };
}

interface MutableResource {
  readonly resourceId: ResourceId;
  readonly worldId: WorldId;
  availableAmount: bigint;
  readonly capacity: bigint;
  scarcityLevel: ScarcityLevel;
  lastUpdated: bigint;
}

interface MutableShortageAlert {
  readonly alertId: string;
  readonly resourceId: ResourceId;
  readonly worldId: WorldId;
  readonly previousLevel: ScarcityLevel;
  readonly currentLevel: ScarcityLevel;
  readonly triggeredAt: bigint;
}

interface MutableRationingProtocol {
  readonly resourceId: ResourceId;
  readonly worldId: WorldId;
  consumptionRate: number;
  activeAt: bigint;
}

const THRESHOLDS = {
  ABUNDANT: 0.85,
  ADEQUATE: 0.5,
  SCARCE: 0.1,
  CRITICAL: 0.05,
  DEPLETED: 0.0,
} as const;

const PRICE_MULTIPLIERS: Record<ScarcityLevel, number> = {
  ABUNDANT: 0.8,
  ADEQUATE: 1.0,
  SCARCE: 1.5,
  CRITICAL: 3.0,
  DEPLETED: 10.0,
} as const;

export function createResourceScarcitySystem(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: {
    info(message: string, meta?: Record<string, unknown>): void;
  };
}): ResourceScarcitySystem {
  const state: ResourceState = {
    resources: new Map(),
    shortageAlerts: [],
    rationingProtocols: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    registerResource: (rid, wid, cap, initial) => {
      registerResourceImpl(state, rid, wid, cap, initial);
    },
    updateAvailability: (rid, wid, amount) => updateAvailabilityImpl(state, rid, wid, amount),
    checkThresholds: (rid, wid) => checkThresholdsImpl(state, rid, wid),
    applyRationing: (rid, wid, rate) => applyRationingImpl(state, rid, wid, rate),
    removeRationing: (rid, wid) => removeRationingImpl(state, rid, wid),
    getPriceMultiplier: (level) => PRICE_MULTIPLIERS[level],
    getScarcityReport: (wid) => getScarcityReportImpl(state, wid),
    getShortageHistory: (wid, limit) => getShortageHistoryImpl(state, wid, limit),
    getResource: (rid, wid) => getResourceImpl(state, rid, wid),
    listResources: (wid) => listResourcesImpl(state, wid),
  };
}

function makeKey(resourceId: ResourceId, worldId: WorldId): string {
  return resourceId + ':' + worldId;
}

function registerResourceImpl(
  state: ResourceState,
  resourceId: ResourceId,
  worldId: WorldId,
  capacity: bigint,
  initialAmount?: bigint,
): void {
  const key = makeKey(resourceId, worldId);
  if (state.resources.has(key)) return;

  const amount = initialAmount ?? capacity;
  const level = classifyScarcity(amount, capacity);
  const now = state.clock.nowMicroseconds();

  state.resources.set(key, {
    resourceId,
    worldId,
    availableAmount: amount,
    capacity,
    scarcityLevel: level,
    lastUpdated: now,
  });

  state.logger.info('Resource registered', {
    resourceId,
    worldId,
    capacity: String(capacity),
    initialAmount: String(amount),
    scarcityLevel: level,
  });
}

function updateAvailabilityImpl(
  state: ResourceState,
  resourceId: ResourceId,
  worldId: WorldId,
  newAmount: bigint,
):
  | { readonly success: true; readonly alert?: ShortageAlert }
  | { readonly success: false; readonly error: string } {
  const key = makeKey(resourceId, worldId);
  const resource = state.resources.get(key);
  if (!resource) return { success: false, error: 'resource-not-found' };
  if (newAmount < 0n) return { success: false, error: 'invalid-amount' };
  if (newAmount > resource.capacity) {
    return { success: false, error: 'exceeds-capacity' };
  }

  const previousLevel = resource.scarcityLevel;
  const newLevel = classifyScarcity(newAmount, resource.capacity);
  const now = state.clock.nowMicroseconds();

  resource.availableAmount = newAmount;
  resource.scarcityLevel = newLevel;
  resource.lastUpdated = now;

  let alert: ShortageAlert | undefined;
  if (previousLevel !== newLevel && shouldTriggerAlert(previousLevel, newLevel)) {
    alert = createShortageAlert(state, resourceId, worldId, previousLevel, newLevel, now);
  }

  state.logger.info('Resource availability updated', {
    resourceId,
    worldId,
    newAmount: String(newAmount),
    previousLevel,
    newLevel,
    alertTriggered: alert !== undefined,
  });

  return { success: true, alert };
}

function classifyScarcity(available: bigint, capacity: bigint): ScarcityLevel {
  if (capacity === 0n) return 'DEPLETED';
  const ratio = Number((available * 10000n) / capacity) / 10000;

  if (ratio >= THRESHOLDS.ABUNDANT) return 'ABUNDANT';
  if (ratio >= THRESHOLDS.ADEQUATE) return 'ADEQUATE';
  if (ratio >= THRESHOLDS.SCARCE) return 'SCARCE';
  if (ratio > THRESHOLDS.CRITICAL) return 'CRITICAL';
  return 'DEPLETED';
}

function shouldTriggerAlert(previous: ScarcityLevel, current: ScarcityLevel): boolean {
  const levels: ScarcityLevel[] = ['ABUNDANT', 'ADEQUATE', 'SCARCE', 'CRITICAL', 'DEPLETED'];
  const prevIdx = levels.indexOf(previous);
  const currIdx = levels.indexOf(current);
  return currIdx > prevIdx;
}

function createShortageAlert(
  state: ResourceState,
  resourceId: ResourceId,
  worldId: WorldId,
  previousLevel: ScarcityLevel,
  currentLevel: ScarcityLevel,
  triggeredAt: bigint,
): ShortageAlert {
  const alertId = state.idGen.generateId();
  const alert: MutableShortageAlert = {
    alertId,
    resourceId,
    worldId,
    previousLevel,
    currentLevel,
    triggeredAt,
  };
  state.shortageAlerts.push(alert);
  return alert;
}

function checkThresholdsImpl(
  state: ResourceState,
  resourceId: ResourceId,
  worldId: WorldId,
): { readonly found: true; readonly scarcityLevel: ScarcityLevel } | { readonly found: false } {
  const key = makeKey(resourceId, worldId);
  const resource = state.resources.get(key);
  if (!resource) return { found: false };
  return { found: true, scarcityLevel: resource.scarcityLevel };
}

function applyRationingImpl(
  state: ResourceState,
  resourceId: ResourceId,
  worldId: WorldId,
  rate: number,
): { readonly success: true } | { readonly success: false; readonly error: string } {
  if (rate < 0 || rate > 1) {
    return { success: false, error: 'invalid-rate' };
  }

  const key = makeKey(resourceId, worldId);
  const resource = state.resources.get(key);
  if (!resource) return { success: false, error: 'resource-not-found' };

  const now = state.clock.nowMicroseconds();
  const existing = state.rationingProtocols.get(key);

  if (existing) {
    existing.consumptionRate = rate;
    existing.activeAt = now;
  } else {
    state.rationingProtocols.set(key, {
      resourceId,
      worldId,
      consumptionRate: rate,
      activeAt: now,
    });
  }

  state.logger.info('Rationing applied', {
    resourceId,
    worldId,
    consumptionRate: rate,
  });

  return { success: true };
}

function removeRationingImpl(
  state: ResourceState,
  resourceId: ResourceId,
  worldId: WorldId,
): { readonly success: true } | { readonly success: false; readonly error: string } {
  const key = makeKey(resourceId, worldId);
  if (!state.rationingProtocols.has(key)) {
    return { success: false, error: 'rationing-not-found' };
  }

  state.rationingProtocols.delete(key);

  state.logger.info('Rationing removed', { resourceId, worldId });

  return { success: true };
}

function getScarcityReportImpl(state: ResourceState, worldId: WorldId): ScarcityReport {
  let totalResources = 0;
  let abundantCount = 0;
  let adequateCount = 0;
  let scarceCount = 0;
  let criticalCount = 0;
  let depletedCount = 0;
  let activeRationing = 0;

  for (const resource of state.resources.values()) {
    if (resource.worldId !== worldId) continue;
    totalResources += 1;

    const level = resource.scarcityLevel;
    if (level === 'ABUNDANT') abundantCount += 1;
    if (level === 'ADEQUATE') adequateCount += 1;
    if (level === 'SCARCE') scarceCount += 1;
    if (level === 'CRITICAL') criticalCount += 1;
    if (level === 'DEPLETED') depletedCount += 1;

    const key = makeKey(resource.resourceId, worldId);
    if (state.rationingProtocols.has(key)) activeRationing += 1;
  }

  const activeAlerts = state.shortageAlerts.filter((a) => a.worldId === worldId).length;

  return {
    worldId,
    totalResources,
    abundantCount,
    adequateCount,
    scarceCount,
    criticalCount,
    depletedCount,
    activeAlerts,
    activeRationing,
  };
}

function getShortageHistoryImpl(
  state: ResourceState,
  worldId: WorldId,
  limit: number,
): ReadonlyArray<ShortageAlert> {
  const filtered = state.shortageAlerts
    .filter((a) => a.worldId === worldId)
    .sort((a, b) => Number(b.triggeredAt - a.triggeredAt));

  return filtered.slice(0, limit);
}

function getResourceImpl(
  state: ResourceState,
  resourceId: ResourceId,
  worldId: WorldId,
): Resource | undefined {
  const key = makeKey(resourceId, worldId);
  const resource = state.resources.get(key);
  if (resource === undefined) return undefined;
  return { ...resource };
}

function listResourcesImpl(state: ResourceState, worldId: WorldId): ReadonlyArray<Resource> {
  const results: Resource[] = [];
  for (const resource of state.resources.values()) {
    if (resource.worldId === worldId) results.push(resource);
  }
  return results;
}
