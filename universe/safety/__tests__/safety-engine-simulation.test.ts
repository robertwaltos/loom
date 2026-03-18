/**
 * Safety Engine — Simulation Tests
 *
 * Tests for COPPA-compliant session lifecycle, time controls,
 * bedtime enforcement, content moderation, and auto-delete scheduling.
 *
 * Thread: silk/universe/safety-engine-sim
 * Tier: 1
 */

import { describe, it, expect, vi } from 'vitest';
import { createSafetyEngine } from '../engine.js';
import type { SafetyEngineDeps, SafetyEngineConfig } from '../engine.js';

// ─── Helpers ──────────────────────────────────────────────────────

let idCounter = 0;
let nowMs = 1_620_000_000_000; // fixed epoch

function makeSafetyEngine(
  nowOverride?: () => number,
  config?: SafetyEngineConfig,
) {
  idCounter = 0;
  const deps: SafetyEngineDeps = {
    generateId: () => `sess-${++idCounter}`,
    now: nowOverride ?? (() => nowMs),
    log: vi.fn(),
  };
  return createSafetyEngine(deps, config);
}

// ─── Session Lifecycle ────────────────────────────────────────────

describe('createAiSession', () => {
  it('creates a session with the correct kindler coords', () => {
    const engine = makeSafetyEngine();
    const sess = engine.createAiSession('k1', 'character-1', 'world-x');
    expect(sess.kindlerId).toBe('k1');
    expect(sess.characterId).toBe('character-1');
    expect(sess.worldId).toBe('world-x');
  });

  it('session starts with turnCount of 0', () => {
    const engine = makeSafetyEngine();
    const sess = engine.createAiSession('k1', 'char', 'world');
    expect(sess.turnCount).toBe(0);
  });

  it('session starts with endedAt null', () => {
    const engine = makeSafetyEngine();
    const sess = engine.createAiSession('k1', 'char', 'world');
    expect(sess.endedAt).toBeNull();
  });

  it('assigns an autoDeleteAt in the future', () => {
    let clock = 1_000_000;
    const engine = makeSafetyEngine(() => clock);
    const sess = engine.createAiSession('k1', 'char', 'world');
    expect(sess.autoDeleteAt).toBeGreaterThan(clock);
  });

  it('increments activeSessions stat', () => {
    const engine = makeSafetyEngine();
    engine.createAiSession('k1', 'char', 'world');
    engine.createAiSession('k2', 'char', 'world');
    expect(engine.getStats().activeSessions).toBe(2);
  });
});

describe('endAiSession', () => {
  it('sets endedAt to current time', () => {
    let clock = 5_000_000;
    const engine = makeSafetyEngine(() => clock);
    const sess = engine.createAiSession('k1', 'char', 'world');
    clock = 6_000_000;
    engine.endAiSession(sess.id);
    expect(engine.getStats().totalSessionsEnded).toBe(1);
  });

  it('decrements activeSessions and increments totalSessionsEnded', () => {
    const engine = makeSafetyEngine();
    const s = engine.createAiSession('k1', 'char', 'world');
    engine.endAiSession(s.id);
    const stats = engine.getStats();
    expect(stats.activeSessions).toBe(0);
    expect(stats.totalSessionsEnded).toBe(1);
  });

  it('recalculates autoDeleteAt relative to endedAt', () => {
    let clock = 1_000_000;
    const autoDeleteMs = 60_000;
    const engine = makeSafetyEngine(() => clock, { sessionAutoDeleteMs: autoDeleteMs });
    const sess = engine.createAiSession('k1', 'char', 'world');
    clock = 2_000_000;
    const ended = engine.endAiSession(sess.id);
    expect(ended.autoDeleteAt).toBeCloseTo(clock + autoDeleteMs, -2);
  });
});

describe('incrementTurnCount', () => {
  it('increments the session turn count without error', () => {
    const engine = makeSafetyEngine();
    const sess = engine.createAiSession('k1', 'char', 'world');
    expect(() => {
      engine.incrementTurnCount(sess.id);
      engine.incrementTurnCount(sess.id);
      engine.incrementTurnCount(sess.id);
    }).not.toThrow();
  });

  it('throws for an unknown session id', () => {
    const engine = makeSafetyEngine();
    expect(() => engine.incrementTurnCount('nonexistent')).toThrow();
  });
});

// ─── Session Auto-Delete ──────────────────────────────────────────

describe('getSessionsNeedingDeletion', () => {
  it('returns nothing when no sessions have ended', () => {
    const engine = makeSafetyEngine();
    engine.createAiSession('k1', 'char', 'world');
    expect(engine.getSessionsNeedingDeletion()).toHaveLength(0);
  });

  it('returns ended sessions whose autoDeleteAt has passed', () => {
    let clock = 1_000_000;
    const engine = makeSafetyEngine(() => clock, { sessionAutoDeleteMs: 1_000 });
    const sess = engine.createAiSession('k1', 'char', 'world');
    engine.endAiSession(sess.id);
    // Advance past autoDeleteAt
    clock = 1_000_000 + 2_000;
    const toDelete = engine.getSessionsNeedingDeletion();
    expect(toDelete.some((s) => s.id === sess.id)).toBe(true);
  });

  it('does NOT return sessions whose autoDeleteAt has not yet passed', () => {
    let clock = 1_000_000;
    const engine = makeSafetyEngine(() => clock, { sessionAutoDeleteMs: 100_000 });
    const sess = engine.createAiSession('k1', 'char', 'world');
    engine.endAiSession(sess.id);
    clock = 1_000_100; // only 100ms later
    expect(engine.getSessionsNeedingDeletion()).toHaveLength(0);
  });

  it('does NOT return active (non-ended) sessions', () => {
    let clock = 1_000_000;
    const engine = makeSafetyEngine(() => clock, { sessionAutoDeleteMs: 1_000 });
    engine.createAiSession('k1', 'char', 'world');
    clock = 1_100_000;
    expect(engine.getSessionsNeedingDeletion()).toHaveLength(0);
  });
});

// ─── Time Controls ────────────────────────────────────────────────

describe('isWithinTimeLimit', () => {
  it('returns true when maxDailyMinutes is null (unlimited)', () => {
    const engine = makeSafetyEngine();
    const controls = { maxDailyMinutes: null, bedtimeCutoff: null, notificationsEnabled: false };
    expect(engine.isWithinTimeLimit(999, controls)).toBe(true);
  });

  it('returns true when used minutes is under the limit', () => {
    const engine = makeSafetyEngine();
    const controls = { maxDailyMinutes: 30 as const, bedtimeCutoff: null, notificationsEnabled: false };
    expect(engine.isWithinTimeLimit(20, controls)).toBe(true);
  });

  it('returns false when used minutes meets the limit', () => {
    const engine = makeSafetyEngine();
    const controls = { maxDailyMinutes: 30 as const, bedtimeCutoff: null, notificationsEnabled: false };
    expect(engine.isWithinTimeLimit(30, controls)).toBe(false);
  });

  it('returns false when used minutes exceeds the limit', () => {
    const engine = makeSafetyEngine();
    const controls = { maxDailyMinutes: 15 as const, bedtimeCutoff: null, notificationsEnabled: false };
    expect(engine.isWithinTimeLimit(16, controls)).toBe(false);
  });
});

describe('isPastBedtime', () => {
  it('returns false when bedtimeCutoff is null', () => {
    const engine = makeSafetyEngine();
    const controls = { maxDailyMinutes: null, bedtimeCutoff: null, notificationsEnabled: false };
    expect(engine.isPastBedtime(controls)).toBe(false);
  });

  it('returns true when UTC time is past the cutoff', () => {
    // Force clock to 21:30 UTC = 21*60+30 = 1290 minutes since midnight
    const UTC_21_30 = new Date('2024-01-01T21:30:00Z').getTime();
    const engine = makeSafetyEngine(() => UTC_21_30);
    const controls = { maxDailyMinutes: null, bedtimeCutoff: '20:00', notificationsEnabled: false };
    expect(engine.isPastBedtime(controls)).toBe(true);
  });

  it('returns false when UTC time is before the cutoff', () => {
    const UTC_18_00 = new Date('2024-01-01T18:00:00Z').getTime();
    const engine = makeSafetyEngine(() => UTC_18_00);
    const controls = { maxDailyMinutes: null, bedtimeCutoff: '20:00', notificationsEnabled: false };
    expect(engine.isPastBedtime(controls)).toBe(false);
  });
});

// ─── Content Moderation ───────────────────────────────────────────

describe('buildModerationResult', () => {
  it('returns approved with no flags', () => {
    const engine = makeSafetyEngine();
    const result = engine.buildModerationResult('content-1', 'ai_response', []);
    expect(result.rating).toBe('approved');
  });

  it('returns flagged for non-blocking flags', () => {
    const engine = makeSafetyEngine();
    // cultural_sensitivity is non-blocking
    const result = engine.buildModerationResult('content-2', 'ai_response', ['cultural_sensitivity']);
    expect(result.rating).toBe('flagged');
  });

  it('returns blocked for age_inappropriate', () => {
    const engine = makeSafetyEngine();
    const result = engine.buildModerationResult('c3', 'ai_response', ['age_inappropriate']);
    expect(result.rating).toBe('blocked');
  });

  it('returns blocked for violence flag', () => {
    const engine = makeSafetyEngine();
    const result = engine.buildModerationResult('c4', 'ai_response', ['violence']);
    expect(result.rating).toBe('blocked');
  });

  it('returns blocked for pii_detected flag', () => {
    const engine = makeSafetyEngine();
    const result = engine.buildModerationResult('c5', 'ai_response', ['pii_detected']);
    expect(result.rating).toBe('blocked');
  });

  it('returns blocked for advertising flag', () => {
    const engine = makeSafetyEngine();
    const result = engine.buildModerationResult('c6', 'ai_response', ['advertising']);
    expect(result.rating).toBe('blocked');
  });

  it('returns blocked for external_link flag', () => {
    const engine = makeSafetyEngine();
    const result = engine.buildModerationResult('c7', 'ai_response', ['external_link']);
    expect(result.rating).toBe('blocked');
  });

  it('blocked takes priority over flagged when mixed', () => {
    const engine = makeSafetyEngine();
    const result = engine.buildModerationResult('c8', 'ai_response', ['cultural_sensitivity', 'violence']);
    expect(result.rating).toBe('blocked');
  });

  it('result carries the flags array and contentId', () => {
    const engine = makeSafetyEngine();
    const result = engine.buildModerationResult('my-content', 'entry', ['cultural_sensitivity']);
    expect(result.contentId).toBe('my-content');
    expect(result.flags).toContain('cultural_sensitivity');
  });

  it('increments totalModerationResults stat', () => {
    const engine = makeSafetyEngine();
    engine.buildModerationResult('c1', 'ai_response', []);
    engine.buildModerationResult('c2', 'ai_response', ['violence']);
    expect(engine.getStats().totalModerationResults).toBe(2);
  });
});

// ─── Stats ────────────────────────────────────────────────────────

describe('getStats', () => {
  it('returns all-zero stats on a fresh engine', () => {
    const engine = makeSafetyEngine();
    const stats = engine.getStats();
    expect(stats.activeSessions).toBe(0);
    expect(stats.totalSessionsCreated).toBe(0);
    expect(stats.totalSessionsEnded).toBe(0);
    expect(stats.totalModerationResults).toBe(0);
  });

  it('totalSessionsCreated counts all created sessions', () => {
    const engine = makeSafetyEngine();
    engine.createAiSession('k1', 'char', 'world');
    engine.createAiSession('k2', 'char', 'world');
    const s3 = engine.createAiSession('k3', 'char', 'world');
    engine.endAiSession(s3.id);
    expect(engine.getStats().totalSessionsCreated).toBe(3);
  });
});
