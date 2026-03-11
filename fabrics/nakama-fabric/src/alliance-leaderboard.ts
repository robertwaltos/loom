/**
 * Alliance Leaderboard — Combined dynasty influence rankings.
 *
 * Aggregates influence from multiple sources:
 *   - Treasury value (KALON reserves)
 *   - Territory count (controlled zones)
 *   - War victories (combat record)
 *   - Diplomatic standing (treaty compliance, reputation)
 *   - Member dynasty count (alliance size)
 *   - Economic output (trade volume)
 *
 * Rankings are recalculated on demand or via periodic tick.
 * Supports seasonal rankings with historical archives.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface LeaderboardClockPort {
  readonly nowMicroseconds: () => number;
}

export interface LeaderboardAlliancePort {
  readonly getAllianceIds: () => ReadonlyArray<string>;
  readonly getTreasury: (allianceId: string) => bigint;
  readonly getMemberCount: (allianceId: string) => number;
  readonly getAllianceName: (allianceId: string) => string;
}

export interface LeaderboardWarPort {
  readonly getVictoryCount: (allianceId: string) => number;
  readonly getDefeatCount: (allianceId: string) => number;
}

export interface LeaderboardEconomyPort {
  readonly getTradeVolume: (allianceId: string) => bigint;
  readonly getTerritoryCount: (allianceId: string) => number;
}

export interface LeaderboardReputationPort {
  readonly getAverageReputation: (allianceId: string) => number;
  readonly getTreatyComplianceRate: (allianceId: string) => number;
}

// ── Types ────────────────────────────────────────────────────────

export interface AllianceRanking {
  readonly rank: number;
  readonly allianceId: string;
  readonly allianceName: string;
  readonly totalScore: number;
  readonly breakdown: InfluenceBreakdown;
  readonly trend: 'rising' | 'stable' | 'falling';
  readonly previousRank: number;
}

export interface InfluenceBreakdown {
  readonly treasuryScore: number;
  readonly territoryScore: number;
  readonly militaryScore: number;
  readonly diplomaticScore: number;
  readonly memberScore: number;
  readonly economicScore: number;
}

export interface SeasonalSnapshot {
  readonly seasonId: string;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly rankings: ReadonlyArray<AllianceRanking>;
}

export interface LeaderboardConfig {
  readonly weights: InfluenceWeights;
  readonly seasonDurationMs: number;
  readonly maxRankingsDisplay: number;
}

export interface InfluenceWeights {
  readonly treasury: number;
  readonly territory: number;
  readonly military: number;
  readonly diplomatic: number;
  readonly members: number;
  readonly economic: number;
}

const DEFAULT_WEIGHTS: InfluenceWeights = {
  treasury: 0.20,
  territory: 0.20,
  military: 0.15,
  diplomatic: 0.15,
  members: 0.10,
  economic: 0.20,
};

const DEFAULT_CONFIG: LeaderboardConfig = {
  weights: DEFAULT_WEIGHTS,
  seasonDurationMs: 30 * 24 * 60 * 60 * 1_000,
  maxRankingsDisplay: 100,
};

// ── Stats ────────────────────────────────────────────────────────

export interface LeaderboardStats {
  readonly rankedAlliances: number;
  readonly seasonsCompleted: number;
  readonly lastRecalculatedAt: number;
}

// ── Public API ───────────────────────────────────────────────────

export interface AllianceLeaderboard {
  readonly recalculate: () => ReadonlyArray<AllianceRanking>;
  readonly getRankings: (limit?: number) => ReadonlyArray<AllianceRanking>;
  readonly getAllianceRank: (allianceId: string) => AllianceRanking | undefined;
  readonly endSeason: () => SeasonalSnapshot;
  readonly getSeasonHistory: () => ReadonlyArray<SeasonalSnapshot>;
  readonly getStats: () => LeaderboardStats;
}

// ── Deps ─────────────────────────────────────────────────────────

export interface AllianceLeaderboardDeps {
  readonly clock: LeaderboardClockPort;
  readonly alliances: LeaderboardAlliancePort;
  readonly wars: LeaderboardWarPort;
  readonly economy: LeaderboardEconomyPort;
  readonly reputation: LeaderboardReputationPort;
}

// ── Factory ──────────────────────────────────────────────────────

export function createAllianceLeaderboard(
  deps: AllianceLeaderboardDeps,
  config?: Partial<LeaderboardConfig>,
): AllianceLeaderboard {
  const cfg: LeaderboardConfig = { ...DEFAULT_CONFIG, ...config };
  let currentRankings: AllianceRanking[] = [];
  const previousRanks = new Map<string, number>();
  const seasonHistory: SeasonalSnapshot[] = [];
  let lastRecalculatedAt = 0;

  function recalculate(): ReadonlyArray<AllianceRanking> {
    const allianceIds = deps.alliances.getAllianceIds();
    const entries: Array<{ allianceId: string; score: number; breakdown: InfluenceBreakdown }> = [];

    for (const allianceId of allianceIds) {
      const breakdown = calculateBreakdown(allianceId);
      const score =
        breakdown.treasuryScore * cfg.weights.treasury +
        breakdown.territoryScore * cfg.weights.territory +
        breakdown.militaryScore * cfg.weights.military +
        breakdown.diplomaticScore * cfg.weights.diplomatic +
        breakdown.memberScore * cfg.weights.members +
        breakdown.economicScore * cfg.weights.economic;

      entries.push({ allianceId, score, breakdown });
    }

    entries.sort((a, b) => b.score - a.score);

    currentRankings = entries.map((entry, index) => {
      const prevRank = previousRanks.get(entry.allianceId) ?? index + 1;
      const rank = index + 1;
      let trend: 'rising' | 'stable' | 'falling' = 'stable';
      if (rank < prevRank) trend = 'rising';
      else if (rank > prevRank) trend = 'falling';

      return {
        rank,
        allianceId: entry.allianceId,
        allianceName: deps.alliances.getAllianceName(entry.allianceId),
        totalScore: Math.round(entry.score * 100) / 100,
        breakdown: entry.breakdown,
        trend,
        previousRank: prevRank,
      };
    });

    // Store ranks for next recalculation trend
    for (const ranking of currentRankings) {
      previousRanks.set(ranking.allianceId, ranking.rank);
    }

    lastRecalculatedAt = deps.clock.nowMicroseconds();
    return currentRankings;
  }

  function calculateBreakdown(allianceId: string): InfluenceBreakdown {
    const treasury = deps.alliances.getTreasury(allianceId);
    const memberCount = deps.alliances.getMemberCount(allianceId);
    const victories = deps.wars.getVictoryCount(allianceId);
    const defeats = deps.wars.getDefeatCount(allianceId);
    const tradeVolume = deps.economy.getTradeVolume(allianceId);
    const territories = deps.economy.getTerritoryCount(allianceId);
    const reputation = deps.reputation.getAverageReputation(allianceId);
    const compliance = deps.reputation.getTreatyComplianceRate(allianceId);

    return {
      treasuryScore: normalise(Number(treasury), 1_000_000),
      territoryScore: normalise(territories, 100),
      militaryScore: normalise(victories - defeats * 0.5, 50),
      diplomaticScore: (reputation / 1_000 + compliance) / 2,
      memberScore: normalise(memberCount, 50),
      economicScore: normalise(Number(tradeVolume), 5_000_000),
    };
  }

  function getRankings(limit?: number): ReadonlyArray<AllianceRanking> {
    const max = limit ?? cfg.maxRankingsDisplay;
    return currentRankings.slice(0, max);
  }

  function getAllianceRank(allianceId: string): AllianceRanking | undefined {
    return currentRankings.find((r) => r.allianceId === allianceId);
  }

  function endSeason(): SeasonalSnapshot {
    const now = deps.clock.nowMicroseconds();
    recalculate();

    const snapshot: SeasonalSnapshot = {
      seasonId: `season-${seasonHistory.length + 1}`,
      startedAt: seasonHistory.length > 0
        ? seasonHistory[seasonHistory.length - 1]!.endedAt
        : 0,
      endedAt: now,
      rankings: [...currentRankings],
    };

    seasonHistory.push(snapshot);
    previousRanks.clear();
    return snapshot;
  }

  function getSeasonHistory(): ReadonlyArray<SeasonalSnapshot> {
    return seasonHistory;
  }

  function getStats(): LeaderboardStats {
    return {
      rankedAlliances: currentRankings.length,
      seasonsCompleted: seasonHistory.length,
      lastRecalculatedAt,
    };
  }

  return {
    recalculate,
    getRankings,
    getAllianceRank,
    endSeason,
    getSeasonHistory,
    getStats,
  };
}

// ── Normalisation ────────────────────────────────────────────────

function normalise(value: number, ceiling: number): number {
  if (ceiling <= 0) return 0;
  return Math.min(Math.max(value / ceiling, 0), 1);
}
