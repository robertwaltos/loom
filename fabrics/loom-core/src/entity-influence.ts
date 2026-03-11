/**
 * Entity Influence — loom-core fabric
 * Entities exert influence in a radius. Overlapping zones create conflicts or synergies.
 * Track influence maps per world region.
 */

// Port interfaces (duplicated, never imported from other fabrics)
interface InfluenceClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface InfluenceLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// Core types
export interface Position {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type InfluenceType = 'FRIENDLY' | 'HOSTILE' | 'NEUTRAL' | 'ENVIRONMENTAL';

export interface InfluenceZone {
  readonly entityId: string;
  readonly worldId: string;
  position: Position;
  radius: number;
  readonly influenceType: InfluenceType;
  strength: number;
  lastUpdateMicros: bigint;
}

export interface InfluenceConflict {
  readonly zone1Id: string;
  readonly zone2Id: string;
  readonly conflictPosition: Position;
  readonly severity: number;
  readonly detectedAtMicros: bigint;
}

export interface InfluenceSynergy {
  readonly zone1Id: string;
  readonly zone2Id: string;
  readonly synergyPosition: Position;
  readonly multiplier: number;
  readonly detectedAtMicros: bigint;
}

export interface InfluenceMap {
  readonly worldId: string;
  readonly regionId: string;
  readonly zones: readonly InfluenceZone[];
  readonly conflicts: readonly InfluenceConflict[];
  readonly synergies: readonly InfluenceSynergy[];
}

export interface InfluenceAtPosition {
  readonly position: Position;
  readonly totalInfluence: number;
  readonly contributingZones: readonly string[];
}

export interface InfluenceReport {
  readonly entityId: string;
  readonly zone: InfluenceZone;
  readonly activeConflicts: readonly InfluenceConflict[];
  readonly activeSynergies: readonly InfluenceSynergy[];
}

// State
interface EntityInfluenceState {
  readonly zones: Map<string, InfluenceZone>;
  readonly conflicts: Map<string, InfluenceConflict>;
  readonly synergies: Map<string, InfluenceSynergy>;
  readonly regionMaps: Map<string, string[]>;
}

// Dependencies
export interface EntityInfluenceDeps {
  readonly clock: InfluenceClockPort;
  readonly logger: InfluenceLoggerPort;
}

// Public API
export interface EntityInfluence {
  readonly registerEntity: (
    entityId: string,
    worldId: string,
    position: Position,
    influenceType: InfluenceType,
  ) => string | 'OK';
  readonly setInfluenceRadius: (entityId: string, radius: number) => string | 'OK';
  readonly setInfluenceStrength: (entityId: string, strength: number) => string | 'OK';
  readonly updatePosition: (entityId: string, position: Position) => string | 'OK';
  readonly computeInfluenceAt: (worldId: string, position: Position) => InfluenceAtPosition;
  readonly detectConflicts: (worldId: string) => readonly InfluenceConflict[];
  readonly detectSynergies: (worldId: string) => readonly InfluenceSynergy[];
  readonly getInfluenceMap: (worldId: string, regionId: string) => InfluenceMap;
  readonly getInfluenceReport: (entityId: string) => string | InfluenceReport;
  readonly removeEntity: (entityId: string) => string | 'OK';
}

// Constants
const CONFLICT_THRESHOLD = 0.3;
const SYNERGY_THRESHOLD = 0.5;

// Factory
export function createEntityInfluence(deps: EntityInfluenceDeps): EntityInfluence {
  const state: EntityInfluenceState = {
    zones: new Map(),
    conflicts: new Map(),
    synergies: new Map(),
    regionMaps: new Map(),
  };

  return {
    registerEntity: (entityId, worldId, position, influenceType) =>
      registerEntity(state, deps, entityId, worldId, position, influenceType),
    setInfluenceRadius: (entityId, radius) => setInfluenceRadius(state, deps, entityId, radius),
    setInfluenceStrength: (entityId, strength) =>
      setInfluenceStrength(state, deps, entityId, strength),
    updatePosition: (entityId, position) => updatePosition(state, deps, entityId, position),
    computeInfluenceAt: (worldId, position) => computeInfluenceAt(state, worldId, position),
    detectConflicts: (worldId) => detectConflicts(state, deps, worldId),
    detectSynergies: (worldId) => detectSynergies(state, deps, worldId),
    getInfluenceMap: (worldId, regionId) => getInfluenceMap(state, worldId, regionId),
    getInfluenceReport: (entityId) => getInfluenceReport(state, entityId),
    removeEntity: (entityId) => removeEntity(state, deps, entityId),
  };
}

// Implementation functions
function registerEntity(
  state: EntityInfluenceState,
  deps: EntityInfluenceDeps,
  entityId: string,
  worldId: string,
  position: Position,
  influenceType: InfluenceType,
): string | 'OK' {
  if (state.zones.has(entityId)) {
    return 'ENTITY_ALREADY_REGISTERED';
  }

  const zone: InfluenceZone = {
    entityId,
    worldId,
    position,
    radius: 10.0,
    influenceType,
    strength: 1.0,
    lastUpdateMicros: deps.clock.nowMicroseconds(),
  };

  state.zones.set(entityId, zone);
  addToRegionMap(state, worldId, entityId);

  deps.logger.info('entity_influence_registered', {
    entityId,
    worldId,
    type: influenceType,
  });

  return 'OK';
}

function addToRegionMap(state: EntityInfluenceState, worldId: string, entityId: string): void {
  const regionKey = worldId;
  const existing = state.regionMaps.get(regionKey);

  if (existing === undefined) {
    state.regionMaps.set(regionKey, [entityId]);
  } else {
    existing.push(entityId);
  }
}

function removeFromRegionMap(state: EntityInfluenceState, worldId: string, entityId: string): void {
  const regionKey = worldId;
  const existing = state.regionMaps.get(regionKey);

  if (existing !== undefined) {
    const index = existing.indexOf(entityId);
    if (index >= 0) {
      existing.splice(index, 1);
    }
  }
}

function setInfluenceRadius(
  state: EntityInfluenceState,
  deps: EntityInfluenceDeps,
  entityId: string,
  radius: number,
): string | 'OK' {
  const zone = state.zones.get(entityId);
  if (zone === undefined) {
    return 'ENTITY_NOT_FOUND';
  }

  if (radius < 0) {
    return 'INVALID_RADIUS';
  }

  zone.radius = radius;
  zone.lastUpdateMicros = deps.clock.nowMicroseconds();

  deps.logger.info('influence_radius_updated', {
    entityId,
    radius,
  });

  return 'OK';
}

function setInfluenceStrength(
  state: EntityInfluenceState,
  deps: EntityInfluenceDeps,
  entityId: string,
  strength: number,
): string | 'OK' {
  const zone = state.zones.get(entityId);
  if (zone === undefined) {
    return 'ENTITY_NOT_FOUND';
  }

  if (strength < 0 || strength > 1) {
    return 'INVALID_STRENGTH';
  }

  zone.strength = strength;
  zone.lastUpdateMicros = deps.clock.nowMicroseconds();

  return 'OK';
}

function updatePosition(
  state: EntityInfluenceState,
  deps: EntityInfluenceDeps,
  entityId: string,
  position: Position,
): string | 'OK' {
  const zone = state.zones.get(entityId);
  if (zone === undefined) {
    return 'ENTITY_NOT_FOUND';
  }

  zone.position = position;
  zone.lastUpdateMicros = deps.clock.nowMicroseconds();

  return 'OK';
}

function computeInfluenceAt(
  state: EntityInfluenceState,
  worldId: string,
  position: Position,
): InfluenceAtPosition {
  const regionKey = worldId;
  const entityIds = state.regionMaps.get(regionKey);

  if (entityIds === undefined) {
    return {
      position,
      totalInfluence: 0,
      contributingZones: [],
    };
  }

  let totalInfluence = 0;
  const contributingZones: string[] = [];

  for (const entityId of entityIds) {
    const zone = state.zones.get(entityId);
    if (zone === undefined) {
      continue;
    }

    const distance = calculateDistance(zone.position, position);
    if (distance <= zone.radius) {
      const influence = calculateInfluenceValue(zone, distance);
      totalInfluence = totalInfluence + influence;
      contributingZones.push(entityId);
    }
  }

  return {
    position,
    totalInfluence,
    contributingZones,
  };
}

function calculateDistance(pos1: Position, pos2: Position): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const dz = pos2.z - pos1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function calculateInfluenceValue(zone: InfluenceZone, distance: number): number {
  const falloff = 1.0 - distance / zone.radius;
  return zone.strength * falloff;
}

function detectConflicts(
  state: EntityInfluenceState,
  deps: EntityInfluenceDeps,
  worldId: string,
): readonly InfluenceConflict[] {
  state.conflicts.clear();

  const regionKey = worldId;
  const entityIds = state.regionMaps.get(regionKey);

  if (entityIds === undefined) {
    return [];
  }

  for (let i = 0; i < entityIds.length; i = i + 1) {
    const id1 = entityIds[i];
    if (id1 === undefined) {
      continue;
    }

    const zone1 = state.zones.get(id1);
    if (zone1 === undefined) {
      continue;
    }

    for (let j = i + 1; j < entityIds.length; j = j + 1) {
      const id2 = entityIds[j];
      if (id2 === undefined) {
        continue;
      }

      const zone2 = state.zones.get(id2);
      if (zone2 === undefined) {
        continue;
      }

      checkForConflict(state, deps, zone1, zone2);
    }
  }

  return Array.from(state.conflicts.values());
}

function checkForConflict(
  state: EntityInfluenceState,
  deps: EntityInfluenceDeps,
  zone1: InfluenceZone,
  zone2: InfluenceZone,
): void {
  if (!isConflictingPair(zone1.influenceType, zone2.influenceType)) {
    return;
  }

  const distance = calculateDistance(zone1.position, zone2.position);
  const overlapDistance = zone1.radius + zone2.radius - distance;

  if (overlapDistance <= 0) {
    return;
  }

  const overlapRatio = overlapDistance / Math.min(zone1.radius, zone2.radius);

  if (overlapRatio < CONFLICT_THRESHOLD) {
    return;
  }

  const midpoint = calculateMidpoint(zone1.position, zone2.position);
  const conflictKey = getConflictKey(zone1.entityId, zone2.entityId);

  const conflict: InfluenceConflict = {
    zone1Id: zone1.entityId,
    zone2Id: zone2.entityId,
    conflictPosition: midpoint,
    severity: overlapRatio,
    detectedAtMicros: deps.clock.nowMicroseconds(),
  };

  state.conflicts.set(conflictKey, conflict);
}

function isConflictingPair(type1: InfluenceType, type2: InfluenceType): boolean {
  if (type1 === 'FRIENDLY' && type2 === 'HOSTILE') {
    return true;
  }
  if (type1 === 'HOSTILE' && type2 === 'FRIENDLY') {
    return true;
  }
  return false;
}

function calculateMidpoint(pos1: Position, pos2: Position): Position {
  return {
    x: (pos1.x + pos2.x) / 2,
    y: (pos1.y + pos2.y) / 2,
    z: (pos1.z + pos2.z) / 2,
  };
}

function getConflictKey(id1: string, id2: string): string {
  const sorted = [id1, id2].sort();
  const first = sorted[0];
  const second = sorted[1];
  if (first === undefined || second === undefined) {
    return '';
  }
  return first + ':' + second;
}

function detectSynergies(
  state: EntityInfluenceState,
  deps: EntityInfluenceDeps,
  worldId: string,
): readonly InfluenceSynergy[] {
  state.synergies.clear();

  const regionKey = worldId;
  const entityIds = state.regionMaps.get(regionKey);

  if (entityIds === undefined) {
    return [];
  }

  for (let i = 0; i < entityIds.length; i = i + 1) {
    const id1 = entityIds[i];
    if (id1 === undefined) {
      continue;
    }

    const zone1 = state.zones.get(id1);
    if (zone1 === undefined) {
      continue;
    }

    for (let j = i + 1; j < entityIds.length; j = j + 1) {
      const id2 = entityIds[j];
      if (id2 === undefined) {
        continue;
      }

      const zone2 = state.zones.get(id2);
      if (zone2 === undefined) {
        continue;
      }

      checkForSynergy(state, deps, zone1, zone2);
    }
  }

  return Array.from(state.synergies.values());
}

function checkForSynergy(
  state: EntityInfluenceState,
  deps: EntityInfluenceDeps,
  zone1: InfluenceZone,
  zone2: InfluenceZone,
): void {
  if (!isSynergyPair(zone1.influenceType, zone2.influenceType)) {
    return;
  }

  const distance = calculateDistance(zone1.position, zone2.position);
  const overlapDistance = zone1.radius + zone2.radius - distance;

  if (overlapDistance <= 0) {
    return;
  }

  const overlapRatio = overlapDistance / Math.min(zone1.radius, zone2.radius);

  if (overlapRatio < SYNERGY_THRESHOLD) {
    return;
  }

  const midpoint = calculateMidpoint(zone1.position, zone2.position);
  const synergyKey = getConflictKey(zone1.entityId, zone2.entityId);

  const multiplier = 1.0 + overlapRatio * 0.5;

  const synergy: InfluenceSynergy = {
    zone1Id: zone1.entityId,
    zone2Id: zone2.entityId,
    synergyPosition: midpoint,
    multiplier,
    detectedAtMicros: deps.clock.nowMicroseconds(),
  };

  state.synergies.set(synergyKey, synergy);
}

function isSynergyPair(type1: InfluenceType, type2: InfluenceType): boolean {
  if (type1 === 'FRIENDLY' && type2 === 'FRIENDLY') {
    return true;
  }
  if (type1 === 'HOSTILE' && type2 === 'HOSTILE') {
    return true;
  }
  return false;
}

function getInfluenceMap(
  state: EntityInfluenceState,
  worldId: string,
  regionId: string,
): InfluenceMap {
  const regionKey = worldId;
  const entityIds = state.regionMaps.get(regionKey);

  const zones: InfluenceZone[] = [];

  if (entityIds !== undefined) {
    for (const entityId of entityIds) {
      const zone = state.zones.get(entityId);
      if (zone !== undefined) {
        zones.push(zone);
      }
    }
  }

  const allConflicts = Array.from(state.conflicts.values());
  const worldConflicts = allConflicts.filter((c) => {
    const zone1 = state.zones.get(c.zone1Id);
    return zone1 !== undefined && zone1.worldId === worldId;
  });

  const allSynergies = Array.from(state.synergies.values());
  const worldSynergies = allSynergies.filter((s) => {
    const zone1 = state.zones.get(s.zone1Id);
    return zone1 !== undefined && zone1.worldId === worldId;
  });

  return {
    worldId,
    regionId,
    zones,
    conflicts: worldConflicts,
    synergies: worldSynergies,
  };
}

function getInfluenceReport(
  state: EntityInfluenceState,
  entityId: string,
): string | InfluenceReport {
  const zone = state.zones.get(entityId);
  if (zone === undefined) {
    return 'ENTITY_NOT_FOUND';
  }

  const activeConflicts = findEntityConflicts(state, entityId);
  const activeSynergies = findEntitySynergies(state, entityId);

  return {
    entityId,
    zone,
    activeConflicts,
    activeSynergies,
  };
}

function findEntityConflicts(
  state: EntityInfluenceState,
  entityId: string,
): readonly InfluenceConflict[] {
  const conflicts: InfluenceConflict[] = [];

  for (const conflict of state.conflicts.values()) {
    if (conflict.zone1Id === entityId || conflict.zone2Id === entityId) {
      conflicts.push(conflict);
    }
  }

  return conflicts;
}

function findEntitySynergies(
  state: EntityInfluenceState,
  entityId: string,
): readonly InfluenceSynergy[] {
  const synergies: InfluenceSynergy[] = [];

  for (const synergy of state.synergies.values()) {
    if (synergy.zone1Id === entityId || synergy.zone2Id === entityId) {
      synergies.push(synergy);
    }
  }

  return synergies;
}

function removeEntity(
  state: EntityInfluenceState,
  deps: EntityInfluenceDeps,
  entityId: string,
): string | 'OK' {
  const zone = state.zones.get(entityId);
  if (zone === undefined) {
    return 'ENTITY_NOT_FOUND';
  }

  state.zones.delete(entityId);
  removeFromRegionMap(state, zone.worldId, entityId);

  deps.logger.info('entity_influence_removed', {
    entityId,
  });

  return 'OK';
}
