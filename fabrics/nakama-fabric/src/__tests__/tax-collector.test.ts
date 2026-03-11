import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTaxCollectorSystem,
  type TaxCollectorSystem,
  type TaxType,
} from '../tax-collector.js';

function createMockClock() {
  let currentTime = 1_000_000n;
  return {
    nowMicroseconds: () => currentTime,
    advance: (delta: bigint) => {
      currentTime += delta;
    },
  };
}

function createMockIdGen() {
  let counter = 1;
  return {
    generateId: () => {
      const id = 'id-' + String(counter);
      counter += 1;
      return id;
    },
  };
}

function createMockLogger() {
  const logs: Array<{ message: string; meta?: Record<string, unknown> }> = [];
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      logs.push({ message, meta });
    },
    getLogs: () => logs,
    clear: () => {
      logs.length = 0;
    },
  };
}

const BASE = 1_000_000n;

function makeSystem() {
  const clock = createMockClock();
  const idGen = createMockIdGen();
  const logger = createMockLogger();
  const system = createTaxCollectorSystem({ clock, idGen, logger });
  return { system, clock, logger };
}

function setupWorld(system: TaxCollectorSystem, worldId = 'world-1'): void {
  system.registerWorld(worldId);
}

function setupTaxpayer(system: TaxCollectorSystem, taxpayerId = 'tp-1', worldId = 'world-1'): void {
  setupWorld(system, worldId);
  system.registerTaxpayer(taxpayerId, worldId);
}

// ── registerWorld ─────────────────────────────────────────────────────────────

describe('TaxCollector — registerWorld', () => {
  it('registers a world successfully', () => {
    const { system } = makeSystem();
    expect(system.registerWorld('world-1').success).toBe(true);
  });

  it('returns already-registered for duplicate world', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    const r = system.registerWorld('world-1');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('already-registered');
  });

  it('logs world registration', () => {
    const { system, logger } = makeSystem();
    logger.clear();
    system.registerWorld('world-1');
    expect(logger.getLogs().some((l) => l.message === 'World registered for tax collection')).toBe(
      true,
    );
  });
});

// ── registerTaxpayer ──────────────────────────────────────────────────────────

describe('TaxCollector — registerTaxpayer', () => {
  let system: TaxCollectorSystem;

  beforeEach(() => {
    system = makeSystem().system;
    setupWorld(system);
  });

  it('registers a taxpayer successfully', () => {
    expect(system.registerTaxpayer('tp-1', 'world-1').success).toBe(true);
  });

  it('returns world-not-found for unregistered world', () => {
    const r = system.registerTaxpayer('tp-1', 'bad-world');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('world-not-found');
  });

  it('returns already-registered for duplicate taxpayer', () => {
    system.registerTaxpayer('tp-1', 'world-1');
    const r = system.registerTaxpayer('tp-1', 'world-1');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('already-registered');
  });

  it('allows same taxpayer in different worlds', () => {
    system.registerWorld('world-2');
    system.registerTaxpayer('tp-1', 'world-1');
    expect(system.registerTaxpayer('tp-1', 'world-2').success).toBe(true);
  });

  it('initialises record with zeroed balances', () => {
    system.registerTaxpayer('tp-1', 'world-1');
    const record = system.getTaxpayerRecord('tp-1', 'world-1');
    expect(record?.totalAssessedKalon).toBe(0n);
    expect(record?.outstandingKalon).toBe(0n);
    expect(record?.assessmentCount).toBe(0);
  });
});

// ── setTaxRate ────────────────────────────────────────────────────────────────

describe('TaxCollector — setTaxRate', () => {
  let system: TaxCollectorSystem;

  beforeEach(() => {
    system = makeSystem().system;
    setupWorld(system);
  });

  it('sets a tax rate successfully', () => {
    const r = system.setTaxRate('world-1', 'TRADE', 500);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.rate.rateBps).toBe(500);
      expect(r.rate.worldId).toBe('world-1');
    }
  });

  it('allows zero rate', () => {
    expect(system.setTaxRate('world-1', 'INCOME', 0).success).toBe(true);
  });

  it('allows max rate 10000', () => {
    expect(system.setTaxRate('world-1', 'LUXURY', 10000).success).toBe(true);
  });

  it('returns invalid-rate for negative rate', () => {
    const r = system.setTaxRate('world-1', 'TRADE', -1);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('invalid-rate');
  });

  it('returns invalid-rate for rate above 10000', () => {
    const r = system.setTaxRate('world-1', 'TRADE', 10001);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('invalid-rate');
  });

  it('returns world-not-found for unregistered world', () => {
    const r = system.setTaxRate('bad-world', 'TRADE', 500);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('world-not-found');
  });

  it('overwrites existing rate', () => {
    system.setTaxRate('world-1', 'PROPERTY', 300);
    const r = system.setTaxRate('world-1', 'PROPERTY', 600);
    expect(r.success).toBe(true);
    if (r.success) expect(r.rate.rateBps).toBe(600);
  });
});

// ── assessTax ─────────────────────────────────────────────────────────────────

describe('TaxCollector — assessTax', () => {
  let system: TaxCollectorSystem;

  beforeEach(() => {
    system = makeSystem().system;
    setupTaxpayer(system);
    system.setTaxRate('world-1', 'TRADE', 1000);
  });

  it('assesses tax at configured rate (10%)', () => {
    const r = system.assessTax('tp-1', 'world-1', 'TRADE', BASE * 100n);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.assessment.taxAmountKalon).toBe(BASE * 10n);
      expect(r.assessment.rateBps).toBe(1000);
    }
  });

  it('defaults to 0 tax when no rate is set', () => {
    const r = system.assessTax('tp-1', 'world-1', 'INCOME', BASE * 100n);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.assessment.taxAmountKalon).toBe(0n);
      expect(r.assessment.rateBps).toBe(0);
    }
  });

  it('returns world-not-found for unregistered world', () => {
    const r = system.assessTax('tp-1', 'bad-world', 'TRADE', BASE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('world-not-found');
  });

  it('returns taxpayer-not-found for unregistered taxpayer', () => {
    const r = system.assessTax('unknown', 'world-1', 'TRADE', BASE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('taxpayer-not-found');
  });

  it('returns invalid-amount for negative base', () => {
    const r = system.assessTax('tp-1', 'world-1', 'TRADE', -1n);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('invalid-amount');
  });

  it('updates taxpayer outstanding balance after assessment', () => {
    system.assessTax('tp-1', 'world-1', 'TRADE', BASE * 100n);
    const record = system.getTaxpayerRecord('tp-1', 'world-1');
    expect(record?.assessmentCount).toBe(1);
    expect(record?.outstandingKalon).toBe(BASE * 10n);
  });

  it('accumulates outstanding across multiple assessments', () => {
    system.assessTax('tp-1', 'world-1', 'TRADE', BASE * 100n);
    system.assessTax('tp-1', 'world-1', 'TRADE', BASE * 50n);
    const record = system.getTaxpayerRecord('tp-1', 'world-1');
    expect(record?.assessmentCount).toBe(2);
    expect(record?.outstandingKalon).toBe(BASE * 15n);
  });
});

// ── recordPayment ─────────────────────────────────────────────────────────────

describe('TaxCollector — recordPayment', () => {
  let system: TaxCollectorSystem;
  let taxId: string;

  beforeEach(() => {
    system = makeSystem().system;
    setupTaxpayer(system);
    system.setTaxRate('world-1', 'INCOME', 500);
    const r = system.assessTax('tp-1', 'world-1', 'INCOME', BASE * 200n);
    if (r.success) taxId = r.assessment.taxId;
  });

  it('records payment and reduces outstanding to zero', () => {
    const outstanding = system.getTaxpayerRecord('tp-1', 'world-1')?.outstandingKalon ?? 0n;
    expect(system.recordPayment(taxId, outstanding).success).toBe(true);
    expect(system.getTaxpayerRecord('tp-1', 'world-1')?.outstandingKalon).toBe(0n);
  });

  it('marks assessment paidAt', () => {
    system.recordPayment(taxId, BASE);
    const history = system.getAssessmentHistory('tp-1', 'world-1', 10);
    const assessment = history.find((a) => a.taxId === taxId);
    expect(assessment?.paidAt).not.toBeNull();
  });

  it('returns tax-not-found for unknown id', () => {
    const r = system.recordPayment('nope', BASE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('tax-not-found');
  });

  it('returns invalid-amount for zero payment', () => {
    const r = system.recordPayment(taxId, 0n);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('invalid-amount');
  });
});

// ── getWorldReport ────────────────────────────────────────────────────────────

describe('TaxCollector — getWorldReport', () => {
  let system: TaxCollectorSystem;

  beforeEach(() => {
    system = makeSystem().system;
    setupTaxpayer(system);
    system.setTaxRate('world-1', 'TRADE', 1000);
    system.setTaxRate('world-1', 'PROPERTY', 500);
  });

  it('returns undefined for unregistered world', () => {
    expect(system.getWorldReport('nope')).toBeUndefined();
  });

  it('reports outstanding for unpaid assessments', () => {
    system.assessTax('tp-1', 'world-1', 'TRADE', BASE * 100n);
    const report = system.getWorldReport('world-1');
    expect(report?.totalOutstandingKalon).toBe(BASE * 10n);
    expect(report?.totalCollectedKalon).toBe(0n);
  });

  it('moves amount to collected after payment', () => {
    const ar = system.assessTax('tp-1', 'world-1', 'TRADE', BASE * 100n);
    if (ar.success) system.recordPayment(ar.assessment.taxId, ar.assessment.taxAmountKalon);
    const report = system.getWorldReport('world-1');
    expect(report?.totalCollectedKalon).toBe(BASE * 10n);
    expect(report?.totalOutstandingKalon).toBe(0n);
  });

  it('tracks byType totals for paid assessments', () => {
    const ar = system.assessTax('tp-1', 'world-1', 'TRADE', BASE * 100n);
    const pr = system.assessTax('tp-1', 'world-1', 'PROPERTY', BASE * 100n);
    if (ar.success) system.recordPayment(ar.assessment.taxId, ar.assessment.taxAmountKalon);
    if (pr.success) system.recordPayment(pr.assessment.taxId, pr.assessment.taxAmountKalon);
    const report = system.getWorldReport('world-1');
    expect(report?.byType.TRADE).toBe(BASE * 10n);
    expect(report?.byType.PROPERTY).toBe(BASE * 5n);
    expect(report?.byType.INCOME).toBe(0n);
  });

  it('returns zeroed report for world with no assessments', () => {
    const report = system.getWorldReport('world-1');
    expect(report?.totalCollectedKalon).toBe(0n);
    expect(report?.totalOutstandingKalon).toBe(0n);
  });
});

// ── getAssessmentHistory & all tax types ─────────────────────────────────────

describe('TaxCollector — assessment history and tax type coverage', () => {
  let system: TaxCollectorSystem;

  beforeEach(() => {
    system = makeSystem().system;
    setupTaxpayer(system);
    system.setTaxRate('world-1', 'TRADE', 200);
  });

  it('returns empty array for taxpayer with no assessments', () => {
    expect(system.getAssessmentHistory('tp-1', 'world-1', 10)).toHaveLength(0);
  });

  it('returns all assessments within limit', () => {
    system.assessTax('tp-1', 'world-1', 'TRADE', BASE);
    system.assessTax('tp-1', 'world-1', 'TRADE', BASE);
    system.assessTax('tp-1', 'world-1', 'TRADE', BASE);
    expect(system.getAssessmentHistory('tp-1', 'world-1', 10).length).toBe(3);
  });

  it('respects the limit parameter', () => {
    for (let i = 0; i < 5; i++) system.assessTax('tp-1', 'world-1', 'TRADE', BASE);
    expect(system.getAssessmentHistory('tp-1', 'world-1', 3).length).toBe(3);
  });

  it('getTaxpayerRecord returns undefined for unknown pair', () => {
    expect(system.getTaxpayerRecord('unknown', 'world-1')).toBeUndefined();
  });

  const types: TaxType[] = ['TRADE', 'PROPERTY', 'INCOME', 'TRANSFER', 'LUXURY'];

  it('supports all tax types for rate setting', () => {
    for (const t of types) {
      expect(system.setTaxRate('world-1', t, 100).success).toBe(true);
    }
  });

  it('assesses all tax types successfully', () => {
    for (const t of types) {
      expect(system.assessTax('tp-1', 'world-1', t, BASE).success).toBe(true);
    }
  });
});
