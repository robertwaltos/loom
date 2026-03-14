import { describe, it, expect } from 'vitest';
import {
  createMiniGamesRegistry,
  SPARK_GAIN_MIN,
  SPARK_GAIN_MAX,
  DIFFICULTY_LEVELS,
  LUMINANCE_GAIN_PER_GAME,
  TOTAL_MINI_GAMES,
} from '../mini-games-registry.js';

describe('mini-games-registry simulation', () => {
  function makeRegistry() {
    return createMiniGamesRegistry();
  }

  // ── data coverage ─────────────────────────────────────────────────

  it('returns exactly 50 games', () => {
    const r = makeRegistry();
    expect(r.getAllGames().length).toBe(TOTAL_MINI_GAMES);
  });

  it('getGameCount equals 50', () => {
    const r = makeRegistry();
    expect(r.getGameCount()).toBe(50);
  });

  it('exports SPARK_GAIN_MIN = 3', () => {
    expect(SPARK_GAIN_MIN).toBe(3);
  });

  it('exports SPARK_GAIN_MAX = 8', () => {
    expect(SPARK_GAIN_MAX).toBe(8);
  });

  it('exports DIFFICULTY_LEVELS = 5', () => {
    expect(DIFFICULTY_LEVELS).toBe(5);
  });

  it('exports LUMINANCE_GAIN_PER_GAME = 1', () => {
    expect(LUMINANCE_GAIN_PER_GAME).toBe(1);
  });

  // ── getGameById ───────────────────────────────────────────────────

  it('getGameById returns a game for a valid id', () => {
    const r = makeRegistry();
    const all = r.getAllGames();
    const first = all[0];
    const found = r.getGameById(first.gameId);
    expect(found).toBeDefined();
    expect(found!.gameId).toBe(first.gameId);
  });

  it('getGameById returns undefined for an unknown id', () => {
    const r = makeRegistry();
    expect(r.getGameById('__nonexistent__')).toBeUndefined();
  });

  // ── getGamesByRealm ───────────────────────────────────────────────

  it('STEM realm has 15 games', () => {
    const r = makeRegistry();
    expect(r.getGamesByRealm('stem').length).toBe(15);
  });

  it('lang-arts realm has 15 games', () => {
    const r = makeRegistry();
    expect(r.getGamesByRealm('language-arts').length).toBe(15);
  });

  it('finance realm has 12 games', () => {
    const r = makeRegistry();
    expect(r.getGamesByRealm('financial-literacy').length).toBe(12);
  });

  it('crossroads realm has 8 games', () => {
    const r = makeRegistry();
    expect(r.getGamesByRealm('crossroads').length).toBe(8);
  });

  // ── getGamesByWorld ───────────────────────────────────────────────

  it('getGamesByWorld returns a subset of all games', () => {
    const r = makeRegistry();
    const all = r.getAllGames();
    const worldId = all[0].worldId;
    const byWorld = r.getGamesByWorld(worldId);
    expect(byWorld.length).toBeGreaterThan(0);
    expect(byWorld.every((g) => g.worldId === worldId)).toBe(true);
  });

  it('exposes Prototype Sprint under the canonical entrepreneur-workshop world id', () => {
    const r = makeRegistry();
    const prototypeSprint = r.getGameById('prototype-sprint');
    expect(prototypeSprint).toBeDefined();
    expect(prototypeSprint!.worldId).toBe('entrepreneur-workshop');
    expect(r.getGamesByWorld('entrepreneur-workshop').some((game) => game.gameId === 'prototype-sprint')).toBe(true);
  });

  // ── computeSparkGain ─────────────────────────────────────────────

  describe('computeSparkGain', () => {
    it('returns SPARK_GAIN_MIN (3) for a zero score', () => {
      const r = makeRegistry();
      expect(r.computeSparkGain(0, 100)).toBe(SPARK_GAIN_MIN);
    });

    it('returns SPARK_GAIN_MAX (8) for a perfect score', () => {
      const r = makeRegistry();
      expect(r.computeSparkGain(100, 100)).toBe(SPARK_GAIN_MAX);
    });

    it('returns a value in [3, 8] for a mid score', () => {
      const r = makeRegistry();
      const result = r.computeSparkGain(50, 100);
      expect(result).toBeGreaterThanOrEqual(SPARK_GAIN_MIN);
      expect(result).toBeLessThanOrEqual(SPARK_GAIN_MAX);
    });

    it('is a whole number (rounded)', () => {
      const r = makeRegistry();
      expect(Number.isInteger(r.computeSparkGain(33, 100))).toBe(true);
    });
  });

  // ── computeResult ────────────────────────────────────────────────

  describe('computeResult', () => {
    it('returns a result with sparkGained and luminanceGained fields', () => {
      const r = makeRegistry();
      const all = r.getAllGames();
      const game = all[0];
      const session = {
        sessionId: 'sess-1',
        gameId: game.gameId,
        kindlerId: 'player-1',
        difficulty: 3,
        score: 80,
        maxScore: 100,
        completedAt: 0,
      };
      const state = {
        kindlerId: 'player-1',
        highScores: new Map<string, number>(),
        maxDifficultyReached: new Map<string, number>(),
        totalGamesPlayed: 0,
      };
      const result = r.computeResult(session, state);
      expect(result).toHaveProperty('sparkGained');
      expect(result).toHaveProperty('luminanceGained');
    });

    it('luminanceGained = LUMINANCE_GAIN_PER_GAME for a completed game', () => {
      const r = makeRegistry();
      const all = r.getAllGames();
      const game = all[0];
      const session = {
        sessionId: 'sess-2',
        gameId: game.gameId,
        kindlerId: 'player-1',
        difficulty: 3,
        score: 60,
        maxScore: 100,
        completedAt: 0,
      };
      const state = {
        kindlerId: 'player-1',
        highScores: new Map<string, number>(),
        maxDifficultyReached: new Map<string, number>(),
        totalGamesPlayed: 0,
      };
      const result = r.computeResult(session, state);
      expect(result.luminanceGained).toBe(LUMINANCE_GAIN_PER_GAME);
    });
  });
});
