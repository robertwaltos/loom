import { beforeEach, describe, expect, it } from 'vitest';
import { createAllianceEngine, type AllianceEngineDeps } from '../alliance-engine.js';

describe('alliance-engine simulation', () => {
  let nowUs: number;
  let idCounter: number;
  let events: Array<{ kind: string; allianceId: string; dynastyId: string; timestamp: number }>;

  const deps = (): AllianceEngineDeps => ({
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: {
      generate: () => {
        idCounter += 1;
        return `sim-alliance-${idCounter}`;
      },
    },
    notifications: {
      notify: (_dynastyId, event) => {
        events.push(event);
      },
    },
  });

  beforeEach(() => {
    nowUs = 3_000_000;
    idCounter = 0;
    events = [];
  });

  it('runs full alliance lifecycle from forming to dissolved with timeline ordering', () => {
    const engine = createAllianceEngine(deps());

    const alliance = engine.create({
      name: 'Concord of Ash',
      allianceType: 'MUTUAL_DEFENSE',
      founderId: 'dawn',
      charter: 'Mutual defense and shared watchtowers.',
    });

    const invite = engine.invite(alliance.allianceId, 'dawn', 'ember');
    const joined = engine.acceptInvite(invite.inviteId);

    nowUs += 10;
    const ratified = engine.ratify(alliance.allianceId);
    nowUs += 10;
    const dissolved = engine.dissolve(alliance.allianceId);

    expect(joined.members).toHaveLength(2);
    expect(ratified.phase).toBe('ACTIVE');
    expect(ratified.ratifiedAt).toBeGreaterThan(alliance.createdAt);
    expect(dissolved.phase).toBe('DISSOLVED');
    expect(dissolved.dissolvedAt).toBeGreaterThan(ratified.ratifiedAt);

    const stats = engine.getStats();
    expect(stats.totalAlliances).toBe(1);
    expect(stats.activeAlliances).toBe(0);
  });

  it('handles mixed invite outcomes and emits expected event mix', () => {
    const engine = createAllianceEngine(deps());
    const alliance = engine.create({
      name: 'Ledger Circle',
      allianceType: 'TRADE_PACT',
      founderId: 'atlas',
      charter: 'Shared routes and market rights.',
    });

    const acceptedInvite = engine.invite(alliance.allianceId, 'atlas', 'briar');
    const rejectedInvite = engine.invite(alliance.allianceId, 'atlas', 'cinder');

    engine.acceptInvite(acceptedInvite.inviteId);
    engine.rejectInvite(rejectedInvite.inviteId);

    const memberIds = engine.getAlliance(alliance.allianceId)?.members.map((m) => m.dynastyId).sort();
    expect(memberIds).toEqual(['atlas', 'briar']);

    const invitedEvents = events.filter((e) => e.kind === 'INVITED');
    const joinedEvents = events.filter((e) => e.kind === 'JOINED');
    expect(invitedEvents).toHaveLength(2);
    expect(joinedEvents).toHaveLength(1);
    expect(joinedEvents[0].dynastyId).toBe('briar');
  });

  it('enforces ratification floor and then allows activation after second member joins', () => {
    const engine = createAllianceEngine(deps());
    const alliance = engine.create({
      name: 'Signal Pact',
      allianceType: 'RESEARCH_COALITION',
      founderId: 'frost',
      charter: 'Shared observatories and archives.',
    });

    expect(() => engine.ratify(alliance.allianceId)).toThrow('Need at least 2 members to ratify');

    const invite = engine.invite(alliance.allianceId, 'frost', 'gale');
    engine.acceptInvite(invite.inviteId);

    const active = engine.ratify(alliance.allianceId);
    expect(active.phase).toBe('ACTIVE');
  });

  it('tracks treasury and per-member contribution totals across multiple deposits', () => {
    const engine = createAllianceEngine(deps());
    const alliance = engine.create({
      name: 'Harbor Syndicate',
      allianceType: 'TRADE_PACT',
      founderId: 'iris',
      charter: 'Joint maritime logistics.',
    });

    const invite = engine.invite(alliance.allianceId, 'iris', 'jade');
    engine.acceptInvite(invite.inviteId);

    engine.contribute({ allianceId: alliance.allianceId, dynastyId: 'iris', amount: 500n });
    const afterSecond = engine.contribute({ allianceId: alliance.allianceId, dynastyId: 'jade', amount: 250n });

    const iris = afterSecond.members.find((m) => m.dynastyId === 'iris');
    const jade = afterSecond.members.find((m) => m.dynastyId === 'jade');

    expect(afterSecond.treasury).toBe(750n);
    expect(iris?.contributionTotal).toBe(500n);
    expect(jade?.contributionTotal).toBe(250n);
  });

  it('keeps membership indexes isolated across concurrent alliances', () => {
    const engine = createAllianceEngine(deps());

    const north = engine.create({
      name: 'North Chain',
      allianceType: 'MUTUAL_DEFENSE',
      founderId: 'kite',
      charter: 'Northern border coordination.',
    });

    const south = engine.create({
      name: 'South Chain',
      allianceType: 'MUTUAL_DEFENSE',
      founderId: 'lumen',
      charter: 'Southern gate protocol.',
    });

    const invite = engine.invite(north.allianceId, 'kite', 'morrow');
    engine.acceptInvite(invite.inviteId);

    const morrowAlliances = engine.listByDynasty('morrow').map((a) => a.allianceId);
    const lumenAlliances = engine.listByDynasty('lumen').map((a) => a.allianceId);

    expect(morrowAlliances).toEqual([north.allianceId]);
    expect(lumenAlliances).toEqual([south.allianceId]);
    expect(engine.isMember(south.allianceId, 'morrow')).toBe(false);
  });

  it('prevents post-dissolution mutations on invites and contributions', () => {
    const engine = createAllianceEngine(deps());
    const alliance = engine.create({
      name: 'Archive Keepers',
      allianceType: 'RESEARCH_COALITION',
      founderId: 'nova',
      charter: 'Preserve and circulate records.',
    });

    engine.dissolve(alliance.allianceId);

    expect(() => engine.invite(alliance.allianceId, 'nova', 'opal')).toThrow(
      `Alliance ${alliance.allianceId} is dissolved`,
    );

    expect(() =>
      engine.contribute({ allianceId: alliance.allianceId, dynastyId: 'nova', amount: 10n }),
    ).toThrow(`Alliance ${alliance.allianceId} is dissolved`);
  });

  it('applies resource agreements as upserts keyed by resource type', () => {
    const engine = createAllianceEngine(deps());
    const alliance = engine.create({
      name: 'Ore Compact',
      allianceType: 'TRADE_PACT',
      founderId: 'quill',
      charter: 'Resource balancing for frontier worlds.',
    });

    engine.setResourceAgreement(alliance.allianceId, { resourceType: 'iron', sharePercentage: 15 });
    const updated = engine.setResourceAgreement(alliance.allianceId, {
      resourceType: 'iron',
      sharePercentage: 30,
    });

    expect(updated.resourceAgreements).toHaveLength(1);
    expect(updated.resourceAgreements[0]).toEqual({ resourceType: 'iron', sharePercentage: 30 });
  });

  it('enforces member cap in mutual-defense alliances through invite acceptance', () => {
    const engine = createAllianceEngine(deps());
    const alliance = engine.create({
      name: 'Fivefold Shield',
      allianceType: 'MUTUAL_DEFENSE',
      founderId: 'rune',
      charter: 'Shared military warning system.',
    });

    const joiners = ['sable', 'thorn', 'umber', 'vale'];
    for (const dynastyId of joiners) {
      const inv = engine.invite(alliance.allianceId, 'rune', dynastyId);
      engine.acceptInvite(inv.inviteId);
    }

    expect(engine.getAlliance(alliance.allianceId)?.members).toHaveLength(5);
    expect(() => engine.invite(alliance.allianceId, 'rune', 'wisp')).toThrow(
      'Alliance has reached member limit',
    );
  });

  it('updates dynasty index correctly after leave and expel transitions', () => {
    const engine = createAllianceEngine(deps());
    const alliance = engine.create({
      name: 'Transit League',
      allianceType: 'POLITICAL_BLOC',
      founderId: 'xeno',
      charter: 'Road and gate standards.',
    });

    const a = engine.invite(alliance.allianceId, 'xeno', 'yarrow');
    const b = engine.invite(alliance.allianceId, 'xeno', 'zephyr');
    engine.acceptInvite(a.inviteId);
    engine.acceptInvite(b.inviteId);

    engine.leave(alliance.allianceId, 'yarrow');
    engine.expel(alliance.allianceId, 'zephyr');

    expect(engine.listByDynasty('yarrow')).toHaveLength(0);
    expect(engine.listByDynasty('zephyr')).toHaveLength(0);
    expect(engine.isMember(alliance.allianceId, 'xeno')).toBe(true);
  });

  it('allocates deterministic ids for alliances and invites in creation order', () => {
    const engine = createAllianceEngine(deps());

    const alpha = engine.create({
      name: 'Alpha',
      allianceType: 'TRADE_PACT',
      founderId: 'd1',
      charter: 'Charter A',
    });

    const beta = engine.create({
      name: 'Beta',
      allianceType: 'TRADE_PACT',
      founderId: 'd2',
      charter: 'Charter B',
    });

    const invite = engine.invite(alpha.allianceId, 'd1', 'd3');

    expect(alpha.allianceId).toBe('sim-alliance-1');
    expect(beta.allianceId).toBe('sim-alliance-2');
    expect(invite.inviteId).toBe('sim-alliance-3');
  });
});
