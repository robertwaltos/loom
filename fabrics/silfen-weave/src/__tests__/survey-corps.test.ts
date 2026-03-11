import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSurveyCorpsSystem,
  type SurveyCorpsSystem,
  type SurveyCorpsClockPort,
  type SurveyCorpsIdGeneratorPort,
  type SurveyCorpsLoggerPort,
} from '../survey-corps.js';

// ── Test Doubles ─────────────────────────────────────────────────

class TestClock implements SurveyCorpsClockPort {
  private time = 1_000_000n;
  now(): bigint {
    return this.time;
  }
  advance(by: bigint): void {
    this.time += by;
  }
}

class TestIdGen implements SurveyCorpsIdGeneratorPort {
  private counter = 0;
  generate(): string {
    return 'id-' + String(++this.counter);
  }
}

class TestLogger implements SurveyCorpsLoggerPort {
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
  sys: SurveyCorpsSystem;
  clock: TestClock;
  logger: TestLogger;
} {
  const clock = new TestClock();
  const logger = new TestLogger();
  const sys = createSurveyCorpsSystem({ clock, idGen: new TestIdGen(), logger });
  return { sys, clock, logger };
}

function setupCorpsAndWorld(sys: SurveyCorpsSystem): void {
  sys.registerCorps('corps-1', 'First Survey Corps');
  sys.registerWorld('world-X');
}

// ── Tests ────────────────────────────────────────────────────────

describe('SurveyCorpsSystem — registration', () => {
  let sys: SurveyCorpsSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('registers a corps successfully', () => {
    const result = sys.registerCorps('corps-1', 'First Corps');
    expect(result.success).toBe(true);
  });

  it('rejects duplicate corps registration', () => {
    sys.registerCorps('corps-1', 'First Corps');
    const result = sys.registerCorps('corps-1', 'Duplicate');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-registered');
  });

  it('registers a world successfully', () => {
    const result = sys.registerWorld('world-X');
    expect(result.success).toBe(true);
  });

  it('rejects duplicate world registration', () => {
    sys.registerWorld('world-X');
    const result = sys.registerWorld('world-X');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-registered');
  });

  it('getCorpsRecord returns undefined for unknown corps', () => {
    expect(sys.getCorpsRecord('ghost')).toBeUndefined();
  });
});

describe('SurveyCorpsSystem — launchExpedition', () => {
  let sys: SurveyCorpsSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupCorpsAndWorld(sys);
  });

  it('launches an expedition in STAGING status', () => {
    const result = sys.launchExpedition('corps-1', 'world-X', 5);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.status).toBe('STAGING');
    expect(result.crewSize).toBe(5);
    expect(result.corpsId).toBe('corps-1');
  });

  it('increments totalExpeditions on launch', () => {
    sys.launchExpedition('corps-1', 'world-X', 3);
    const record = sys.getCorpsRecord('corps-1');
    expect(record?.totalExpeditions).toBe(1);
  });

  it('rejects launch for unregistered corps', () => {
    const result = sys.launchExpedition('ghost-corps', 'world-X', 5);
    expect(result).toBe('corps-not-found');
  });

  it('rejects launch for unregistered world', () => {
    const result = sys.launchExpedition('corps-1', 'unknown-world', 5);
    expect(result).toBe('world-not-found');
  });

  it('rejects launch with crew size 0', () => {
    const result = sys.launchExpedition('corps-1', 'world-X', 0);
    expect(result).toBe('invalid-crew');
  });

  it('rejects second active expedition to the same world by same corps', () => {
    sys.launchExpedition('corps-1', 'world-X', 3);
    const result = sys.launchExpedition('corps-1', 'world-X', 5);
    expect(result).toBe('already-active');
  });

  it('allows two corps to launch expeditions to the same world', () => {
    sys.registerCorps('corps-2', 'Second Corps');
    sys.launchExpedition('corps-1', 'world-X', 3);
    const result = sys.launchExpedition('corps-2', 'world-X', 4);
    expect(typeof result).not.toBe('string');
  });
});

describe('SurveyCorpsSystem — status machine', () => {
  let sys: SurveyCorpsSystem;
  let expeditionId: string;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupCorpsAndWorld(sys);
    const expedition = sys.launchExpedition('corps-1', 'world-X', 5);
    if (typeof expedition === 'string') throw new Error('Setup failed');
    expeditionId = expedition.expeditionId;
  });

  it('depart transitions STAGING → DEPARTED and sets departedAt', () => {
    const result = sys.depart(expeditionId);
    expect(result.success).toBe(true);
    const expedition = sys.getExpedition(expeditionId);
    expect(expedition?.status).toBe('DEPARTED');
    expect(expedition?.departedAt).not.toBeNull();
  });

  it('rejects depart from non-STAGING state', () => {
    sys.depart(expeditionId);
    const result = sys.depart(expeditionId);
    expect(result.success).toBe(false);
  });

  it('beginSurveying transitions DEPARTED → SURVEYING', () => {
    sys.depart(expeditionId);
    const result = sys.beginSurveying(expeditionId);
    expect(result.success).toBe(true);
    expect(sys.getExpedition(expeditionId)?.status).toBe('SURVEYING');
  });

  it('rejects beginSurveying from STAGING', () => {
    const result = sys.beginSurveying(expeditionId);
    expect(result.success).toBe(false);
  });

  it('returnHome transitions SURVEYING → RETURNING', () => {
    sys.depart(expeditionId);
    sys.beginSurveying(expeditionId);
    const result = sys.returnHome(expeditionId);
    expect(result.success).toBe(true);
    expect(sys.getExpedition(expeditionId)?.status).toBe('RETURNING');
  });

  it('completeExpedition transitions RETURNING → COMPLETED and sets completedAt', () => {
    sys.depart(expeditionId);
    sys.beginSurveying(expeditionId);
    sys.returnHome(expeditionId);
    const result = sys.completeExpedition(expeditionId);
    expect(result.success).toBe(true);
    const expedition = sys.getExpedition(expeditionId);
    expect(expedition?.status).toBe('COMPLETED');
    expect(expedition?.completedAt).not.toBeNull();
  });

  it('completeExpedition increments successfulExpeditions', () => {
    sys.depart(expeditionId);
    sys.beginSurveying(expeditionId);
    sys.returnHome(expeditionId);
    sys.completeExpedition(expeditionId);
    expect(sys.getCorpsRecord('corps-1')?.successfulExpeditions).toBe(1);
  });

  it('loseExpedition from STAGING sets status LOST and adds crewLost', () => {
    const result = sys.loseExpedition(expeditionId, 4);
    expect(result.success).toBe(true);
    expect(sys.getExpedition(expeditionId)?.status).toBe('LOST');
    expect(sys.getCorpsRecord('corps-1')?.crewLost).toBe(4);
  });

  it('loseExpedition works from any active status', () => {
    sys.depart(expeditionId);
    sys.beginSurveying(expeditionId);
    const result = sys.loseExpedition(expeditionId, 5);
    expect(result.success).toBe(true);
    expect(sys.getExpedition(expeditionId)?.status).toBe('LOST');
  });

  it('rejects loseExpedition on already COMPLETED expedition', () => {
    sys.depart(expeditionId);
    sys.beginSurveying(expeditionId);
    sys.returnHome(expeditionId);
    sys.completeExpedition(expeditionId);
    const result = sys.loseExpedition(expeditionId, 1);
    expect(result.success).toBe(false);
  });
});

describe('SurveyCorpsSystem — submitReport and discoveryScore', () => {
  let sys: SurveyCorpsSystem;
  let expeditionId: string;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupCorpsAndWorld(sys);
    const expedition = sys.launchExpedition('corps-1', 'world-X', 5);
    if (typeof expedition === 'string') throw new Error('Setup failed');
    expeditionId = expedition.expeditionId;
    sys.depart(expeditionId);
    sys.beginSurveying(expeditionId);
  });

  it('submitReport returns a SurveyReport', () => {
    const result = sys.submitReport(expeditionId, 'Rich mineral deposits', 3, 80, ['iron', 'gold']);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.expeditionId).toBe(expeditionId);
    expect(result.hazardLevel).toBe(3);
    expect(result.habitability).toBe(80);
  });

  it('submitReport sets worldVerified to true', () => {
    sys.submitReport(expeditionId, 'findings', 5, 60, []);
    expect(sys.getExpedition(expeditionId)?.worldVerified).toBe(true);
  });

  it('discoveryScore is clamped at 100 for max habitability / min hazard', () => {
    sys.submitReport(expeditionId, 'findings', 1, 100, []);
    const score = sys.getExpedition(expeditionId)?.discoveryScore ?? -1;
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('discoveryScore calculation: habitability=60, hazard=5 → 60*0.4 + 5*6 = 24 + 30 = 54', () => {
    sys.submitReport(expeditionId, 'findings', 5, 60, []);
    expect(sys.getExpedition(expeditionId)?.discoveryScore).toBeCloseTo(54);
  });

  it('rejects submitReport when expedition not in SURVEYING state', () => {
    sys.returnHome(expeditionId);
    const result = sys.submitReport(expeditionId, 'late report', 2, 70, []);
    expect(result).toBe('invalid-status');
  });

  it('rejects submitReport for unknown expedition', () => {
    const result = sys.submitReport('ghost-id', 'findings', 5, 50, []);
    expect(result).toBe('expedition-not-found');
  });
});

describe('SurveyCorpsSystem — listExpeditions', () => {
  let sys: SurveyCorpsSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupCorpsAndWorld(sys);
    sys.registerWorld('world-Y');
  });

  it('listExpeditions returns all expeditions for a corps', () => {
    sys.launchExpedition('corps-1', 'world-X', 3);
    sys.launchExpedition('corps-1', 'world-Y', 2);
    expect(sys.listExpeditions('corps-1').length).toBe(2);
  });

  it('listExpeditions filters by status', () => {
    const e1 = sys.launchExpedition('corps-1', 'world-X', 3);
    sys.launchExpedition('corps-1', 'world-Y', 2);
    if (typeof e1 === 'string') return;
    sys.depart(e1.expeditionId);
    const staging = sys.listExpeditions('corps-1', 'STAGING');
    expect(staging.length).toBe(1);
    const departed = sys.listExpeditions('corps-1', 'DEPARTED');
    expect(departed.length).toBe(1);
  });

  it('getExpedition returns undefined for unknown id', () => {
    expect(sys.getExpedition('no-such-expedition')).toBeUndefined();
  });

  it('allows new expedition to same world after previous is COMPLETED', () => {
    const e1 = sys.launchExpedition('corps-1', 'world-X', 3);
    if (typeof e1 === 'string') return;
    sys.depart(e1.expeditionId);
    sys.beginSurveying(e1.expeditionId);
    sys.returnHome(e1.expeditionId);
    sys.completeExpedition(e1.expeditionId);
    const e2 = sys.launchExpedition('corps-1', 'world-X', 5);
    expect(typeof e2).not.toBe('string');
  });
});
