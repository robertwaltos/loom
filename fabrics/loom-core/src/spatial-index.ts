/**
 * Spatial Index — Grid-based spatial partitioning for entity location queries.
 *
 * Provides efficient spatial lookups: range queries (find entities within
 * a radius), nearest-neighbor search, entity movement tracking between
 * grid cells, and zone boundary detection. Entities are bucketed into
 * uniform grid cells for O(1) cell lookup and bounded neighborhood scans.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface SpatialEntry {
  readonly entityId: string;
  readonly x: number;
  readonly y: number;
  readonly cellX: number;
  readonly cellY: number;
}

export interface RangeQueryResult {
  readonly entityId: string;
  readonly x: number;
  readonly y: number;
  readonly distance: number;
}

export interface ZoneBoundary {
  readonly entityId: string;
  readonly previousZone: string;
  readonly currentZone: string;
  readonly crossedAt: number;
}

export interface SpatialZone {
  readonly zoneId: string;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface SpatialIndexStats {
  readonly entityCount: number;
  readonly cellSize: number;
  readonly occupiedCells: number;
  readonly totalCells: number;
  readonly zoneCrossings: number;
  readonly queriesExecuted: number;
}

export interface SpatialIndexDeps {
  readonly clock: { nowMicroseconds(): number };
  readonly cellSize?: number;
}

export interface SpatialIndex {
  insert(entityId: string, x: number, y: number): SpatialEntry;
  remove(entityId: string): boolean;
  update(entityId: string, x: number, y: number): SpatialEntry | undefined;
  getEntry(entityId: string): SpatialEntry | undefined;
  queryRange(cx: number, cy: number, radius: number): ReadonlyArray<RangeQueryResult>;
  queryNearest(cx: number, cy: number, count: number): ReadonlyArray<RangeQueryResult>;
  getEntitiesInCell(cellX: number, cellY: number): ReadonlyArray<string>;
  registerZone(zone: SpatialZone): boolean;
  unregisterZone(zoneId: string): boolean;
  getEntityZone(entityId: string): string | undefined;
  onZoneCrossing(callback: ZoneCrossingCallback): void;
  getStats(): SpatialIndexStats;
}

export type ZoneCrossingCallback = (boundary: ZoneBoundary) => void;

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_CELL_SIZE = 64;

// ─── State ──────────────────────────────────────────────────────────

interface MutableEntry {
  readonly entityId: string;
  x: number;
  y: number;
  cellX: number;
  cellY: number;
}

interface IndexState {
  readonly entries: Map<string, MutableEntry>;
  readonly cells: Map<string, Set<string>>;
  readonly zones: Map<string, SpatialZone>;
  readonly entityZones: Map<string, string>;
  readonly callbacks: ZoneCrossingCallback[];
  readonly clock: { nowMicroseconds(): number };
  readonly cellSize: number;
  zoneCrossings: number;
  queriesExecuted: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createSpatialIndex(deps: SpatialIndexDeps): SpatialIndex {
  const state: IndexState = {
    entries: new Map(),
    cells: new Map(),
    zones: new Map(),
    entityZones: new Map(),
    callbacks: [],
    clock: deps.clock,
    cellSize: deps.cellSize ?? DEFAULT_CELL_SIZE,
    zoneCrossings: 0,
    queriesExecuted: 0,
  };

  return {
    insert: (eid, x, y) => insertImpl(state, eid, x, y),
    remove: (eid) => removeImpl(state, eid),
    update: (eid, x, y) => updateImpl(state, eid, x, y),
    getEntry: (eid) => getEntryImpl(state, eid),
    queryRange: (cx, cy, r) => queryRangeImpl(state, cx, cy, r),
    queryNearest: (cx, cy, n) => queryNearestImpl(state, cx, cy, n),
    getEntitiesInCell: (cx, cy) => getEntitiesInCellImpl(state, cx, cy),
    registerZone: (zone) => registerZoneImpl(state, zone),
    unregisterZone: (zid) => unregisterZoneImpl(state, zid),
    getEntityZone: (eid) => state.entityZones.get(eid),
    onZoneCrossing: (cb) => {
      state.callbacks.push(cb);
    },
    getStats: () => computeStats(state),
  };
}

// ─── Cell Key Helpers ───────────────────────────────────────────────

function cellKey(cx: number, cy: number): string {
  return String(cx) + ',' + String(cy);
}

function toCell(state: IndexState, coord: number): number {
  return Math.floor(coord / state.cellSize);
}

// ─── Insert ─────────────────────────────────────────────────────────

function insertImpl(state: IndexState, entityId: string, x: number, y: number): SpatialEntry {
  const existing = state.entries.get(entityId);
  if (existing !== undefined) {
    return toReadonlyEntry(existing);
  }
  const cx = toCell(state, x);
  const cy = toCell(state, y);
  const entry: MutableEntry = { entityId, x, y, cellX: cx, cellY: cy };
  state.entries.set(entityId, entry);
  addToCell(state, cx, cy, entityId);
  assignZone(state, entityId, x, y);
  return toReadonlyEntry(entry);
}

function addToCell(state: IndexState, cx: number, cy: number, entityId: string): void {
  const key = cellKey(cx, cy);
  const bucket = state.cells.get(key);
  if (bucket !== undefined) {
    bucket.add(entityId);
  } else {
    state.cells.set(key, new Set([entityId]));
  }
}

// ─── Remove ─────────────────────────────────────────────────────────

function removeImpl(state: IndexState, entityId: string): boolean {
  const entry = state.entries.get(entityId);
  if (entry === undefined) return false;
  removeFromCell(state, entry.cellX, entry.cellY, entityId);
  state.entries.delete(entityId);
  state.entityZones.delete(entityId);
  return true;
}

function removeFromCell(state: IndexState, cx: number, cy: number, entityId: string): void {
  const key = cellKey(cx, cy);
  const bucket = state.cells.get(key);
  if (bucket === undefined) return;
  bucket.delete(entityId);
  if (bucket.size === 0) state.cells.delete(key);
}

// ─── Update ─────────────────────────────────────────────────────────

function updateImpl(
  state: IndexState,
  entityId: string,
  x: number,
  y: number,
): SpatialEntry | undefined {
  const entry = state.entries.get(entityId);
  if (entry === undefined) return undefined;
  const newCx = toCell(state, x);
  const newCy = toCell(state, y);
  if (entry.cellX !== newCx || entry.cellY !== newCy) {
    removeFromCell(state, entry.cellX, entry.cellY, entityId);
    addToCell(state, newCx, newCy, entityId);
    entry.cellX = newCx;
    entry.cellY = newCy;
  }
  entry.x = x;
  entry.y = y;
  checkZoneCrossing(state, entityId, x, y);
  return toReadonlyEntry(entry);
}

// ─── Range Query ────────────────────────────────────────────────────

function queryRangeImpl(
  state: IndexState,
  cx: number,
  cy: number,
  radius: number,
): ReadonlyArray<RangeQueryResult> {
  state.queriesExecuted++;
  const results: RangeQueryResult[] = [];
  const minCellX = toCell(state, cx - radius);
  const maxCellX = toCell(state, cx + radius);
  const minCellY = toCell(state, cy - radius);
  const maxCellY = toCell(state, cy + radius);
  const radiusSq = radius * radius;

  for (let gx = minCellX; gx <= maxCellX; gx++) {
    for (let gy = minCellY; gy <= maxCellY; gy++) {
      collectFromCell(state, gx, gy, cx, cy, radiusSq, results);
    }
  }
  results.sort(compareByDistance);
  return results;
}

function collectFromCell(
  state: IndexState,
  gx: number,
  gy: number,
  cx: number,
  cy: number,
  radiusSq: number,
  results: RangeQueryResult[],
): void {
  const bucket = state.cells.get(cellKey(gx, gy));
  if (bucket === undefined) return;
  for (const eid of bucket) {
    const entry = state.entries.get(eid);
    if (entry === undefined) continue;
    const distSq = distanceSquared(entry.x, entry.y, cx, cy);
    if (distSq <= radiusSq) {
      results.push({ entityId: eid, x: entry.x, y: entry.y, distance: Math.sqrt(distSq) });
    }
  }
}

// ─── Nearest Neighbor ───────────────────────────────────────────────

function queryNearestImpl(
  state: IndexState,
  cx: number,
  cy: number,
  count: number,
): ReadonlyArray<RangeQueryResult> {
  state.queriesExecuted++;
  const all: RangeQueryResult[] = [];
  for (const entry of state.entries.values()) {
    const dist = Math.sqrt(distanceSquared(entry.x, entry.y, cx, cy));
    all.push({ entityId: entry.entityId, x: entry.x, y: entry.y, distance: dist });
  }
  all.sort(compareByDistance);
  return all.slice(0, count);
}

// ─── Cell Query ─────────────────────────────────────────────────────

function getEntitiesInCellImpl(state: IndexState, cx: number, cy: number): ReadonlyArray<string> {
  const bucket = state.cells.get(cellKey(cx, cy));
  if (bucket === undefined) return [];
  return [...bucket];
}

// ─── Zones ──────────────────────────────────────────────────────────

function registerZoneImpl(state: IndexState, zone: SpatialZone): boolean {
  if (state.zones.has(zone.zoneId)) return false;
  state.zones.set(zone.zoneId, zone);
  return true;
}

function unregisterZoneImpl(state: IndexState, zoneId: string): boolean {
  if (!state.zones.has(zoneId)) return false;
  state.zones.delete(zoneId);
  for (const [eid, z] of state.entityZones) {
    if (z === zoneId) state.entityZones.delete(eid);
  }
  return true;
}

function assignZone(state: IndexState, entityId: string, x: number, y: number): void {
  const zone = findZoneForPoint(state, x, y);
  if (zone !== undefined) {
    state.entityZones.set(entityId, zone);
  }
}

function checkZoneCrossing(state: IndexState, entityId: string, x: number, y: number): void {
  const previousZone = state.entityZones.get(entityId);
  const currentZone = findZoneForPoint(state, x, y);
  if (currentZone !== undefined) {
    state.entityZones.set(entityId, currentZone);
  } else {
    state.entityZones.delete(entityId);
  }
  const prev = previousZone ?? '';
  const curr = currentZone ?? '';
  if (prev === curr) return;
  state.zoneCrossings++;
  const boundary: ZoneBoundary = {
    entityId,
    previousZone: prev,
    currentZone: curr,
    crossedAt: state.clock.nowMicroseconds(),
  };
  notifyZoneCrossing(state, boundary);
}

function findZoneForPoint(state: IndexState, x: number, y: number): string | undefined {
  for (const [zoneId, zone] of state.zones) {
    if (x >= zone.minX && x <= zone.maxX && y >= zone.minY && y <= zone.maxY) {
      return zoneId;
    }
  }
  return undefined;
}

function notifyZoneCrossing(state: IndexState, boundary: ZoneBoundary): void {
  for (const cb of state.callbacks) {
    cb(boundary);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function distanceSquared(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

function compareByDistance(a: RangeQueryResult, b: RangeQueryResult): number {
  return a.distance - b.distance;
}

function toReadonlyEntry(entry: MutableEntry): SpatialEntry {
  return {
    entityId: entry.entityId,
    x: entry.x,
    y: entry.y,
    cellX: entry.cellX,
    cellY: entry.cellY,
  };
}

function getEntryImpl(state: IndexState, entityId: string): SpatialEntry | undefined {
  const entry = state.entries.get(entityId);
  return entry !== undefined ? toReadonlyEntry(entry) : undefined;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: IndexState): SpatialIndexStats {
  return {
    entityCount: state.entries.size,
    cellSize: state.cellSize,
    occupiedCells: state.cells.size,
    totalCells: state.cells.size,
    zoneCrossings: state.zoneCrossings,
    queriesExecuted: state.queriesExecuted,
  };
}
