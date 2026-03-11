import { describe, it, expect } from 'vitest';
import { createAllianceEngine, MEMBER_LIMITS, MIN_MEMBERS_TO_RATIFY } from '../alliance-engine.js';
import type {
  AllianceEngineDeps,
  AllianceEvent,
  CreateAllianceParams,
} from '../alliance-engine.js';

function makeDeps(): AllianceEngineDeps & { readonly events: AllianceEvent[] } {
  let time = 1_000_000;
  let idCounter = 0;
  const events: AllianceEvent[] = [];
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: {
      generate: () => {
        idCounter++;
        return 'id-' + String(idCounter);
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

function makeParams(overrides?: Partial<CreateAllianceParams>): CreateAllianceParams {
  return {
    name: 'Test Alliance',
    allianceType: 'MUTUAL_DEFENSE',
    founderId: 'dynasty-1',
    charter: 'We stand together.',
    ...overrides,
  };
}

describe('AllianceEngine -- creation', () => {
  it('creates an alliance in FORMING phase', () => {
    const deps = makeDeps();
    const engine = createAllianceEngine(deps);
    const alliance = engine.create(makeParams());
    expect(alliance.phase).toBe('FORMING');
    expect(alliance.founderId).toBe('dynasty-1');
    expect(alliance.name).toBe('Test Alliance');
    expect(alliance.members).toHaveLength(1);
    expect(alliance.members[0]?.role).toBe('FOUNDER');
  });

  it('includes founder as first member', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    expect(alliance.members[0]?.dynastyId).toBe('dynasty-1');
  });

  it('sends invites to initial members', () => {
    const deps = makeDeps();
    const engine = createAllianceEngine(deps);
    engine.create(makeParams({ initialMembers: ['dynasty-2', 'dynasty-3'] }));
    const inviteEvents = deps.events.filter((e) => e.kind === 'INVITED');
    expect(inviteEvents).toHaveLength(2);
  });

  it('does not invite founder in initialMembers', () => {
    const deps = makeDeps();
    const engine = createAllianceEngine(deps);
    engine.create(makeParams({ initialMembers: ['dynasty-1', 'dynasty-2'] }));
    const inviteEvents = deps.events.filter((e) => e.kind === 'INVITED');
    expect(inviteEvents).toHaveLength(1);
  });
});

describe('AllianceEngine -- invitations', () => {
  it('creates and accepts an invite', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    const invite = engine.invite(alliance.allianceId, 'dynasty-1', 'dynasty-2');
    expect(invite.status).toBe('PENDING');
    const updated = engine.acceptInvite(invite.inviteId);
    expect(updated.members).toHaveLength(2);
  });

  it('rejects an invite', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    const invite = engine.invite(alliance.allianceId, 'dynasty-1', 'dynasty-2');
    const rejected = engine.rejectInvite(invite.inviteId);
    expect(rejected.status).toBe('REJECTED');
  });

  it('throws when inviter is not a member', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    expect(() => engine.invite(alliance.allianceId, 'outsider', 'dynasty-2')).toThrow(
      'not a member',
    );
  });

  it('throws when inviting existing member', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    expect(() => engine.invite(alliance.allianceId, 'dynasty-1', 'dynasty-1')).toThrow(
      'already a member',
    );
  });

  it('throws when accepting non-pending invite', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    const invite = engine.invite(alliance.allianceId, 'dynasty-1', 'dynasty-2');
    engine.rejectInvite(invite.inviteId);
    expect(() => engine.acceptInvite(invite.inviteId)).toThrow('not pending');
  });

  it('throws for unknown invite', () => {
    const engine = createAllianceEngine(makeDeps());
    expect(() => engine.acceptInvite('nonexistent')).toThrow('not found');
  });

  it('enforces member limit on invite', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams({ allianceType: 'MUTUAL_DEFENSE' }));
    const limit = MEMBER_LIMITS['MUTUAL_DEFENSE'];
    for (let i = 2; i <= limit; i++) {
      const inv = engine.invite(alliance.allianceId, 'dynasty-1', 'dynasty-' + String(i));
      engine.acceptInvite(inv.inviteId);
    }
    expect(() => engine.invite(alliance.allianceId, 'dynasty-1', 'dynasty-extra')).toThrow(
      'member limit',
    );
  });
});

describe('AllianceEngine -- ratification', () => {
  it('ratifies an alliance with enough members', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    const invite = engine.invite(alliance.allianceId, 'dynasty-1', 'dynasty-2');
    engine.acceptInvite(invite.inviteId);
    const ratified = engine.ratify(alliance.allianceId);
    expect(ratified.phase).toBe('ACTIVE');
    expect(ratified.ratifiedAt).toBeGreaterThan(0);
  });

  it('rejects ratification with insufficient members', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    expect(() => engine.ratify(alliance.allianceId)).toThrow(
      'at least ' + String(MIN_MEMBERS_TO_RATIFY),
    );
  });

  it('rejects ratification of non-FORMING alliance', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    const inv = engine.invite(alliance.allianceId, 'dynasty-1', 'dynasty-2');
    engine.acceptInvite(inv.inviteId);
    engine.ratify(alliance.allianceId);
    expect(() => engine.ratify(alliance.allianceId)).toThrow('not in FORMING phase');
  });
});

describe('AllianceEngine -- membership changes', () => {
  it('expels a member', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    const inv = engine.invite(alliance.allianceId, 'dynasty-1', 'dynasty-2');
    engine.acceptInvite(inv.inviteId);
    const updated = engine.expel(alliance.allianceId, 'dynasty-2');
    expect(updated.members).toHaveLength(1);
  });

  it('prevents expelling the founder', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    expect(() => engine.expel(alliance.allianceId, 'dynasty-1')).toThrow(
      'Cannot expel the founder',
    );
  });

  it('allows a member to leave', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    const inv = engine.invite(alliance.allianceId, 'dynasty-1', 'dynasty-2');
    engine.acceptInvite(inv.inviteId);
    const updated = engine.leave(alliance.allianceId, 'dynasty-2');
    expect(updated.members).toHaveLength(1);
  });

  it('prevents founder from leaving', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    expect(() => engine.leave(alliance.allianceId, 'dynasty-1')).toThrow('Founder cannot leave');
  });

  it('throws when leaving a non-member', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    expect(() => engine.leave(alliance.allianceId, 'outsider')).toThrow('not a member');
  });
});

describe('AllianceEngine -- dissolution', () => {
  it('dissolves an alliance', () => {
    const deps = makeDeps();
    const engine = createAllianceEngine(deps);
    const alliance = engine.create(makeParams());
    const dissolved = engine.dissolve(alliance.allianceId);
    expect(dissolved.phase).toBe('DISSOLVED');
    expect(dissolved.dissolvedAt).toBeGreaterThan(0);
  });

  it('throws when dissolving already dissolved', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    engine.dissolve(alliance.allianceId);
    expect(() => engine.dissolve(alliance.allianceId)).toThrow('is dissolved');
  });

  it('emits DISSOLVED events to all members', () => {
    const deps = makeDeps();
    const engine = createAllianceEngine(deps);
    const alliance = engine.create(makeParams());
    const inv = engine.invite(alliance.allianceId, 'dynasty-1', 'dynasty-2');
    engine.acceptInvite(inv.inviteId);
    deps.events.length = 0;
    engine.dissolve(alliance.allianceId);
    const dissolveEvents = deps.events.filter((e) => e.kind === 'DISSOLVED');
    expect(dissolveEvents).toHaveLength(2);
  });
});

describe('AllianceEngine -- treasury', () => {
  it('accepts contributions to treasury', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    const updated = engine.contribute({
      allianceId: alliance.allianceId,
      dynastyId: 'dynasty-1',
      amount: 500n,
    });
    expect(updated.treasury).toBe(500n);
    expect(updated.members[0]?.contributionTotal).toBe(500n);
  });

  it('rejects zero contributions', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    expect(() =>
      engine.contribute({ allianceId: alliance.allianceId, dynastyId: 'dynasty-1', amount: 0n }),
    ).toThrow('Contribution must be positive');
  });

  it('rejects contributions from non-members', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    expect(() =>
      engine.contribute({ allianceId: alliance.allianceId, dynastyId: 'outsider', amount: 100n }),
    ).toThrow('not a member');
  });
});

describe('AllianceEngine -- resource agreements', () => {
  it('sets a resource sharing agreement', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    const updated = engine.setResourceAgreement(alliance.allianceId, {
      resourceType: 'minerals',
      sharePercentage: 15,
    });
    expect(updated.resourceAgreements).toHaveLength(1);
    expect(updated.resourceAgreements[0]?.sharePercentage).toBe(15);
  });

  it('rejects invalid share percentage', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    expect(() =>
      engine.setResourceAgreement(alliance.allianceId, {
        resourceType: 'minerals',
        sharePercentage: 150,
      }),
    ).toThrow('between 0 and 100');
  });
});

describe('AllianceEngine -- queries', () => {
  it('gets alliance by id', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    const fetched = engine.getAlliance(alliance.allianceId);
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('Test Alliance');
  });

  it('returns undefined for unknown alliance', () => {
    const engine = createAllianceEngine(makeDeps());
    expect(engine.getAlliance('nonexistent')).toBeUndefined();
  });

  it('lists alliances by dynasty', () => {
    const engine = createAllianceEngine(makeDeps());
    engine.create(makeParams());
    engine.create(makeParams({ name: 'Second Alliance' }));
    const list = engine.listByDynasty('dynasty-1');
    expect(list).toHaveLength(2);
  });

  it('checks membership correctly', () => {
    const engine = createAllianceEngine(makeDeps());
    const alliance = engine.create(makeParams());
    expect(engine.isMember(alliance.allianceId, 'dynasty-1')).toBe(true);
    expect(engine.isMember(alliance.allianceId, 'outsider')).toBe(false);
  });

  it('reports correct stats', () => {
    const engine = createAllianceEngine(makeDeps());
    engine.create(makeParams());
    const alliance2 = engine.create(makeParams({ name: 'Second' }));
    engine.dissolve(alliance2.allianceId);
    const stats = engine.getStats();
    expect(stats.totalAlliances).toBe(2);
    expect(stats.activeAlliances).toBe(1);
    expect(stats.totalMembers).toBe(2);
  });
});

describe('AllianceEngine -- constants', () => {
  it('exports MEMBER_LIMITS with correct values', () => {
    expect(MEMBER_LIMITS['MUTUAL_DEFENSE']).toBe(5);
    expect(MEMBER_LIMITS['GRAND_ALLIANCE']).toBe(50);
    expect(MEMBER_LIMITS['TRADE_PACT']).toBe(10);
  });

  it('exports MIN_MEMBERS_TO_RATIFY', () => {
    expect(MIN_MEMBERS_TO_RATIFY).toBe(2);
  });
});
