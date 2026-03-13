/**
 * Tax Collector - Simulation Tests
 *
 * Exercises world-level taxation flows across multiple cycles.
 */

import { describe, expect, it } from 'vitest';
import { createTaxCollectorSystem, type TaxCollectorSystem } from '../tax-collector.js';

const MICRO = 1_000_000n;

function mk(kalon: bigint): bigint {
  return kalon * MICRO;
}

function createHarness(): {
  system: TaxCollectorSystem;
  advance: (delta: bigint) => void;
} {
  let now = 5_000_000n;
  let id = 0;

  const system = createTaxCollectorSystem({
    clock: {
      nowMicroseconds: () => now,
    },
    idGen: {
      generateId: () => {
        id += 1;
        return `tax-${String(id)}`;
      },
    },
    logger: {
      info: () => {
        // simulation tests do not assert logs
      },
    },
  });

  return {
    system,
    advance: (delta: bigint) => {
      now += delta;
    },
  };
}

function seedWorld(system: TaxCollectorSystem, worldId: string, taxpayers: string[]): void {
  expect(system.registerWorld(worldId).success).toBe(true);
  for (const taxpayer of taxpayers) {
    expect(system.registerTaxpayer(taxpayer, worldId).success).toBe(true);
  }
}

describe('tax collector simulation', () => {
  it('keeps world reports isolated across parallel worlds', () => {
    const { system } = createHarness();

    seedWorld(system, 'w-alpha', ['a1']);
    seedWorld(system, 'w-beta', ['b1']);

    system.setTaxRate('w-alpha', 'TRADE', 1000);
    system.setTaxRate('w-beta', 'TRADE', 500);

    const alpha = system.assessTax('a1', 'w-alpha', 'TRADE', mk(100n));
    const beta = system.assessTax('b1', 'w-beta', 'TRADE', mk(100n));

    expect(alpha.success && beta.success).toBe(true);
    if (!alpha.success || !beta.success) return;

    system.recordPayment(alpha.assessment.taxId, alpha.assessment.taxAmountKalon);

    const alphaReport = system.getWorldReport('w-alpha');
    const betaReport = system.getWorldReport('w-beta');

    expect(alphaReport?.totalCollectedKalon).toBe(mk(10n));
    expect(alphaReport?.totalOutstandingKalon).toBe(0n);
    expect(betaReport?.totalCollectedKalon).toBe(0n);
    expect(betaReport?.totalOutstandingKalon).toBe(mk(5n));
  });

  it('moves taxpayer balances from outstanding to paid over multiple cycles', () => {
    const { system, advance } = createHarness();

    seedWorld(system, 'w1', ['tp1']);
    system.setTaxRate('w1', 'INCOME', 800);

    const a1 = system.assessTax('tp1', 'w1', 'INCOME', mk(100n));
    advance(10_000n);
    const a2 = system.assessTax('tp1', 'w1', 'INCOME', mk(50n));

    expect(a1.success && a2.success).toBe(true);
    if (!a1.success || !a2.success) return;

    const before = system.getTaxpayerRecord('tp1', 'w1');
    expect(before?.outstandingKalon).toBe(mk(12n));

    system.recordPayment(a1.assessment.taxId, a1.assessment.taxAmountKalon);
    const mid = system.getTaxpayerRecord('tp1', 'w1');
    expect(mid?.totalPaidKalon).toBe(mk(8n));
    expect(mid?.outstandingKalon).toBe(mk(4n));

    system.recordPayment(a2.assessment.taxId, a2.assessment.taxAmountKalon);
    const after = system.getTaxpayerRecord('tp1', 'w1');

    expect(after?.totalAssessedKalon).toBe(mk(12n));
    expect(after?.totalPaidKalon).toBe(mk(12n));
    expect(after?.outstandingKalon).toBe(0n);
  });

  it('uses configured rate at assessment time when rates are changed later', () => {
    const { system, advance } = createHarness();

    seedWorld(system, 'w2', ['tp2']);

    system.setTaxRate('w2', 'PROPERTY', 300);
    const first = system.assessTax('tp2', 'w2', 'PROPERTY', mk(200n));

    advance(1_000n);
    system.setTaxRate('w2', 'PROPERTY', 700);
    const second = system.assessTax('tp2', 'w2', 'PROPERTY', mk(200n));

    expect(first.success && second.success).toBe(true);
    if (!first.success || !second.success) return;

    expect(first.assessment.rateBps).toBe(300);
    expect(first.assessment.taxAmountKalon).toBe(mk(6n));
    expect(second.assessment.rateBps).toBe(700);
    expect(second.assessment.taxAmountKalon).toBe(mk(14n));
  });

  it('tracks byType totals from paid assessments only', () => {
    const { system } = createHarness();

    seedWorld(system, 'w3', ['tp3']);

    system.setTaxRate('w3', 'TRADE', 1000);
    system.setTaxRate('w3', 'LUXURY', 1500);

    const trade = system.assessTax('tp3', 'w3', 'TRADE', mk(100n));
    const luxury = system.assessTax('tp3', 'w3', 'LUXURY', mk(40n));

    expect(trade.success && luxury.success).toBe(true);
    if (!trade.success || !luxury.success) return;

    system.recordPayment(trade.assessment.taxId, trade.assessment.taxAmountKalon);

    const report = system.getWorldReport('w3');
    expect(report?.byType.TRADE).toBe(mk(10n));
    expect(report?.byType.LUXURY).toBe(0n);
    expect(report?.totalCollectedKalon).toBe(mk(10n));
    expect(report?.totalOutstandingKalon).toBe(mk(6n));
  });

  it('keeps same taxpayer partitioned across worlds', () => {
    const { system } = createHarness();

    seedWorld(system, 'w4a', ['dyn-x']);
    seedWorld(system, 'w4b', ['dyn-x']);

    system.setTaxRate('w4a', 'TRANSFER', 400);
    system.setTaxRate('w4b', 'TRANSFER', 1200);

    const a = system.assessTax('dyn-x', 'w4a', 'TRANSFER', mk(100n));
    const b = system.assessTax('dyn-x', 'w4b', 'TRANSFER', mk(100n));

    expect(a.success && b.success).toBe(true);
    if (!a.success || !b.success) return;

    const recA = system.getTaxpayerRecord('dyn-x', 'w4a');
    const recB = system.getTaxpayerRecord('dyn-x', 'w4b');

    expect(recA?.outstandingKalon).toBe(mk(4n));
    expect(recB?.outstandingKalon).toBe(mk(12n));
  });

  it('defaults to zero tax where no rate is configured', () => {
    const { system } = createHarness();

    seedWorld(system, 'w5', ['tp5']);

    const assessment = system.assessTax('tp5', 'w5', 'INCOME', mk(700n));
    expect(assessment.success).toBe(true);
    if (!assessment.success) return;

    expect(assessment.assessment.rateBps).toBe(0);
    expect(assessment.assessment.taxAmountKalon).toBe(0n);

    const report = system.getWorldReport('w5');
    expect(report?.totalOutstandingKalon).toBe(0n);
  });

  it('preserves financial state after invalid payment attempt', () => {
    const { system } = createHarness();

    seedWorld(system, 'w6', ['tp6']);
    system.setTaxRate('w6', 'TRADE', 1000);

    const assessed = system.assessTax('tp6', 'w6', 'TRADE', mk(100n));
    expect(assessed.success).toBe(true);
    if (!assessed.success) return;

    const before = system.getTaxpayerRecord('tp6', 'w6');
    const bad = system.recordPayment(assessed.assessment.taxId, 0n);

    expect(bad.success).toBe(false);

    const after = system.getTaxpayerRecord('tp6', 'w6');
    expect(after?.totalPaidKalon).toBe(before?.totalPaidKalon);
    expect(after?.outstandingKalon).toBe(before?.outstandingKalon);
  });

  it('returns bounded history and keeps insertion order', () => {
    const { system } = createHarness();

    seedWorld(system, 'w7', ['tp7']);
    system.setTaxRate('w7', 'TRADE', 200);

    const ids: string[] = [];
    for (const amount of [mk(10n), mk(20n), mk(30n), mk(40n), mk(50n)]) {
      const res = system.assessTax('tp7', 'w7', 'TRADE', amount);
      expect(res.success).toBe(true);
      if (res.success) ids.push(res.assessment.taxId);
    }

    const history = system.getAssessmentHistory('tp7', 'w7', 3);
    expect(history).toHaveLength(3);
    expect(history[0]?.taxId).toBe(ids[0]);
    expect(history[1]?.taxId).toBe(ids[1]);
    expect(history[2]?.taxId).toBe(ids[2]);
  });

  it('supports mixed tax types in one world during a fiscal cycle', () => {
    const { system } = createHarness();

    seedWorld(system, 'w8', ['tp8']);

    system.setTaxRate('w8', 'TRADE', 300);
    system.setTaxRate('w8', 'PROPERTY', 600);
    system.setTaxRate('w8', 'LUXURY', 900);

    const trade = system.assessTax('tp8', 'w8', 'TRADE', mk(100n));
    const property = system.assessTax('tp8', 'w8', 'PROPERTY', mk(100n));
    const luxury = system.assessTax('tp8', 'w8', 'LUXURY', mk(100n));

    expect(trade.success && property.success && luxury.success).toBe(true);
    if (!trade.success || !property.success || !luxury.success) return;

    system.recordPayment(trade.assessment.taxId, trade.assessment.taxAmountKalon);
    system.recordPayment(luxury.assessment.taxId, luxury.assessment.taxAmountKalon);

    const report = system.getWorldReport('w8');
    expect(report?.byType.TRADE).toBe(mk(3n));
    expect(report?.byType.PROPERTY).toBe(0n);
    expect(report?.byType.LUXURY).toBe(mk(9n));
    expect(report?.totalCollectedKalon).toBe(mk(12n));
    expect(report?.totalOutstandingKalon).toBe(mk(6n));
  });

  it('keeps accounting identity total assessed equals paid plus outstanding', () => {
    const { system } = createHarness();

    seedWorld(system, 'w9', ['tp9']);
    system.setTaxRate('w9', 'INCOME', 1000);

    const first = system.assessTax('tp9', 'w9', 'INCOME', mk(50n));
    const second = system.assessTax('tp9', 'w9', 'INCOME', mk(70n));

    expect(first.success && second.success).toBe(true);
    if (!first.success || !second.success) return;

    system.recordPayment(first.assessment.taxId, first.assessment.taxAmountKalon);

    const record = system.getTaxpayerRecord('tp9', 'w9');
    expect(record?.totalAssessedKalon).toBe((record?.totalPaidKalon ?? 0n) + (record?.outstandingKalon ?? 0n));
  });
});
