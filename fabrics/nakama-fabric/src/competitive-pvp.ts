/**
 * Competitive PvP Engine — Ranked, arenas, territory, siege warfare.
 *
 *   - ELO-based matchmaking with seasonal resets and division tiers
 *   - Arena system: 1v1, 2v2, 5v5, dynasty vs dynasty instanced combat
 *   - Territory control: weekly capture cycles for world zones
 *   - Siege warfare: 48h preparation, timed battles
 *   - War economy: supply chains, mercenary contracts, war bonds
 *   - Ceasefire enforcement: mechanical penalties
 *   - Combat replay: store and replay fights
 *   - Anti-smurfing: skill-based detection for new accounts
 *
 * "In the arena, KALON means nothing. Only skill endures."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface PvpClockPort {
  readonly now: () => bigint;
}

export interface PvpIdPort {
  readonly next: () => string;
}

export interface PvpLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface PvpEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface MatchmakingPort {
  readonly findOpponents: (playerId: string, mode: ArenaMode, eloRange: number) => Promise<readonly string[]>;
  readonly getPlayerElo: (playerId: string) => Promise<number>;
  readonly savePlayerElo: (playerId: string, elo: number) => Promise<void>;
}

export interface TerritoryStorePort {
  readonly getZone: (zoneId: string) => Promise<TerritoryZone | undefined>;
  readonly saveZone: (zone: TerritoryZone) => Promise<void>;
  readonly getWorldZones: (worldId: string) => Promise<readonly TerritoryZone[]>;
}

export interface ReplayStorePort {
  readonly saveReplay: (replay: CombatReplay) => Promise<void>;
  readonly getReplay: (replayId: string) => Promise<CombatReplay | undefined>;
  readonly getPlayerReplays: (playerId: string, limit: number) => Promise<readonly CombatReplay[]>;
}

// ─── Types ──────────────────────────────────────────────────────────

export type ArenaMode = '1v1' | '2v2' | '5v5' | 'dynasty-war';

export type DivisionTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'champion'
  | 'legend';

export type TerritoryStatus = 'neutral' | 'contested' | 'controlled' | 'fortified';

export type SiegeDeclarationPhase = 'declared' | 'preparing' | 'active' | 'resolved';

export type CeasefireViolationType = 'attack-during-peace' | 'supply-route-sabotage' | 'spy-activity';

export interface RankedProfile {
  readonly playerId: string;
  readonly elo: number;
  readonly division: DivisionTier;
  readonly wins: number;
  readonly losses: number;
  readonly streak: number;
  readonly peakElo: number;
  readonly seasonId: string;
  readonly matchesPlayed: number;
  readonly lastMatchAt: bigint;
}

export interface ArenaMatch {
  readonly matchId: string;
  readonly mode: ArenaMode;
  readonly teamA: readonly string[];
  readonly teamB: readonly string[];
  readonly winningSide: 'A' | 'B' | 'draw' | undefined;
  readonly eloChanges: ReadonlyMap<string, number>;
  readonly duration: number;
  readonly startedAt: bigint;
  readonly endedAt: bigint | undefined;
}

export interface TerritoryZone {
  readonly zoneId: string;
  readonly worldId: string;
  readonly name: string;
  readonly status: TerritoryStatus;
  readonly controllingDynastyId: string | undefined;
  readonly contestingDynastyId: string | undefined;
  readonly captureProgress: number;
  readonly resourceBonus: number;
  readonly cycleEndsAt: bigint;
}

export interface SiegeDeclaration {
  readonly siegeId: string;
  readonly attackerDynastyId: string;
  readonly defenderDynastyId: string;
  readonly targetEstateId: string;
  readonly phase: SiegeDeclarationPhase;
  readonly declaredAt: bigint;
  readonly battleStartsAt: bigint;
  readonly battleEndsAt: bigint;
  readonly winnerId: string | undefined;
}

export interface WarBond {
  readonly bondId: string;
  readonly issuerId: string;
  readonly kalonAmount: number;
  readonly interestRate: number;
  readonly maturityAt: bigint;
  readonly buyerId: string | undefined;
  readonly redeemed: boolean;
  readonly createdAt: bigint;
}

export interface MercenaryContract {
  readonly contractId: string;
  readonly mercenaryId: string;
  readonly employerId: string;
  readonly kalonFee: number;
  readonly durationMs: number;
  readonly objective: string;
  readonly completed: boolean;
  readonly createdAt: bigint;
}

export interface CeasefireRecord {
  readonly recordId: string;
  readonly violatorId: string;
  readonly violationType: CeasefireViolationType;
  readonly penaltyKalon: number;
  readonly penaltyDuration: number;
  readonly violatedAt: bigint;
}

export interface CombatReplay {
  readonly replayId: string;
  readonly matchId: string;
  readonly mode: ArenaMode;
  readonly participants: readonly string[];
  readonly duration: number;
  readonly eventCount: number;
  readonly sizeBytes: number;
  readonly recordedAt: bigint;
}

export interface SmurfDetectionResult {
  readonly playerId: string;
  readonly confidence: number;
  readonly signals: readonly string[];
  readonly accountAge: number;
  readonly suspectedMainId: string | undefined;
  readonly recommendation: 'allow' | 'flag' | 'restrict';
}

export interface SeasonConfig {
  readonly seasonId: string;
  readonly name: string;
  readonly startsAt: bigint;
  readonly endsAt: bigint;
  readonly eloResetFactor: number;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface CompetitivePvpConfig {
  readonly defaultElo: number;
  readonly eloKFactor: number;
  readonly eloMatchRange: number;
  readonly siegePrepTimeMs: number;
  readonly siegeBattleDurationMs: number;
  readonly ceasefirePenaltyKalon: number;
  readonly ceasefirePenaltyDurationMs: number;
  readonly territoryCaptureCycleMs: number;
  readonly smurfConfidenceThreshold: number;
  readonly seasonDurationMs: number;
  readonly warBondInterestRate: number;
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface CompetitivePvpStats {
  readonly matchesPlayed: number;
  readonly activeArenas: number;
  readonly territoriesContested: number;
  readonly siegesDeclared: number;
  readonly warBondsIssued: number;
  readonly mercenaryContracts: number;
  readonly ceasefireViolations: number;
  readonly replaysStored: number;
  readonly smurfsDetected: number;
}

// ─── Interface ──────────────────────────────────────────────────────

export interface CompetitivePvpEngine {
  // Ranked
  readonly getProfile: (playerId: string) => Promise<RankedProfile>;
  readonly queueMatch: (playerId: string, mode: ArenaMode) => Promise<ArenaMatch>;
  readonly resolveMatch: (matchId: string, winningSide: 'A' | 'B' | 'draw') => ArenaMatch;
  readonly getDivision: (elo: number) => DivisionTier;

  // Territory
  readonly contestZone: (zoneId: string, dynastyId: string) => Promise<TerritoryZone>;
  readonly advanceCapture: (zoneId: string, progress: number) => Promise<TerritoryZone>;
  readonly getWorldTerritories: (worldId: string) => Promise<readonly TerritoryZone[]>;

  // Siege
  readonly declareSiege: (attackerId: string, defenderId: string, estateId: string) => SiegeDeclaration;
  readonly resolveSiege: (siegeId: string, winnerId: string) => SiegeDeclaration;

  // War economy
  readonly issueWarBond: (issuerId: string, amount: number) => WarBond;
  readonly buyWarBond: (bondId: string, buyerId: string) => WarBond;
  readonly hireMercenary: (mercenaryId: string, employerId: string, fee: number, objective: string) => MercenaryContract;

  // Ceasefire
  readonly recordViolation: (violatorId: string, type: CeasefireViolationType) => CeasefireRecord;

  // Replay
  readonly storeReplay: (matchId: string, participants: readonly string[], duration: number, eventCount: number, sizeBytes: number) => Promise<CombatReplay>;
  readonly getReplay: (replayId: string) => Promise<CombatReplay | undefined>;

  // Anti-smurf
  readonly detectSmurf: (playerId: string, accountAgeMs: number, winRate: number, avgEloGain: number) => SmurfDetectionResult;

  readonly getStats: () => CompetitivePvpStats;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface CompetitivePvpDeps {
  readonly clock: PvpClockPort;
  readonly id: PvpIdPort;
  readonly log: PvpLogPort;
  readonly events: PvpEventPort;
  readonly matchmaking: MatchmakingPort;
  readonly territories: TerritoryStorePort;
  readonly replays: ReplayStorePort;
}

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULT_CONFIG: CompetitivePvpConfig = {
  defaultElo: 1200,
  eloKFactor: 32,
  eloMatchRange: 200,
  siegePrepTimeMs: 48 * 60 * 60 * 1000,
  siegeBattleDurationMs: 2 * 60 * 60 * 1000,
  ceasefirePenaltyKalon: 5000,
  ceasefirePenaltyDurationMs: 24 * 60 * 60 * 1000,
  territoryCaptureCycleMs: 7 * 24 * 60 * 60 * 1000,
  smurfConfidenceThreshold: 0.75,
  seasonDurationMs: 90 * 24 * 60 * 60 * 1000,
  warBondInterestRate: 0.05,
};

const DIVISION_THRESHOLDS: readonly (readonly [number, DivisionTier])[] = [
  [2200, 'legend'],
  [2000, 'champion'],
  [1800, 'diamond'],
  [1600, 'platinum'],
  [1400, 'gold'],
  [1200, 'silver'],
  [0, 'bronze'],
];

// ─── Factory ────────────────────────────────────────────────────────

export function createCompetitivePvpEngine(
  deps: CompetitivePvpDeps,
  config: Partial<CompetitivePvpConfig> = {},
): CompetitivePvpEngine {
  const cfg: CompetitivePvpConfig = { ...DEFAULT_CONFIG, ...config };

  const activeMatches = new Map<string, ArenaMatch>();
  const sieges = new Map<string, SiegeDeclaration>();
  const warBonds = new Map<string, WarBond>();
  const mercContracts = new Map<string, MercenaryContract>();

  let matchesPlayed = 0;
  let territoriesContested = 0;
  let siegesDeclared = 0;
  let warBondsIssued = 0;
  let mercenaryContracts = 0;
  let ceasefireViolations = 0;
  let replaysStored = 0;
  let smurfsDetected = 0;

  function getDivision(elo: number): DivisionTier {
    for (const [threshold, tier] of DIVISION_THRESHOLDS) {
      if (elo >= threshold) return tier;
    }
    return 'bronze';
  }

  async function getProfile(playerId: string): Promise<RankedProfile> {
    const elo = await deps.matchmaking.getPlayerElo(playerId);
    return {
      playerId,
      elo,
      division: getDivision(elo),
      wins: 0,
      losses: 0,
      streak: 0,
      peakElo: elo,
      seasonId: '',
      matchesPlayed: 0,
      lastMatchAt: deps.clock.now(),
    };
  }

  async function queueMatch(playerId: string, mode: ArenaMode): Promise<ArenaMatch> {
    const opponents = await deps.matchmaking.findOpponents(playerId, mode, cfg.eloMatchRange);
    const teamSize = mode === '1v1' ? 1 : mode === '2v2' ? 2 : mode === '5v5' ? 5 : 10;

    const teamA = [playerId, ...opponents.slice(0, teamSize - 1)];
    const teamB = opponents.slice(teamSize - 1, teamSize - 1 + teamSize);

    const match: ArenaMatch = {
      matchId: deps.id.next(),
      mode,
      teamA,
      teamB,
      winningSide: undefined,
      eloChanges: new Map(),
      duration: 0,
      startedAt: deps.clock.now(),
      endedAt: undefined,
    };

    activeMatches.set(match.matchId, match);
    deps.log.info('match-queued', { matchId: match.matchId, mode, teamASize: teamA.length, teamBSize: teamB.length });
    return match;
  }

  function calculateEloChange(winnerElo: number, loserElo: number): number {
    const expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    return Math.round(cfg.eloKFactor * (1 - expected));
  }

  function resolveMatch(matchId: string, winningSide: 'A' | 'B' | 'draw'): ArenaMatch {
    const match = activeMatches.get(matchId);
    if (match === undefined) throw new Error(`Match ${matchId} not found`);

    const eloChanges = new Map<string, number>();

    if (winningSide !== 'draw') {
      const winners = winningSide === 'A' ? match.teamA : match.teamB;
      const losers = winningSide === 'A' ? match.teamB : match.teamA;
      const change = calculateEloChange(cfg.defaultElo, cfg.defaultElo);

      for (const p of winners) eloChanges.set(p, change);
      for (const p of losers) eloChanges.set(p, -change);
    }

    const resolved: ArenaMatch = {
      ...match,
      winningSide,
      eloChanges,
      endedAt: deps.clock.now(),
    };

    activeMatches.set(matchId, resolved);
    matchesPlayed++;
    deps.log.info('match-resolved', { matchId, winningSide, players: match.teamA.length + match.teamB.length });
    return resolved;
  }

  async function contestZone(zoneId: string, dynastyId: string): Promise<TerritoryZone> {
    const zone = await deps.territories.getZone(zoneId);
    if (zone === undefined) throw new Error(`Zone ${zoneId} not found`);

    const contested: TerritoryZone = {
      ...zone,
      status: 'contested',
      contestingDynastyId: dynastyId,
      captureProgress: 0,
    };

    await deps.territories.saveZone(contested);
    territoriesContested++;
    deps.log.info('territory-contested', { zoneId, dynastyId });
    return contested;
  }

  async function advanceCapture(zoneId: string, progress: number): Promise<TerritoryZone> {
    const zone = await deps.territories.getZone(zoneId);
    if (zone === undefined) throw new Error(`Zone ${zoneId} not found`);

    const newProgress = Math.min(1, zone.captureProgress + progress);
    const captured = newProgress >= 1;

    const updated: TerritoryZone = {
      ...zone,
      status: captured ? 'controlled' : 'contested',
      controllingDynastyId: captured ? zone.contestingDynastyId : zone.controllingDynastyId,
      contestingDynastyId: captured ? undefined : zone.contestingDynastyId,
      captureProgress: captured ? 0 : newProgress,
    };

    await deps.territories.saveZone(updated);
    if (captured) {
      deps.log.info('territory-captured', { zoneId, dynasty: zone.contestingDynastyId });
    }
    return updated;
  }

  async function getWorldTerritories(worldId: string): Promise<readonly TerritoryZone[]> {
    return deps.territories.getWorldZones(worldId);
  }

  function declareSiege(attackerId: string, defenderId: string, estateId: string): SiegeDeclaration {
    const now = deps.clock.now();
    const siege: SiegeDeclaration = {
      siegeId: deps.id.next(),
      attackerDynastyId: attackerId,
      defenderDynastyId: defenderId,
      targetEstateId: estateId,
      phase: 'declared',
      declaredAt: now,
      battleStartsAt: now + BigInt(cfg.siegePrepTimeMs),
      battleEndsAt: now + BigInt(cfg.siegePrepTimeMs) + BigInt(cfg.siegeBattleDurationMs),
      winnerId: undefined,
    };

    sieges.set(siege.siegeId, siege);
    siegesDeclared++;
    deps.log.info('siege-declared', { siegeId: siege.siegeId, attacker: attackerId, defender: defenderId, estateId });
    return siege;
  }

  function resolveSiege(siegeId: string, winnerId: string): SiegeDeclaration {
    const siege = sieges.get(siegeId);
    if (siege === undefined) throw new Error(`Siege ${siegeId} not found`);

    const resolved: SiegeDeclaration = {
      ...siege,
      phase: 'resolved',
      winnerId,
    };

    sieges.set(siegeId, resolved);
    deps.log.info('siege-resolved', { siegeId, winnerId });
    return resolved;
  }

  function issueWarBond(issuerId: string, amount: number): WarBond {
    const bond: WarBond = {
      bondId: deps.id.next(),
      issuerId,
      kalonAmount: amount,
      interestRate: cfg.warBondInterestRate,
      maturityAt: deps.clock.now() + BigInt(30 * 24 * 60 * 60 * 1000),
      buyerId: undefined,
      redeemed: false,
      createdAt: deps.clock.now(),
    };

    warBonds.set(bond.bondId, bond);
    warBondsIssued++;
    deps.log.info('war-bond-issued', { bondId: bond.bondId, issuerId, amount });
    return bond;
  }

  function buyWarBond(bondId: string, buyerId: string): WarBond {
    const bond = warBonds.get(bondId);
    if (bond === undefined) throw new Error(`Bond ${bondId} not found`);
    if (bond.buyerId !== undefined) throw new Error('Bond already purchased');

    const purchased: WarBond = { ...bond, buyerId };
    warBonds.set(bondId, purchased);
    deps.log.info('war-bond-bought', { bondId, buyerId });
    return purchased;
  }

  function hireMercenary(
    mercenaryId: string,
    employerId: string,
    fee: number,
    objective: string,
  ): MercenaryContract {
    const contract: MercenaryContract = {
      contractId: deps.id.next(),
      mercenaryId,
      employerId,
      kalonFee: fee,
      durationMs: 7 * 24 * 60 * 60 * 1000,
      objective,
      completed: false,
      createdAt: deps.clock.now(),
    };

    mercContracts.set(contract.contractId, contract);
    mercenaryContracts++;
    deps.log.info('mercenary-hired', { contractId: contract.contractId, mercenaryId, employerId, fee });
    return contract;
  }

  function recordViolation(violatorId: string, type: CeasefireViolationType): CeasefireRecord {
    const record: CeasefireRecord = {
      recordId: deps.id.next(),
      violatorId,
      violationType: type,
      penaltyKalon: cfg.ceasefirePenaltyKalon,
      penaltyDuration: cfg.ceasefirePenaltyDurationMs,
      violatedAt: deps.clock.now(),
    };

    ceasefireViolations++;
    deps.log.info('ceasefire-violated', { recordId: record.recordId, violatorId, type, penalty: record.penaltyKalon });
    return record;
  }

  async function storeReplay(
    matchId: string,
    participants: readonly string[],
    duration: number,
    eventCount: number,
    sizeBytes: number,
  ): Promise<CombatReplay> {
    const match = activeMatches.get(matchId);
    const replay: CombatReplay = {
      replayId: deps.id.next(),
      matchId,
      mode: match?.mode ?? '1v1',
      participants,
      duration,
      eventCount,
      sizeBytes,
      recordedAt: deps.clock.now(),
    };

    await deps.replays.saveReplay(replay);
    replaysStored++;
    deps.log.info('replay-stored', { replayId: replay.replayId, matchId, sizeBytes });
    return replay;
  }

  async function getReplayById(replayId: string): Promise<CombatReplay | undefined> {
    return deps.replays.getReplay(replayId);
  }

  function detectSmurf(
    playerId: string,
    accountAgeMs: number,
    winRate: number,
    avgEloGain: number,
  ): SmurfDetectionResult {
    const signals: string[] = [];
    let confidence = 0;

    const ageDays = accountAgeMs / (24 * 60 * 60 * 1000);

    if (ageDays < 7 && winRate > 0.8) {
      signals.push('new-account-high-winrate');
      confidence += 0.35;
    }

    if (avgEloGain > 50) {
      signals.push('rapid-elo-climb');
      confidence += 0.25;
    }

    if (ageDays < 3) {
      signals.push('very-new-account');
      confidence += 0.15;
    }

    if (winRate > 0.9 && ageDays < 14) {
      signals.push('exceptional-performance');
      confidence += 0.25;
    }

    confidence = Math.min(1, confidence);

    let recommendation: 'allow' | 'flag' | 'restrict' = 'allow';
    if (confidence >= cfg.smurfConfidenceThreshold) {
      recommendation = 'restrict';
      smurfsDetected++;
    } else if (confidence >= 0.5) {
      recommendation = 'flag';
    }

    deps.log.info('smurf-detection', { playerId, confidence, recommendation, signals });
    return {
      playerId,
      confidence,
      signals,
      accountAge: ageDays,
      suspectedMainId: undefined,
      recommendation,
    };
  }

  function getStats(): CompetitivePvpStats {
    return {
      matchesPlayed,
      activeArenas: activeMatches.size,
      territoriesContested,
      siegesDeclared,
      warBondsIssued,
      mercenaryContracts,
      ceasefireViolations,
      replaysStored,
      smurfsDetected,
    };
  }

  deps.log.info('competitive-pvp-engine-created', {
    defaultElo: cfg.defaultElo,
    eloKFactor: cfg.eloKFactor,
  });

  return {
    getProfile,
    queueMatch,
    resolveMatch,
    getDivision,
    contestZone,
    advanceCapture,
    getWorldTerritories,
    declareSiege,
    resolveSiege,
    issueWarBond,
    buyWarBond,
    hireMercenary,
    recordViolation,
    storeReplay,
    getReplay: getReplayById,
    detectSmurf,
    getStats,
  };
}
