import { describe, expect, it } from 'vitest';
import { createHeirRegistry } from '../heir-registry.js';

describe('heir-registry simulation', () => {
  const make = () => {
    const records = new Map<string, { state: string; heirDynastyIds: string[] }>();
    const activations: Array<{ parent: string; heir: string }> = [];

    const registry = createHeirRegistry({
      continuity: {
        registerHeir: (dynastyId, heirDynastyId) => {
          const r = records.get(dynastyId) ?? { state: 'active', heirDynastyIds: [] };
          if (!r.heirDynastyIds.includes(heirDynastyId)) r.heirDynastyIds.push(heirDynastyId);
          records.set(dynastyId, r);
        },
        removeHeir: (dynastyId, heirDynastyId) => {
          const r = records.get(dynastyId) ?? { state: 'active', heirDynastyIds: [] };
          records.set(dynastyId, {
            ...r,
            heirDynastyIds: r.heirDynastyIds.filter((id) => id !== heirDynastyId),
          });
        },
        activateHeir: (completedDynastyId, heirDynastyId) => {
          activations.push({ parent: completedDynastyId, heir: heirDynastyId });
        },
        getRecord: (dynastyId) => records.get(dynastyId) ?? { state: 'active', heirDynastyIds: [] },
      },
      dynasty: {
        exists: (dynastyId) => ['parent-herald', 'parent-patron', 'heir-1', 'heir-2', 'heir-3'].includes(dynastyId),
        get: (dynastyId) => {
          if (dynastyId === 'parent-patron') {
            return { dynastyId, subscriptionTier: 'patron', status: 'active' };
          }
          return { dynastyId, subscriptionTier: 'herald', status: 'active' };
        },
      },
      chronicle: {
        append: ({ subject, content }) => `chr:${subject}:${content.length}`,
      },
      clock: { nowMicroseconds: () => 1_000_000 },
    });

    return { registry, records, activations };
  };

  it('simulates tier-limited heir declaration and parent/heir index traversal', () => {
    const { registry } = make();

    registry.declareHeir('parent-herald', 'heir-1');
    registry.declareHeir('parent-herald', 'heir-2');

    expect(() => registry.declareHeir('parent-herald', 'heir-3')).toThrow('heir limit');

    expect(registry.getHeirs('parent-herald')).toHaveLength(2);
    expect(registry.getParents('heir-1')).toContain('parent-herald');
    expect(registry.count()).toBe(2);

    registry.revokeHeir('parent-herald', 'heir-2');
    expect(registry.getHeirs('parent-herald')).toHaveLength(1);
  });

  it('simulates inheritance claim lifecycle and single-active-claim enforcement', () => {
    const { registry, records, activations } = make();

    registry.declareHeir('parent-herald', 'heir-1');
    registry.declareHeir('parent-patron', 'heir-1');

    records.set('parent-herald', { state: 'completed', heirDynastyIds: ['heir-1'] });
    const claim = registry.claimInheritance('parent-herald', 'heir-1');

    expect(claim.chronicleEntryId).toContain('chr:parent-herald');
    expect(registry.hasActiveInheritance('heir-1')).toBe(true);
    expect(activations).toHaveLength(1);

    records.set('parent-patron', { state: 'completed', heirDynastyIds: ['heir-1'] });
    expect(() => registry.claimInheritance('parent-patron', 'heir-1')).toThrow('active inheritance');
  });
});
