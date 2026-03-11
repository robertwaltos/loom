import { describe, it, expect, beforeEach } from 'vitest';
import { createFactionEngine, ALL_FACTIONS, RANK_THRESHOLDS } from '../faction-engine.js';
import type {
  FactionEngineDeps,
  FactionEvent,
  FactionEngine,
  FactionBenefit,
  FactionId,
} from '../faction-engine.js';

function makeDeps(): FactionEngineDeps & { readonly events: FactionEvent[] } {
  let time = 1_000_000;
  let idCounter = 0;
  const events: FactionEvent[] = [];
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: {
      generate: () => {
        idCounter++;
        return 'fac-' + String(idCounter);
      },
    },
    notifications: {
      notify: (_dynastyId, event) => {
        events.push(event);
      },
    },
    events,
  };
}

function makeBenefit(overrides?: Partial<FactionBenefit>): FactionBenefit {
  return {
    id: 'benefit-1',
    name: 'Builder Bonus',
    description: 'Reduced construction costs',
    requiredRank: 'INITIATE',
    factionId: 'ARCHITECTS',
    ...overrides,
  };
}

let engine: FactionEngine;
let deps: FactionEngineDeps & { readonly events: FactionEvent[] };

beforeEach(() => {
  deps = makeDeps();
  engine = createFactionEngine(deps);
});

describe('FactionEngine -- joining and leaving', () => {
  it('joins a faction as INITIATE', () => {
    const membership = engine.joinFaction('d1', 'ARCHITECTS');
    expect(membership.factionId).toBe('ARCHITECTS');
    expect(membership.rank).toBe('INITIATE');
    expect(membership.reputation).toBe(0);
    expect(membership.totalContributions).toBe(0n);
  });

  it('rejects joining when already in a faction', () => {
    engine.joinFaction('d1', 'ARCHITECTS');
    expect(() => engine.joinFaction('d1', 'WARDENS')).toThrow('already belongs');
  });

  it('retrieves membership', () => {
    engine.joinFaction('d1', 'PIONEERS');
    const m = engine.getMembership('d1');
    expect(m).toBeDefined();
    expect(m?.factionId).toBe('PIONEERS');
  });

  it('returns undefined for non-member', () => {
    expect(engine.getMembership('nobody')).toBeUndefined();
  });

  it('leaves a faction', () => {
    engine.joinFaction('d1', 'ARCHITECTS');
    engine.leaveFaction('d1');
    expect(engine.getMembership('d1')).toBeUndefined();
  });

  it('throws when leaving without membership', () => {
    expect(() => engine.leaveFaction('nobody')).toThrow('not in any faction');
  });

  it('emits JOINED event on join', () => {
    engine.joinFaction('d1', 'WARDENS');
    const joined = deps.events.filter((e) => e.kind === 'JOINED');
    expect(joined).toHaveLength(1);
    expect(joined[0]?.factionId).toBe('WARDENS');
  });

  it('emits LEFT event on leave', () => {
    engine.joinFaction('d1', 'WARDENS');
    deps.events.length = 0;
    engine.leaveFaction('d1');
    const left = deps.events.filter((e) => e.kind === 'LEFT');
    expect(left).toHaveLength(1);
  });
});

describe('FactionEngine -- contributions', () => {
  it('accepts contribution', () => {
    engine.joinFaction('d1', 'ARCHITECTS');
    const updated = engine.contribute('d1', 500n);
    expect(updated.totalContributions).toBe(500n);
  });

  it('accumulates contributions', () => {
    engine.joinFaction('d1', 'ARCHITECTS');
    engine.contribute('d1', 500n);
    const updated = engine.contribute('d1', 300n);
    expect(updated.totalContributions).toBe(800n);
  });

  it('rejects zero contribution', () => {
    engine.joinFaction('d1', 'ARCHITECTS');
    expect(() => engine.contribute('d1', 0n)).toThrow('must be positive');
  });

  it('rejects negative contribution', () => {
    engine.joinFaction('d1', 'ARCHITECTS');
    expect(() => engine.contribute('d1', -5n)).toThrow('must be positive');
  });

  it('throws for non-member contribution', () => {
    expect(() => engine.contribute('nobody', 100n)).toThrow('not in any faction');
  });
});

describe('FactionEngine -- reputation and ranks', () => {
  it('adds reputation', () => {
    engine.joinFaction('d1', 'WARDENS');
    const updated = engine.addReputation('d1', 50);
    expect(updated.reputation).toBe(50);
    expect(updated.rank).toBe('INITIATE');
  });

  it('promotes to MEMBER at 100 reputation', () => {
    engine.joinFaction('d1', 'WARDENS');
    const updated = engine.addReputation('d1', 100);
    expect(updated.rank).toBe('MEMBER');
  });

  it('promotes to VETERAN at 500 reputation', () => {
    engine.joinFaction('d1', 'PIONEERS');
    engine.addReputation('d1', 500);
    const m = engine.getMembership('d1');
    expect(m?.rank).toBe('VETERAN');
  });

  it('promotes to ELITE at 2000 reputation', () => {
    engine.joinFaction('d1', 'ARCHITECTS');
    engine.addReputation('d1', 2000);
    expect(engine.getMembership('d1')?.rank).toBe('ELITE');
  });

  it('promotes to CHAMPION at 5000 reputation', () => {
    engine.joinFaction('d1', 'ARCHITECTS');
    engine.addReputation('d1', 5000);
    expect(engine.getMembership('d1')?.rank).toBe('CHAMPION');
  });

  it('emits PROMOTED event on rank change', () => {
    engine.joinFaction('d1', 'WARDENS');
    deps.events.length = 0;
    engine.addReputation('d1', 100);
    const promoted = deps.events.filter((e) => e.kind === 'PROMOTED');
    expect(promoted).toHaveLength(1);
  });

  it('rejects zero reputation', () => {
    engine.joinFaction('d1', 'WARDENS');
    expect(() => engine.addReputation('d1', 0)).toThrow('must be positive');
  });
});

describe('FactionEngine -- benefits', () => {
  it('registers and retrieves a benefit', () => {
    engine.registerBenefit(makeBenefit());
    const benefits = engine.getAllBenefits('ARCHITECTS');
    expect(benefits).toHaveLength(1);
    expect(benefits[0]?.name).toBe('Builder Bonus');
  });

  it('returns available benefits for member rank', () => {
    engine.registerBenefit(makeBenefit({ id: 'b1', requiredRank: 'INITIATE' }));
    engine.registerBenefit(makeBenefit({ id: 'b2', requiredRank: 'VETERAN' }));
    engine.joinFaction('d1', 'ARCHITECTS');
    const available = engine.getAvailableBenefits('d1');
    expect(available).toHaveLength(1);
    expect(available[0]?.id).toBe('b1');
  });

  it('returns more benefits as rank increases', () => {
    engine.registerBenefit(makeBenefit({ id: 'b1', requiredRank: 'INITIATE' }));
    engine.registerBenefit(makeBenefit({ id: 'b2', requiredRank: 'MEMBER' }));
    engine.joinFaction('d1', 'ARCHITECTS');
    engine.addReputation('d1', 100);
    const available = engine.getAvailableBenefits('d1');
    expect(available).toHaveLength(2);
  });

  it('returns empty for non-member', () => {
    engine.registerBenefit(makeBenefit());
    expect(engine.getAvailableBenefits('nobody')).toHaveLength(0);
  });

  it('filters benefits by faction', () => {
    engine.registerBenefit(makeBenefit({ id: 'b1', factionId: 'ARCHITECTS' }));
    engine.registerBenefit(makeBenefit({ id: 'b2', factionId: 'WARDENS' }));
    expect(engine.getAllBenefits('ARCHITECTS')).toHaveLength(1);
    expect(engine.getAllBenefits('WARDENS')).toHaveLength(1);
    expect(engine.getAllBenefits('PIONEERS')).toHaveLength(0);
  });
});

describe('FactionEngine -- conflicts', () => {
  it('declares a conflict between factions', () => {
    const conflict = engine.declareConflict('ARCHITECTS', 'WARDENS', 'Resource dispute');
    expect(conflict.aggressorFaction).toBe('ARCHITECTS');
    expect(conflict.defenderFaction).toBe('WARDENS');
    expect(conflict.active).toBe(true);
    expect(conflict.resolvedAt).toBeNull();
  });

  it('rejects self-conflict', () => {
    expect(() => engine.declareConflict('ARCHITECTS', 'ARCHITECTS', 'x')).toThrow(
      'cannot conflict with itself',
    );
  });

  it('resolves a conflict', () => {
    const conflict = engine.declareConflict('PIONEERS', 'WARDENS', 'Border issue');
    const resolved = engine.resolveConflict(conflict.conflictId);
    expect(resolved.active).toBe(false);
    expect(resolved.resolvedAt).toBeGreaterThan(0);
  });

  it('rejects resolving already resolved conflict', () => {
    const conflict = engine.declareConflict('PIONEERS', 'WARDENS', 'x');
    engine.resolveConflict(conflict.conflictId);
    expect(() => engine.resolveConflict(conflict.conflictId)).toThrow('already resolved');
  });

  it('throws for unknown conflict id', () => {
    expect(() => engine.resolveConflict('missing')).toThrow('not found');
  });

  it('lists active conflicts', () => {
    engine.declareConflict('ARCHITECTS', 'WARDENS', 'x');
    const c2 = engine.declareConflict('PIONEERS', 'WARDENS', 'y');
    engine.resolveConflict(c2.conflictId);
    const active = engine.getActiveConflicts();
    expect(active).toHaveLength(1);
  });
});

describe('FactionEngine -- queries', () => {
  it('lists members of a faction', () => {
    engine.joinFaction('d1', 'ARCHITECTS');
    engine.joinFaction('d2', 'ARCHITECTS');
    engine.joinFaction('d3', 'WARDENS');
    const architects = engine.listMembers('ARCHITECTS');
    expect(architects).toHaveLength(2);
  });

  it('returns empty list for faction with no members', () => {
    expect(engine.listMembers('PIONEERS')).toHaveLength(0);
  });

  it('gets faction info', () => {
    engine.joinFaction('d1', 'ARCHITECTS');
    engine.joinFaction('d2', 'ARCHITECTS');
    engine.contribute('d1', 100n);
    engine.addReputation('d1', 50);
    engine.declareConflict('ARCHITECTS', 'WARDENS', 'x');
    const info = engine.getFactionInfo('ARCHITECTS');
    expect(info.memberCount).toBe(2);
    expect(info.totalContributions).toBe(100n);
    expect(info.totalReputation).toBe(50);
    expect(info.activeConflicts).toBe(1);
  });
});

describe('FactionEngine -- stats', () => {
  it('starts with zero stats', () => {
    const stats = engine.getStats();
    expect(stats.totalMembers).toBe(0);
    expect(stats.totalContributions).toBe(0n);
    expect(stats.activeConflicts).toBe(0);
  });

  it('tracks aggregate stats', () => {
    engine.joinFaction('d1', 'ARCHITECTS');
    engine.joinFaction('d2', 'WARDENS');
    engine.joinFaction('d3', 'PIONEERS');
    engine.contribute('d1', 200n);
    engine.contribute('d2', 300n);
    engine.declareConflict('ARCHITECTS', 'WARDENS', 'x');
    const stats = engine.getStats();
    expect(stats.totalMembers).toBe(3);
    expect(stats.membersByFaction.ARCHITECTS).toBe(1);
    expect(stats.membersByFaction.WARDENS).toBe(1);
    expect(stats.membersByFaction.PIONEERS).toBe(1);
    expect(stats.totalContributions).toBe(500n);
    expect(stats.activeConflicts).toBe(1);
  });
});

describe('FactionEngine -- constants', () => {
  it('exports ALL_FACTIONS with three factions', () => {
    expect(ALL_FACTIONS).toHaveLength(3);
    expect(ALL_FACTIONS).toContain('ARCHITECTS');
    expect(ALL_FACTIONS).toContain('WARDENS');
    expect(ALL_FACTIONS).toContain('PIONEERS');
  });

  it('exports RANK_THRESHOLDS', () => {
    expect(RANK_THRESHOLDS.INITIATE).toBe(0);
    expect(RANK_THRESHOLDS.MEMBER).toBe(100);
    expect(RANK_THRESHOLDS.VETERAN).toBe(500);
    expect(RANK_THRESHOLDS.ELITE).toBe(2000);
    expect(RANK_THRESHOLDS.CHAMPION).toBe(5000);
  });
});
