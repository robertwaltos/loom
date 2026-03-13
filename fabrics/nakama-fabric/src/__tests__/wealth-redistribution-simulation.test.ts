/**
 * Wealth Redistribution - Simulation Tests
 *
 * Exercises multi-program cycles and pooled-fund accounting invariants.
 */

import { describe, expect, it } from 'vitest';
import {
  createWealthRedistributionSystem,
  type CommonsPool,
  type DistributionProgram,
  type WealthRedistributionSystem,
} from '../wealth-redistribution.js';

function createHarness(): {
  system: WealthRedistributionSystem;
  advance: (delta: bigint) => void;
} {
  let now = 2_000_000n;
  let ids = 0;

  const system = createWealthRedistributionSystem({
    clock: {
      nowMicroseconds: () => now,
    },
    idGen: {
      generate: () => {
        ids += 1;
        return `wr-${String(ids)}`;
      },
    },
    logger: {
      info: () => {
        // Logs are intentionally ignored in simulation tests.
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

function mustFund(result: CommonsPool | string): CommonsPool {
  expect(typeof result).toBe('object');
  if (typeof result === 'string') {
    throw new Error(`Expected fund, got error: ${result}`);
  }
  return result;
}

function mustProgram(result: DistributionProgram | string): DistributionProgram {
  expect(typeof result).toBe('object');
  if (typeof result === 'string') {
    throw new Error(`Expected program, got error: ${result}`);
  }
  return result;
}

describe('wealth redistribution simulation', () => {
  it('supports parallel programs drawing from one commons pool', () => {
    const { system } = createHarness();

    const fund = mustFund(system.createFund('Commons Prime', 10_000n));
    const ubi = mustProgram(system.createProgram('UBI', 'UBI_SUPPLEMENT', fund.fundId, 1_000n));
    const relief = mustProgram(system.createProgram('Relief', 'EMERGENCY_RELIEF', fund.fundId, 500n));

    system.enrollBeneficiary(ubi.programId, 'dyn:a');
    system.enrollBeneficiary(ubi.programId, 'dyn:b');
    system.enrollBeneficiary(relief.programId, 'dyn:x');

    const ubiCycle = system.distributeAll(ubi.programId);
    const reliefCycle = system.distributeAll(relief.programId);

    expect(ubiCycle.success).toBe(true);
    expect(reliefCycle.success).toBe(true);
    if (!ubiCycle.success || !reliefCycle.success) return;

    expect(ubiCycle.totalKalon).toBe(2_000n);
    expect(reliefCycle.totalKalon).toBe(500n);
    expect(system.getPool(fund.fundId)?.balanceKalon).toBe(7_500n);
  });

  it('keeps pool identity balance = deposited - distributed across mixed cycles', () => {
    const { system } = createHarness();

    const fund = mustFund(system.createFund('Commons Stable', 4_000n));
    const program = mustProgram(system.createProgram('Skill', 'SKILL_STIPEND', fund.fundId, 750n));

    system.enrollBeneficiary(program.programId, 'u1');
    system.enrollBeneficiary(program.programId, 'u2');

    system.depositToFund(fund.fundId, 1_500n);
    system.distribute(program.programId, 'u1');
    system.distribute(program.programId, 'u2');

    const pool = system.getPool(fund.fundId);
    expect(pool).toBeDefined();
    expect(pool?.balanceKalon).toBe((pool?.totalDepositedKalon ?? 0n) - (pool?.totalDistributedKalon ?? 0n));
  });

  it('halts distributeAll when funds are exhausted mid-roster', () => {
    const { system } = createHarness();

    const fund = mustFund(system.createFund('Tight Pool', 2_500n));
    const program = mustProgram(system.createProgram('Grant', 'COMMUNITY_GRANT', fund.fundId, 1_000n));

    for (const beneficiary of ['b1', 'b2', 'b3', 'b4']) {
      system.enrollBeneficiary(program.programId, beneficiary);
    }

    const cycle = system.distributeAll(program.programId);
    expect(cycle.success).toBe(true);
    if (!cycle.success) return;

    expect(cycle.distributed).toBe(2);
    expect(cycle.totalKalon).toBe(2_000n);
    expect(system.getPool(fund.fundId)?.balanceKalon).toBe(500n);
  });

  it('tracks beneficiary cumulative receipts and timestamp progression', () => {
    const { system, advance } = createHarness();

    const fund = mustFund(system.createFund('Time Pool', 5_000n));
    const program = mustProgram(system.createProgram('Settlement', 'SETTLEMENT_BONUS', fund.fundId, 600n));

    system.enrollBeneficiary(program.programId, 'dyn:clock');

    const first = system.distribute(program.programId, 'dyn:clock');
    advance(2_000n);
    const second = system.distribute(program.programId, 'dyn:clock');

    expect(first.success && second.success).toBe(true);
    if (!first.success || !second.success) return;

    const record = system.getBeneficiaryRecord(program.programId, 'dyn:clock');
    expect(record?.totalReceivedKalon).toBe(1_200n);
    expect(record?.lastDistributionAt).toBe(second.event.distributedAt);
    expect(second.event.distributedAt).toBeGreaterThan(first.event.distributedAt);
  });

  it('isolates the same beneficiary id across different programs', () => {
    const { system } = createHarness();

    const fund = mustFund(system.createFund('Iso Pool', 8_000n));
    const p1 = mustProgram(system.createProgram('UBI A', 'UBI_SUPPLEMENT', fund.fundId, 300n));
    const p2 = mustProgram(system.createProgram('UBI B', 'UBI_SUPPLEMENT', fund.fundId, 700n));

    system.enrollBeneficiary(p1.programId, 'dyn:shared');
    system.enrollBeneficiary(p2.programId, 'dyn:shared');

    system.distribute(p1.programId, 'dyn:shared');
    system.distribute(p2.programId, 'dyn:shared');

    const r1 = system.getBeneficiaryRecord(p1.programId, 'dyn:shared');
    const r2 = system.getBeneficiaryRecord(p2.programId, 'dyn:shared');

    expect(r1?.totalReceivedKalon).toBe(300n);
    expect(r2?.totalReceivedKalon).toBe(700n);
  });

  it('prevents further distribution after program deactivation', () => {
    const { system } = createHarness();

    const fund = mustFund(system.createFund('Freeze Pool', 2_000n));
    const program = mustProgram(system.createProgram('Emergency', 'EMERGENCY_RELIEF', fund.fundId, 400n));

    system.enrollBeneficiary(program.programId, 'dyn:e1');
    const before = system.distribute(program.programId, 'dyn:e1');
    expect(before.success).toBe(true);

    system.deactivateProgram(program.programId);
    const after = system.distribute(program.programId, 'dyn:e1');

    expect(after).toEqual({ success: false, error: 'program-inactive' });
    expect(system.getProgram(program.programId)?.distributionCount).toBe(1);
  });

  it('returns zero-op distributeAll for active program with empty roster', () => {
    const { system } = createHarness();

    const fund = mustFund(system.createFund('Empty Roster Pool', 1_000n));
    const program = mustProgram(system.createProgram('No One Yet', 'SKILL_STIPEND', fund.fundId, 100n));

    const result = system.distributeAll(program.programId);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.distributed).toBe(0);
    expect(result.totalKalon).toBe(0n);
    expect(system.getPool(fund.fundId)?.balanceKalon).toBe(1_000n);
  });

  it('preserves state when distribution fails for missing beneficiary', () => {
    const { system } = createHarness();

    const fund = mustFund(system.createFund('Safety Pool', 3_000n));
    const program = mustProgram(system.createProgram('UBI Safe', 'UBI_SUPPLEMENT', fund.fundId, 500n));

    const beforeProgram = system.getProgram(program.programId);
    const beforePool = system.getPool(fund.fundId);

    const result = system.distribute(program.programId, 'ghost');

    expect(result).toEqual({ success: false, error: 'beneficiary-not-found' });
    expect(system.getProgram(program.programId)?.distributionCount).toBe(beforeProgram?.distributionCount);
    expect(system.getPool(fund.fundId)?.balanceKalon).toBe(beforePool?.balanceKalon);
  });

  it('allows replenishment then resumed distribution after initial insufficiency', () => {
    const { system } = createHarness();

    const fund = mustFund(system.createFund('Recovery Pool', 900n));
    const program = mustProgram(system.createProgram('Relief Recovery', 'EMERGENCY_RELIEF', fund.fundId, 1_000n));

    system.enrollBeneficiary(program.programId, 'dyn:r1');

    const first = system.distribute(program.programId, 'dyn:r1');
    expect(first).toEqual({ success: false, error: 'insufficient-funds' });

    system.depositToFund(fund.fundId, 500n);
    const second = system.distribute(program.programId, 'dyn:r1');

    expect(second.success).toBe(true);
    expect(system.getPool(fund.fundId)?.balanceKalon).toBe(400n);
  });

  it('keeps total distributed equal to sum of beneficiary receipts for a single program', () => {
    const { system } = createHarness();

    const fund = mustFund(system.createFund('Audit Pool', 20_000n));
    const program = mustProgram(system.createProgram('Audit UBI', 'UBI_SUPPLEMENT', fund.fundId, 1_250n));

    for (const beneficiary of ['a', 'b', 'c']) {
      system.enrollBeneficiary(program.programId, beneficiary);
    }

    system.distributeAll(program.programId);
    system.distribute(program.programId, 'a');

    const recA = system.getBeneficiaryRecord(program.programId, 'a')?.totalReceivedKalon ?? 0n;
    const recB = system.getBeneficiaryRecord(program.programId, 'b')?.totalReceivedKalon ?? 0n;
    const recC = system.getBeneficiaryRecord(program.programId, 'c')?.totalReceivedKalon ?? 0n;
    const expectedTotal = recA + recB + recC;

    const pool = system.getPool(fund.fundId);
    expect(pool?.totalDistributedKalon).toBe(expectedTotal);
    expect(system.getProgram(program.programId)?.distributionCount).toBe(4);
  });
});
