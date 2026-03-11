import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStarMapSystem,
  type StarMapSystem,
  type StarMapClockPort,
  type StarMapIdGeneratorPort,
  type StarMapLoggerPort,
  type StarCoordinates,
} from '../star-map.js';

// ── Test Doubles ─────────────────────────────────────────────────

class TestClock implements StarMapClockPort {
  private time = 1_000_000n;
  now(): bigint {
    return this.time;
  }
  advance(by: bigint): void {
    this.time += by;
  }
}

class TestIdGen implements StarMapIdGeneratorPort {
  private counter = 0;
  generate(): string {
    return 'id-' + String(++this.counter);
  }
}

class TestLogger implements StarMapLoggerPort {
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
  sys: StarMapSystem;
  clock: TestClock;
  logger: TestLogger;
} {
  const clock = new TestClock();
  const logger = new TestLogger();
  const sys = createStarMapSystem({ clock, idGen: new TestIdGen(), logger });
  return { sys, clock, logger };
}

const ORIGIN: StarCoordinates = { x: 0, y: 0, z: 0 };
const NEAR: StarCoordinates = { x: 3, y: 4, z: 0 }; // distance = 5
const FAR: StarCoordinates = { x: 0, y: 0, z: 100 }; // distance = 100

// ── Tests ────────────────────────────────────────────────────────

describe('StarMapSystem — registerStar', () => {
  let sys: StarMapSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('registers a star and returns it', () => {
    const result = sys.registerStar('sol', 'Sol', 'G', 1.0, ORIGIN);
    expect(typeof result).toBe('object');
    if (typeof result === 'string') return;
    expect(result.starId).toBe('sol');
    expect(result.name).toBe('Sol');
    expect(result.starClass).toBe('G');
    expect(result.luminosity).toBe(1.0);
    expect(result.orbitingWorldIds).toHaveLength(0);
  });

  it('sets registeredAt on creation', () => {
    const result = sys.registerStar('sol', 'Sol', 'G', 1.0, ORIGIN);
    if (typeof result === 'string') return;
    expect(result.registeredAt).toBe(1_000_000n);
  });

  it('rejects duplicate star id', () => {
    sys.registerStar('sol', 'Sol', 'G', 1.0, ORIGIN);
    const result = sys.registerStar('sol', 'Sol Duplicate', 'G', 1.0, ORIGIN);
    expect(result).toBe('already-registered');
  });

  it('rejects non-finite coordinate components', () => {
    const result = sys.registerStar('bad', 'Bad', 'M', 0.1, { x: Infinity, y: 0, z: 0 });
    expect(result).toBe('invalid-coordinates');
  });

  it('rejects NaN coordinate components', () => {
    const result = sys.registerStar('bad', 'Bad', 'M', 0.1, { x: NaN, y: 0, z: 0 });
    expect(result).toBe('invalid-coordinates');
  });

  it('rejects luminosity below minimum', () => {
    const result = sys.registerStar('dim', 'Dim', 'M', 0.00001, ORIGIN);
    expect(result).toBe('invalid-coordinates');
  });

  it('rejects luminosity above maximum', () => {
    const result = sys.registerStar('bright', 'Bright', 'O', 2_000_000, ORIGIN);
    expect(result).toBe('invalid-coordinates');
  });

  it('accepts boundary luminosity values', () => {
    const r1 = sys.registerStar('min', 'Min', 'M', 0.0001, ORIGIN);
    const r2 = sys.registerStar('max', 'Max', 'O', 1_000_000, NEAR);
    expect(typeof r1).toBe('object');
    expect(typeof r2).toBe('object');
  });
});

describe('StarMapSystem — registerWorld', () => {
  let sys: StarMapSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    sys.registerStar('sol', 'Sol', 'G', 1.0, ORIGIN);
  });

  it('registers a world to a star', () => {
    const result = sys.registerWorld('earth', 'sol');
    expect(result.success).toBe(true);
    const star = sys.getStar('sol');
    expect(star?.orbitingWorldIds).toContain('earth');
  });

  it('returns star-not-found for unknown star', () => {
    const result = sys.registerWorld('earth', 'unknown-star');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('star-not-found');
  });

  it('getWorldStar returns the star a world orbits', () => {
    sys.registerWorld('earth', 'sol');
    const star = sys.getWorldStar('earth');
    expect(star?.starId).toBe('sol');
  });

  it('getWorldStar returns undefined for unregistered world', () => {
    expect(sys.getWorldStar('mars')).toBeUndefined();
  });
});

describe('StarMapSystem — calculateDistance', () => {
  let sys: StarMapSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    sys.registerStar('sol', 'Sol', 'G', 1.0, ORIGIN);
    sys.registerStar('near-star', 'Near', 'K', 0.5, NEAR);
    sys.registerStar('far-star', 'Far', 'M', 0.1, FAR);
  });

  it('calculates Euclidean distance between two stars', () => {
    const result = sys.calculateDistance('sol', 'near-star');
    expect(typeof result).toBe('object');
    if (typeof result === 'string') return;
    expect(result.distanceLY).toBeCloseTo(5);
  });

  it('calculates distance in the other direction (symmetric)', () => {
    const ab = sys.calculateDistance('sol', 'far-star');
    const ba = sys.calculateDistance('far-star', 'sol');
    if (typeof ab === 'string' || typeof ba === 'string') return;
    expect(ab.distanceLY).toBeCloseTo(ba.distanceLY);
  });

  it('returns star-not-found for unknown source star', () => {
    const result = sys.calculateDistance('ghost-star', 'sol');
    expect(result).toBe('star-not-found');
  });

  it('returns star-not-found for unknown destination star', () => {
    const result = sys.calculateDistance('sol', 'ghost-star');
    expect(result).toBe('star-not-found');
  });
});

describe('StarMapSystem — findNearestStars', () => {
  let sys: StarMapSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    sys.registerStar('sol', 'Sol', 'G', 1.0, ORIGIN);
    sys.registerStar('near-star', 'Near', 'K', 0.5, NEAR); // dist=5
    sys.registerStar('far-star', 'Far', 'M', 0.1, FAR); // dist=100
  });

  it('returns nearest stars sorted by distance', () => {
    const results = sys.findNearestStars('sol', 2);
    expect(results).toHaveLength(2);
    expect(results[0]?.toStarId).toBe('near-star');
    expect(results[1]?.toStarId).toBe('far-star');
  });

  it('excludes the source star', () => {
    const results = sys.findNearestStars('sol', 10);
    const ids = results.map((r) => r.toStarId);
    expect(ids).not.toContain('sol');
  });

  it('respects count limit', () => {
    const results = sys.findNearestStars('sol', 1);
    expect(results).toHaveLength(1);
  });

  it('returns empty array for unknown star', () => {
    const results = sys.findNearestStars('ghost', 5);
    expect(results).toHaveLength(0);
  });
});

describe('StarMapSystem — listStarsInRadius and getSectorSummary', () => {
  let sys: StarMapSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    sys.registerStar('sol', 'Sol', 'G', 1.0, ORIGIN);
    sys.registerStar('near-star', 'Near', 'K', 0.5, NEAR); // dist=5 from origin
    sys.registerStar('far-star', 'Far', 'M', 0.1, FAR); // dist=100 from origin
  });

  it('lists stars within radius', () => {
    const stars = sys.listStarsInRadius(ORIGIN, 10);
    expect(stars).toHaveLength(2);
  });

  it('excludes stars beyond radius', () => {
    const stars = sys.listStarsInRadius(ORIGIN, 4);
    expect(stars).toHaveLength(1);
    expect(stars[0]?.starId).toBe('sol');
  });

  it('includes stars exactly at radius boundary', () => {
    const stars = sys.listStarsInRadius(ORIGIN, 5);
    expect(stars.map((s) => s.starId)).toContain('near-star');
  });

  it('getSectorSummary returns correct totals', () => {
    const summary = sys.getSectorSummary();
    expect(summary.totalStars).toBe(3);
    expect(summary.byClass['G']).toBe(1);
    expect(summary.byClass['K']).toBe(1);
    expect(summary.byClass['M']).toBe(1);
  });

  it('getSectorSummary computes average luminosity', () => {
    const summary = sys.getSectorSummary();
    const expected = (1.0 + 0.5 + 0.1) / 3;
    expect(summary.avgLuminosity).toBeCloseTo(expected);
  });

  it('getStar returns undefined for unknown id', () => {
    expect(sys.getStar('ghost')).toBeUndefined();
  });
});
