import { describe, it, expect, vi } from 'vitest';
import {
  createWorldEditor,
  type WorldEditorDeps,
  type Vec3,
  type BoundingRect,
  type TriggerCondition,
  type TriggerAction,
} from '../index.js';

// ── Test doubles ─────────────────────────────────────────────────────

function makeDeps(): WorldEditorDeps {
  let counter = 0;
  return {
    clock: { nowMs: vi.fn(() => 2_000) },
    id: { next: vi.fn(() => `id-${String(++counter)}`) },
    log: { info: vi.fn() },
  };
}

const POS: Vec3 = Object.freeze({ x: 10, y: 0, z: 20 });
const BOUNDS: BoundingRect = Object.freeze({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
const CONDITION: TriggerCondition = Object.freeze({ type: 'enter-zone', params: {} });
const ACTION: TriggerAction = Object.freeze({ type: 'spawn-entity', params: { entityType: 'wolf' } });

// ── placeEntity ───────────────────────────────────────────────────────

describe('placeEntity', () => {
  it('creates and returns an EntityPlacement', () => {
    const editor = createWorldEditor(makeDeps());
    const p = editor.placeEntity({ worldId: 'w1', entityType: 'tree', position: POS });
    expect(p.worldId).toBe('w1');
    expect(p.entityType).toBe('tree');
    expect(p.position.x).toBe(10);
    expect(p.rotationYaw).toBe(0);
  });

  it('uses provided templateId and properties', () => {
    const editor = createWorldEditor(makeDeps());
    const p = editor.placeEntity({
      worldId: 'w1',
      entityType: 'chest',
      position: POS,
      templateId: 'tmpl-rare',
      properties: { lootTier: 'legendary' },
    });
    expect(p.templateId).toBe('tmpl-rare');
    expect(p.properties['lootTier']).toBe('legendary');
  });

  it('increments totalPlacements in stats', () => {
    const editor = createWorldEditor(makeDeps());
    editor.placeEntity({ worldId: 'w1', entityType: 'rock', position: POS });
    editor.placeEntity({ worldId: 'w1', entityType: 'tree', position: POS });
    expect(editor.getStats().totalPlacements).toBe(2);
  });
});

// ── removeEntity ──────────────────────────────────────────────────────

describe('removeEntity', () => {
  it('removes an existing placement', () => {
    const editor = createWorldEditor(makeDeps());
    const p = editor.placeEntity({ worldId: 'w1', entityType: 'rock', position: POS });
    expect(editor.removeEntity(p.placementId)).toBe(true);
    expect(editor.getStats().totalPlacements).toBe(0);
  });

  it('returns false for unknown placementId', () => {
    const editor = createWorldEditor(makeDeps());
    expect(editor.removeEntity('ghost')).toBe(false);
  });
});

// ── defineZone ────────────────────────────────────────────────────────

describe('defineZone', () => {
  it('creates and returns a ZoneDefinition', () => {
    const editor = createWorldEditor(makeDeps());
    const z = editor.defineZone({ worldId: 'w1', name: 'Market', bounds: BOUNDS, type: 'trading' });
    expect(z.name).toBe('Market');
    expect(z.type).toBe('trading');
    expect(z.bounds.maxX).toBe(100);
  });

  it('increments totalZones in stats', () => {
    const editor = createWorldEditor(makeDeps());
    editor.defineZone({ worldId: 'w1', name: 'Arena', bounds: BOUNDS, type: 'combat' });
    expect(editor.getStats().totalZones).toBe(1);
  });
});

// ── removeZone ────────────────────────────────────────────────────────

describe('removeZone', () => {
  it('removes an existing zone', () => {
    const editor = createWorldEditor(makeDeps());
    const z = editor.defineZone({ worldId: 'w1', name: 'Safe Haven', bounds: BOUNDS, type: 'safe' });
    expect(editor.removeZone(z.zoneId)).toBe(true);
    expect(editor.getStats().totalZones).toBe(0);
  });

  it('returns false for unknown zoneId', () => {
    const editor = createWorldEditor(makeDeps());
    expect(editor.removeZone('ghost')).toBe(false);
  });
});

// ── addTrigger ────────────────────────────────────────────────────────

describe('addTrigger', () => {
  it('creates and returns an EventTrigger', () => {
    const editor = createWorldEditor(makeDeps());
    const t = editor.addTrigger({ worldId: 'w1', name: 'Spawn Wolf', condition: CONDITION, action: ACTION });
    expect(t.name).toBe('Spawn Wolf');
    expect(t.condition.type).toBe('enter-zone');
    expect(t.action.type).toBe('spawn-entity');
  });
});

// ── removeTrigger ─────────────────────────────────────────────────────

describe('removeTrigger', () => {
  it('removes an existing trigger', () => {
    const editor = createWorldEditor(makeDeps());
    const t = editor.addTrigger({ worldId: 'w1', name: 'Spawn', condition: CONDITION, action: ACTION });
    expect(editor.removeTrigger(t.triggerId)).toBe(true);
    expect(editor.getStats().totalTriggers).toBe(0);
  });
});

// ── exportWorld ───────────────────────────────────────────────────────

describe('exportWorld', () => {
  it('exports all content for a world', () => {
    const editor = createWorldEditor(makeDeps());
    editor.placeEntity({ worldId: 'w1', entityType: 'tree', position: POS });
    editor.defineZone({ worldId: 'w1', name: 'Clearing', bounds: BOUNDS, type: 'safe' });
    const result = editor.exportWorld('w1');
    if (typeof result === 'string') throw new Error();
    expect(result.worldId).toBe('w1');
    expect(result.placements.length).toBe(1);
    expect(result.zones.length).toBe(1);
  });

  it('excludes content from other worlds', () => {
    const editor = createWorldEditor(makeDeps());
    editor.placeEntity({ worldId: 'w2', entityType: 'npc', position: POS });
    editor.placeEntity({ worldId: 'w1', entityType: 'tree', position: POS });
    const result = editor.exportWorld('w1');
    if (typeof result === 'string') throw new Error();
    expect(result.placements.length).toBe(1);
  });

  it('returns world-has-no-content when world is empty', () => {
    const editor = createWorldEditor(makeDeps());
    expect(editor.exportWorld('empty-world')).toBe('world-has-no-content');
  });
});

// ── getStats ──────────────────────────────────────────────────────────

describe('getStats', () => {
  it('tracks worldsEdited across entities and zones', () => {
    const editor = createWorldEditor(makeDeps());
    editor.placeEntity({ worldId: 'w1', entityType: 'tree', position: POS });
    editor.defineZone({ worldId: 'w2', name: 'Zone', bounds: BOUNDS, type: 'event' });
    expect(editor.getStats().worldsEdited).toBe(2);
  });

  it('starts with all zeros', () => {
    const editor = createWorldEditor(makeDeps());
    const stats = editor.getStats();
    expect(stats.totalPlacements).toBe(0);
    expect(stats.totalZones).toBe(0);
    expect(stats.totalTriggers).toBe(0);
    expect(stats.worldsEdited).toBe(0);
  });
});
