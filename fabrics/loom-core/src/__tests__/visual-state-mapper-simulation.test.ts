import { describe, expect, it } from 'vitest';
import { createVisualStateMapper } from '../visual-state-mapper.js';
import { createComponentStore } from '../component-store.js';
import type { EntityId } from '@loom/entities-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

describe('visual-state-mapper simulation', () => {
  it('simulates multi-entity mapping with replication-priority stratification over ticks', () => {
    const store = createComponentStore();

    const setup = (id: EntityId, priority?: 'critical' | 'high' | 'normal' | 'low') => {
      store.set(id, 'transform', {
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      });
      store.set(id, 'visual-mesh', {
        meshContentHash: 'mesh-' + id,
        assetName: 'SM_' + id,
        lodTier: 'high',
        materialVariant: null,
      });
      if (priority) {
        store.set(id, 'network-replication', {
          priority,
          relevancyRadius: 100,
          updateFrequency: 20,
          ownerConnectionId: null,
        });
      }
    };

    setup(eid('e-critical'), 'critical');
    setup(eid('e-high'), 'high');
    setup(eid('e-default'));

    const mapper = createVisualStateMapper({ componentStore: store });
    mapper.system({ deltaMs: 16, tickNumber: 1, wallTimeMicroseconds: 16_000 });
    mapper.system({ deltaMs: 16, tickNumber: 2, wallTimeMicroseconds: 32_000 });

    const buffer = mapper.getLatestBuffer();
    expect(buffer?.tickNumber).toBe(2);
    expect(buffer?.states).toHaveLength(3);
    expect(buffer?.states.find((s) => s.entityId === 'e-critical')?.renderPriority).toBe(100);
    expect(buffer?.states.find((s) => s.entityId === 'e-high')?.renderPriority).toBe(75);
    expect(buffer?.states.find((s) => s.entityId === 'e-default')?.renderPriority).toBe(50);
  });
});
