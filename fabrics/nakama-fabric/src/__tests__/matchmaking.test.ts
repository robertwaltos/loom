import { describe, it, expect } from 'vitest';
import { createMatchmakingEngine } from '../matchmaking.js';
import type { MatchmakingDeps, QueueEntry, BracketType } from '../matchmaking.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDeps(worldIds: string[] = ['world-1', 'world-2', 'world-3']): MatchmakingDeps {
  let id = 0;
  let timeMs = 10_000;
  const playerCounts = new Map<string, number>(worldIds.map((w) => [w, 0]));
  return {
    clock: { nowMs: () => (timeMs += 100) },
    idGenerator: { generate: () => 'match-' + String(++id) },
    logger: { info: () => {} },
    worldRoster: { getActivePlayerCount: (wid) => playerCounts.get(wid) ?? 0 },
    worldIds,
  };
}

function makeEntry(
  playerId: string,
  bracketType: BracketType,
  skillRating: number,
  queuedAt = 1_000,
  preferredWorldIds: ReadonlyArray<string> = [],
): QueueEntry {
  return { playerId, bracketType, skillRating, queuedAt, preferredWorldIds };
}

// ─── solo_1v1 ─────────────────────────────────────────────────────────────────

describe('Matchmaking — solo_1v1', () => {
  it('forms a match when 2 players are within ELO spread (±200)', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('p1', 'solo_1v1', 1500));
    engine.enqueue(makeEntry('p2', 'solo_1v1', 1700));
    const results = engine.tick();
    expect(results).toHaveLength(1);
    expect(results[0]?.bracketType).toBe('solo_1v1');
    expect(results[0]?.playerIds).toContain('p1');
    expect(results[0]?.playerIds).toContain('p2');
    expect(typeof results[0]?.assignedWorldId).toBe('string');
    expect(typeof results[0]?.matchId).toBe('string');
  });

  it('does not match players whose ELO spread exceeds 400', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('p1', 'solo_1v1', 1000));
    engine.enqueue(makeEntry('p2', 'solo_1v1', 1401));
    expect(engine.tick()).toHaveLength(0);
  });

  it('tick() returns empty when only one player is in the queue', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('p1', 'solo_1v1', 1500));
    expect(engine.tick()).toHaveLength(0);
  });

  it('removes matched players from the queue after tick', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('p1', 'solo_1v1', 1500));
    engine.enqueue(makeEntry('p2', 'solo_1v1', 1600));
    engine.tick();
    expect(engine.getQueueDepth('solo_1v1')).toBe(0);
  });
});

// ─── ELO boundary ─────────────────────────────────────────────────────────────

describe('Matchmaking — ELO boundary conditions', () => {
  it('matches at exactly 400 ELO spread (boundary inclusive)', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('p1', 'solo_1v1', 1000));
    engine.enqueue(makeEntry('p2', 'solo_1v1', 1400));
    expect(engine.tick()).toHaveLength(1);
  });

  it('does not match at 401 ELO spread (one over boundary)', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('p1', 'solo_1v1', 1000));
    engine.enqueue(makeEntry('p2', 'solo_1v1', 1401));
    expect(engine.tick()).toHaveLength(0);
  });

  it('matches three players within the 400-point window for duo_2v2 subset', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('p1', 'solo_1v1', 1200));
    engine.enqueue(makeEntry('p2', 'solo_1v1', 1400));
    engine.enqueue(makeEntry('p3', 'solo_1v1', 1500));
    // p1+p2 are within 400; p1+p3 (300 apart) are also fine; first sorted pair wins
    const results = engine.tick();
    expect(results).toHaveLength(1);
  });
});

// ─── dequeue ──────────────────────────────────────────────────────────────────

describe('Matchmaking — dequeue', () => {
  it('dequeue removes a player before a match can form', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('p1', 'solo_1v1', 1500));
    engine.enqueue(makeEntry('p2', 'solo_1v1', 1500));
    engine.dequeue('p2');
    expect(engine.tick()).toHaveLength(0);
    expect(engine.getQueueDepth('solo_1v1')).toBe(1);
  });

  it('dequeue removes a player from all bracket queues simultaneously', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('p1', 'solo_1v1', 1500));
    engine.enqueue(makeEntry('p1', 'duo_2v2', 1500));
    engine.enqueue(makeEntry('p1', 'open_world', 1500));
    engine.dequeue('p1');
    expect(engine.getQueueDepth('solo_1v1')).toBe(0);
    expect(engine.getQueueDepth('duo_2v2')).toBe(0);
    expect(engine.getQueueDepth('open_world')).toBe(0);
  });
});

// ─── open_world ───────────────────────────────────────────────────────────────

describe('Matchmaking — open_world', () => {
  it('assigns a single player immediately on tick (never waits)', () => {
    const engine = createMatchmakingEngine(makeDeps(['world-a', 'world-b']));
    engine.enqueue(makeEntry('p1', 'open_world', 1500));
    const results = engine.tick();
    expect(results).toHaveLength(1);
    expect(results[0]?.bracketType).toBe('open_world');
    expect(results[0]?.playerIds).toEqual(['p1']);
    expect(results[0]?.estimatedStartMs).toBeGreaterThan(0);
  });

  it('assigns to the world with fewest active players', () => {
    const deps: MatchmakingDeps = {
      clock: { nowMs: () => 5_000 },
      idGenerator: { generate: () => 'match-ow' },
      logger: { info: () => {} },
      worldRoster: { getActivePlayerCount: (wid) => (wid === 'world-busy' ? 99 : 2) },
      worldIds: ['world-busy', 'world-empty'],
    };
    const engine = createMatchmakingEngine(deps);
    engine.enqueue(makeEntry('p1', 'open_world', 1500));
    const results = engine.tick();
    expect(results[0]?.assignedWorldId).toBe('world-empty');
  });

  it('clears the open_world queue after tick', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('p1', 'open_world', 1500));
    engine.enqueue(makeEntry('p2', 'open_world', 1800));
    engine.tick();
    expect(engine.getQueueDepth('open_world')).toBe(0);
  });
});

// ─── bracket size requirements ────────────────────────────────────────────────

describe('Matchmaking — bracket size requirements', () => {
  it('duo_2v2 does not match with 3 players; matches with 4', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('p1', 'duo_2v2', 1500));
    engine.enqueue(makeEntry('p2', 'duo_2v2', 1500));
    engine.enqueue(makeEntry('p3', 'duo_2v2', 1500));
    expect(engine.tick()).toHaveLength(0);
    engine.enqueue(makeEntry('p4', 'duo_2v2', 1500));
    expect(engine.tick()).toHaveLength(1);
  });

  it('squad_4v4 does not match with 7 players (requires 8)', () => {
    const engine = createMatchmakingEngine(makeDeps());
    for (let i = 1; i <= 7; i++) {
      engine.enqueue(makeEntry('p' + String(i), 'squad_4v4', 1500));
    }
    expect(engine.tick()).toHaveLength(0);
  });
});

// ─── multiple simultaneous brackets ──────────────────────────────────────────

describe('Matchmaking — multiple simultaneous bracket types', () => {
  it('processes solo_1v1 and duo_2v2 independently in one tick', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('s1', 'solo_1v1', 1500));
    engine.enqueue(makeEntry('s2', 'solo_1v1', 1600));
    engine.enqueue(makeEntry('d1', 'duo_2v2', 1500));
    engine.enqueue(makeEntry('d2', 'duo_2v2', 1500));
    engine.enqueue(makeEntry('d3', 'duo_2v2', 1500));
    engine.enqueue(makeEntry('d4', 'duo_2v2', 1500));
    const results = engine.tick();
    const solo = results.filter((r) => r.bracketType === 'solo_1v1');
    const duo = results.filter((r) => r.bracketType === 'duo_2v2');
    expect(solo).toHaveLength(1);
    expect(duo).toHaveLength(1);
  });

  it('open_world and ELO brackets both produce results in the same tick', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('ow1', 'open_world', 1500));
    engine.enqueue(makeEntry('s1', 'solo_1v1', 1500));
    engine.enqueue(makeEntry('s2', 'solo_1v1', 1500));
    const results = engine.tick();
    expect(results.some((r) => r.bracketType === 'open_world')).toBe(true);
    expect(results.some((r) => r.bracketType === 'solo_1v1')).toBe(true);
  });
});

// ─── getQueueDepth ────────────────────────────────────────────────────────────

describe('Matchmaking — getQueueDepth', () => {
  it('returns accurate depth per bracket', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('p1', 'solo_1v1', 1500));
    engine.enqueue(makeEntry('p2', 'duo_2v2', 1500));
    engine.enqueue(makeEntry('p3', 'duo_2v2', 1500));
    expect(engine.getQueueDepth('solo_1v1')).toBe(1);
    expect(engine.getQueueDepth('duo_2v2')).toBe(2);
    expect(engine.getQueueDepth('squad_4v4')).toBe(0);
    expect(engine.getQueueDepth('open_world')).toBe(0);
  });
});

// ─── getStats ─────────────────────────────────────────────────────────────────

describe('Matchmaking — getStats', () => {
  it('returns correct depth per bracket for all four bracket types', () => {
    const engine = createMatchmakingEngine(makeDeps());
    engine.enqueue(makeEntry('p1', 'solo_1v1', 1500));
    engine.enqueue(makeEntry('p2', 'duo_2v2', 1500));
    engine.enqueue(makeEntry('p3', 'duo_2v2', 1500));
    const stats = engine.getStats();
    expect(stats.solo_1v1.depth).toBe(1);
    expect(stats.duo_2v2.depth).toBe(2);
    expect(stats.squad_4v4.depth).toBe(0);
    expect(stats.open_world.depth).toBe(0);
  });

  it('reports averageWaitMs as elapsed time since queuedAt', () => {
    let nowMs = 5_000;
    const deps: MatchmakingDeps = {
      clock: { nowMs: () => nowMs },
      idGenerator: { generate: () => 'x' },
      logger: { info: () => {} },
      worldRoster: { getActivePlayerCount: () => 0 },
      worldIds: ['world-1'],
    };
    const engine = createMatchmakingEngine(deps);
    // p1 queued at 1000ms, p2 queued at 3000ms; now=5000ms
    engine.enqueue(makeEntry('p1', 'solo_1v1', 1500, 1_000));
    engine.enqueue(makeEntry('p2', 'solo_1v1', 1500, 3_000));
    // avg wait = ((5000-1000) + (5000-3000)) / 2 = (4000 + 2000) / 2 = 3000
    const stats = engine.getStats();
    expect(stats.solo_1v1.averageWaitMs).toBe(3_000);
  });

  it('reports depth=0 and averageWaitMs=0 for empty brackets', () => {
    const engine = createMatchmakingEngine(makeDeps());
    const stats = engine.getStats();
    expect(stats.solo_1v1.depth).toBe(0);
    expect(stats.solo_1v1.averageWaitMs).toBe(0);
  });
});