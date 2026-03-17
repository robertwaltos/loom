import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAntiCheatSystem,
  DEFAULT_ANTI_CHEAT_CONFIG,
  type AntiCheatSystem,
} from '../anti-cheat.js';

// ── Helpers ───────────────────────────────────────────────────────────

const ORIGIN = { x: 0, y: 0, z: 0 };
const NEARBY = { x: 1, y: 0, z: 0 };

function makeSystem(overrides?: Partial<typeof DEFAULT_ANTI_CHEAT_CONFIG>): AntiCheatSystem {
  return createAntiCheatSystem({ ...DEFAULT_ANTI_CHEAT_CONFIG, ...overrides });
}

// ── Speed Hack Detection ──────────────────────────────────────────────

describe('speed hack detection', () => {
  it('allows movement within max speed', () => {
    const sys = makeSystem();
    const slow = { x: 5, y: 0, z: 0 };
    const result = sys.validateMove('p1', slow, ORIGIN, 1000);
    expect(result).toBe('allowed');
  });

  it('detects speed hack when distance/time exceeds max speed', () => {
    const sys = makeSystem({ maxSpeedUnitsPerSecond: 12, positionToleranceUnits: 0 });
    const fast = { x: 100, y: 0, z: 0 };
    const result = sys.validateMove('p1', fast, ORIGIN, 1000);
    expect(result).not.toBe('allowed');
  });

  it('tolerates speed within positionToleranceUnits margin', () => {
    const sys = makeSystem({ maxSpeedUnitsPerSecond: 12, positionToleranceUnits: 2 });
    const borderline = { x: 13, y: 0, z: 0 };
    const result = sys.validateMove('p1', borderline, ORIGIN, 1000);
    expect(result).toBe('allowed');
  });
});

// ── Teleport Detection ────────────────────────────────────────────────

describe('teleport detection', () => {
  it('detects instant position jump over threshold', () => {
    const sys = makeSystem({ teleportThresholdUnits: 100 });
    const teleported = { x: 200, y: 0, z: 0 };
    const result = sys.validateMove('p1', teleported, ORIGIN, 1000);
    expect(result).not.toBe('allowed');
  });

  it('allows movement just under teleport threshold', () => {
    const sys = makeSystem({ teleportThresholdUnits: 100, maxSpeedUnitsPerSecond: 200 });
    const near = { x: 99, y: 0, z: 0 };
    const result = sys.validateMove('p1', near, ORIGIN, 1000);
    expect(result).toBe('allowed');
  });
});

// ── Rapid Fire Detection ──────────────────────────────────────────────

describe('rapid fire detection', () => {
  it('allows actions within rate limit', () => {
    const sys = makeSystem({ maxActionsPerSecond: 10 });
    sys.validateAction('p1', 'shoot', 1);
    const result = sys.validateAction('p1', 'shoot', 2);
    expect(result).not.toBe('rejected');
  });

  it('detects rapid fire when same action exceeds rate limit', () => {
    const sys = makeSystem({ maxActionsPerSecond: 1 });
    sys.validateAction('p1', 'shoot', 1);
    const result = sys.validateAction('p1', 'shoot', 2);
    expect(result).not.toBe('allowed');
  });

  it('allows different action types without rate limiting each other', () => {
    const sys = makeSystem({ maxActionsPerSecond: 1 });
    sys.validateAction('p1', 'shoot', 1);
    const result = sys.validateAction('p1', 'jump', 1);
    expect(result).toBe('allowed');
  });
});

// ── Sequence Replay Detection ─────────────────────────────────────────

describe('sequence replay detection', () => {
  it('detects replayed sequence number', () => {
    const sys = makeSystem();
    sys.validateAction('p1', 'shoot', 5);
    const result = sys.validateAction('p1', 'shoot', 5);
    expect(result).not.toBe('allowed');
  });

  it('detects sequence number going backwards', () => {
    const sys = makeSystem();
    sys.validateAction('p1', 'shoot', 10);
    const result = sys.validateAction('p1', 'shoot', 9);
    expect(result).not.toBe('allowed');
  });
});

// ── Warn / Kick / Ban Escalation ──────────────────────────────────────

describe('escalation tiers', () => {
  it('returns warn penalty once threshold reached', () => {
    const sys = makeSystem({ warnThreshold: 3, kickThreshold: 100, banThreshold: 200 });
    const tele = { x: 500, y: 0, z: 0 };
    sys.validateMove('p1', tele, ORIGIN, 1000);
    const summary = sys.getSummary('p1');
    expect(summary.activePenalty).toBe('warn');
  });

  it('returns kick penalty at kick threshold', () => {
    const sys = makeSystem({ warnThreshold: 1, kickThreshold: 7, banThreshold: 100 });
    const tele = { x: 500, y: 0, z: 0 };
    for (let i = 0; i < 2; i++) {
      sys.validateMove('p1', tele, ORIGIN, 1000);
    }
    const summary = sys.getSummary('p1');
    expect(summary.activePenalty).toBe('kick');
  });

  it('bans player at ban threshold', () => {
    const sys = makeSystem({ warnThreshold: 1, kickThreshold: 2, banThreshold: 8 });
    const tele = { x: 500, y: 0, z: 0 };
    for (let i = 0; i < 3; i++) {
      sys.validateMove('p1', tele, ORIGIN, 1000);
    }
    expect(sys.isBanned('p1')).toBe(true);
  });
});

// ── Ban Expiry ────────────────────────────────────────────────────────

describe('ban expiry', () => {
  it('expires ban and reduces score after banDurationMs', () => {
    const sys = makeSystem({
      warnThreshold: 1,
      kickThreshold: 2,
      banThreshold: 8,
      banDurationMs: 1,
    });
    const tele = { x: 500, y: 0, z: 0 };
    for (let i = 0; i < 3; i++) {
      sys.validateMove('p1', tele, ORIGIN, 1000);
    }
    expect(sys.isBanned('p1')).toBe(true);
    // Force ban to expire by waiting a tiny bit (banDurationMs = 1ms)
    const past = Date.now() + 50;
    while (Date.now() < past) { /* spin */ }
    expect(sys.isBanned('p1')).toBe(false);
  });
});

// ── Audit Log ─────────────────────────────────────────────────────────

describe('audit log', () => {
  it('returns empty audit log for unknown player', () => {
    const sys = makeSystem();
    expect(sys.getAuditLog('unknown')).toHaveLength(0);
  });

  it('records violations in audit log', () => {
    const sys = makeSystem();
    const tele = { x: 500, y: 0, z: 0 };
    sys.validateMove('p1', tele, ORIGIN, 1000);
    const log = sys.getAuditLog('p1');
    expect(log.length).toBeGreaterThan(0);
    expect(log[0]!.playerId).toBe('p1');
  });
});

// ── getSummary ────────────────────────────────────────────────────────

describe('getSummary', () => {
  it('returns zero summary for unknown player', () => {
    const sys = makeSystem();
    const summary = sys.getSummary('ghost');
    expect(summary.totalViolations).toBe(0);
    expect(summary.severityScore).toBe(0);
    expect(summary.activePenalty).toBeNull();
    expect(summary.bannedUntil).toBeNull();
    expect(summary.lastViolation).toBeNull();
  });

  it('tracks totalViolations accurately', () => {
    const sys = makeSystem({ maxActionsPerSecond: 1 });
    sys.validateAction('p1', 'fire', 1);
    sys.validateAction('p1', 'fire', 2); // rapid fire
    const summary = sys.getSummary('p1');
    expect(summary.totalViolations).toBeGreaterThanOrEqual(1);
  });
});

// ── clearPlayer ────────────────────────────────────────────────────────

describe('clearPlayer', () => {
  it('resets all player data after clearPlayer', () => {
    const sys = makeSystem({ maxActionsPerSecond: 1 });
    sys.validateAction('p1', 'fire', 1);
    sys.validateAction('p1', 'fire', 2);
    sys.clearPlayer('p1');
    const summary = sys.getSummary('p1');
    expect(summary.totalViolations).toBe(0);
    expect(summary.activePenalty).toBeNull();
  });
});

// ── isBanned ──────────────────────────────────────────────────────────

describe('isBanned', () => {
  it('returns false for unknown player', () => {
    const sys = makeSystem();
    expect(sys.isBanned('nobody')).toBe(false);
  });

  it('returns false for player with only warn-level violations', () => {
    const sys = makeSystem({ warnThreshold: 3, kickThreshold: 100, banThreshold: 200 });
    const tele = { x: 500, y: 0, z: 0 };
    sys.validateMove('p1', tele, ORIGIN, 1000);
    expect(sys.isBanned('p1')).toBe(false);
  });

  it('banned player gets rejected immediately without adding violations', () => {
    const sys = makeSystem({ warnThreshold: 1, kickThreshold: 2, banThreshold: 8 });
    const tele = { x: 500, y: 0, z: 0 };
    for (let i = 0; i < 3; i++) {
      sys.validateMove('p1', tele, ORIGIN, 1000);
    }
    const countBefore = sys.getAuditLog('p1').length;
    const result = sys.validateMove('p1', NEARBY, ORIGIN, 1000);
    expect(result).toBe('rejected');
    expect(sys.getAuditLog('p1').length).toBe(countBefore);
  });
});

// ── Player isolation ──────────────────────────────────────────────────

describe('player isolation', () => {
  it('violations on one player do not affect another', () => {
    const sys = makeSystem({ maxActionsPerSecond: 1 });
    sys.validateAction('bad', 'fire', 1);
    sys.validateAction('bad', 'fire', 2);
    const summary = sys.getSummary('clean');
    expect(summary.totalViolations).toBe(0);
  });
});
