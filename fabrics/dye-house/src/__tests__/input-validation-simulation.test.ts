/**
 * input-validation-simulation.test.ts — Server-authoritative anti-cheat layer.
 *
 * SECURITY-CRITICAL: validates client inputs against physics constraints.
 *
 * Proves that:
 *   - Legitimate movement is accepted
 *   - Speed hacks are detected and position is clamped
 *   - Teleport attempts are rejected with last-known corrected position
 *   - Sequence replays are rejected (anti-replay)
 *   - Sequence gaps are flagged
 *   - Rapid-fire action spam is rate-limited
 *   - Unknown player inputs are rejected
 *   - Violation scores accumulate correctly
 *   - Violations are reported to the sink
 */

import { describe, it, expect } from 'vitest';
import {
  createInputValidator,
  DEFAULT_VALIDATION_CONFIG,
} from '../input-validation.js';
import type {
  InputValidator,
  InputValidationConfig,
  Violation,
  ValidatedPosition,
} from '../input-validation.js';

// ── Helpers ─────────────────────────────────────────────────────

function createClock(startUs = 1_000_000n) {
  let time = startUs;
  return {
    nowMicroseconds: () => time,
    advanceUs: (us: bigint) => { time += us; },
    advanceSeconds: (s: number) => { time += BigInt(s * 1_000_000); },
    set: (us: bigint) => { time = us; },
  };
}

function createSink() {
  const violations: Violation[] = [];
  return {
    report: (v: Violation) => { violations.push(v); },
    violations,
  };
}

const ORIGIN: ValidatedPosition = { x: 0, y: 0, z: 0 };

function createTestValidator(
  configOverrides?: Partial<InputValidationConfig>,
) {
  const clock = createClock();
  const sink = createSink();
  const config = { ...DEFAULT_VALIDATION_CONFIG, ...configOverrides };
  const validator = createInputValidator(config, clock, sink);
  return { validator, clock, sink, config };
}

// ── Tests ───────────────────────────────────────────────────────

describe('InputValidator', () => {
  describe('player registration', () => {
    it('registers and removes players', () => {
      const { validator } = createTestValidator();

      validator.registerPlayer('p-1', ORIGIN);
      expect(validator.playerCount()).toBe(1);

      validator.registerPlayer('p-2', { x: 10, y: 0, z: 5 });
      expect(validator.playerCount()).toBe(2);

      validator.removePlayer('p-1');
      expect(validator.playerCount()).toBe(1);
    });

    it('unregistered player has 0 violation score', () => {
      const { validator } = createTestValidator();
      expect(validator.getViolationScore('unknown')).toBe(0);
    });
  });

  describe('legitimate movement', () => {
    it('accepts valid slow movement', () => {
      const { validator, clock } = createTestValidator();
      validator.registerPlayer('p-1', ORIGIN);

      clock.advanceSeconds(1);
      const result = validator.validateMovement(
        'p-1',
        { x: 5, y: 0, z: 0 },
        1,
        clock.nowMicroseconds(),
      );

      expect(result.valid).toBe(true);
      expect(result.violation).toBeUndefined();
    });

    it('accepts movement at exactly max speed', () => {
      const { validator, clock, config } = createTestValidator();
      validator.registerPlayer('p-1', ORIGIN);

      clock.advanceSeconds(1);
      // Exactly max speed — should pass (tolerance allows slightly above)
      const result = validator.validateMovement(
        'p-1',
        { x: config.maxSpeedUnitsPerSecond, y: 0, z: 0 },
        1,
        clock.nowMicroseconds(),
      );

      expect(result.valid).toBe(true);
    });

    it('accepts stationary player', () => {
      const { validator, clock } = createTestValidator();
      validator.registerPlayer('p-1', { x: 50, y: 10, z: 3 });

      clock.advanceSeconds(1);
      const result = validator.validateMovement(
        'p-1',
        { x: 50, y: 10, z: 3 },
        1,
        clock.nowMicroseconds(),
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('speed hack detection', () => {
    it('detects movement faster than max speed', () => {
      const { validator, clock, sink, config } = createTestValidator();
      validator.registerPlayer('p-1', ORIGIN);

      clock.advanceSeconds(1);
      // Move 50 units in 1 second (max is 12 + tolerance)
      const result = validator.validateMovement(
        'p-1',
        { x: 50, y: 0, z: 0 },
        1,
        clock.nowMicroseconds(),
      );

      expect(result.valid).toBe(false);
      expect(result.violation?.type).toBe('speed_hack');
      expect(result.correctedPosition).toBeDefined();

      // Corrected position should be clamped to max legal distance
      const corrected = result.correctedPosition!;
      const clampedDist = Math.sqrt(corrected.x ** 2 + corrected.y ** 2 + corrected.z ** 2);
      expect(clampedDist).toBeCloseTo(config.maxSpeedUnitsPerSecond, 1);

      // Violation reported to sink
      expect(sink.violations).toHaveLength(1);
      expect(sink.violations[0]!.type).toBe('speed_hack');
    });

    it('accumulates violation score for repeated speed hacks', () => {
      const { validator, clock } = createTestValidator();
      validator.registerPlayer('p-1', ORIGIN);

      for (let i = 1; i <= 3; i++) {
        clock.advanceSeconds(1);
        validator.validateMovement(
          'p-1',
          { x: i * 200, y: 0, z: 0 },
          i,
          clock.nowMicroseconds(),
        );
      }

      // Each speed hack adds 0.6, but the first may be teleport (1.0) if > 100
      expect(validator.getViolationScore('p-1')).toBeGreaterThan(0);
    });
  });

  describe('teleport detection', () => {
    it('rejects teleport beyond threshold', () => {
      const { validator, clock, sink, config } = createTestValidator();
      validator.registerPlayer('p-1', ORIGIN);

      clock.advanceSeconds(10);
      // Move 500 units — well beyond teleport threshold (100)
      const result = validator.validateMovement(
        'p-1',
        { x: 500, y: 0, z: 0 },
        1,
        clock.nowMicroseconds(),
      );

      expect(result.valid).toBe(false);
      expect(result.violation?.type).toBe('teleport');
      expect(result.violation?.severity).toBe(1.0);

      // Corrected position is LAST KNOWN position (origin)
      expect(result.correctedPosition).toEqual(ORIGIN);

      expect(sink.violations[0]!.type).toBe('teleport');
    });

    it('teleport adds 1.0 to violation score', () => {
      const { validator, clock } = createTestValidator();
      validator.registerPlayer('p-1', ORIGIN);

      clock.advanceSeconds(1);
      validator.validateMovement('p-1', { x: 500, y: 0, z: 0 }, 1, clock.nowMicroseconds());

      expect(validator.getViolationScore('p-1')).toBe(1.0);
    });
  });

  describe('sequence integrity', () => {
    it('rejects sequence replay (same sequence number)', () => {
      const { validator, clock, sink } = createTestValidator();
      validator.registerPlayer('p-1', ORIGIN);

      clock.advanceSeconds(1);
      validator.validateMovement('p-1', { x: 1, y: 0, z: 0 }, 5, clock.nowMicroseconds());

      clock.advanceSeconds(1);
      const replay = validator.validateMovement('p-1', { x: 2, y: 0, z: 0 }, 5, clock.nowMicroseconds());

      expect(replay.valid).toBe(false);
      expect(replay.violation?.type).toBe('sequence_replay');
    });

    it('rejects decreasing sequence number', () => {
      const { validator, clock } = createTestValidator();
      validator.registerPlayer('p-1', ORIGIN);

      clock.advanceSeconds(1);
      validator.validateMovement('p-1', { x: 1, y: 0, z: 0 }, 10, clock.nowMicroseconds());

      clock.advanceSeconds(1);
      const result = validator.validateMovement('p-1', { x: 2, y: 0, z: 0 }, 3, clock.nowMicroseconds());

      expect(result.valid).toBe(false);
      expect(result.violation?.type).toBe('sequence_replay');
    });

    it('flags sequence gaps exceeding threshold', () => {
      const { validator, clock, sink } = createTestValidator({
        maxSequenceGap: 10,
      });
      validator.registerPlayer('p-1', ORIGIN);

      clock.advanceSeconds(1);
      validator.validateMovement('p-1', { x: 1, y: 0, z: 0 }, 1, clock.nowMicroseconds());

      clock.advanceSeconds(1);
      // Jump from seq 1 to seq 100 — gap of 99, exceeds max 10
      validator.validateMovement('p-1', { x: 2, y: 0, z: 0 }, 100, clock.nowMicroseconds());

      // Gap is flagged but movement may still be valid if speed check passes
      expect(sink.violations.some(v => v.type === 'sequence_gap')).toBe(true);
      expect(validator.getViolationScore('p-1')).toBeGreaterThan(0);
    });

    it('allows sequential increments without gap violation', () => {
      const { validator, clock, sink } = createTestValidator();
      validator.registerPlayer('p-1', ORIGIN);

      for (let i = 1; i <= 5; i++) {
        clock.advanceSeconds(1);
        validator.validateMovement('p-1', { x: i, y: 0, z: 0 }, i, clock.nowMicroseconds());
      }

      expect(sink.violations.filter(v => v.type === 'sequence_gap')).toHaveLength(0);
    });
  });

  describe('action rate limiting', () => {
    it('accepts actions within rate limit', () => {
      const { validator, clock } = createTestValidator({ maxActionsPerSecond: 5 });
      validator.registerPlayer('p-1', ORIGIN);

      for (let i = 0; i < 5; i++) {
        clock.advanceUs(100_000n); // 0.1s each
        const result = validator.validateAction('p-1', 42, clock.nowMicroseconds());
        expect(result.valid).toBe(true);
      }
    });

    it('rejects rapid-fire exceeding rate limit', () => {
      const { validator, clock, sink } = createTestValidator({ maxActionsPerSecond: 3 });
      validator.registerPlayer('p-1', ORIGIN);

      // Fire 4 actions within 1 second
      for (let i = 0; i < 3; i++) {
        clock.advanceUs(10_000n);
        validator.validateAction('p-1', 1, clock.nowMicroseconds());
      }

      clock.advanceUs(10_000n);
      const result = validator.validateAction('p-1', 1, clock.nowMicroseconds());

      expect(result.valid).toBe(false);
      expect(result.violation?.type).toBe('rapid_fire');
      expect(sink.violations.some(v => v.type === 'rapid_fire')).toBe(true);
    });

    it('rate limit window slides (old actions expire)', () => {
      const { validator, clock } = createTestValidator({ maxActionsPerSecond: 3 });
      validator.registerPlayer('p-1', ORIGIN);

      // Fire 3 actions
      for (let i = 0; i < 3; i++) {
        clock.advanceUs(10_000n);
        validator.validateAction('p-1', 1, clock.nowMicroseconds());
      }

      // Advance past 1-second window
      clock.advanceSeconds(2);

      // Should be allowed again
      const result = validator.validateAction('p-1', 1, clock.nowMicroseconds());
      expect(result.valid).toBe(true);
    });
  });

  describe('unknown player', () => {
    it('rejects movement from unregistered player', () => {
      const { validator, clock } = createTestValidator();

      const result = validator.validateMovement(
        'ghost',
        { x: 0, y: 0, z: 0 },
        1,
        clock.nowMicroseconds(),
      );

      expect(result.valid).toBe(false);
      expect(result.violation?.type).toBe('position_desync');
      expect(result.violation?.severity).toBe(1.0);
    });

    it('rejects action from unregistered player', () => {
      const { validator, clock } = createTestValidator();

      const result = validator.validateAction('ghost', 1, clock.nowMicroseconds());

      expect(result.valid).toBe(false);
      expect(result.violation?.type).toBe('position_desync');
    });
  });

  describe('violation reporting', () => {
    it('violations have connection ID and timestamp', () => {
      const { validator, clock, sink } = createTestValidator();
      validator.registerPlayer('conn-42', ORIGIN);

      clock.advanceSeconds(1);
      validator.validateMovement('conn-42', { x: 500, y: 0, z: 0 }, 1, clock.nowMicroseconds());

      expect(sink.violations).toHaveLength(1);
      expect(sink.violations[0]!.connectionId).toBe('conn-42');
      expect(sink.violations[0]!.timestampUs).toBe(clock.nowMicroseconds());
    });

    it('multiple violation types reported independently', () => {
      const { validator, clock, sink } = createTestValidator({
        maxSequenceGap: 5,
      });
      validator.registerPlayer('p-1', ORIGIN);

      // Sequence gap + teleport in one movement
      clock.advanceSeconds(1);
      validator.validateMovement('p-1', { x: 500, y: 0, z: 0 }, 100, clock.nowMicroseconds());

      // Should have gap + teleport violations
      const types = sink.violations.map(v => v.type);
      expect(types).toContain('sequence_gap');
      expect(types).toContain('teleport');
    });
  });

  describe('3D movement', () => {
    it('validates diagonal movement in 3D space', () => {
      const { validator, clock, config } = createTestValidator();
      validator.registerPlayer('p-1', ORIGIN);

      clock.advanceSeconds(1);
      // 3D diagonal: sqrt(4^2 + 4^2 + 4^2) = sqrt(48) ≈ 6.93 < 12 max
      const result = validator.validateMovement(
        'p-1',
        { x: 4, y: 4, z: 4 },
        1,
        clock.nowMicroseconds(),
      );

      expect(result.valid).toBe(true);
    });

    it('detects speed hack in vertical axis', () => {
      const { validator, clock, config } = createTestValidator();
      validator.registerPlayer('p-1', ORIGIN);

      clock.advanceSeconds(1);
      // Pure vertical movement: 50 units/sec > 12 max
      const result = validator.validateMovement(
        'p-1',
        { x: 0, y: 50, z: 0 },
        1,
        clock.nowMicroseconds(),
      );

      expect(result.valid).toBe(false);
      expect(result.violation?.type).toBe('speed_hack');
    });
  });
});
