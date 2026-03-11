import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorldPhysicsState,
  registerWorldPhysics,
  updatePhysics,
  getModifiers,
  validatePhysics,
  compareWorlds,
  getPhysicsReport,
  setConstraint,
  getPhysics,
  getConstraint,
  getAllPhysics,
  getWorldsByGravityClass,
  getWorldsByAtmosphere,
  getHabitableWorlds,
  removePhysics,
  removeConstraint,
  type Clock,
  type IdGenerator,
  type Logger,
  type WorldPhysicsState,
} from '../world-physics.js';

// --- Test Doubles ---

class TestClock implements Clock {
  private time = 1000000000000n;

  nowMicros(): bigint {
    return this.time;
  }

  advance(micros: bigint): void {
    this.time += micros;
  }
}

class TestIdGenerator implements IdGenerator {
  private counter = 0;

  nextId(): string {
    this.counter += 1;
    return 'id-' + String(this.counter);
  }
}

class TestLogger implements Logger {
  logs: string[] = [];

  info(message: string): void {
    this.logs.push('INFO: ' + message);
  }

  warn(message: string): void {
    this.logs.push('WARN: ' + message);
  }

  error(message: string): void {
    this.logs.push('ERROR: ' + message);
  }
}

// --- Helper Functions ---

function createTestState(): WorldPhysicsState {
  return createWorldPhysicsState(new TestClock(), new TestIdGenerator(), new TestLogger());
}

// --- Tests ---

describe('WorldPhysics', () => {
  let state: WorldPhysicsState;

  beforeEach(() => {
    state = createTestState();
  });

  describe('createWorldPhysicsState', () => {
    it('should create initial state', () => {
      expect(state.physics.size).toBe(0);
      expect(state.constraints.size).toBe(0);
      expect(state.clock).toBeDefined();
      expect(state.idGen).toBeDefined();
      expect(state.logger).toBeDefined();
    });

    it('should accept custom ports', () => {
      const customClock = new TestClock();
      const customIdGen = new TestIdGenerator();
      const customLogger = new TestLogger();

      const custom = createWorldPhysicsState(customClock, customIdGen, customLogger);

      expect(custom.clock).toBe(customClock);
      expect(custom.idGen).toBe(customIdGen);
      expect(custom.logger).toBe(customLogger);
    });
  });

  describe('registerWorldPhysics', () => {
    it('should register earth-like physics', () => {
      const result = registerWorldPhysics(
        state,
        'world-1',
        9.81,
        'STANDARD',
        24,
        1.0,
        0.5,
        101.325,
        288,
      );

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
      expect(result.gravity).toBe(9.81);
      expect(result.gravityClass).toBe('STANDARD');
      expect(result.atmosphere).toBe('STANDARD');
      expect(result.dayLengthHours).toBe(24);
      expect(result.temperatureKelvin).toBe(288);
    });

    it('should classify micro gravity', () => {
      const result = registerWorldPhysics(state, 'world-1', 1.0, 'VACUUM', 24, 0.0, 5.0, 0.0, 100);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.gravityClass).toBe('MICRO');
    });

    it('should classify low gravity', () => {
      const result = registerWorldPhysics(state, 'world-1', 5.0, 'THIN', 24, 0.5, 1.0, 20.0, 250);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.gravityClass).toBe('LOW');
    });

    it('should classify high gravity', () => {
      const result = registerWorldPhysics(
        state,
        'world-1',
        15.0,
        'DENSE',
        24,
        1.5,
        0.3,
        150.0,
        300,
      );

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.gravityClass).toBe('HIGH');
    });

    it('should classify extreme gravity', () => {
      const result = registerWorldPhysics(
        state,
        'world-1',
        25.0,
        'CRUSHING',
        24,
        2.0,
        0.1,
        2000.0,
        350,
      );

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.gravityClass).toBe('EXTREME');
    });

    it('should return error for invalid gravity', () => {
      const result = registerWorldPhysics(
        state,
        'world-1',
        0.05,
        'STANDARD',
        24,
        1.0,
        0.5,
        101.325,
        288,
      );

      expect(result).toBe('invalid-gravity');
    });

    it('should return error for excessive gravity', () => {
      const result = registerWorldPhysics(
        state,
        'world-1',
        35.0,
        'CRUSHING',
        24,
        1.0,
        0.5,
        2000.0,
        300,
      );

      expect(result).toBe('invalid-gravity');
    });

    it('should return error for invalid atmosphere', () => {
      const result = registerWorldPhysics(
        state,
        'world-1',
        9.81,
        'INVALID' as never,
        24,
        1.0,
        0.5,
        101.325,
        288,
      );

      expect(result).toBe('invalid-atmosphere');
    });

    it('should return error for invalid day length', () => {
      const result = registerWorldPhysics(
        state,
        'world-1',
        9.81,
        'STANDARD',
        0,
        1.0,
        0.5,
        101.325,
        288,
      );

      expect(result).toBe('invalid-day-length');
    });

    it('should return error for excessive day length', () => {
      const result = registerWorldPhysics(
        state,
        'world-1',
        9.81,
        'STANDARD',
        1500,
        1.0,
        0.5,
        101.325,
        288,
      );

      expect(result).toBe('invalid-day-length');
    });

    it('should return error for invalid temperature', () => {
      const result = registerWorldPhysics(
        state,
        'world-1',
        9.81,
        'STANDARD',
        24,
        1.0,
        0.5,
        101.325,
        -10,
      );

      expect(result).toBe('invalid-temperature');
    });

    it('should return error for incoherent vacuum with pressure', () => {
      const result = registerWorldPhysics(state, 'world-1', 5.0, 'VACUUM', 24, 0.0, 5.0, 50.0, 100);

      expect(result).toBe('incoherent-physics');
    });

    it('should return error for incoherent crushing without pressure', () => {
      const result = registerWorldPhysics(
        state,
        'world-1',
        15.0,
        'CRUSHING',
        24,
        1.5,
        0.1,
        50.0,
        350,
      );

      expect(result).toBe('incoherent-physics');
    });

    it('should return error for low gravity crushing atmosphere', () => {
      const result = registerWorldPhysics(
        state,
        'world-1',
        0.5,
        'CRUSHING',
        24,
        0.1,
        0.5,
        2000.0,
        300,
      );

      expect(result).toBe('incoherent-physics');
    });

    it('should log registration', () => {
      const logger = state.logger as TestLogger;
      registerWorldPhysics(state, 'world-1', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);

      const hasLog = logger.logs.some((log) => log.includes('Registered physics'));
      expect(hasLog).toBe(true);
    });

    it('should support all atmosphere types', () => {
      registerWorldPhysics(state, 'world-1', 1.0, 'VACUUM', 24, 0.0, 5.0, 0.0, 100);
      registerWorldPhysics(state, 'world-2', 5.0, 'THIN', 24, 0.5, 1.0, 20.0, 250);
      registerWorldPhysics(state, 'world-3', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);
      registerWorldPhysics(state, 'world-4', 12.0, 'DENSE', 24, 1.2, 0.3, 200.0, 310);
      registerWorldPhysics(state, 'world-5', 8.0, 'TOXIC', 24, 0.8, 3.0, 80.0, 320);
      registerWorldPhysics(state, 'world-6', 20.0, 'CRUSHING', 24, 2.0, 0.1, 2000.0, 400);

      expect(state.physics.size).toBe(6);
    });

    it('should preserve created time on update', () => {
      const clock = state.clock as TestClock;

      const first = registerWorldPhysics(
        state,
        'world-1',
        9.81,
        'STANDARD',
        24,
        1.0,
        0.5,
        101.325,
        288,
      );
      expect(typeof first).not.toBe('string');
      if (typeof first === 'string') return;

      clock.advance(1000000n);

      const second = registerWorldPhysics(
        state,
        'world-1',
        10.0,
        'STANDARD',
        24,
        1.0,
        0.5,
        101.325,
        288,
      );
      expect(typeof second).not.toBe('string');
      if (typeof second === 'string') return;

      expect(second.createdAt).toBe(first.createdAt);
      expect(second.updatedAt).toBeGreaterThan(first.updatedAt);
    });

    it('should respect constraints', () => {
      setConstraint(state, 'world-1', 8.0, 12.0, ['STANDARD', 'DENSE'], 20, 30);

      const result = registerWorldPhysics(
        state,
        'world-1',
        5.0,
        'STANDARD',
        24,
        1.0,
        0.5,
        101.325,
        288,
      );

      expect(result).toBe('constraint-violation');
    });
  });

  describe('updatePhysics', () => {
    beforeEach(() => {
      registerWorldPhysics(state, 'world-1', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);
    });

    it('should update gravity', () => {
      const result = updatePhysics(state, 'world-1', { gravity: 12.0 });

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.gravity).toBe(12.0);
    });

    it('should update atmosphere', () => {
      const result = updatePhysics(state, 'world-1', { atmosphere: 'DENSE' });

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.atmosphere).toBe('DENSE');
    });

    it('should update day length', () => {
      const result = updatePhysics(state, 'world-1', { dayLengthHours: 30 });

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.dayLengthHours).toBe(30);
    });

    it('should update multiple fields', () => {
      const result = updatePhysics(state, 'world-1', {
        gravity: 11.0,
        dayLengthHours: 28,
        temperatureKelvin: 300,
      });

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.gravity).toBe(11.0);
      expect(result.dayLengthHours).toBe(28);
      expect(result.temperatureKelvin).toBe(300);
    });

    it('should return error for non-existent world', () => {
      const result = updatePhysics(state, 'fake-world', { gravity: 12.0 });

      expect(result).toBe('physics-not-found');
    });

    it('should preserve unchanged fields', () => {
      const result = updatePhysics(state, 'world-1', { gravity: 12.0 });

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.atmosphere).toBe('STANDARD');
      expect(result.dayLengthHours).toBe(24);
    });
  });

  describe('getModifiers', () => {
    beforeEach(() => {
      registerWorldPhysics(state, 'world-1', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);
    });

    it('should compute modifiers', () => {
      const result = getModifiers(state, 'world-1');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
      expect(result.fallDamageMultiplier).toBeCloseTo(0.9);
      expect(result.staminaDrainModifier).toBeCloseTo(1.0);
      expect(result.travelSpeedModifier).toBeCloseTo(1.0);
      expect(result.jumpHeightModifier).toBeCloseTo(1.0);
      expect(result.carryCapacityModifier).toBeCloseTo(1.0);
      expect(result.healthRegenModifier).toBeCloseTo(1.0);
    });

    it('should return error for non-existent world', () => {
      const result = getModifiers(state, 'fake-world');

      expect(result).toBe('physics-not-found');
    });

    it('should compute low gravity modifiers', () => {
      registerWorldPhysics(state, 'world-2', 3.0, 'THIN', 24, 0.3, 1.0, 30.0, 270);

      const result = getModifiers(state, 'world-2');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.jumpHeightModifier).toBeGreaterThan(1.5);
      expect(result.carryCapacityModifier).toBeGreaterThan(1.5);
    });

    it('should compute high gravity modifiers', () => {
      registerWorldPhysics(state, 'world-3', 20.0, 'DENSE', 24, 1.5, 0.2, 200.0, 310);

      const result = getModifiers(state, 'world-3');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.fallDamageMultiplier).toBeGreaterThan(1.5);
      expect(result.staminaDrainModifier).toBeGreaterThan(1.5);
    });

    it('should apply atmosphere effects', () => {
      registerWorldPhysics(state, 'world-4', 10.0, 'VACUUM', 24, 0.0, 5.0, 0.0, 150);

      const result = getModifiers(state, 'world-4');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.healthRegenModifier).toBe(0);
      expect(result.staminaDrainModifier).toBeGreaterThan(1.5);
    });

    it('should apply temperature effects', () => {
      registerWorldPhysics(state, 'world-5', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 400);

      const result = getModifiers(state, 'world-5');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.staminaDrainModifier).toBeGreaterThan(1.2);
      expect(result.healthRegenModifier).toBeLessThan(1.0);
    });

    it('should apply radiation effects', () => {
      registerWorldPhysics(state, 'world-6', 9.81, 'STANDARD', 24, 1.0, 8.0, 101.325, 288);

      const result = getModifiers(state, 'world-6');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.healthRegenModifier).toBeLessThan(0.5);
    });
  });

  describe('validatePhysics', () => {
    it('should validate correct physics', () => {
      registerWorldPhysics(state, 'world-1', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);

      const result = validatePhysics(state, 'world-1');

      expect(result).toBe('ok');
    });

    it('should return error for non-existent world', () => {
      const result = validatePhysics(state, 'fake-world');

      expect(result).toBe('physics-not-found');
    });
  });

  describe('compareWorlds', () => {
    beforeEach(() => {
      registerWorldPhysics(state, 'world-1', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);
      registerWorldPhysics(state, 'world-2', 5.0, 'THIN', 48, 0.5, 1.0, 50.0, 250);
    });

    it('should compare two worlds', () => {
      const result = compareWorlds(state, 'world-1', 'world-2');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.gravityRatio).toBeCloseTo(1.962);
      expect(result.dayLengthRatio).toBe(0.5);
      expect(result.pressureRatio).toBeCloseTo(2.0265);
      expect(result.temperatureDiff).toBe(38);
      expect(result.atmosphereMatch).toBe(false);
    });

    it('should return error for non-existent world', () => {
      const result = compareWorlds(state, 'fake-world', 'world-1');

      expect(result).toBe('physics-not-found');
    });

    it('should detect atmosphere match', () => {
      registerWorldPhysics(state, 'world-3', 10.0, 'STANDARD', 20, 1.1, 0.4, 110.0, 295);

      const result = compareWorlds(state, 'world-1', 'world-3');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.atmosphereMatch).toBe(true);
    });
  });

  describe('getPhysicsReport', () => {
    beforeEach(() => {
      registerWorldPhysics(state, 'world-1', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);
    });

    it('should generate physics report', () => {
      const result = getPhysicsReport(state, 'world-1');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
      expect(result.physics).toBeDefined();
      expect(result.modifiers).toBeDefined();
      expect(result.habitabilityScore).toBeGreaterThan(70);
      expect(result.warnings.length).toBe(0);
    });

    it('should return error for non-existent world', () => {
      const result = getPhysicsReport(state, 'fake-world');

      expect(result).toBe('physics-not-found');
    });

    it('should include warnings for hostile conditions', () => {
      registerWorldPhysics(state, 'world-2', 25.0, 'TOXIC', 12, 2.0, 8.0, 150.0, 400);

      const result = getPhysicsReport(state, 'world-2');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.habitabilityScore).toBeLessThan(50);
    });

    it('should penalize extreme gravity', () => {
      registerWorldPhysics(state, 'world-3', 0.3, 'VACUUM', 24, 0.0, 5.0, 0.0, 100);

      const result = getPhysicsReport(state, 'world-3');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.habitabilityScore).toBeLessThan(50);
      const hasWarning = result.warnings.some((w) => w.includes('gravity'));
      expect(hasWarning).toBe(true);
    });

    it('should penalize hostile atmosphere', () => {
      registerWorldPhysics(state, 'world-4', 10.0, 'CRUSHING', 24, 1.5, 0.2, 2500.0, 350);

      const result = getPhysicsReport(state, 'world-4');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.habitabilityScore).toBeLessThan(80);
      const hasWarning = result.warnings.some((w) => w.includes('atmosphere'));
      expect(hasWarning).toBe(true);
    });

    it('should penalize extreme temperature', () => {
      registerWorldPhysics(state, 'world-5', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 450);

      const result = getPhysicsReport(state, 'world-5');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.habitabilityScore).toBeLessThan(80);
      const hasWarning = result.warnings.some((w) => w.includes('temperature'));
      expect(hasWarning).toBe(true);
    });

    it('should penalize high radiation', () => {
      registerWorldPhysics(state, 'world-6', 9.81, 'STANDARD', 24, 1.0, 7.0, 101.325, 288);

      const result = getPhysicsReport(state, 'world-6');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.habitabilityScore).toBeLessThan(90);
      const hasWarning = result.warnings.some((w) => w.includes('radiation'));
      expect(hasWarning).toBe(true);
    });
  });

  describe('setConstraint', () => {
    it('should set a constraint', () => {
      const result = setConstraint(state, 'world-1', 5.0, 15.0, ['STANDARD', 'DENSE'], 18, 36);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
      expect(result.minGravity).toBe(5.0);
      expect(result.maxGravity).toBe(15.0);
      expect(result.allowedAtmospheres).toContain('STANDARD');
      expect(result.minDayLength).toBe(18);
      expect(result.maxDayLength).toBe(36);
    });

    it('should return error for invalid gravity range', () => {
      const result = setConstraint(state, 'world-1', 15.0, 5.0, ['STANDARD'], 18, 36);

      expect(result).toBe('invalid-gravity');
    });

    it('should return error for invalid day length range', () => {
      const result = setConstraint(state, 'world-1', 5.0, 15.0, ['STANDARD'], 36, 18);

      expect(result).toBe('invalid-day-length');
    });

    it('should log constraint setting', () => {
      const logger = state.logger as TestLogger;
      setConstraint(state, 'world-1', 5.0, 15.0, ['STANDARD'], 18, 36);

      const hasLog = logger.logs.some((log) => log.includes('Set physics constraint'));
      expect(hasLog).toBe(true);
    });
  });

  describe('getPhysics', () => {
    it('should retrieve physics', () => {
      registerWorldPhysics(state, 'world-1', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);

      const result = getPhysics(state, 'world-1');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
    });

    it('should return error for non-existent world', () => {
      const result = getPhysics(state, 'fake-world');

      expect(result).toBe('physics-not-found');
    });
  });

  describe('getConstraint', () => {
    it('should retrieve constraint', () => {
      setConstraint(state, 'world-1', 5.0, 15.0, ['STANDARD'], 18, 36);

      const result = getConstraint(state, 'world-1');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
    });

    it('should return error for non-existent constraint', () => {
      const result = getConstraint(state, 'fake-world');

      expect(result).toBe('constraint-not-found');
    });
  });

  describe('getAllPhysics', () => {
    it('should get all physics', () => {
      registerWorldPhysics(state, 'world-1', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);
      registerWorldPhysics(state, 'world-2', 5.0, 'THIN', 48, 0.5, 1.0, 50.0, 250);
      registerWorldPhysics(state, 'world-3', 15.0, 'DENSE', 18, 1.5, 0.3, 200.0, 310);

      const result = getAllPhysics(state);

      expect(result.length).toBe(3);
    });

    it('should return empty for no physics', () => {
      const result = getAllPhysics(state);

      expect(result.length).toBe(0);
    });
  });

  describe('getWorldsByGravityClass', () => {
    beforeEach(() => {
      registerWorldPhysics(state, 'world-1', 1.0, 'VACUUM', 24, 0.0, 5.0, 0.0, 100);
      registerWorldPhysics(state, 'world-2', 5.0, 'THIN', 24, 0.5, 1.0, 30.0, 250);
      registerWorldPhysics(state, 'world-3', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);
      registerWorldPhysics(state, 'world-4', 15.0, 'DENSE', 24, 1.5, 0.3, 200.0, 310);
    });

    it('should get worlds by gravity class', () => {
      const result = getWorldsByGravityClass(state, 'LOW');

      expect(result.length).toBe(1);
      const first = result[0];
      if (first === undefined) return;
      expect(first.worldId).toBe('world-2');
    });

    it('should return empty for no matches', () => {
      const result = getWorldsByGravityClass(state, 'EXTREME');

      expect(result.length).toBe(0);
    });

    it('should find all gravity classes', () => {
      const micro = getWorldsByGravityClass(state, 'MICRO');
      const low = getWorldsByGravityClass(state, 'LOW');
      const standard = getWorldsByGravityClass(state, 'STANDARD');
      const high = getWorldsByGravityClass(state, 'HIGH');

      expect(micro.length).toBe(1);
      expect(low.length).toBe(1);
      expect(standard.length).toBe(1);
      expect(high.length).toBe(1);
    });
  });

  describe('getWorldsByAtmosphere', () => {
    beforeEach(() => {
      registerWorldPhysics(state, 'world-1', 1.0, 'VACUUM', 24, 0.0, 5.0, 0.0, 100);
      registerWorldPhysics(state, 'world-2', 5.0, 'THIN', 24, 0.5, 1.0, 30.0, 250);
      registerWorldPhysics(state, 'world-3', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);
      registerWorldPhysics(state, 'world-4', 9.81, 'STANDARD', 20, 0.9, 0.6, 95.0, 280);
    });

    it('should get worlds by atmosphere', () => {
      const result = getWorldsByAtmosphere(state, 'STANDARD');

      expect(result.length).toBe(2);
    });

    it('should return empty for no matches', () => {
      const result = getWorldsByAtmosphere(state, 'TOXIC');

      expect(result.length).toBe(0);
    });
  });

  describe('getHabitableWorlds', () => {
    beforeEach(() => {
      registerWorldPhysics(state, 'world-1', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);
      registerWorldPhysics(state, 'world-2', 1.0, 'VACUUM', 24, 0.0, 5.0, 0.0, 100);
      registerWorldPhysics(state, 'world-3', 25.0, 'TOXIC', 12, 2.0, 8.0, 150.0, 400);
      registerWorldPhysics(state, 'world-4', 8.0, 'STANDARD', 22, 0.9, 0.4, 98.0, 285);
    });

    it('should get habitable worlds', () => {
      const result = getHabitableWorlds(state, 70);

      expect(result.length).toBeGreaterThan(0);
      const first = result[0];
      if (first === undefined) return;
      expect(first.score).toBeGreaterThanOrEqual(70);
    });

    it('should sort by score descending', () => {
      const result = getHabitableWorlds(state, 0);

      for (let i = 0; i < result.length - 1; i++) {
        const current = result[i];
        const next = result[i + 1];
        if (current === undefined || next === undefined) continue;
        expect(current.score).toBeGreaterThanOrEqual(next.score);
      }
    });

    it('should filter by minimum score', () => {
      const result = getHabitableWorlds(state, 90);

      for (const world of result) {
        expect(world.score).toBeGreaterThanOrEqual(90);
      }
    });

    it('should return empty for impossible threshold', () => {
      const result = getHabitableWorlds(state, 150);

      expect(result.length).toBe(0);
    });
  });

  describe('removePhysics', () => {
    it('should remove physics', () => {
      registerWorldPhysics(state, 'world-1', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);

      const result = removePhysics(state, 'world-1');

      expect(result).toBe('ok');

      const check = getPhysics(state, 'world-1');
      expect(check).toBe('physics-not-found');
    });

    it('should return error for non-existent world', () => {
      const result = removePhysics(state, 'fake-world');

      expect(result).toBe('physics-not-found');
    });

    it('should log removal', () => {
      const logger = state.logger as TestLogger;
      registerWorldPhysics(state, 'world-1', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);

      removePhysics(state, 'world-1');

      const hasLog = logger.logs.some((log) => log.includes('Removed physics'));
      expect(hasLog).toBe(true);
    });
  });

  describe('removeConstraint', () => {
    it('should remove constraint', () => {
      setConstraint(state, 'world-1', 5.0, 15.0, ['STANDARD'], 18, 36);

      const result = removeConstraint(state, 'world-1');

      expect(result).toBe('ok');

      const check = getConstraint(state, 'world-1');
      expect(check).toBe('constraint-not-found');
    });

    it('should return error for non-existent constraint', () => {
      const result = removeConstraint(state, 'fake-world');

      expect(result).toBe('constraint-not-found');
    });

    it('should log removal', () => {
      const logger = state.logger as TestLogger;
      setConstraint(state, 'world-1', 5.0, 15.0, ['STANDARD'], 18, 36);

      removeConstraint(state, 'world-1');

      const hasLog = logger.logs.some((log) => log.includes('Removed constraint'));
      expect(hasLog).toBe(true);
    });
  });
});
