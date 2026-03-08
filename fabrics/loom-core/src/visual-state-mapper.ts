/**
 * visual-state-mapper.ts — Maps game state to visual state.
 *
 * Bridges the gap between entity components (game truth) and
 * EntityVisualState (rendering instructions). Runs each tick
 * to produce a snapshot buffer that the bridge consumes.
 *
 * The Loom decides what things LOOK like based on what they ARE.
 * The rendering fabric just follows instructions.
 */

import type { ComponentStore } from './component-store.js';
import type { SystemFn } from './system-registry.js';
import type { EntityId } from '@loom/entities-contracts';
import type {
  TransformComponent,
  VisualMeshComponent,
  AnimationComponent,
  NetworkReplicationComponent,
} from '@loom/entities-contracts';

// ── Visual State Types ──────────────────────────────────────────
// Locally defined to avoid importing from bridge-loom contract.
// Structurally compatible with bridge-loom's EntityVisualState.

export interface MappedTransform {
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly rotation: { readonly x: number; readonly y: number; readonly z: number; readonly w: number };
  readonly scale: { readonly x: number; readonly y: number; readonly z: number };
}

export interface MappedMesh {
  readonly contentHash: string;
  readonly assetName: string;
  readonly availableTiers: ReadonlyArray<string>;
}

export interface MappedAnimation {
  readonly clipName: string;
  readonly normalizedTime: number;
  readonly blendWeight: number;
  readonly playbackRate: number;
}

export interface MappedVisualState {
  readonly entityId: string;
  readonly transform: MappedTransform;
  readonly mesh: MappedMesh | undefined;
  readonly animation: MappedAnimation | undefined;
  readonly visibility: boolean;
  readonly renderPriority: number;
}

// ── Ports ────────────────────────────────────────────────────────

export interface VisualStateMapperDeps {
  readonly componentStore: ComponentStore;
}

export interface VisualStateBuffer {
  readonly states: ReadonlyArray<MappedVisualState>;
  readonly tickNumber: number;
  readonly timestamp: number;
}

export interface VisualStateMapperService {
  readonly getLatestBuffer: () => VisualStateBuffer | undefined;
  readonly system: SystemFn;
}

// ── State ────────────────────────────────────────────────────────

interface MapperState {
  readonly deps: VisualStateMapperDeps;
  latestBuffer: VisualStateBuffer | undefined;
}

// ── Mapping Functions ───────────────────────────────────────────

function mapTransform(t: TransformComponent): MappedTransform {
  return {
    position: { x: t.position.x, y: t.position.y, z: t.position.z },
    rotation: { x: t.rotation.x, y: t.rotation.y, z: t.rotation.z, w: t.rotation.w },
    scale: { x: t.scale.x, y: t.scale.y, z: t.scale.z },
  };
}

function mapMesh(m: VisualMeshComponent): MappedMesh {
  return {
    contentHash: m.meshContentHash,
    assetName: m.assetName,
    availableTiers: [m.lodTier],
  };
}

function mapAnimation(a: AnimationComponent): MappedAnimation {
  return {
    clipName: a.currentClip,
    normalizedTime: a.normalizedTime,
    blendWeight: a.blendWeight,
    playbackRate: a.playbackRate,
  };
}

function resolvePriority(entityId: EntityId, store: ComponentStore): number {
  const net = store.tryGet(entityId, 'network-replication') as NetworkReplicationComponent | undefined;
  if (!net) return 50;
  if (net.priority === 'critical') return 100;
  if (net.priority === 'high') return 75;
  if (net.priority === 'low') return 25;
  return 50;
}

function mapEntity(entityId: EntityId, store: ComponentStore): MappedVisualState | undefined {
  const transform = store.tryGet(entityId, 'transform') as TransformComponent | undefined;
  if (!transform) return undefined;
  const mesh = store.tryGet(entityId, 'visual-mesh') as VisualMeshComponent | undefined;
  const anim = store.tryGet(entityId, 'animation') as AnimationComponent | undefined;
  return {
    entityId,
    transform: mapTransform(transform),
    mesh: mesh ? mapMesh(mesh) : undefined,
    animation: anim ? mapAnimation(anim) : undefined,
    visibility: true,
    renderPriority: resolvePriority(entityId, store),
  };
}

// ── System ──────────────────────────────────────────────────────

/** Priority 900: runs after all game logic, before bridge push. */
const VISUAL_STATE_MAPPER_PRIORITY = 900;

function createVisualStateMapper(deps: VisualStateMapperDeps): VisualStateMapperService {
  const state: MapperState = { deps, latestBuffer: undefined };

  const system: SystemFn = (context) => {
    const entities = deps.componentStore.findEntitiesWith('visual-mesh');
    const states: MappedVisualState[] = [];
    for (const entityId of entities) {
      const mapped = mapEntity(entityId, deps.componentStore);
      if (mapped) states.push(mapped);
    }
    state.latestBuffer = {
      states,
      tickNumber: context.tickNumber,
      timestamp: context.wallTimeMicroseconds,
    };
  };

  return {
    getLatestBuffer: () => state.latestBuffer,
    system,
  };
}

// ── Exports ─────────────────────────────────────────────────────

export { createVisualStateMapper, VISUAL_STATE_MAPPER_PRIORITY };
