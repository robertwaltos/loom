import { describe, it, expect } from 'vitest';
import { createHeirRegistry, MAX_HEIRS_BY_TIER } from '../heir-registry.js';
import type {
  HeirRegistry,
  HeirRegistryDeps,
  HeirContinuityPort,
  HeirContinuityRecord,
  HeirDynastyPort,
  HeirDynastyInfo,
  HeirChroniclePort,
  HeirChronicleEntry,
} from '../heir-registry.js';
import type { SubscriptionTier } from '../dynasty.js';

// ─── Test Helpers ───────────────────────────────────────────────────

function createMockContinuity(): HeirContinuityPort & {
  registered: Array<{ dynastyId: string; heirId: string }>;
  removed: Array<{ dynastyId: string; heirId: string }>;
  activated: Array<{ dynastyId: string; heirId: string }>;
  records: Map<string, HeirContinuityRecord>;
} {
  const registered: Array<{ dynastyId: string; heirId: string }> = [];
  const removed: Array<{ dynastyId: string; heirId: string }> = [];
  const activated: Array<{ dynastyId: string; heirId: string }> = [];
  const records = new Map<string, HeirContinuityRecord>();

  return {
    registered,
    removed,
    activated,
    records,
    registerHeir(dynastyId: string, heirDynastyId: string) {
      registered.push({ dynastyId, heirId: heirDynastyId });
    },
    removeHeir(dynastyId: string, heirDynastyId: string) {
      removed.push({ dynastyId, heirId: heirDynastyId });
    },
    activateHeir(completedDynastyId: string, heirDynastyId: string) {
      activated.push({ dynastyId: completedDynastyId, heirId: heirDynastyId });
    },
    getRecord(dynastyId: string) {
      const record = records.get(dynastyId);
      if (record === undefined) {
        return { state: 'active', heirDynastyIds: [] };
      }
      return record;
    },
  };
}

function createMockDynasty(
  overrides?: Partial<Record<string, Partial<HeirDynastyInfo>>>,
): HeirDynastyPort & {
  dynasties: Map<string, HeirDynastyInfo>;
} {
  const dynasties = new Map<string, HeirDynastyInfo>();
  // Default test dynasties
  dynasties.set('parent-1', {
    dynastyId: 'parent-1',
    subscriptionTier: 'herald',
    status: 'active',
  });
  dynasties.set('heir-1', {
    dynastyId: 'heir-1',
    subscriptionTier: 'accord',
    status: 'active',
  });
  dynasties.set('heir-2', {
    dynastyId: 'heir-2',
    subscriptionTier: 'accord',
    status: 'active',
  });
  dynasties.set('heir-3', {
    dynastyId: 'heir-3',
    subscriptionTier: 'accord',
    status: 'active',
  });

  if (overrides) {
    for (const [id, partial] of Object.entries(overrides)) {
      const existing = dynasties.get(id) ?? {
        dynastyId: id,
        subscriptionTier: 'accord' as SubscriptionTier,
        status: 'active',
      };
      dynasties.set(id, { ...existing, ...partial, dynastyId: id });
    }
  }

  return {
    dynasties,
    get(dynastyId: string) {
      const d = dynasties.get(dynastyId);
      if (d === undefined) {
        throw new Error('Dynasty ' + dynastyId + ' not found');
      }
      return d;
    },
    exists(dynastyId: string) {
      return dynasties.has(dynastyId);
    },
  };
}

function createMockChronicle(): HeirChroniclePort & {
  entries: HeirChronicleEntry[];
} {
  const entries: HeirChronicleEntry[] = [];
  let counter = 0;
  return {
    entries,
    append(entry: HeirChronicleEntry) {
      counter += 1;
      entries.push(entry);
      return 'chr-' + String(counter);
    },
  };
}

function createTestRegistry(
  dynastyOverrides?: Partial<Record<string, Partial<HeirDynastyInfo>>>,
): {
  registry: HeirRegistry;
  continuity: ReturnType<typeof createMockContinuity>;
  dynasty: ReturnType<typeof createMockDynasty>;
  chronicle: ReturnType<typeof createMockChronicle>;
} {
  const continuity = createMockContinuity();
  const dynasty = createMockDynasty(dynastyOverrides);
  const chronicle = createMockChronicle();
  const deps: HeirRegistryDeps = {
    continuity,
    dynasty,
    chronicle,
    clock: { nowMicroseconds: () => 1_000_000 },
  };
  return {
    registry: createHeirRegistry(deps),
    continuity,
    dynasty,
    chronicle,
  };
}

// ─── Tier Limits ────────────────────────────────────────────────────

describe('Heir registry tier limits', () => {
  it('free tier cannot declare heirs', () => {
    expect(MAX_HEIRS_BY_TIER.free).toBe(0);
  });

  it('accord tier cannot declare heirs', () => {
    expect(MAX_HEIRS_BY_TIER.accord).toBe(0);
  });

  it('patron tier allows 1 heir', () => {
    expect(MAX_HEIRS_BY_TIER.patron).toBe(1);
  });

  it('herald tier allows 2 heirs', () => {
    expect(MAX_HEIRS_BY_TIER.herald).toBe(2);
  });
});

// ─── Declaration ────────────────────────────────────────────────────

describe('Heir registry declaration', () => {
  it('declares heir for eligible dynasty', () => {
    const { registry } = createTestRegistry();
    const decl = registry.declareHeir('parent-1', 'heir-1');
    expect(decl.parentDynastyId).toBe('parent-1');
    expect(decl.heirDynastyId).toBe('heir-1');
    expect(decl.declaredAt).toBe(1_000_000);
  });

  it('registers heir with continuity engine', () => {
    const { registry, continuity } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    expect(continuity.registered).toHaveLength(1);
    expect(continuity.registered[0]?.heirId).toBe('heir-1');
  });

  it('tracks declaration count', () => {
    const { registry } = createTestRegistry();
    expect(registry.count()).toBe(0);
    registry.declareHeir('parent-1', 'heir-1');
    expect(registry.count()).toBe(1);
  });

  it('allows multiple heirs for herald tier', () => {
    const { registry } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    registry.declareHeir('parent-1', 'heir-2');
    expect(registry.getHeirs('parent-1')).toHaveLength(2);
  });

  it('rejects heir declaration beyond tier limit', () => {
    const { registry } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    registry.declareHeir('parent-1', 'heir-2');
    expect(() => registry.declareHeir('parent-1', 'heir-3')).toThrow('heir limit');
  });

  it('rejects self-inheritance', () => {
    const { registry } = createTestRegistry();
    expect(() => registry.declareHeir('parent-1', 'parent-1')).toThrow('own heir');
  });

  it('rejects non-existent heir dynasty', () => {
    const { registry } = createTestRegistry();
    expect(() => registry.declareHeir('parent-1', 'nonexistent')).toThrow('not found');
  });

  it('rejects duplicate heir declaration', () => {
    const { registry } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    expect(() => registry.declareHeir('parent-1', 'heir-1')).toThrow('already declared');
  });

  it('rejects when accord tier tries to declare', () => {
    const { registry } = createTestRegistry({
      'accord-parent': { subscriptionTier: 'accord' },
    });
    expect(registry.canDeclareHeir('accord-parent')).toBe(false);
  });
});

// ─── Revocation ─────────────────────────────────────────────────────

describe('Heir registry revocation', () => {
  it('removes heir declaration', () => {
    const { registry } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    registry.revokeHeir('parent-1', 'heir-1');
    expect(registry.getHeirs('parent-1')).toHaveLength(0);
  });

  it('removes heir from continuity engine', () => {
    const { registry, continuity } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    registry.revokeHeir('parent-1', 'heir-1');
    expect(continuity.removed).toHaveLength(1);
    expect(continuity.removed[0]?.heirId).toBe('heir-1');
  });

  it('allows re-declaration after revocation', () => {
    const { registry } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    registry.revokeHeir('parent-1', 'heir-1');
    const decl = registry.declareHeir('parent-1', 'heir-1');
    expect(decl.heirDynastyId).toBe('heir-1');
  });

  it('handles revocation of non-existent heir gracefully', () => {
    const { registry } = createTestRegistry();
    expect(() => { registry.revokeHeir('parent-1', 'nonexistent'); }).not.toThrow();
  });

  it('updates parent index on revocation', () => {
    const { registry } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    registry.revokeHeir('parent-1', 'heir-1');
    expect(registry.getParents('heir-1')).toHaveLength(0);
  });
});

// ─── Inheritance Claim ──────────────────────────────────────────────

describe('Heir registry claim success', () => {
  it('claims inheritance for completed dynasty', () => {
    const { registry, continuity } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    continuity.records.set('parent-1', {
      state: 'completed',
      heirDynastyIds: ['heir-1'],
    });
    const result = registry.claimInheritance('parent-1', 'heir-1');
    expect(result.parentDynastyId).toBe('parent-1');
    expect(result.heirDynastyId).toBe('heir-1');
    expect(result.chronicleEntryId).toBe('chr-1');
  });

  it('activates heir in continuity engine', () => {
    const { registry, continuity } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    continuity.records.set('parent-1', {
      state: 'completed',
      heirDynastyIds: ['heir-1'],
    });
    registry.claimInheritance('parent-1', 'heir-1');
    expect(continuity.activated).toHaveLength(1);
  });

  it('records chronicle entry for claim', () => {
    const { registry, continuity, chronicle } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    continuity.records.set('parent-1', {
      state: 'completed',
      heirDynastyIds: ['heir-1'],
    });
    registry.claimInheritance('parent-1', 'heir-1');
    expect(chronicle.entries).toHaveLength(1);
    expect(chronicle.entries[0]?.category).toBe('dynasty.heir');
    expect(chronicle.entries[0]?.content).toContain('heir-1');
    expect(chronicle.entries[0]?.content).toContain('parent-1');
  });

  it('marks heir as having active inheritance', () => {
    const { registry, continuity } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    continuity.records.set('parent-1', {
      state: 'completed',
      heirDynastyIds: ['heir-1'],
    });
    registry.claimInheritance('parent-1', 'heir-1');
    expect(registry.hasActiveInheritance('heir-1')).toBe(true);
  });
});

describe('Heir registry claim validation', () => {
  it('rejects claim for non-completed dynasty', () => {
    const { registry, continuity } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    continuity.records.set('parent-1', {
      state: 'redistribution',
      heirDynastyIds: ['heir-1'],
    });
    expect(() => registry.claimInheritance('parent-1', 'heir-1'))
      .toThrow('not completed');
  });

  it('rejects claim from non-registered heir', () => {
    const { registry, continuity } = createTestRegistry();
    continuity.records.set('parent-1', {
      state: 'completed',
      heirDynastyIds: [],
    });
    expect(() => registry.claimInheritance('parent-1', 'heir-1'))
      .toThrow('not registered');
  });

  it('rejects double inheritance', () => {
    const { registry, continuity } = createTestRegistry({
      'parent-2': { subscriptionTier: 'herald' },
    });
    registry.declareHeir('parent-1', 'heir-1');
    registry.declareHeir('parent-2', 'heir-1');
    continuity.records.set('parent-1', {
      state: 'completed',
      heirDynastyIds: ['heir-1'],
    });
    continuity.records.set('parent-2', {
      state: 'completed',
      heirDynastyIds: ['heir-1'],
    });
    registry.claimInheritance('parent-1', 'heir-1');
    expect(() => registry.claimInheritance('parent-2', 'heir-1'))
      .toThrow('active inheritance');
  });
});

// ─── Queries ────────────────────────────────────────────────────────

describe('Heir registry queries', () => {
  it('returns heirs for parent dynasty', () => {
    const { registry } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    registry.declareHeir('parent-1', 'heir-2');
    const heirs = registry.getHeirs('parent-1');
    expect(heirs).toHaveLength(2);
  });

  it('returns empty array for dynasty with no heirs', () => {
    const { registry } = createTestRegistry();
    expect(registry.getHeirs('parent-1')).toHaveLength(0);
  });

  it('returns parent dynasties for heir', () => {
    const { registry } = createTestRegistry({
      'parent-2': { subscriptionTier: 'herald' },
    });
    registry.declareHeir('parent-1', 'heir-1');
    registry.declareHeir('parent-2', 'heir-1');
    const parents = registry.getParents('heir-1');
    expect(parents).toHaveLength(2);
  });

  it('canDeclareHeir returns true when under limit', () => {
    const { registry } = createTestRegistry();
    expect(registry.canDeclareHeir('parent-1')).toBe(true);
  });

  it('canDeclareHeir returns false when at limit', () => {
    const { registry } = createTestRegistry();
    registry.declareHeir('parent-1', 'heir-1');
    registry.declareHeir('parent-1', 'heir-2');
    expect(registry.canDeclareHeir('parent-1')).toBe(false);
  });

  it('hasActiveInheritance returns false by default', () => {
    const { registry } = createTestRegistry();
    expect(registry.hasActiveInheritance('heir-1')).toBe(false);
  });
});
