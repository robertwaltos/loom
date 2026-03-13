/**
 * world-editor/index.ts — Web-based tool state manager for placing entities,
 * defining zones, and configuring event triggers.
 *
 * NEXT-STEPS Phase 16.4: "World editor: web-based tool for placing entities,
 * defining zones, triggering events."
 *
 * This module owns the editing session state on the Loom side.  A web client
 * calls these methods via the Selvage API; the resulting exports are fed into
 * the entity system at publish time.
 *
 * Features:
 *   - Entity placement registry (position, rotation, template, overrides)
 *   - Zone definition (bounding rectangles, zone type, linked triggers)
 *   - Event trigger definitions (condition + action pairs)
 *   - Full-world export to a serialisable snapshot
 *
 * Thread: cotton/tools/world-editor
 * Tier: 1
 */

// ── Ports ────────────────────────────────────────────────────────────

export interface EditorClockPort {
  readonly nowMs: () => number;
}

export interface EditorIdPort {
  readonly next: () => string;
}

export interface EditorLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
}

// ── Types ────────────────────────────────────────────────────────────

export type ZoneType = 'safe' | 'combat' | 'trading' | 'restricted' | 'event' | 'transition';

export type ConditionType =
  | 'enter-zone'
  | 'leave-zone'
  | 'entity-count'
  | 'time-of-day'
  | 'item-pickup';

export type ActionType =
  | 'spawn-entity'
  | 'despawn-entity'
  | 'play-cutscene'
  | 'unlock-zone'
  | 'broadcast-event';

export type WorldEditorError =
  | 'placement-not-found'
  | 'zone-not-found'
  | 'trigger-not-found'
  | 'world-has-no-content';

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface BoundingRect {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface TriggerCondition {
  readonly type: ConditionType;
  readonly params: Readonly<Record<string, unknown>>;
}

export interface TriggerAction {
  readonly type: ActionType;
  readonly params: Readonly<Record<string, unknown>>;
}

export interface EntityPlacement {
  readonly placementId: string;
  readonly worldId: string;
  readonly entityType: string;
  readonly templateId: string | undefined;
  readonly position: Vec3;
  readonly rotationYaw: number;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly createdAt: number;
}

export interface ZoneDefinition {
  readonly zoneId: string;
  readonly worldId: string;
  readonly name: string;
  readonly bounds: BoundingRect;
  readonly type: ZoneType;
  readonly createdAt: number;
}

export interface EventTrigger {
  readonly triggerId: string;
  readonly worldId: string;
  readonly name: string;
  readonly condition: TriggerCondition;
  readonly action: TriggerAction;
  readonly createdAt: number;
}

export interface WorldExport {
  readonly worldId: string;
  readonly placements: readonly EntityPlacement[];
  readonly zones: readonly ZoneDefinition[];
  readonly triggers: readonly EventTrigger[];
  readonly exportedAt: number;
}

export interface EditorStats {
  readonly totalPlacements: number;
  readonly totalZones: number;
  readonly totalTriggers: number;
  readonly worldsEdited: number;
}

export type PlaceEntityParams = {
  readonly worldId: string;
  readonly entityType: string;
  readonly templateId?: string;
  readonly position: Vec3;
  readonly rotationYaw?: number;
  readonly properties?: Record<string, unknown>;
};

export type DefineZoneParams = {
  readonly worldId: string;
  readonly name: string;
  readonly bounds: BoundingRect;
  readonly type: ZoneType;
};

export type AddTriggerParams = {
  readonly worldId: string;
  readonly name: string;
  readonly condition: TriggerCondition;
  readonly action: TriggerAction;
};

export interface WorldEditor {
  readonly placeEntity: (params: PlaceEntityParams) => EntityPlacement;
  readonly removeEntity: (placementId: string) => boolean;
  readonly defineZone: (params: DefineZoneParams) => ZoneDefinition;
  readonly removeZone: (zoneId: string) => boolean;
  readonly addTrigger: (params: AddTriggerParams) => EventTrigger;
  readonly removeTrigger: (triggerId: string) => boolean;
  readonly exportWorld: (worldId: string) => WorldExport | WorldEditorError;
  readonly getStats: () => EditorStats;
}

export type WorldEditorDeps = {
  readonly clock: EditorClockPort;
  readonly id: EditorIdPort;
  readonly log: EditorLogPort;
};

// ── Internal state ────────────────────────────────────────────────────

type EditorStore = {
  placements: Map<string, EntityPlacement>;
  zones: Map<string, ZoneDefinition>;
  triggers: Map<string, EventTrigger>;
};

// ── Helpers ───────────────────────────────────────────────────────────

function worldsEdited(store: EditorStore): number {
  const ids = new Set<string>();
  for (const p of store.placements.values()) ids.add(p.worldId);
  for (const z of store.zones.values()) ids.add(z.worldId);
  for (const t of store.triggers.values()) ids.add(t.worldId);
  return ids.size;
}

function exportWorld(store: EditorStore, clock: EditorClockPort) {
  return function doExport(worldId: string): WorldExport | WorldEditorError {
    const placements = Array.from(store.placements.values()).filter((p) => p.worldId === worldId);
    const zones = Array.from(store.zones.values()).filter((z) => z.worldId === worldId);
    const triggers = Array.from(store.triggers.values()).filter((t) => t.worldId === worldId);
    if (placements.length + zones.length + triggers.length === 0) return 'world-has-no-content';
    return Object.freeze({ worldId, placements, zones, triggers, exportedAt: clock.nowMs() });
  };
}

function makePlaceEntity(store: EditorStore, deps: WorldEditorDeps) {
  return function placeEntity(params: PlaceEntityParams): EntityPlacement {
    const placement: EntityPlacement = Object.freeze({
      placementId: deps.id.next(),
      worldId: params.worldId,
      entityType: params.entityType,
      templateId: params.templateId ?? undefined,
      position: Object.freeze({ ...params.position }),
      rotationYaw: params.rotationYaw ?? 0,
      properties: Object.freeze({ ...(params.properties ?? {}) }),
      createdAt: deps.clock.nowMs(),
    });
    store.placements.set(placement.placementId, placement);
    deps.log.info('entity-placed', { placementId: placement.placementId });
    return placement;
  };
}

function makeDefineZone(store: EditorStore, deps: WorldEditorDeps) {
  return function defineZone(params: DefineZoneParams): ZoneDefinition {
    const zone: ZoneDefinition = Object.freeze({
      zoneId: deps.id.next(),
      worldId: params.worldId,
      name: params.name,
      bounds: Object.freeze({ ...params.bounds }),
      type: params.type,
      createdAt: deps.clock.nowMs(),
    });
    store.zones.set(zone.zoneId, zone);
    return zone;
  };
}

function makeAddTrigger(store: EditorStore, deps: WorldEditorDeps) {
  return function addTrigger(params: AddTriggerParams): EventTrigger {
    const trigger: EventTrigger = Object.freeze({
      triggerId: deps.id.next(),
      worldId: params.worldId,
      name: params.name,
      condition: Object.freeze({ ...params.condition }),
      action: Object.freeze({ ...params.action }),
      createdAt: deps.clock.nowMs(),
    });
    store.triggers.set(trigger.triggerId, trigger);
    return trigger;
  };
}

// ── Factory ───────────────────────────────────────────────────────────

export function createWorldEditor(deps: WorldEditorDeps): WorldEditor {
  const store: EditorStore = {
    placements: new Map<string, EntityPlacement>(),
    zones: new Map<string, ZoneDefinition>(),
    triggers: new Map<string, EventTrigger>(),
  };
  return {
    placeEntity: makePlaceEntity(store, deps),
    removeEntity: (id) => store.placements.delete(id),
    defineZone: makeDefineZone(store, deps),
    removeZone: (id) => store.zones.delete(id),
    addTrigger: makeAddTrigger(store, deps),
    removeTrigger: (id) => store.triggers.delete(id),
    exportWorld: exportWorld(store, deps.clock),
    getStats() {
      return Object.freeze({
        totalPlacements: store.placements.size,
        totalZones: store.zones.size,
        totalTriggers: store.triggers.size,
        worldsEdited: worldsEdited(store),
      });
    },
  };
}
