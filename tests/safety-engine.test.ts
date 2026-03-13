/**
 * Safety Engine Tests
 *
 * COPPA compliance, AI session lifecycle, time controls, content moderation.
 */

import { describe, it, expect } from 'vitest';
import {
  createSafetyEngine,
  AI_SESSION_AUTO_DELETE_MS,
  type SafetyEngine,
  type SafetyEngineDeps,
} from '../universe/safety/engine.js';
import type { TimeControls, ModerationFlag } from '../universe/safety/types.js';

// ─── Test Helpers ──────────────────────────────────────────────────

type DepsWithControl = SafetyEngineDeps & {
  advance: (ms: number) => void;
};

let _idCounter = 0;

function makeDeps(startMs = 1_000_000): DepsWithControl {
  let now = startMs;
  return {
    now: () => now,
    advance: (ms: number) => { now += ms; },
    generateId: () => `id-${String(++_idCounter)}`,
    log: () => { /* silent in tests */ },
  };
}

function makeControls(overrides?: Partial<TimeControls>): TimeControls {
  return {
    maxDailyMinutes: 60,
    bedtimeCutoff: null,
    notificationsEnabled: false,
    ...overrides,
  };
}

function makeEngine(
  deps?: DepsWithControl,
): { engine: SafetyEngine; deps: DepsWithControl } {
  const d = deps ?? makeDeps();
  return { engine: createSafetyEngine(d), deps: d };
}

// ─── createAiSession ───────────────────────────────────────────────

describe('createAiSession', () => {
  it('creates a session with correct kindler, character, world IDs', () => {
    const { engine } = makeEngine();
    const session = engine.createAiSession('k1', 'professor-nimbus', 'cloud-kingdom');
    expect(session.kindlerId).toBe('k1');
    expect(session.characterId).toBe('professor-nimbus');
    expect(session.worldId).toBe('cloud-kingdom');
  });

  it('sets startedAt to current time', () => {
    const { engine } = makeEngine(makeDeps(5_000_000));
    const session = engine.createAiSession('k1', 'zara', 'savanna-workshop');
    expect(session.startedAt).toBe(5_000_000);
  });

  it('sets endedAt to null on creation', () => {
    const { engine } = makeEngine();
    const session = engine.createAiSession('k1', 'char1', 'world1');
    expect(session.endedAt).toBeNull();
  });

  it('sets turnCount to 0 on creation', () => {
    const { engine } = makeEngine();
    const session = engine.createAiSession('k1', 'char1', 'world1');
    expect(session.turnCount).toBe(0);
  });

  it('sets autoDeleteAt to startedAt + 24hrs', () => {
    const { engine } = makeEngine(makeDeps(1_000_000));
    const session = engine.createAiSession('k1', 'char1', 'world1');
    expect(session.autoDeleteAt).toBe(1_000_000 + AI_SESSION_AUTO_DELETE_MS);
  });

  it('increments stats.totalSessionsCreated', () => {
    const { engine } = makeEngine();
    engine.createAiSession('k1', 'c1', 'w1');
    engine.createAiSession('k2', 'c2', 'w2');
    expect(engine.getStats().totalSessionsCreated).toBe(2);
  });

  it('created session appears as active', () => {
    const { engine } = makeEngine();
    engine.createAiSession('k1', 'c1', 'w1');
    expect(engine.getStats().activeSessions).toBe(1);
  });

  it('generates unique IDs for multiple sessions', () => {
    const { engine } = makeEngine();
    const s1 = engine.createAiSession('k1', 'c1', 'w1');
    const s2 = engine.createAiSession('k2', 'c2', 'w2');
    expect(s1.id).not.toBe(s2.id);
  });
});

// ─── endAiSession ─────────────────────────────────────────────────

describe('endAiSession', () => {
  it('sets endedAt to current time', () => {
    const { engine, deps } = makeEngine(makeDeps(1_000_000));
    const { id } = engine.createAiSession('k1', 'c1', 'w1');
    deps.advance(30_000);
    const ended = engine.endAiSession(id);
    expect(ended.endedAt).toBe(1_030_000);
  });

  it('sets autoDeleteAt to endedAt + 24hrs', () => {
    const { engine, deps } = makeEngine(makeDeps(1_000_000));
    const { id } = engine.createAiSession('k1', 'c1', 'w1');
    deps.advance(60_000);
    const ended = engine.endAiSession(id);
    expect(ended.autoDeleteAt).toBe(1_060_000 + AI_SESSION_AUTO_DELETE_MS);
  });

  it('removes session from activeSessions', () => {
    const { engine } = makeEngine();
    const { id } = engine.createAiSession('k1', 'c1', 'w1');
    engine.endAiSession(id);
    expect(engine.getStats().activeSessions).toBe(0);
  });

  it('increments stats.totalSessionsEnded', () => {
    const { engine } = makeEngine();
    const { id } = engine.createAiSession('k1', 'c1', 'w1');
    engine.endAiSession(id);
    expect(engine.getStats().totalSessionsEnded).toBe(1);
  });

  it('throws on unknown session ID', () => {
    const { engine } = makeEngine();
    expect(() => engine.endAiSession('nonexistent')).toThrow('session not found');
  });

  it('preserves turnCount from before session end', () => {
    const { engine } = makeEngine();
    const { id } = engine.createAiSession('k1', 'c1', 'w1');
    engine.incrementTurnCount(id);
    engine.incrementTurnCount(id);
    const ended = engine.endAiSession(id);
    expect(ended.turnCount).toBe(2);
  });
});

// ─── incrementTurnCount ───────────────────────────────────────────

describe('incrementTurnCount', () => {
  it('increments turnCount by 1 each call', () => {
    const { engine } = makeEngine();
    const { id } = engine.createAiSession('k1', 'c1', 'w1');
    engine.incrementTurnCount(id);
    engine.incrementTurnCount(id);
    engine.incrementTurnCount(id);
    const ended = engine.endAiSession(id);
    expect(ended.turnCount).toBe(3);
  });

  it('throws on unknown session ID', () => {
    const { engine } = makeEngine();
    expect(() => { engine.incrementTurnCount('ghost'); }).toThrow('session not found');
  });
});

// ─── getSessionsNeedingDeletion ────────────────────────────────────

describe('getSessionsNeedingDeletion', () => {
  it('returns empty when no sessions exist', () => {
    const { engine } = makeEngine();
    expect(engine.getSessionsNeedingDeletion()).toHaveLength(0);
  });

  it('does not include active sessions', () => {
    const { engine } = makeEngine();
    engine.createAiSession('k1', 'c1', 'w1');
    expect(engine.getSessionsNeedingDeletion()).toHaveLength(0);
  });

  it('does not include ended sessions before 24h window', () => {
    const { engine, deps } = makeEngine(makeDeps(0));
    const { id } = engine.createAiSession('k1', 'c1', 'w1');
    engine.endAiSession(id);
    deps.advance(AI_SESSION_AUTO_DELETE_MS - 1);
    expect(engine.getSessionsNeedingDeletion()).toHaveLength(0);
  });

  it('includes ended sessions at exactly 24h after end', () => {
    const { engine, deps } = makeEngine(makeDeps(0));
    const { id } = engine.createAiSession('k1', 'c1', 'w1');
    deps.advance(1_000);
    engine.endAiSession(id);
    deps.advance(AI_SESSION_AUTO_DELETE_MS);
    const pending = engine.getSessionsNeedingDeletion();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.id).toBe(id);
  });

  it('includes only ended sessions, not active ones', () => {
    const { engine, deps } = makeEngine(makeDeps(0));
    const { id: id1 } = engine.createAiSession('k1', 'c1', 'w1');
    engine.createAiSession('k2', 'c2', 'w2'); // still active
    engine.endAiSession(id1);
    deps.advance(AI_SESSION_AUTO_DELETE_MS + 1);
    const pending = engine.getSessionsNeedingDeletion();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.id).toBe(id1);
  });
});

// ─── isWithinTimeLimit ────────────────────────────────────────────

describe('isWithinTimeLimit', () => {
  it('returns true when under daily limit', () => {
    const { engine } = makeEngine();
    const controls = makeControls({ maxDailyMinutes: 60 });
    expect(engine.isWithinTimeLimit(59, controls)).toBe(true);
  });

  it('returns false when at daily limit', () => {
    const { engine } = makeEngine();
    const controls = makeControls({ maxDailyMinutes: 60 });
    expect(engine.isWithinTimeLimit(60, controls)).toBe(false);
  });

  it('returns false when over daily limit', () => {
    const { engine } = makeEngine();
    const controls = makeControls({ maxDailyMinutes: 30 });
    expect(engine.isWithinTimeLimit(45, controls)).toBe(false);
  });

  it('returns true when maxDailyMinutes is null (unlimited)', () => {
    const { engine } = makeEngine();
    const controls = makeControls({ maxDailyMinutes: null });
    expect(engine.isWithinTimeLimit(9999, controls)).toBe(true);
  });

  it('supports all allowed minute values', () => {
    const { engine } = makeEngine();
    for (const limit of [15, 30, 45, 60] as const) {
      const controls = makeControls({ maxDailyMinutes: limit });
      expect(engine.isWithinTimeLimit(limit - 1, controls)).toBe(true);
      expect(engine.isWithinTimeLimit(limit, controls)).toBe(false);
    }
  });
});

// ─── isPastBedtime ────────────────────────────────────────────────

describe('isPastBedtime', () => {
  it('returns false when bedtimeCutoff is null', () => {
    const { engine } = makeEngine();
    const controls = makeControls({ bedtimeCutoff: null });
    expect(engine.isPastBedtime(controls)).toBe(false);
  });

  it('returns true when current UTC time >= cutoff', () => {
    // 23:00 UTC
    const nowMs = Date.UTC(2027, 0, 15, 23, 0, 0);
    const { engine } = makeEngine(makeDeps(nowMs));
    const controls = makeControls({ bedtimeCutoff: '22:00' });
    expect(engine.isPastBedtime(controls)).toBe(true);
  });

  it('returns true at exactly the cutoff minute', () => {
    const nowMs = Date.UTC(2027, 0, 15, 22, 0, 0);
    const { engine } = makeEngine(makeDeps(nowMs));
    const controls = makeControls({ bedtimeCutoff: '22:00' });
    expect(engine.isPastBedtime(controls)).toBe(true);
  });

  it('returns false one minute before cutoff', () => {
    const nowMs = Date.UTC(2027, 0, 15, 21, 59, 59);
    const { engine } = makeEngine(makeDeps(nowMs));
    const controls = makeControls({ bedtimeCutoff: '22:00' });
    expect(engine.isPastBedtime(controls)).toBe(false);
  });
});

// ─── buildModerationResult — ratings ─────────────────────────────

describe('buildModerationResult — ratings', () => {
  it('rates as approved with zero flags', () => {
    const { engine } = makeEngine();
    expect(engine.buildModerationResult('c1', 'entry', []).rating).toBe('approved');
  });

  it('rates as blocked for age_inappropriate flag', () => {
    const { engine } = makeEngine();
    expect(engine.buildModerationResult('c1', 'ai_response', ['age_inappropriate']).rating).toBe('blocked');
  });

  it('rates as blocked for violence flag', () => {
    const { engine } = makeEngine();
    expect(engine.buildModerationResult('c1', 'user_input', ['violence']).rating).toBe('blocked');
  });

  it('rates as blocked for pii_detected, advertising, external_link', () => {
    const { engine } = makeEngine();
    expect(engine.buildModerationResult('c1', 'entry', ['pii_detected']).rating).toBe('blocked');
    expect(engine.buildModerationResult('c1', 'entry', ['advertising']).rating).toBe('blocked');
    expect(engine.buildModerationResult('c1', 'entry', ['external_link']).rating).toBe('blocked');
  });

  it('rates as flagged for cultural_sensitivity or factual_accuracy', () => {
    const { engine } = makeEngine();
    expect(engine.buildModerationResult('c1', 'entry', ['cultural_sensitivity']).rating).toBe('flagged');
    expect(engine.buildModerationResult('c1', 'entry', ['factual_accuracy']).rating).toBe('flagged');
  });

  it('escalates to blocked if any blocking flag mixed with non-blocking', () => {
    const { engine } = makeEngine();
    const flags: ModerationFlag[] = ['factual_accuracy', 'violence'];
    expect(engine.buildModerationResult('c1', 'entry', flags).rating).toBe('blocked');
  });
});

// ─── buildModerationResult — metadata ────────────────────────────

describe('buildModerationResult — metadata', () => {
  it('preserves flags array on result', () => {
    const { engine } = makeEngine();
    const flags: ModerationFlag[] = ['cultural_sensitivity', 'factual_accuracy'];
    const result = engine.buildModerationResult('c1', 'entry', flags);
    expect(result.flags).toEqual(flags);
  });

  it('sets reviewedBy to automated', () => {
    const { engine } = makeEngine();
    expect(engine.buildModerationResult('c1', 'entry', []).reviewedBy).toBe('automated');
  });

  it('sets contentType on result', () => {
    const { engine } = makeEngine();
    expect(engine.buildModerationResult('c1', 'ai_response', []).contentType).toBe('ai_response');
  });

  it('increments stats.totalModerationResults', () => {
    const { engine } = makeEngine();
    engine.buildModerationResult('c1', 'entry', []);
    engine.buildModerationResult('c2', 'entry', []);
    expect(engine.getStats().totalModerationResults).toBe(2);
  });
});

// ─── getStats ─────────────────────────────────────────────────────

describe('getStats', () => {
  it('starts at zero for all counters', () => {
    const { engine } = makeEngine();
    const stats = engine.getStats();
    expect(stats.activeSessions).toBe(0);
    expect(stats.totalSessionsCreated).toBe(0);
    expect(stats.totalSessionsEnded).toBe(0);
    expect(stats.totalModerationResults).toBe(0);
  });

  it('tracks active vs ended sessions correctly', () => {
    const { engine } = makeEngine();
    const { id: id1 } = engine.createAiSession('k1', 'c1', 'w1');
    engine.createAiSession('k2', 'c2', 'w2');
    engine.endAiSession(id1);
    const stats = engine.getStats();
    expect(stats.activeSessions).toBe(1);
    expect(stats.totalSessionsCreated).toBe(2);
    expect(stats.totalSessionsEnded).toBe(1);
  });
});
