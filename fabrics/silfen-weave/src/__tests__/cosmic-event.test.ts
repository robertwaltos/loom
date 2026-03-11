import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCosmicEventSystem,
  type CosmicEventSystem,
  type CosmicClockPort,
  type CosmicIdGeneratorPort,
  type CosmicLoggerPort,
} from '../cosmic-event.js';

// ── Test Doubles ─────────────────────────────────────────────────

class TestClock implements CosmicClockPort {
  private time = 1_000_000n;
  now(): bigint {
    return this.time;
  }
  advance(by: bigint): void {
    this.time += by;
  }
}

class TestIdGen implements CosmicIdGeneratorPort {
  private counter = 0;
  generate(): string {
    return 'id-' + String(++this.counter);
  }
}

class TestLogger implements CosmicLoggerPort {
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
  sys: CosmicEventSystem;
  clock: TestClock;
  logger: TestLogger;
} {
  const clock = new TestClock();
  const logger = new TestLogger();
  const sys = createCosmicEventSystem({ clock, idGen: new TestIdGen(), logger });
  return { sys, clock, logger };
}

function setupWorlds(sys: CosmicEventSystem): void {
  sys.registerWorld('world-A');
  sys.registerWorld('world-B');
  sys.registerWorld('world-C');
}

// ── Tests ────────────────────────────────────────────────────────

describe('CosmicEventSystem — registerWorld', () => {
  let sys: CosmicEventSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('registers a world successfully', () => {
    const result = sys.registerWorld('world-A');
    expect(result.success).toBe(true);
  });

  it('rejects duplicate world registration', () => {
    sys.registerWorld('world-A');
    const result = sys.registerWorld('world-A');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-registered');
  });
});

describe('CosmicEventSystem — predictEvent', () => {
  let sys: CosmicEventSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupWorlds(sys);
  });

  it('predicts a valid event and returns it', () => {
    const result = sys.predictEvent('SOLAR_FLARE', 5, ['world-A'], 3_600_000_000n);
    expect(typeof result).toBe('object');
    if (typeof result === 'string') return;
    expect(result.type).toBe('SOLAR_FLARE');
    expect(result.magnitude).toBe(5);
    expect(result.status).toBe('PREDICTED');
    expect(result.activatedAt).toBeNull();
  });

  it('rejects magnitude below 1', () => {
    const result = sys.predictEvent('NEBULA_BLOOM', 0, ['world-A'], 1_000n);
    expect(result).toBe('invalid-magnitude');
  });

  it('rejects magnitude above 10', () => {
    const result = sys.predictEvent('GRAVITY_SURGE', 11, ['world-A'], 1_000n);
    expect(result).toBe('invalid-magnitude');
  });

  it('rejects non-integer magnitude', () => {
    const result = sys.predictEvent('VOID_RIFT', 5.5, ['world-A'], 1_000n);
    expect(result).toBe('invalid-magnitude');
  });

  it('rejects event with unregistered world', () => {
    const result = sys.predictEvent('SOLAR_FLARE', 5, ['world-UNKNOWN'], 1_000n);
    expect(result).toBe('world-not-found');
  });

  it('sets predictedAt on creation', () => {
    const result = sys.predictEvent('STELLAR_CONVERGENCE', 8, ['world-A', 'world-B'], 1_000n);
    if (typeof result === 'string') return;
    expect(result.predictedAt).toBe(1_000_000n);
  });

  it('stores multiple affected worlds', () => {
    const result = sys.predictEvent(
      'DARK_MATTER_WAVE',
      3,
      ['world-A', 'world-B', 'world-C'],
      1_000n,
    );
    if (typeof result === 'string') return;
    expect(result.affectedWorldIds).toHaveLength(3);
  });
});

describe('CosmicEventSystem — status transitions', () => {
  let sys: CosmicEventSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupWorlds(sys);
  });

  it('activates a PREDICTED event', () => {
    const event = sys.predictEvent('SOLAR_FLARE', 5, ['world-A'], 1_000n);
    if (typeof event === 'string') return;
    const result = sys.activateEvent(event.eventId);
    expect(result.success).toBe(true);
    expect(sys.getEvent(event.eventId)?.status).toBe('ACTIVE');
  });

  it('sets activatedAt when activating', () => {
    const event = sys.predictEvent('SOLAR_FLARE', 5, ['world-A'], 1_000n);
    if (typeof event === 'string') return;
    sys.activateEvent(event.eventId);
    expect(sys.getEvent(event.eventId)?.activatedAt).not.toBeNull();
  });

  it('rejects activating an already ACTIVE event', () => {
    const event = sys.predictEvent('SOLAR_FLARE', 5, ['world-A'], 1_000n);
    if (typeof event === 'string') return;
    sys.activateEvent(event.eventId);
    const result = sys.activateEvent(event.eventId);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-active');
  });

  it('wanes an ACTIVE event', () => {
    const event = sys.predictEvent('NEBULA_BLOOM', 3, ['world-B'], 1_000n);
    if (typeof event === 'string') return;
    sys.activateEvent(event.eventId);
    const result = sys.waneEvent(event.eventId);
    expect(result.success).toBe(true);
    expect(sys.getEvent(event.eventId)?.status).toBe('WANING');
  });

  it('ends a WANING event and sets endedAt', () => {
    const event = sys.predictEvent('GRAVITY_SURGE', 7, ['world-C'], 1_000n);
    if (typeof event === 'string') return;
    sys.activateEvent(event.eventId);
    sys.waneEvent(event.eventId);
    const result = sys.endEvent(event.eventId);
    expect(result.success).toBe(true);
    expect(sys.getEvent(event.eventId)?.status).toBe('ENDED');
    expect(sys.getEvent(event.eventId)?.endedAt).not.toBeNull();
  });

  it('returns event-not-found for unknown event', () => {
    const result = sys.activateEvent('no-such-event');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('event-not-found');
  });
});

describe('CosmicEventSystem — measureImpact', () => {
  let sys: CosmicEventSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupWorlds(sys);
  });

  it('measures impact on an ACTIVE event', () => {
    const event = sys.predictEvent('SOLAR_FLARE', 10, ['world-A'], 1_000n);
    if (typeof event === 'string') return;
    sys.activateEvent(event.eventId);
    const impact = sys.measureImpact(event.eventId, 'world-A');
    expect(typeof impact).toBe('object');
    if (typeof impact === 'string') return;
    expect(impact.effectType).toBe('radiation_burst');
    expect(impact.severity).toBeCloseTo(0.85);
    expect(impact.worldId).toBe('world-A');
    expect(impact.eventId).toBe(event.eventId);
  });

  it('severity scales with magnitude', () => {
    const event = sys.predictEvent('NEBULA_BLOOM', 5, ['world-B'], 1_000n);
    if (typeof event === 'string') return;
    sys.activateEvent(event.eventId);
    const impact = sys.measureImpact(event.eventId, 'world-B');
    if (typeof impact === 'string') return;
    expect(impact.severity).toBeCloseTo(0.425);
  });

  it('uses correct effect types per event type', () => {
    const types = [
      ['GRAVITY_SURGE', 'tidal_stress'],
      ['VOID_RIFT', 'dimensional_tear'],
      ['STELLAR_CONVERGENCE', 'gravitational_lens'],
      ['DARK_MATTER_WAVE', 'dark_matter_flux'],
    ] as const;
    for (const [evType, expectedEffect] of types) {
      const e = sys.predictEvent(evType, 4, ['world-A'], 1_000n);
      if (typeof e === 'string') continue;
      sys.activateEvent(e.eventId);
      const imp = sys.measureImpact(e.eventId, 'world-A');
      if (typeof imp === 'string') continue;
      expect(imp.effectType).toBe(expectedEffect);
    }
  });

  it('rejects impact measurement on ENDED event', () => {
    const event = sys.predictEvent('VOID_RIFT', 5, ['world-C'], 1_000n);
    if (typeof event === 'string') return;
    sys.activateEvent(event.eventId);
    sys.waneEvent(event.eventId);
    sys.endEvent(event.eventId);
    const result = sys.measureImpact(event.eventId, 'world-C');
    expect(result).toBe('event-ended');
  });

  it('rejects impact for unknown world', () => {
    const event = sys.predictEvent('SOLAR_FLARE', 5, ['world-A'], 1_000n);
    if (typeof event === 'string') return;
    sys.activateEvent(event.eventId);
    const result = sys.measureImpact(event.eventId, 'unknown-world');
    expect(result).toBe('world-not-found');
  });
});

describe('CosmicEventSystem — listEvents and getForecast', () => {
  let sys: CosmicEventSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupWorlds(sys);
  });

  it('listEvents returns all events without filters', () => {
    sys.predictEvent('SOLAR_FLARE', 5, ['world-A'], 1_000n);
    sys.predictEvent('NEBULA_BLOOM', 3, ['world-B'], 1_000n);
    expect(sys.listEvents()).toHaveLength(2);
  });

  it('listEvents filters by worldId', () => {
    sys.predictEvent('SOLAR_FLARE', 5, ['world-A'], 1_000n);
    sys.predictEvent('NEBULA_BLOOM', 3, ['world-B'], 1_000n);
    expect(sys.listEvents('world-A')).toHaveLength(1);
  });

  it('listEvents filters by status', () => {
    const e1 = sys.predictEvent('SOLAR_FLARE', 5, ['world-A'], 1_000n);
    sys.predictEvent('NEBULA_BLOOM', 3, ['world-B'], 1_000n);
    if (typeof e1 === 'string') return;
    sys.activateEvent(e1.eventId);
    expect(sys.listEvents(undefined, 'ACTIVE')).toHaveLength(1);
    expect(sys.listEvents(undefined, 'PREDICTED')).toHaveLength(1);
  });

  it('getForecast counts upcoming events', () => {
    sys.predictEvent('SOLAR_FLARE', 5, ['world-A'], 1_000n);
    sys.predictEvent('NEBULA_BLOOM', 3, ['world-B'], 1_000n);
    const forecast = sys.getForecast();
    expect(forecast.upcomingCount).toBe(2);
    expect(forecast.activeCount).toBe(0);
  });

  it('getForecast counts active events (ACTIVE + WANING)', () => {
    const e1 = sys.predictEvent('SOLAR_FLARE', 5, ['world-A'], 1_000n);
    const e2 = sys.predictEvent('NEBULA_BLOOM', 3, ['world-B'], 1_000n);
    if (typeof e1 === 'string' || typeof e2 === 'string') return;
    sys.activateEvent(e1.eventId);
    sys.activateEvent(e2.eventId);
    sys.waneEvent(e2.eventId);
    const forecast = sys.getForecast();
    expect(forecast.activeCount).toBe(2);
  });

  it('getForecast counts high-magnitude non-ended events', () => {
    const e1 = sys.predictEvent('SOLAR_FLARE', 7, ['world-A'], 1_000n);
    const e2 = sys.predictEvent('NEBULA_BLOOM', 9, ['world-B'], 1_000n);
    const e3 = sys.predictEvent('GRAVITY_SURGE', 6, ['world-C'], 1_000n);
    if (typeof e1 === 'string' || typeof e2 === 'string' || typeof e3 === 'string') return;
    // end e1 — should not count
    sys.activateEvent(e1.eventId);
    sys.waneEvent(e1.eventId);
    sys.endEvent(e1.eventId);
    const forecast = sys.getForecast();
    expect(forecast.highMagnitudeCount).toBe(1); // only e2 (mag 9, not ended)
  });

  it('getEvent returns undefined for unknown eventId', () => {
    expect(sys.getEvent('no-such-id')).toBeUndefined();
  });
});
