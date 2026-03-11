/**
 * VisualStateMapper — Validates game state → visual state mapping.
 */

import { describe, it, expect } from 'vitest';
import { createVisualStateMapper } from '../visual-state-mapper.js';
import { createComponentStore } from '../component-store.js';
import type { SystemContext } from '../system-registry.js';
import type { EntityId } from '@loom/entities-contracts';
import type {
  TransformComponent,
  VisualMeshComponent,
  AnimationComponent,
  NetworkReplicationComponent,
} from '@loom/entities-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

function context(tickNumber: number): SystemContext {
  return { deltaMs: 33, tickNumber, wallTimeMicroseconds: tickNumber * 33_000 };
}

function setupVisualEntity(
  store: ReturnType<typeof createComponentStore>,
  entityId: EntityId,
): void {
  const transform: TransformComponent = {
    position: { x: 10, y: 5, z: 20 },
    rotation: { x: 0, y: 0.7071, z: 0, w: 0.7071 },
    scale: { x: 1, y: 1, z: 1 },
  };
  const mesh: VisualMeshComponent = {
    meshContentHash: 'sha256:hero-mesh',
    assetName: 'SM_HeroCharacter',
    lodTier: 'cinematic',
    materialVariant: 'battle-worn',
  };
  const anim: AnimationComponent = {
    currentClip: 'Run_Forward',
    normalizedTime: 0.4,
    blendWeight: 1.0,
    playbackRate: 1.0,
    nextClip: null,
  };
  store.set(entityId, 'transform', transform);
  store.set(entityId, 'visual-mesh', mesh);
  store.set(entityId, 'animation', anim);
}

describe('VisualStateMapper — basic mapping', () => {
  it('produces visual state from entity components', () => {
    const store = createComponentStore();
    const mapper = createVisualStateMapper({ componentStore: store });
    const id = eid('entity-1');
    setupVisualEntity(store, id);

    mapper.system(context(1));

    const buffer = mapper.getLatestBuffer();
    expect(buffer).toBeDefined();
    expect(buffer?.states).toHaveLength(1);
    expect(buffer?.tickNumber).toBe(1);
  });

  it('maps transform position correctly', () => {
    const store = createComponentStore();
    const mapper = createVisualStateMapper({ componentStore: store });
    const id = eid('entity-1');
    setupVisualEntity(store, id);

    mapper.system(context(1));

    const state = mapper.getLatestBuffer()?.states[0];
    expect(state?.transform.position.x).toBe(10);
    expect(state?.transform.position.y).toBe(5);
    expect(state?.transform.position.z).toBe(20);
  });

  it('maps mesh reference correctly', () => {
    const store = createComponentStore();
    const mapper = createVisualStateMapper({ componentStore: store });
    const id = eid('entity-1');
    setupVisualEntity(store, id);

    mapper.system(context(1));

    const state = mapper.getLatestBuffer()?.states[0];
    expect(state?.mesh?.contentHash).toBe('sha256:hero-mesh');
    expect(state?.mesh?.assetName).toBe('SM_HeroCharacter');
    expect(state?.mesh?.availableTiers).toContain('cinematic');
  });

  it('maps animation state correctly', () => {
    const store = createComponentStore();
    const mapper = createVisualStateMapper({ componentStore: store });
    const id = eid('entity-1');
    setupVisualEntity(store, id);

    mapper.system(context(1));

    const state = mapper.getLatestBuffer()?.states[0];
    expect(state?.animation?.clipName).toBe('Run_Forward');
    expect(state?.animation?.normalizedTime).toBe(0.4);
  });
});

describe('VisualStateMapper — priority mapping', () => {
  it('assigns critical priority for critical replication entities', () => {
    const store = createComponentStore();
    const mapper = createVisualStateMapper({ componentStore: store });
    const id = eid('player-1');
    setupVisualEntity(store, id);
    const net: NetworkReplicationComponent = {
      priority: 'critical',
      relevancyRadius: 200,
      updateFrequency: 30,
      ownerConnectionId: 'conn-1',
    };
    store.set(id, 'network-replication', net);

    mapper.system(context(1));

    const state = mapper.getLatestBuffer()?.states[0];
    expect(state?.renderPriority).toBe(100);
  });

  it('assigns default priority for entities without replication', () => {
    const store = createComponentStore();
    const mapper = createVisualStateMapper({ componentStore: store });
    const id = eid('ambient-1');
    setupVisualEntity(store, id);

    mapper.system(context(1));

    const state = mapper.getLatestBuffer()?.states[0];
    expect(state?.renderPriority).toBe(50);
  });
});

describe('VisualStateMapper — multiple entities', () => {
  it('maps all visual entities each tick', () => {
    const store = createComponentStore();
    const mapper = createVisualStateMapper({ componentStore: store });
    setupVisualEntity(store, eid('e1'));
    setupVisualEntity(store, eid('e2'));
    setupVisualEntity(store, eid('e3'));

    mapper.system(context(1));

    const buffer = mapper.getLatestBuffer();
    expect(buffer?.states).toHaveLength(3);
  });

  it('skips entities without transform', () => {
    const store = createComponentStore();
    const mapper = createVisualStateMapper({ componentStore: store });
    const id = eid('mesh-only');
    const mesh: VisualMeshComponent = {
      meshContentHash: 'sha256:test',
      assetName: 'SM_Test',
      lodTier: 'low',
      materialVariant: null,
    };
    store.set(id, 'visual-mesh', mesh);

    mapper.system(context(1));

    const buffer = mapper.getLatestBuffer();
    expect(buffer?.states).toHaveLength(0);
  });
});

describe('VisualStateMapper — buffer lifecycle', () => {
  it('returns undefined before first tick', () => {
    const store = createComponentStore();
    const mapper = createVisualStateMapper({ componentStore: store });
    expect(mapper.getLatestBuffer()).toBeUndefined();
  });

  it('updates buffer each tick', () => {
    const store = createComponentStore();
    const mapper = createVisualStateMapper({ componentStore: store });
    setupVisualEntity(store, eid('e1'));

    mapper.system(context(1));
    mapper.system(context(2));

    const buffer = mapper.getLatestBuffer();
    expect(buffer?.tickNumber).toBe(2);
  });
});
