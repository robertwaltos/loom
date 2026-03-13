/**
 * War Engine - Simulation Tests
 *
 * Covers war lifecycle transitions, peace negotiation,
 * betrayal penalties, territory events, ticking, and stats.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createWarEngine, type WarEngineDeps } from '../war-engine.js';

function makeHarness() {
  let nowUs = 1_000_000;
  let idCounter = 0;

  const allianceNotifications: Array<{ allianceId: string; kind: string }> = [];
  const dynastyNotifications: Array<{ dynastyId: string; kind: string }> = [];
  const penalties: Array<{ from: string; amount: bigint; reason: string }> = [];
  const reparations: Array<{ from: string; to: string; amount: bigint; reason: string }> = [];
  const declarations: string[] = [];
  const peaceTreaties: string[] = [];
  const betrayalRecords: string[] = [];

  const deps: WarEngineDeps = {
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: { generate: () => `war-${++idCounter}` },
    notifications: {
      notifyAlliance: (allianceId, event) => {
        allianceNotifications.push({ allianceId, kind: event.kind });
      },
      notifyDynasty: (dynastyId, event) => {
        dynastyNotifications.push({ dynastyId, kind: event.kind });
      },
    },
    kalon: {
      transferPenalty: (fromDynastyId, amount, reason) => {
        penalties.push({ from: fromDynastyId, amount, reason });
        return true;
      },
      transferReparations: (fromId, toId, amount, reason) => {
        reparations.push({ from: fromId, to: toId, amount, reason });
        return true;
      },
    },
    remembrance: {
      recordWarDeclaration: (war) => {
        declarations.push(war.warId);
      },
      recordPeaceTreaty: (war) => {
        peaceTreaties.push(war.warId);
      },
      recordBetrayalPenalty: (dynastyId) => {
        betrayalRecords.push(dynastyId);
      },
    },
  };

  const engine = createWarEngine(deps, {
    preparationDurationMs: 100,
    maxActivateWarsPerAlliance: 2,
    betrayalKalonPenaltyBase: 9_999n,
    betrayalReputationPenalty: 123,
    betrayalDiplomaticCooldownMs: 555,
  });

  return {
    engine,
    allianceNotifications,
    dynastyNotifications,
    penalties,
    reparations,
    declarations,
    peaceTreaties,
    betrayalRecords,
    setNowUs: (value: number) => {
      nowUs = value;
    },
    stepUs: (delta: number) => {
      nowUs += delta;
    },
  };
}

function makeWar(engine: ReturnType<typeof makeHarness>['engine']) {
  return engine.declareWar({
    attackerAllianceId: 'alliance-a',
    defenderAllianceId: 'alliance-b',
    casus_belli: 'Border raid',
    attackerDynasties: ['dyn-a1', 'dyn-a2'],
    defenderDynasties: ['dyn-b1'],
  });
}

describe('WarEngine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('declares war in PREPARING phase with participants and remembrance record', () => {
    const { engine, declarations, allianceNotifications } = makeHarness();

    const war = makeWar(engine);

    expect(war.phase).toBe('PREPARING');
    expect(war.participants).toHaveLength(3);
    expect(declarations).toContain(war.warId);
    expect(allianceNotifications.filter((n) => n.kind === 'WAR_DECLARED').length).toBe(2);
  });

  it('enforces max active wars per attacker alliance', () => {
    const { engine } = makeHarness();

    makeWar(engine);
    engine.declareWar({
      attackerAllianceId: 'alliance-a',
      defenderAllianceId: 'alliance-c',
      casus_belli: 'Trade dispute',
      attackerDynasties: ['dyn-a1'],
      defenderDynasties: ['dyn-c1'],
    });

    expect(() =>
      engine.declareWar({
        attackerAllianceId: 'alliance-a',
        defenderAllianceId: 'alliance-d',
        casus_belli: 'Third front',
        attackerDynasties: ['dyn-a1'],
        defenderDynasties: ['dyn-d1'],
      }),
    ).toThrow('exceeds max active wars');
  });

  it('starts combat from PREPARING and rejects invalid phase transitions', () => {
    const { engine } = makeHarness();
    const war = makeWar(engine);

    const started = engine.startCombat(war.warId);
    expect(started.phase).toBe('ACTIVE');
    expect(started.combatStartedAt).toBeGreaterThan(0);

    expect(() => engine.startCombat(war.warId)).toThrow('not in PREPARING phase');
  });

  it('calls and breaks ceasefire only in valid phases', () => {
    const { engine } = makeHarness();
    const war = makeWar(engine);
    engine.startCombat(war.warId);

    const cease = engine.callCeasefire(war.warId, 'alliance-a');
    expect(cease.phase).toBe('CEASEFIRE');

    const resumed = engine.breakCeasefire(war.warId, 'alliance-b');
    expect(resumed.phase).toBe('ACTIVE');

    expect(() => engine.breakCeasefire(war.warId, 'alliance-b')).toThrow('not in CEASEFIRE phase');
  });

  it('proposes peace from ACTIVE and rejects from invalid phases', () => {
    const { engine } = makeHarness();
    const war = makeWar(engine);

    expect(() =>
      engine.proposePeace({
        warId: war.warId,
        proposedBy: 'alliance-a',
        reparationsKalon: 1n,
        territoryConcessions: [],
        tradeRestrictions: [],
        demilitarisedZones: [],
        armisticeDurationMs: 10,
      }),
    ).toThrow('not in combat/ceasefire');

    engine.startCombat(war.warId);

    const proposed = engine.proposePeace({
      warId: war.warId,
      proposedBy: 'alliance-a',
      reparationsKalon: 10n,
      territoryConcessions: [],
      tradeRestrictions: [],
      demilitarisedZones: [],
      armisticeDurationMs: 10,
    });

    expect(proposed.phase).toBe('NEGOTIATING');
    expect(proposed.peaceTerms?.reparationsKalon).toBe(10n);
  });

  it('accepts peace, resolves war, applies reparations, and records treaty', () => {
    const { engine, reparations, peaceTreaties } = makeHarness();
    const war = makeWar(engine);
    engine.startCombat(war.warId);
    engine.proposePeace({
      warId: war.warId,
      proposedBy: 'alliance-a',
      reparationsKalon: 500n,
      territoryConcessions: [],
      tradeRestrictions: [],
      demilitarisedZones: [],
      armisticeDurationMs: 100,
    });

    const resolved = engine.acceptPeace(war.warId, 'alliance-b');

    expect(resolved.phase).toBe('RESOLVED');
    expect(resolved.peaceTerms?.acceptedAt).toBeGreaterThan(0);
    expect(reparations).toHaveLength(1);
    expect(reparations[0]?.amount).toBe(500n);
    expect(peaceTreaties).toContain(war.warId);
  });

  it('acceptPeace and rejectPeace enforce NEGOTIATING precondition', () => {
    const { engine } = makeHarness();
    const war = makeWar(engine);

    expect(() => engine.acceptPeace(war.warId, 'x')).toThrow('not in NEGOTIATING phase');
    expect(() => engine.rejectPeace(war.warId)).toThrow('not in NEGOTIATING phase');
  });

  it('rejects peace and returns war to ACTIVE state', () => {
    const { engine } = makeHarness();
    const war = makeWar(engine);
    engine.startCombat(war.warId);
    engine.proposePeace({
      warId: war.warId,
      proposedBy: 'alliance-b',
      reparationsKalon: 0n,
      territoryConcessions: [],
      tradeRestrictions: [],
      demilitarisedZones: [],
      armisticeDurationMs: 1,
    });

    const rejected = engine.rejectPeace(war.warId);
    expect(rejected.phase).toBe('ACTIVE');
    expect(rejected.peaceTerms).toBeNull();
  });

  it('records territory captures for valid participants only', () => {
    const { engine } = makeHarness();
    const war = makeWar(engine);

    const updated = engine.recordTerritoryCaptured(war.warId, 'dyn-a1', 'territory-7');
    const participant = updated.participants.find((p) => p.dynastyId === 'dyn-a1');
    expect(participant?.territoriesCaptured).toBe(1);

    expect(() => engine.recordTerritoryCaptured(war.warId, 'unknown-dyn', 'territory-1')).toThrow('not in war');
  });

  it('processes betrayal penalties using configured values and remembrance hook', () => {
    const { engine, penalties, betrayalRecords } = makeHarness();

    const penalty = engine.processBetrayal('dyn-traitor', 'treaty-1');

    expect(penalty.kalonPenalty).toBe(9_999n);
    expect(penalty.reputationPenalty).toBe(123);
    expect(penalty.diplomaticCooldownMs).toBe(555);
    expect(penalties).toHaveLength(1);
    expect(betrayalRecords).toContain('dyn-traitor');
  });

  it('getWar returns undefined for unknown ids', () => {
    const { engine } = makeHarness();
    expect(engine.getWar('missing')).toBeUndefined();
  });

  it('getActiveWars indexes by alliance and excludes resolved wars', () => {
    const { engine } = makeHarness();
    const war = makeWar(engine);

    expect(engine.getActiveWars('alliance-a')).toHaveLength(1);

    engine.startCombat(war.warId);
    engine.proposePeace({
      warId: war.warId,
      proposedBy: 'alliance-a',
      reparationsKalon: 0n,
      territoryConcessions: [],
      tradeRestrictions: [],
      demilitarisedZones: [],
      armisticeDurationMs: 1,
    });
    engine.acceptPeace(war.warId, 'alliance-b');

    expect(engine.getActiveWars('alliance-a')).toHaveLength(0);
  });

  it('tick auto-starts combat when preparation timer expires', () => {
    const { engine, setNowUs } = makeHarness();
    const war = makeWar(engine);

    // preparationEndsAt is based on ms; convert to microseconds threshold crossing.
    setNowUs((war.preparationEndsAt + 1) * 1_000);
    engine.tick();

    const updated = engine.getWar(war.warId);
    expect(updated?.phase).toBe('ACTIVE');
    expect(updated?.events.some((event) => event.kind === 'COMBAT_STARTED')).toBe(true);
  });

  it('throws on operations for missing war ids', () => {
    const { engine } = makeHarness();

    expect(() => engine.startCombat('missing')).toThrow('War missing not found');
    expect(() => engine.callCeasefire('missing', 'x')).toThrow('War missing not found');
    expect(() => engine.breakCeasefire('missing', 'x')).toThrow('War missing not found');
    expect(() =>
      engine.proposePeace({
        warId: 'missing',
        proposedBy: 'x',
        reparationsKalon: 0n,
        territoryConcessions: [],
        tradeRestrictions: [],
        demilitarisedZones: [],
        armisticeDurationMs: 1,
      }),
    ).toThrow('War missing not found');
  });

  it('aggregates stats for wars, resolutions, betrayals, and reparations', () => {
    const { engine } = makeHarness();

    const war1 = makeWar(engine);
    const war2 = engine.declareWar({
      attackerAllianceId: 'alliance-c',
      defenderAllianceId: 'alliance-d',
      casus_belli: 'Resource theft',
      attackerDynasties: ['dyn-c1'],
      defenderDynasties: ['dyn-d1'],
    });

    engine.startCombat(war1.warId);
    engine.proposePeace({
      warId: war1.warId,
      proposedBy: 'alliance-a',
      reparationsKalon: 111n,
      territoryConcessions: [],
      tradeRestrictions: [],
      demilitarisedZones: [],
      armisticeDurationMs: 5,
    });
    engine.acceptPeace(war1.warId, 'alliance-b');

    engine.processBetrayal('dyn-c1', 't-2');

    const stats = engine.getStats();
    expect(stats.totalWars).toBe(2);
    expect(stats.resolvedWars).toBe(1);
    expect(stats.activeWars).toBe(1);
    expect(stats.totalBetrayals).toBe(1);
    expect(stats.totalReparationsPaid).toBe(111n);

    // ensure war2 still active
    expect(engine.getWar(war2.warId)?.phase).toBe('PREPARING');
  });
});
