import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGravityWellSystem,
  type GravityWellSystem,
  type GravityClockPort,
  type GravityIdGeneratorPort,
  type GravityLoggerPort,
} from '../gravity-well.js';

// ── Test Doubles ─────────────────────────────────────────────────

class TestClock implements GravityClockPort {
  private time = 1_000_000n;
  now(): bigint {
    return this.time;
  }
  advance(by: bigint): void {
    this.time += by;
  }
}

class TestIdGen implements GravityIdGeneratorPort {
  private counter = 0;
  generate(): string {
    return 'id-' + String(++this.counter);
  }
}

class TestLogger implements GravityLoggerPort {
  readonly infos: string[] = [];
  readonly warns: string[] = [];
  readonly errors: string[] = [];
  info(m: string): void {
    this.infos.push(m);
  }
  warn(m: string): void {
    this.warns.push(m);
  }
  error(m: string): void {
    this.errors.push(m);
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function makeSystem(): {
  sys: GravityWellSystem;
  clock: TestClock;
  logger: TestLogger;
} {
  const clock = new TestClock();
  const logger = new TestLogger();
  const sys = createGravityWellSystem({ clock, idGen: new TestIdGen(), logger });
  return { sys, clock, logger };
}

// Mass constants for test clarity
const NEGLIGIBLE_MASS = 1_000_000_000_000_000_000_000n; // 1e21 kg
const WEAK_MASS = 100_000_000_000_000_000_000_000n; // 1e23 kg
const MODERATE_MASS = 1_000_000_000_000_000_000_000_000n; // 1e24 kg
const STRONG_MASS = 10_000_000_000_000_000_000_000_000n; // 1e25 kg
const EXTREME_MASS = 100_000_000_000_000_000_000_000_000n; // 1e26 kg

// ── Tests ────────────────────────────────────────────────────────

describe('GravityWellSystem — registerWorld', () => {
  let sys: GravityWellSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('registers a world successfully', () => {
    const result = sys.registerWorld('earth');
    expect(result.success).toBe(true);
  });

  it('rejects duplicate world registration', () => {
    sys.registerWorld('earth');
    const result = sys.registerWorld('earth');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-registered');
  });
});

describe('GravityWellSystem — createWell', () => {
  let sys: GravityWellSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    sys.registerWorld('earth');
  });

  it('creates a well and returns it', () => {
    const result = sys.createWell('earth', MODERATE_MASS, 6371);
    expect(typeof result).toBe('object');
    if (typeof result === 'string') return;
    expect(result.worldId).toBe('earth');
    expect(result.massKg).toBe(MODERATE_MASS);
    expect(result.radiusKm).toBe(6371);
  });

  it('sets registeredAt on creation', () => {
    const result = sys.createWell('earth', MODERATE_MASS, 6371);
    if (typeof result === 'string') return;
    expect(result.registeredAt).toBe(1_000_000n);
  });

  it('rejects world-not-found for unregistered world', () => {
    const result = sys.createWell('mars', MODERATE_MASS, 3389);
    expect(result).toBe('world-not-found');
  });

  it('rejects zero mass', () => {
    const result = sys.createWell('earth', 0n, 6371);
    expect(result).toBe('invalid-mass');
  });

  it('rejects negative mass', () => {
    const result = sys.createWell('earth', -1n, 6371);
    expect(result).toBe('invalid-mass');
  });

  it('rejects zero radius', () => {
    const result = sys.createWell('earth', MODERATE_MASS, 0);
    expect(result).toBe('invalid-radius');
  });

  it('rejects negative radius', () => {
    const result = sys.createWell('earth', MODERATE_MASS, -100);
    expect(result).toBe('invalid-radius');
  });

  it('rejects second well for same world', () => {
    sys.createWell('earth', MODERATE_MASS, 6371);
    const result = sys.createWell('earth', STRONG_MASS, 6371);
    expect(result).toBe('already-registered');
  });
});

describe('GravityWellSystem — well strength classification', () => {
  let sys: GravityWellSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    sys.registerWorld('p1');
    sys.registerWorld('p2');
    sys.registerWorld('p3');
    sys.registerWorld('p4');
    sys.registerWorld('p5');
  });

  it('classifies NEGLIGIBLE strength below 1e23 kg', () => {
    const w = sys.createWell('p1', NEGLIGIBLE_MASS, 1000);
    if (typeof w === 'string') return;
    expect(w.strength).toBe('NEGLIGIBLE');
    expect(w.transitCostMultiplier).toBe(1.0);
  });

  it('classifies WEAK strength at 1e23 kg', () => {
    const w = sys.createWell('p2', WEAK_MASS, 1000);
    if (typeof w === 'string') return;
    expect(w.strength).toBe('WEAK');
    expect(w.transitCostMultiplier).toBe(1.1);
  });

  it('classifies MODERATE strength at 1e24 kg', () => {
    const w = sys.createWell('p3', MODERATE_MASS, 6371);
    if (typeof w === 'string') return;
    expect(w.strength).toBe('MODERATE');
    expect(w.transitCostMultiplier).toBe(1.3);
  });

  it('classifies STRONG strength at 1e25 kg', () => {
    const w = sys.createWell('p4', STRONG_MASS, 70000);
    if (typeof w === 'string') return;
    expect(w.strength).toBe('STRONG');
    expect(w.transitCostMultiplier).toBe(1.7);
  });

  it('classifies EXTREME strength at 1e26 kg', () => {
    const w = sys.createWell('p5', EXTREME_MASS, 700000);
    if (typeof w === 'string') return;
    expect(w.strength).toBe('EXTREME');
    expect(w.transitCostMultiplier).toBe(2.5);
  });
});

describe('GravityWellSystem — escape velocity', () => {
  let sys: GravityWellSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    sys.registerWorld('earth');
  });

  it('computes positive escape velocity', () => {
    const w = sys.createWell('earth', MODERATE_MASS, 6371);
    if (typeof w === 'string') return;
    expect(w.escapeVelocityKms).toBeGreaterThan(0);
  });

  it('escape velocity increases with mass', () => {
    sys.registerWorld('heavy');
    const light = sys.createWell('earth', MODERATE_MASS, 6371);
    const heavy = sys.createWell('heavy', STRONG_MASS, 6371);
    if (typeof light === 'string' || typeof heavy === 'string') return;
    expect(heavy.escapeVelocityKms).toBeGreaterThan(light.escapeVelocityKms);
  });
});

describe('GravityWellSystem — calculateTransitCost', () => {
  let sys: GravityWellSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    sys.registerWorld('earth');
    sys.registerWorld('jupiter');
    sys.createWell('earth', MODERATE_MASS, 6371); // multiplier 1.3
    sys.createWell('jupiter', EXTREME_MASS, 69911); // multiplier 2.5
  });

  it('uses multiplier 1.0 when neither world has a well', () => {
    sys.registerWorld('empty-A');
    sys.registerWorld('empty-B');
    const calc = sys.calculateTransitCost('empty-A', 'empty-B', 1000n);
    expect(calc.multiplier).toBe(1.0);
    expect(calc.adjustedCost).toBe(1000n);
  });

  it('uses the larger multiplier between from and to worlds', () => {
    const calc = sys.calculateTransitCost('earth', 'jupiter', 1000n);
    expect(calc.multiplier).toBe(2.5);
    expect(calc.fromWellId).not.toBeNull();
    expect(calc.toWellId).not.toBeNull();
  });

  it('adjustedCost = baseCost * multiplier (rounded to 2 decimal places)', () => {
    // multiplier 1.3 from earth → empty
    sys.registerWorld('void');
    const calc = sys.calculateTransitCost('earth', 'void', 1000n);
    expect(calc.multiplier).toBe(1.3);
    expect(calc.adjustedCost).toBe(1300n);
  });

  it('handles null fromWorldId', () => {
    const calc = sys.calculateTransitCost(null, 'earth', 100n);
    expect(calc.fromWellId).toBeNull();
    expect(calc.multiplier).toBe(1.3);
  });

  it('handles null toWorldId', () => {
    const calc = sys.calculateTransitCost('jupiter', null, 100n);
    expect(calc.toWellId).toBeNull();
    expect(calc.multiplier).toBe(2.5);
  });

  it('returns base cost unchanged in calc structure', () => {
    const calc = sys.calculateTransitCost('earth', 'jupiter', 500n);
    expect(calc.baseCost).toBe(500n);
  });
});

describe('GravityWellSystem — queries', () => {
  let sys: GravityWellSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    sys.registerWorld('earth');
    sys.registerWorld('mars');
    sys.createWell('earth', MODERATE_MASS, 6371);
    sys.createWell('mars', WEAK_MASS, 3389);
  });

  it('getWellForWorld returns the well', () => {
    const well = sys.getWellForWorld('earth');
    expect(well?.worldId).toBe('earth');
  });

  it('getWellForWorld returns undefined for world without well', () => {
    sys.registerWorld('empty');
    expect(sys.getWellForWorld('empty')).toBeUndefined();
  });

  it('getWell returns well by id', () => {
    const well = sys.getWellForWorld('earth');
    if (well === undefined) return;
    expect(sys.getWell(well.wellId)?.worldId).toBe('earth');
  });

  it('getWell returns undefined for unknown id', () => {
    expect(sys.getWell('no-such-id')).toBeUndefined();
  });

  it('listWells returns all wells', () => {
    expect(sys.listWells()).toHaveLength(2);
  });

  it('getStats returns correct totals', () => {
    const stats = sys.getStats();
    expect(stats.totalWells).toBe(2);
    expect(stats.byStrength['MODERATE']).toBe(1);
    expect(stats.byStrength['WEAK']).toBe(1);
    expect(stats.avgEscapeVelocity).toBeGreaterThan(0);
  });
});
