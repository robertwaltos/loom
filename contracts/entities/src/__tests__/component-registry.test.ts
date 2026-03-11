/**
 * Component Registry — Validates type map and component type enumeration.
 */

import { describe, it, expect } from 'vitest';
import type {
  ComponentType,
  ComponentTypeMap,
  PlayerRequiredComponents,
  AmbientNpcRequiredComponents,
  SpawnPointRequiredComponents,
} from '../component-registry.js';
import { ALL_COMPONENT_TYPES } from '../component-registry.js';

describe('ALL_COMPONENT_TYPES', () => {
  it('contains all 16 component types', () => {
    expect(ALL_COMPONENT_TYPES).toHaveLength(16);
  });

  it('contains core components', () => {
    expect(ALL_COMPONENT_TYPES).toContain('transform');
    expect(ALL_COMPONENT_TYPES).toContain('identity');
    expect(ALL_COMPONENT_TYPES).toContain('health');
    expect(ALL_COMPONENT_TYPES).toContain('inventory');
    expect(ALL_COMPONENT_TYPES).toContain('ai-brain');
    expect(ALL_COMPONENT_TYPES).toContain('physics-body');
    expect(ALL_COMPONENT_TYPES).toContain('world-membership');
  });

  it('contains gameplay components', () => {
    expect(ALL_COMPONENT_TYPES).toContain('player-input');
    expect(ALL_COMPONENT_TYPES).toContain('movement');
    expect(ALL_COMPONENT_TYPES).toContain('camera-target');
    expect(ALL_COMPONENT_TYPES).toContain('visual-mesh');
    expect(ALL_COMPONENT_TYPES).toContain('animation');
    expect(ALL_COMPONENT_TYPES).toContain('network-replication');
    expect(ALL_COMPONENT_TYPES).toContain('spawn-point');
    expect(ALL_COMPONENT_TYPES).toContain('npc-tier');
    expect(ALL_COMPONENT_TYPES).toContain('interaction');
  });

  it('has no duplicates', () => {
    const unique = new Set(ALL_COMPONENT_TYPES);
    expect(unique.size).toBe(ALL_COMPONENT_TYPES.length);
  });
});

describe('ComponentType union', () => {
  it('accepts valid component type strings', () => {
    const types: ComponentType[] = [
      'transform',
      'identity',
      'health',
      'player-input',
      'movement',
      'npc-tier',
      'interaction',
    ];
    expect(types).toHaveLength(7);
  });
});

describe('ComponentTypeMap', () => {
  it('maps transform to TransformComponent shape', () => {
    const data: ComponentTypeMap['transform'] = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    };
    expect(data.position.x).toBe(0);
    expect(data.rotation.w).toBe(1);
  });

  it('maps player-input to PlayerInputComponent shape', () => {
    const data: ComponentTypeMap['player-input'] = {
      moveDirection: { x: 1, y: 0, z: 0 },
      lookDirection: { x: 0, y: 0, z: -1 },
      actions: [],
      sequenceNumber: 1,
    };
    expect(data.moveDirection.x).toBe(1);
  });

  it('maps npc-tier to NpcTierComponent shape', () => {
    const data: ComponentTypeMap['npc-tier'] = {
      tier: 2,
      memoryWindowDays: null,
      aiBackend: 'llm-haiku',
      canCreateAssets: true,
    };
    expect(data.tier).toBe(2);
  });

  it('maps visual-mesh to VisualMeshComponent shape', () => {
    const data: ComponentTypeMap['visual-mesh'] = {
      meshContentHash: 'sha256:test',
      assetName: 'SM_TestMesh',
      lodTier: 'high',
      materialVariant: null,
    };
    expect(data.assetName).toBe('SM_TestMesh');
  });
});

describe('Component requirement sets', () => {
  it('player requires 10 components', () => {
    const required: PlayerRequiredComponents[] = [
      'transform',
      'identity',
      'health',
      'world-membership',
      'player-input',
      'movement',
      'camera-target',
      'visual-mesh',
      'animation',
      'network-replication',
    ];
    expect(required).toHaveLength(10);
  });

  it('ambient NPC requires 5 components', () => {
    const required: AmbientNpcRequiredComponents[] = [
      'transform',
      'visual-mesh',
      'animation',
      'npc-tier',
      'world-membership',
    ];
    expect(required).toHaveLength(5);
  });

  it('spawn point requires 3 components', () => {
    const required: SpawnPointRequiredComponents[] = [
      'transform',
      'spawn-point',
      'world-membership',
    ];
    expect(required).toHaveLength(3);
  });
});
