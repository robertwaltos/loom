/**
 * Gameplay Components — Validates all vertical-slice component shapes.
 */

import { describe, it, expect } from 'vitest';
import type {
  PlayerInputComponent,
  MovementComponent,
  CameraTargetComponent,
  VisualMeshComponent,
  AnimationComponent,
  NetworkReplicationComponent,
  SpawnPointComponent,
  NpcTierComponent,
  InteractionComponent,
  MovementMode,
  CameraMode,
  NpcTier,
  NpcAiBackend,
  ReplicationPriority,
  SpawnType,
  InteractionType,
} from '../gameplay-components.js';

describe('PlayerInputComponent', () => {
  it('captures movement and look input', () => {
    const input: PlayerInputComponent = {
      moveDirection: { x: 0, y: 0, z: 1 },
      lookDirection: { x: 0, y: 0, z: -1 },
      actions: ['jump'],
      sequenceNumber: 42,
    };
    expect(input.moveDirection.z).toBe(1);
    expect(input.actions).toContain('jump');
    expect(input.sequenceNumber).toBe(42);
  });

  it('represents no-input state', () => {
    const idle: PlayerInputComponent = {
      moveDirection: { x: 0, y: 0, z: 0 },
      lookDirection: { x: 0, y: 0, z: -1 },
      actions: [],
      sequenceNumber: 0,
    };
    expect(idle.actions).toHaveLength(0);
  });
});

describe('MovementComponent', () => {
  it('represents a walking entity', () => {
    const move: MovementComponent = {
      speed: 2.5,
      maxSpeed: 5.0,
      isGrounded: true,
      movementMode: 'walking',
    };
    expect(move.speed).toBeLessThanOrEqual(move.maxSpeed);
    expect(move.isGrounded).toBe(true);
    expect(move.movementMode).toBe('walking');
  });

  it('covers all movement modes', () => {
    const modes: ReadonlyArray<MovementMode> = [
      'walking',
      'running',
      'sprinting',
      'falling',
      'swimming',
      'flying',
    ];
    expect(modes).toHaveLength(6);
  });

  it('represents a falling entity', () => {
    const falling: MovementComponent = {
      speed: 9.8,
      maxSpeed: 50,
      isGrounded: false,
      movementMode: 'falling',
    };
    expect(falling.isGrounded).toBe(false);
  });
});

describe('CameraTargetComponent', () => {
  it('creates a third-person camera setup', () => {
    const cam: CameraTargetComponent = {
      mode: 'third-person',
      fieldOfView: 90,
      distance: 5.0,
      offset: { x: 0, y: 1.8, z: 0 },
      pitchLimits: { min: -89, max: 89 },
    };
    expect(cam.mode).toBe('third-person');
    expect(cam.offset.y).toBe(1.8);
    expect(cam.pitchLimits.max).toBe(89);
  });

  it('covers all camera modes', () => {
    const modes: ReadonlyArray<CameraMode> = ['first-person', 'third-person', 'orbital'];
    expect(modes).toHaveLength(3);
  });
});

describe('VisualMeshComponent', () => {
  it('references a mesh by content hash', () => {
    const mesh: VisualMeshComponent = {
      meshContentHash: 'sha256:abc123def456',
      assetName: 'SM_HumanMale_01',
      lodTier: 'cinematic',
      materialVariant: 'worn-leather',
    };
    expect(mesh.meshContentHash).toContain('sha256');
    expect(mesh.materialVariant).toBe('worn-leather');
  });

  it('allows null material variant', () => {
    const mesh: VisualMeshComponent = {
      meshContentHash: 'sha256:789',
      assetName: 'SM_Tree_Oak',
      lodTier: 'high',
      materialVariant: null,
    };
    expect(mesh.materialVariant).toBeNull();
  });
});

describe('AnimationComponent', () => {
  it('represents an idle animation', () => {
    const anim: AnimationComponent = {
      currentClip: 'Idle_Breathe',
      normalizedTime: 0.5,
      blendWeight: 1.0,
      playbackRate: 1.0,
      nextClip: null,
    };
    expect(anim.normalizedTime).toBeGreaterThanOrEqual(0);
    expect(anim.normalizedTime).toBeLessThanOrEqual(1);
    expect(anim.nextClip).toBeNull();
  });

  it('represents a blend transition', () => {
    const blending: AnimationComponent = {
      currentClip: 'Walk_Forward',
      normalizedTime: 0.3,
      blendWeight: 0.6,
      playbackRate: 1.0,
      nextClip: 'Run_Forward',
    };
    expect(blending.nextClip).toBe('Run_Forward');
    expect(blending.blendWeight).toBeLessThan(1.0);
  });
});

describe('NetworkReplicationComponent', () => {
  it('configures player entity replication', () => {
    const net: NetworkReplicationComponent = {
      priority: 'critical',
      relevancyRadius: 200,
      updateFrequency: 30,
      ownerConnectionId: 'conn-42',
    };
    expect(net.priority).toBe('critical');
    expect(net.ownerConnectionId).toBe('conn-42');
  });

  it('configures server-authoritative NPC replication', () => {
    const net: NetworkReplicationComponent = {
      priority: 'normal',
      relevancyRadius: 100,
      updateFrequency: 10,
      ownerConnectionId: null,
    };
    expect(net.ownerConnectionId).toBeNull();
  });

  it('covers all priority levels', () => {
    const priorities: ReadonlyArray<ReplicationPriority> = ['critical', 'high', 'normal', 'low'];
    expect(priorities).toHaveLength(4);
  });
});

describe('SpawnPointComponent', () => {
  it('creates a player spawn point', () => {
    const spawn: SpawnPointComponent = {
      spawnType: 'player',
      capacity: 10,
      activeSpawns: 0,
      cooldownMicroseconds: 5_000_000,
    };
    expect(spawn.spawnType).toBe('player');
    expect(spawn.activeSpawns).toBeLessThanOrEqual(spawn.capacity);
  });

  it('covers all spawn types', () => {
    const types: ReadonlyArray<SpawnType> = ['player', 'npc', 'creature'];
    expect(types).toHaveLength(3);
  });
});

describe('NpcTierComponent', () => {
  it('classifies a Tier 0 ambient NPC', () => {
    const tier0: NpcTierComponent = {
      tier: 0,
      memoryWindowDays: null,
      aiBackend: 'rule-based',
      canCreateAssets: false,
    };
    expect(tier0.tier).toBe(0);
    expect(tier0.memoryWindowDays).toBeNull();
    expect(tier0.canCreateAssets).toBe(false);
  });

  it('classifies a Tier 1 inhabitant NPC', () => {
    const tier1: NpcTierComponent = {
      tier: 1,
      memoryWindowDays: 90,
      aiBackend: 'behavior-tree',
      canCreateAssets: false,
    };
    expect(tier1.memoryWindowDays).toBe(90);
  });

  it('classifies a Tier 2 notable NPC', () => {
    const tier2: NpcTierComponent = {
      tier: 2,
      memoryWindowDays: null,
      aiBackend: 'llm-haiku',
      canCreateAssets: true,
    };
    expect(tier2.canCreateAssets).toBe(true);
    expect(tier2.aiBackend).toBe('llm-haiku');
  });

  it('classifies a Tier 3 architect agent', () => {
    const tier3: NpcTierComponent = {
      tier: 3,
      memoryWindowDays: null,
      aiBackend: 'llm-opus',
      canCreateAssets: true,
    };
    expect(tier3.tier).toBe(3);
  });

  it('covers all tiers and backends', () => {
    const tiers: ReadonlyArray<NpcTier> = [0, 1, 2, 3];
    const backends: ReadonlyArray<NpcAiBackend> = [
      'rule-based',
      'behavior-tree',
      'llm-haiku',
      'llm-opus',
    ];
    expect(tiers).toHaveLength(4);
    expect(backends).toHaveLength(4);
  });
});

describe('InteractionComponent', () => {
  it('creates a talkable NPC interaction', () => {
    const interact: InteractionComponent = {
      availableInteractions: ['talk', 'trade'],
      interactionRadius: 3.0,
      requiresLineOfSight: true,
      promptText: 'Press E to talk',
    };
    expect(interact.availableInteractions).toContain('talk');
    expect(interact.requiresLineOfSight).toBe(true);
  });

  it('covers all interaction types', () => {
    const types: ReadonlyArray<InteractionType> = ['talk', 'trade', 'inspect', 'use', 'pickup'];
    expect(types).toHaveLength(5);
  });
});
