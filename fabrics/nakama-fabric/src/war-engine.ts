/**
 * War & Peace Engine — Formal conflict resolution protocol.
 *
 * Manages the full lifecycle of inter-dynasty/alliance warfare:
 *   DECLARED      → Attacker formally declares war (with stated reason)
 *   PREPARING     → 24-hour preparation window (no combat allowed)
 *   ACTIVE        → Combat rules in effect
 *   CEASEFIRE     → Temporary pause, negotiation window
 *   NEGOTIATING   → Peace terms under discussion
 *   RESOLVED      → War concluded, reparations/concessions applied
 *
 * Integrates with Remembrance — all wars and peace treaties become
 * permanent historical records.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface WarClockPort {
  readonly nowMicroseconds: () => number;
}

export interface WarIdGeneratorPort {
  readonly generate: () => string;
}

export interface WarNotificationPort {
  readonly notifyAlliance: (allianceId: string, event: WarEvent) => void;
  readonly notifyDynasty: (dynastyId: string, event: WarEvent) => void;
}

export interface WarKalonPort {
  readonly transferPenalty: (fromDynastyId: string, amount: bigint, reason: string) => boolean;
  readonly transferReparations: (
    fromId: string,
    toId: string,
    amount: bigint,
    reason: string,
  ) => boolean;
}

export interface WarRemembrancePort {
  readonly recordWarDeclaration: (war: WarRecord) => void;
  readonly recordPeaceTreaty: (war: WarRecord, terms: PeaceTerms) => void;
  readonly recordBetrayalPenalty: (dynastyId: string, penalty: BetrayalPenalty) => void;
}

// ── Types ────────────────────────────────────────────────────────

export type WarPhase =
  | 'DECLARED'
  | 'PREPARING'
  | 'ACTIVE'
  | 'CEASEFIRE'
  | 'NEGOTIATING'
  | 'RESOLVED'
  | 'ABANDONED';

export type WarParticipantSide = 'attacker' | 'defender';

export type WarEventKind =
  | 'WAR_DECLARED'
  | 'PREPARATION_STARTED'
  | 'COMBAT_STARTED'
  | 'CEASEFIRE_CALLED'
  | 'CEASEFIRE_BROKEN'
  | 'PEACE_PROPOSED'
  | 'PEACE_ACCEPTED'
  | 'PEACE_REJECTED'
  | 'TERRITORY_CAPTURED'
  | 'BETRAYAL_DETECTED';

export interface WarEvent {
  readonly kind: WarEventKind;
  readonly warId: string;
  readonly timestamp: number;
  readonly details: Readonly<Record<string, unknown>>;
}

export interface WarParticipant {
  readonly dynastyId: string;
  readonly side: WarParticipantSide;
  readonly joinedAt: number;
  readonly casualtyScore: number;
  readonly territoriesCaptured: number;
}

export interface WarRecord {
  readonly warId: string;
  readonly phase: WarPhase;
  readonly attackerAllianceId: string;
  readonly defenderAllianceId: string;
  readonly casus_belli: string;
  readonly declaredAt: number;
  readonly preparationEndsAt: number;
  readonly combatStartedAt: number;
  readonly resolvedAt: number;
  readonly participants: ReadonlyArray<WarParticipant>;
  readonly events: ReadonlyArray<WarEvent>;
  readonly peaceTerms: PeaceTerms | null;
}

export interface PeaceTerms {
  readonly proposedBy: string;
  readonly reparationsKalon: bigint;
  readonly territoryConcessions: ReadonlyArray<TerritoryConcession>;
  readonly tradeRestrictions: ReadonlyArray<TradeRestriction>;
  readonly demilitarisedZones: ReadonlyArray<string>;
  readonly armisticeDurationMs: number;
  readonly proposedAt: number;
  readonly acceptedAt: number;
}

export interface TerritoryConcession {
  readonly territoryId: string;
  readonly fromDynastyId: string;
  readonly toDynastyId: string;
}

export interface TradeRestriction {
  readonly resourceType: string;
  readonly restrictionType: 'embargo' | 'tariff' | 'quota';
  readonly value: number;
  readonly durationMs: number;
}

export interface BetrayalPenalty {
  readonly dynastyId: string;
  readonly brokenTreatyId: string;
  readonly kalonPenalty: bigint;
  readonly reputationPenalty: number;
  readonly diplomaticCooldownMs: number;
  readonly timestamp: number;
}

// ── Declare War Params ───────────────────────────────────────────

export interface DeclareWarParams {
  readonly attackerAllianceId: string;
  readonly defenderAllianceId: string;
  readonly casus_belli: string;
  readonly attackerDynasties: ReadonlyArray<string>;
  readonly defenderDynasties: ReadonlyArray<string>;
}

export interface ProposePeaceParams {
  readonly warId: string;
  readonly proposedBy: string;
  readonly reparationsKalon: bigint;
  readonly territoryConcessions: ReadonlyArray<TerritoryConcession>;
  readonly tradeRestrictions: ReadonlyArray<TradeRestriction>;
  readonly demilitarisedZones: ReadonlyArray<string>;
  readonly armisticeDurationMs: number;
}

// ── Config ───────────────────────────────────────────────────────

export interface WarEngineConfig {
  readonly preparationDurationMs: number;
  readonly ceasefireMaxDurationMs: number;
  readonly betrayalKalonPenaltyBase: bigint;
  readonly betrayalReputationPenalty: number;
  readonly betrayalDiplomaticCooldownMs: number;
  readonly maxActivateWarsPerAlliance: number;
}

const DEFAULT_CONFIG: WarEngineConfig = {
  preparationDurationMs: 24 * 60 * 60 * 1_000,
  ceasefireMaxDurationMs: 7 * 24 * 60 * 60 * 1_000,
  betrayalKalonPenaltyBase: 50_000n,
  betrayalReputationPenalty: 200,
  betrayalDiplomaticCooldownMs: 30 * 24 * 60 * 60 * 1_000,
  maxActivateWarsPerAlliance: 3,
};

// ── Stats ────────────────────────────────────────────────────────

export interface WarEngineStats {
  readonly totalWars: number;
  readonly activeWars: number;
  readonly resolvedWars: number;
  readonly totalBetrayals: number;
  readonly totalReparationsPaid: bigint;
}

// ── Public API ───────────────────────────────────────────────────

export interface WarEngine {
  readonly declareWar: (params: DeclareWarParams) => WarRecord;
  readonly startCombat: (warId: string) => WarRecord;
  readonly callCeasefire: (warId: string, calledBy: string) => WarRecord;
  readonly breakCeasefire: (warId: string, brokenBy: string) => WarRecord;
  readonly proposePeace: (params: ProposePeaceParams) => WarRecord;
  readonly acceptPeace: (warId: string, acceptedBy: string) => WarRecord;
  readonly rejectPeace: (warId: string) => WarRecord;
  readonly recordTerritoryCaptured: (
    warId: string,
    dynastyId: string,
    territoryId: string,
  ) => WarRecord;
  readonly processBetrayal: (
    dynastyId: string,
    brokenTreatyId: string,
  ) => BetrayalPenalty;
  readonly getWar: (warId: string) => WarRecord | undefined;
  readonly getActiveWars: (allianceId: string) => ReadonlyArray<WarRecord>;
  readonly tick: () => void;
  readonly getStats: () => WarEngineStats;
}

// ── Deps ─────────────────────────────────────────────────────────

export interface WarEngineDeps {
  readonly clock: WarClockPort;
  readonly idGenerator: WarIdGeneratorPort;
  readonly notifications: WarNotificationPort;
  readonly kalon: WarKalonPort;
  readonly remembrance: WarRemembrancePort;
}

// ── Mutable State ────────────────────────────────────────────────

interface MutableWar {
  readonly warId: string;
  phase: WarPhase;
  readonly attackerAllianceId: string;
  readonly defenderAllianceId: string;
  readonly casus_belli: string;
  readonly declaredAt: number;
  preparationEndsAt: number;
  combatStartedAt: number;
  resolvedAt: number;
  readonly participants: Map<string, MutableParticipant>;
  readonly events: WarEvent[];
  peaceTerms: MutablePeaceTerms | null;
}

interface MutableParticipant {
  readonly dynastyId: string;
  readonly side: WarParticipantSide;
  readonly joinedAt: number;
  casualtyScore: number;
  territoriesCaptured: number;
}

interface MutablePeaceTerms {
  readonly proposedBy: string;
  readonly reparationsKalon: bigint;
  readonly territoryConcessions: ReadonlyArray<TerritoryConcession>;
  readonly tradeRestrictions: ReadonlyArray<TradeRestriction>;
  readonly demilitarisedZones: ReadonlyArray<string>;
  readonly armisticeDurationMs: number;
  readonly proposedAt: number;
  acceptedAt: number;
}

// ── Factory ──────────────────────────────────────────────────────

export function createWarEngine(
  deps: WarEngineDeps,
  config?: Partial<WarEngineConfig>,
): WarEngine {
  const cfg: WarEngineConfig = { ...DEFAULT_CONFIG, ...config };
  const wars = new Map<string, MutableWar>();
  const allianceWars = new Map<string, Set<string>>();
  let totalBetrayals = 0;
  let totalReparationsPaid = 0n;

  function addWarToIndex(allianceId: string, warId: string): void {
    let set = allianceWars.get(allianceId);
    if (!set) {
      set = new Set();
      allianceWars.set(allianceId, set);
    }
    set.add(warId);
  }

  function emitEvent(war: MutableWar, kind: WarEventKind, details: Readonly<Record<string, unknown>>): void {
    const event: WarEvent = {
      kind,
      warId: war.warId,
      timestamp: deps.clock.nowMicroseconds(),
      details,
    };
    war.events.push(event);
    deps.notifications.notifyAlliance(war.attackerAllianceId, event);
    deps.notifications.notifyAlliance(war.defenderAllianceId, event);
  }

  function requireWar(warId: string): MutableWar {
    const w = wars.get(warId);
    if (!w) throw new Error(`War ${warId} not found`);
    return w;
  }

  function declareWar(params: DeclareWarParams): WarRecord {
    const activeCount = getActiveWars(params.attackerAllianceId).length;
    if (activeCount >= cfg.maxActivateWarsPerAlliance) {
      throw new Error(`Alliance ${params.attackerAllianceId} exceeds max active wars (${cfg.maxActivateWarsPerAlliance})`);
    }

    const now = deps.clock.nowMicroseconds();
    const nowMs = now / 1_000;
    const warId = deps.idGenerator.generate();

    const participants = new Map<string, MutableParticipant>();
    for (const dId of params.attackerDynasties) {
      participants.set(dId, {
        dynastyId: dId,
        side: 'attacker',
        joinedAt: now,
        casualtyScore: 0,
        territoriesCaptured: 0,
      });
    }
    for (const dId of params.defenderDynasties) {
      participants.set(dId, {
        dynastyId: dId,
        side: 'defender',
        joinedAt: now,
        casualtyScore: 0,
        territoriesCaptured: 0,
      });
    }

    const war: MutableWar = {
      warId,
      phase: 'PREPARING',
      attackerAllianceId: params.attackerAllianceId,
      defenderAllianceId: params.defenderAllianceId,
      casus_belli: params.casus_belli,
      declaredAt: now,
      preparationEndsAt: nowMs + cfg.preparationDurationMs,
      combatStartedAt: 0,
      resolvedAt: 0,
      participants,
      events: [],
      peaceTerms: null,
    };

    wars.set(warId, war);
    addWarToIndex(params.attackerAllianceId, warId);
    addWarToIndex(params.defenderAllianceId, warId);

    emitEvent(war, 'WAR_DECLARED', { casus_belli: params.casus_belli });
    deps.remembrance.recordWarDeclaration(warToReadonly(war));

    return warToReadonly(war);
  }

  function startCombat(warId: string): WarRecord {
    const war = requireWar(warId);
    if (war.phase !== 'PREPARING') {
      throw new Error(`War ${warId} not in PREPARING phase`);
    }
    war.phase = 'ACTIVE';
    war.combatStartedAt = deps.clock.nowMicroseconds();
    emitEvent(war, 'COMBAT_STARTED', {});
    return warToReadonly(war);
  }

  function callCeasefire(warId: string, calledBy: string): WarRecord {
    const war = requireWar(warId);
    if (war.phase !== 'ACTIVE') {
      throw new Error(`War ${warId} not in ACTIVE phase`);
    }
    war.phase = 'CEASEFIRE';
    emitEvent(war, 'CEASEFIRE_CALLED', { calledBy });
    return warToReadonly(war);
  }

  function breakCeasefire(warId: string, brokenBy: string): WarRecord {
    const war = requireWar(warId);
    if (war.phase !== 'CEASEFIRE') {
      throw new Error(`War ${warId} not in CEASEFIRE phase`);
    }
    war.phase = 'ACTIVE';
    emitEvent(war, 'CEASEFIRE_BROKEN', { brokenBy });
    return warToReadonly(war);
  }

  function proposePeace(params: ProposePeaceParams): WarRecord {
    const war = requireWar(params.warId);
    if (war.phase !== 'ACTIVE' && war.phase !== 'CEASEFIRE') {
      throw new Error(`War ${params.warId} not in combat/ceasefire`);
    }
    war.phase = 'NEGOTIATING';
    war.peaceTerms = {
      proposedBy: params.proposedBy,
      reparationsKalon: params.reparationsKalon,
      territoryConcessions: params.territoryConcessions,
      tradeRestrictions: params.tradeRestrictions,
      demilitarisedZones: params.demilitarisedZones,
      armisticeDurationMs: params.armisticeDurationMs,
      proposedAt: deps.clock.nowMicroseconds(),
      acceptedAt: 0,
    };
    emitEvent(war, 'PEACE_PROPOSED', { proposedBy: params.proposedBy });
    return warToReadonly(war);
  }

  function acceptPeace(warId: string, acceptedBy: string): WarRecord {
    const war = requireWar(warId);
    if (war.phase !== 'NEGOTIATING' || !war.peaceTerms) {
      throw new Error(`War ${warId} not in NEGOTIATING phase`);
    }

    war.peaceTerms.acceptedAt = deps.clock.nowMicroseconds();
    war.phase = 'RESOLVED';
    war.resolvedAt = deps.clock.nowMicroseconds();

    // Apply reparations
    if (war.peaceTerms.reparationsKalon > 0n) {
      const losingSide = war.peaceTerms.proposedBy === war.attackerAllianceId
        ? war.defenderAllianceId
        : war.attackerAllianceId;
      deps.kalon.transferReparations(
        losingSide,
        war.peaceTerms.proposedBy,
        war.peaceTerms.reparationsKalon,
        `War reparations: ${warId}`,
      );
      totalReparationsPaid += war.peaceTerms.reparationsKalon;
    }

    emitEvent(war, 'PEACE_ACCEPTED', { acceptedBy });
    deps.remembrance.recordPeaceTreaty(warToReadonly(war), peaceToCast(war.peaceTerms));
    return warToReadonly(war);
  }

  function rejectPeace(warId: string): WarRecord {
    const war = requireWar(warId);
    if (war.phase !== 'NEGOTIATING') {
      throw new Error(`War ${warId} not in NEGOTIATING phase`);
    }
    war.phase = 'ACTIVE';
    war.peaceTerms = null;
    emitEvent(war, 'PEACE_REJECTED', {});
    return warToReadonly(war);
  }

  function recordTerritoryCaptured(
    warId: string,
    dynastyId: string,
    territoryId: string,
  ): WarRecord {
    const war = requireWar(warId);
    const participant = war.participants.get(dynastyId);
    if (!participant) throw new Error(`Dynasty ${dynastyId} not in war ${warId}`);
    participant.territoriesCaptured++;
    emitEvent(war, 'TERRITORY_CAPTURED', { dynastyId, territoryId });
    return warToReadonly(war);
  }

  function processBetrayal(
    dynastyId: string,
    brokenTreatyId: string,
  ): BetrayalPenalty {
    const penalty: BetrayalPenalty = {
      dynastyId,
      brokenTreatyId,
      kalonPenalty: cfg.betrayalKalonPenaltyBase,
      reputationPenalty: cfg.betrayalReputationPenalty,
      diplomaticCooldownMs: cfg.betrayalDiplomaticCooldownMs,
      timestamp: deps.clock.nowMicroseconds(),
    };

    deps.kalon.transferPenalty(
      dynastyId,
      cfg.betrayalKalonPenaltyBase,
      `Treaty betrayal penalty: ${brokenTreatyId}`,
    );
    deps.remembrance.recordBetrayalPenalty(dynastyId, penalty);
    totalBetrayals++;
    return penalty;
  }

  function getWar(warId: string): WarRecord | undefined {
    const war = wars.get(warId);
    return war ? warToReadonly(war) : undefined;
  }

  function getActiveWars(allianceId: string): ReadonlyArray<WarRecord> {
    const ids = allianceWars.get(allianceId);
    if (!ids) return [];
    const result: WarRecord[] = [];
    for (const id of ids) {
      const war = wars.get(id);
      if (war && war.phase !== 'RESOLVED' && war.phase !== 'ABANDONED') {
        result.push(warToReadonly(war));
      }
    }
    return result;
  }

  function tick(): void {
    const now = deps.clock.nowMicroseconds();
    const nowMs = now / 1_000;

    for (const war of wars.values()) {
      if (war.phase === 'PREPARING' && nowMs >= war.preparationEndsAt) {
        war.phase = 'ACTIVE';
        war.combatStartedAt = now;
        emitEvent(war, 'COMBAT_STARTED', { automatic: true });
      }
    }
  }

  function getStats(): WarEngineStats {
    let activeWars = 0;
    let resolvedWars = 0;
    for (const war of wars.values()) {
      if (war.phase === 'RESOLVED') resolvedWars++;
      else if (war.phase !== 'ABANDONED') activeWars++;
    }
    return {
      totalWars: wars.size,
      activeWars,
      resolvedWars,
      totalBetrayals,
      totalReparationsPaid,
    };
  }

  return {
    declareWar,
    startCombat,
    callCeasefire,
    breakCeasefire,
    proposePeace,
    acceptPeace,
    rejectPeace,
    recordTerritoryCaptured,
    processBetrayal,
    getWar,
    getActiveWars,
    tick,
    getStats,
  };
}

// ── Helpers ──────────────────────────────────────────────────────

function warToReadonly(war: MutableWar): WarRecord {
  const participants: WarParticipant[] = [];
  for (const p of war.participants.values()) {
    participants.push({
      dynastyId: p.dynastyId,
      side: p.side,
      joinedAt: p.joinedAt,
      casualtyScore: p.casualtyScore,
      territoriesCaptured: p.territoriesCaptured,
    });
  }
  return {
    warId: war.warId,
    phase: war.phase,
    attackerAllianceId: war.attackerAllianceId,
    defenderAllianceId: war.defenderAllianceId,
    casus_belli: war.casus_belli,
    declaredAt: war.declaredAt,
    preparationEndsAt: war.preparationEndsAt,
    combatStartedAt: war.combatStartedAt,
    resolvedAt: war.resolvedAt,
    participants,
    events: [...war.events],
    peaceTerms: war.peaceTerms ? peaceToCast(war.peaceTerms) : null,
  };
}

function peaceToCast(terms: MutablePeaceTerms): PeaceTerms {
  return {
    proposedBy: terms.proposedBy,
    reparationsKalon: terms.reparationsKalon,
    territoryConcessions: terms.territoryConcessions,
    tradeRestrictions: terms.tradeRestrictions,
    demilitarisedZones: terms.demilitarisedZones,
    armisticeDurationMs: terms.armisticeDurationMs,
    proposedAt: terms.proposedAt,
    acceptedAt: terms.acceptedAt,
  };
}
