/**
 * Alliance Leaderboard — Simulation Tests
 *
 * Exercises multi-source influence scoring, weighted ranking,
 * trend tracking, seasonal snapshots, and leaderboard queries.
 */

import { describe, it, expect } from 'vitest';
import { createAllianceLeaderboard } from '../alliance-leaderboard.js';
import type {
  AllianceLeaderboardDeps,
  AllianceLeaderboard,
  LeaderboardConfig,
} from '../alliance-leaderboard.js';

// ── Helpers ──────────────────────────────────────────────────────

interface AllianceData {
  name: string;
  treasury: bigint;
  members: number;
  victories: number;
  defeats: number;
  tradeVolume: bigint;
  territories: number;
  reputation: number;
  compliance: number;
}

function makeDeps(alliances: Record<string, AllianceData>) {
  let time = 1_000_000;
  const ids = Object.keys(alliances);

  const deps: AllianceLeaderboardDeps = {
    clock: { nowMicroseconds: () => time },
    alliances: {
      getAllianceIds: () => ids,
      getTreasury: (id) => alliances[id]?.treasury ?? 0n,
      getMemberCount: (id) => alliances[id]?.members ?? 0,
      getAllianceName: (id) => alliances[id]?.name ?? id,
    },
    wars: {
      getVictoryCount: (id) => alliances[id]?.victories ?? 0,
      getDefeatCount: (id) => alliances[id]?.defeats ?? 0,
    },
    economy: {
      getTradeVolume: (id) => alliances[id]?.tradeVolume ?? 0n,
      getTerritoryCount: (id) => alliances[id]?.territories ?? 0,
    },
    reputation: {
      getAverageReputation: (id) => alliances[id]?.reputation ?? 0,
      getTreatyComplianceRate: (id) => alliances[id]?.compliance ?? 0,
    },
  };

  return {
    deps,
    advance: (us: number) => { time += us; },
  };
}

function standardAlliances(): Record<string, AllianceData> {
  return {
    'alliance-alpha': {
      name: 'Alpha Legion',
      treasury: 500_000n,
      members: 20,
      victories: 30,
      defeats: 5,
      tradeVolume: 2_000_000n,
      territories: 40,
      reputation: 800,
      compliance: 0.95,
    },
    'alliance-beta': {
      name: 'Beta Coalition',
      treasury: 300_000n,
      members: 15,
      victories: 10,
      defeats: 10,
      tradeVolume: 1_000_000n,
      territories: 20,
      reputation: 600,
      compliance: 0.80,
    },
    'alliance-gamma': {
      name: 'Gamma Union',
      treasury: 800_000n,
      members: 10,
      victories: 5,
      defeats: 2,
      tradeVolume: 4_000_000n,
      territories: 60,
      reputation: 500,
      compliance: 0.70,
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('Alliance Leaderboard', () => {
  describe('recalculate', () => {
    it('ranks alliances by weighted score', () => {
      const { deps } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      const rankings = lb.recalculate();
      expect(rankings.length).toBe(3);
      // Should be sorted by totalScore descending
      expect(rankings[0].rank).toBe(1);
      expect(rankings[1].rank).toBe(2);
      expect(rankings[2].rank).toBe(3);
      expect(rankings[0].totalScore).toBeGreaterThanOrEqual(rankings[1].totalScore);
      expect(rankings[1].totalScore).toBeGreaterThanOrEqual(rankings[2].totalScore);
    });

    it('includes alliance names in rankings', () => {
      const { deps } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      const rankings = lb.recalculate();
      const names = rankings.map(r => r.allianceName);
      expect(names).toContain('Alpha Legion');
      expect(names).toContain('Beta Coalition');
      expect(names).toContain('Gamma Union');
    });

    it('provides influence breakdown per alliance', () => {
      const { deps } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      const rankings = lb.recalculate();
      const top = rankings[0];
      expect(top.breakdown).toBeDefined();
      expect(typeof top.breakdown.treasuryScore).toBe('number');
      expect(typeof top.breakdown.territoryScore).toBe('number');
      expect(typeof top.breakdown.militaryScore).toBe('number');
      expect(typeof top.breakdown.diplomaticScore).toBe('number');
      expect(typeof top.breakdown.memberScore).toBe('number');
      expect(typeof top.breakdown.economicScore).toBe('number');
    });

    it('normalises scores between 0 and 1', () => {
      const { deps } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      const rankings = lb.recalculate();
      for (const r of rankings) {
        const b = r.breakdown;
        expect(b.treasuryScore).toBeGreaterThanOrEqual(0);
        expect(b.treasuryScore).toBeLessThanOrEqual(1);
        expect(b.territoryScore).toBeGreaterThanOrEqual(0);
        expect(b.territoryScore).toBeLessThanOrEqual(1);
        expect(b.memberScore).toBeGreaterThanOrEqual(0);
        expect(b.memberScore).toBeLessThanOrEqual(1);
        expect(b.economicScore).toBeGreaterThanOrEqual(0);
        expect(b.economicScore).toBeLessThanOrEqual(1);
      }
    });
  });

  // ── Trend Tracking ────────────────────────────────────────────

  describe('trend tracking', () => {
    it('initial recalculation shows stable trend', () => {
      const { deps } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      const rankings = lb.recalculate();
      // First calc — previousRank equals current rank → stable
      for (const r of rankings) {
        expect(r.trend).toBe('stable');
      }
    });

    it('detects rising trend when rank improves', () => {
      const data = standardAlliances();
      const { deps } = makeDeps(data);
      const lb = createAllianceLeaderboard(deps);
      lb.recalculate();

      // Boost beta to #1 position
      data['alliance-beta'].treasury = 999_000n;
      data['alliance-beta'].tradeVolume = 10_000_000n;
      data['alliance-beta'].territories = 90;

      const r2 = lb.recalculate();
      const beta = r2.find(r => r.allianceId === 'alliance-beta');
      expect(beta).toBeDefined();
      // Beta moved up from a lower rank
      if (beta!.rank < beta!.previousRank) {
        expect(beta!.trend).toBe('rising');
      }
    });
  });

  // ── getRankings ───────────────────────────────────────────────

  describe('getRankings', () => {
    it('returns empty before first recalculation', () => {
      const { deps } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      expect(lb.getRankings()).toEqual([]);
    });

    it('limits by provided count', () => {
      const { deps } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      lb.recalculate();
      const top2 = lb.getRankings(2);
      expect(top2.length).toBe(2);
    });

    it('returns all when limit exceeds count', () => {
      const { deps } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      lb.recalculate();
      expect(lb.getRankings(100).length).toBe(3);
    });
  });

  // ── getAllianceRank ────────────────────────────────────────────

  describe('getAllianceRank', () => {
    it('returns ranking for a specific alliance', () => {
      const { deps } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      lb.recalculate();
      const alpha = lb.getAllianceRank('alliance-alpha');
      expect(alpha).toBeDefined();
      expect(alpha!.allianceId).toBe('alliance-alpha');
      expect(alpha!.allianceName).toBe('Alpha Legion');
    });

    it('returns undefined for unknown alliance', () => {
      const { deps } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      lb.recalculate();
      expect(lb.getAllianceRank('nonexistent')).toBeUndefined();
    });
  });

  // ── Seasons ───────────────────────────────────────────────────

  describe('seasonal rankings', () => {
    it('ends a season and produces a snapshot', () => {
      const { deps, advance } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      lb.recalculate();
      advance(1_000_000);
      const snapshot = lb.endSeason();
      expect(snapshot.seasonId).toBe('season-1');
      expect(snapshot.rankings.length).toBe(3);
      expect(snapshot.endedAt).toBe(2_000_000);
    });

    it('tracks multiple seasons', () => {
      const { deps, advance } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      lb.recalculate();
      advance(100);
      lb.endSeason();
      advance(100);
      lb.endSeason();
      const history = lb.getSeasonHistory();
      expect(history.length).toBe(2);
      expect(history[0].seasonId).toBe('season-1');
      expect(history[1].seasonId).toBe('season-2');
    });

    it('season 2 starts where season 1 ended', () => {
      const { deps, advance } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      lb.recalculate();
      advance(500);
      const s1 = lb.endSeason();
      advance(500);
      const s2 = lb.endSeason();
      expect(s2.startedAt).toBe(s1.endedAt);
    });

    it('resets trends after season end', () => {
      const { deps, advance } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      lb.recalculate();
      advance(100);
      lb.endSeason();
      // After season end, previousRanks cleared → next recalc shows stable
      const newRankings = lb.recalculate();
      for (const r of newRankings) {
        expect(r.trend).toBe('stable');
      }
    });
  });

  // ── Stats ─────────────────────────────────────────────────────

  describe('getStats', () => {
    it('reports initial stats', () => {
      const { deps } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      const stats = lb.getStats();
      expect(stats.rankedAlliances).toBe(0);
      expect(stats.seasonsCompleted).toBe(0);
      expect(stats.lastRecalculatedAt).toBe(0);
    });

    it('updates after recalculation', () => {
      const { deps } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      lb.recalculate();
      const stats = lb.getStats();
      expect(stats.rankedAlliances).toBe(3);
      expect(stats.lastRecalculatedAt).toBe(1_000_000);
    });

    it('increments seasons after endSeason', () => {
      const { deps } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps);
      lb.recalculate();
      lb.endSeason();
      expect(lb.getStats().seasonsCompleted).toBe(1);
    });
  });

  // ── Custom Weights ────────────────────────────────────────────

  describe('custom weights', () => {
    it('treasury-only weighting ranks by treasury', () => {
      const { deps } = makeDeps(standardAlliances());
      const lb = createAllianceLeaderboard(deps, {
        weights: {
          treasury: 1.0,
          territory: 0,
          military: 0,
          diplomatic: 0,
          members: 0,
          economic: 0,
        },
      });
      const rankings = lb.recalculate();
      // Gamma has highest treasury (800k)
      expect(rankings[0].allianceId).toBe('alliance-gamma');
    });
  });
});
