import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInputValidator,
  DEFAULT_VALIDATION_CONFIG,
  type InputValidator,
  type Violation,
  type ValidatedPosition,
} from '../input-validation.js';

// ── Helpers ───────────────────────────────────────────────────────────

const ORIGIN: ValidatedPosition = { x: 0, y: 0, z: 0 };

function makeValidator(): {
  validator: InputValidator;
  violations: Violation[];
  nowUs: () => bigint;
  advanceUs: (delta: bigint) => void;
} {
  let now = 1_000_000_000n;
  const violations: Violation[] = [];
  const validator = createInputValidator(
    DEFAULT_VALIDATION_CONFIG,
    { nowMicroseconds: () => now },
    { report: (v) => { violations.push(v); } },
  );
  return {
    validator,
    violations,
    nowUs: () => now,
    advanceUs: (delta) => { now += delta; },
  };
}

// ── registerPlayer / removePlayer ──────────────────────────────────────

describe('registerPlayer', () => {
  it('increments playerCount', () => {
    const { validator } = makeValidator();
    validator.registerPlayer('c1', ORIGIN);
    expect(validator.playerCount()).toBe(1);
  });

  it('starts with violation score of 0', () => {
    const { validator } = makeValidator();
    validator.registerPlayer('c1', ORIGIN);
    expect(validator.getViolationScore('c1')).toBe(0);
  });
});

describe('removePlayer', () => {
  it('decrements playerCount', () => {
    const { validator } = makeValidator();
    validator.registerPlayer('c1', ORIGIN);
    validator.removePlayer('c1');
    expect(validator.playerCount()).toBe(0);
  });

  it('returns 0 violation score for removed player', () => {
    const { validator } = makeValidator();
    validator.registerPlayer('c1', ORIGIN);
    validator.removePlayer('c1');
    expect(validator.getViolationScore('c1')).toBe(0);
  });
});

// ── validateMovement ──────────────────────────────────────────────────

describe('validateMovement — valid movement', () => {
  let validator: InputValidator;
  let advanceUs: (d: bigint) => void;
  let nowUs: () => bigint;

  beforeEach(() => {
    ({ validator, advanceUs, nowUs } = makeValidator());
    validator.registerPlayer('c1', ORIGIN);
    advanceUs(100_000n); // 0.1s
  });

  it('accepts movement within speed limit', () => {
    const pos: ValidatedPosition = { x: 1, y: 0, z: 0 }; // 10 units/s at 0.1s → well under 12
    const result = validator.validateMovement('c1', pos, 1, nowUs());
    expect(result.valid).toBe(true);
    expect(result.violation).toBeUndefined();
  });
});

describe('validateMovement — sequence replay', () => {
  it('rejects a sequence number <= last seen', () => {
    const { validator, advanceUs, nowUs, violations } = makeValidator();
    validator.registerPlayer('c1', ORIGIN);
    advanceUs(100_000n);
    validator.validateMovement('c1', { x: 1, y: 0, z: 0 }, 5, nowUs());
    advanceUs(100_000n);
    const result = validator.validateMovement('c1', { x: 2, y: 0, z: 0 }, 5, nowUs());
    expect(result.valid).toBe(false);
    expect(result.violation?.type).toBe('sequence_replay');
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe('validateMovement — teleport detection', () => {
  it('rejects movement exceeding teleport threshold', () => {
    const { validator, advanceUs, nowUs, violations } = makeValidator();
    validator.registerPlayer('c1', ORIGIN);
    advanceUs(100_000n);
    const far: ValidatedPosition = { x: 150, y: 0, z: 0 }; // 150 > 100 threshold
    const result = validator.validateMovement('c1', far, 1, nowUs());
    expect(result.valid).toBe(false);
    expect(result.violation?.type).toBe('teleport');
    expect(result.correctedPosition).toEqual(ORIGIN);
    expect(violations.some((v) => v.type === 'teleport')).toBe(true);
  });
});

describe('validateMovement — speed hack', () => {
  it('rejects movement that exceeds max speed and clamps position', () => {
    const { validator, advanceUs, nowUs, violations } = makeValidator();
    validator.registerPlayer('c1', ORIGIN);
    advanceUs(1_000_000n); // 1 second
    // 12 units/s max + some tolerance; 80 units in 1s is a speed hack
    const fast: ValidatedPosition = { x: 80, y: 0, z: 0 };
    const result = validator.validateMovement('c1', fast, 1, nowUs());
    expect(result.valid).toBe(false);
    expect(result.violation?.type).toBe('speed_hack');
    expect(result.correctedPosition).toBeDefined();
    expect((result.correctedPosition?.x ?? 0)).toBeLessThan(80);
    expect(violations.some((v) => v.type === 'speed_hack')).toBe(true);
  });
});

describe('validateMovement — unknown player', () => {
  it('returns invalid for unregistered connection', () => {
    const { validator, nowUs } = makeValidator();
    const result = validator.validateMovement('ghost', ORIGIN, 1, nowUs());
    expect(result.valid).toBe(false);
  });
});

// ── validateAction ────────────────────────────────────────────────────

describe('validateAction — valid', () => {
  it('accepts actions within rate limit', () => {
    const { validator, nowUs } = makeValidator();
    validator.registerPlayer('c1', ORIGIN);
    const result = validator.validateAction('c1', 1, nowUs());
    expect(result.valid).toBe(true);
  });
});

describe('validateAction — rapid fire', () => {
  it('rejects when rate limit exceeded', () => {
    const { validator, violations } = makeValidator();
    validator.registerPlayer('c1', ORIGIN);
    // Fire max+1 actions at the same timestamp to trigger rate limit
    const ts = 1_000_000_000n;
    for (let i = 0; i <= DEFAULT_VALIDATION_CONFIG.maxActionsPerSecond; i++) {
      validator.validateAction('c1', i, ts);
    }
    expect(violations.some((v) => v.type === 'rapid_fire')).toBe(true);
  });
});

describe('validateAction — unknown player', () => {
  it('returns invalid for unregistered connection', () => {
    const { validator, nowUs } = makeValidator();
    const result = validator.validateAction('ghost', 1, nowUs());
    expect(result.valid).toBe(false);
  });
});

// ── getViolationScore ─────────────────────────────────────────────────

describe('getViolationScore', () => {
  it('accumulates score after violations', () => {
    const { validator, advanceUs, nowUs } = makeValidator();
    validator.registerPlayer('c1', ORIGIN);
    advanceUs(100_000n);
    // Trigger a teleport violation (+1.0 score)
    validator.validateMovement('c1', { x: 150, y: 0, z: 0 }, 1, nowUs());
    expect(validator.getViolationScore('c1')).toBeGreaterThan(0);
  });
});
