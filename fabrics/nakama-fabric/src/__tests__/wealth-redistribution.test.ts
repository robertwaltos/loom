import { describe, it, expect } from 'vitest';
import {
  createWealthRedistributionSystem,
  type WealthRedistributionSystem,
} from '../wealth-redistribution.js';

function makeDeps() {
  let time = 1_000_000n;
  let idSeq = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000n) },
    idGen: { generate: () => `id-${String(++idSeq)}` },
    logger: { info: () => {} },
  };
}

function makeSystem(): WealthRedistributionSystem {
  return createWealthRedistributionSystem(makeDeps());
}

function makeReadySystem() {
  const system = makeSystem();
  const fund = system.createFund('Commons Fund Alpha', 1_000_000n) as { fundId: string };
  const program = system.createProgram('Basic Relief', 'UBI_SUPPLEMENT', fund.fundId, 1000n) as {
    programId: string;
  };
  return { system, fundId: fund.fundId, programId: program.programId };
}

// ── createFund ────────────────────────────────────────────────────────────────

describe('createFund', () => {
  it('creates a fund with initial balance', () => {
    const system = makeSystem();
    const result = system.createFund('Alpha Fund', 500_000n);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.name).toBe('Alpha Fund');
      expect(result.balanceKalon).toBe(500_000n);
      expect(result.totalDepositedKalon).toBe(500_000n);
      expect(result.totalDistributedKalon).toBe(0n);
    }
  });

  it('accepts zero initial balance', () => {
    const system = makeSystem();
    const result = system.createFund('Empty Fund', 0n);
    expect(typeof result).toBe('object');
  });

  it('rejects negative initial balance', () => {
    const system = makeSystem();
    expect(system.createFund('Bad Fund', -1n)).toBe('invalid-amount');
  });
});

// ── depositToFund ─────────────────────────────────────────────────────────────

describe('depositToFund', () => {
  it('deposits to an existing fund', () => {
    const system = makeSystem();
    const fund = system.createFund('Fund', 0n) as { fundId: string };
    const result = system.depositToFund(fund.fundId, 50_000n);
    expect(result.success).toBe(true);
    expect(system.getPool(fund.fundId)?.balanceKalon).toBe(50_000n);
  });

  it('returns fund-not-found for unknown fund', () => {
    const system = makeSystem();
    expect(system.depositToFund('ghost', 100n)).toEqual({
      success: false,
      error: 'fund-not-found',
    });
  });

  it('rejects amount < 1', () => {
    const system = makeSystem();
    const fund = system.createFund('Fund', 0n) as { fundId: string };
    expect(system.depositToFund(fund.fundId, 0n)).toEqual({
      success: false,
      error: 'invalid-amount',
    });
  });

  it('accumulates totalDepositedKalon', () => {
    const system = makeSystem();
    const fund = system.createFund('Fund', 1000n) as { fundId: string };
    system.depositToFund(fund.fundId, 500n);
    expect(system.getPool(fund.fundId)?.totalDepositedKalon).toBe(1500n);
  });
});

// ── createProgram ─────────────────────────────────────────────────────────────

describe('createProgram', () => {
  it('creates a distribution program', () => {
    const system = makeSystem();
    const fund = system.createFund('Fund', 100_000n) as { fundId: string };
    const result = system.createProgram('Relief', 'EMERGENCY_RELIEF', fund.fundId, 500n);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.name).toBe('Relief');
      expect(result.type).toBe('EMERGENCY_RELIEF');
      expect(result.active).toBe(true);
      expect(result.distributionCount).toBe(0);
    }
  });

  it('returns fund-not-found for unknown fund', () => {
    const system = makeSystem();
    expect(system.createProgram('X', 'UBI_SUPPLEMENT', 'ghost', 100n)).toBe('fund-not-found');
  });

  it('rejects amountPerBeneficiaryKalon < 1', () => {
    const system = makeSystem();
    const fund = system.createFund('Fund', 100n) as { fundId: string };
    expect(system.createProgram('X', 'UBI_SUPPLEMENT', fund.fundId, 0n)).toBe('invalid-amount');
  });
});

// ── enrollBeneficiary ─────────────────────────────────────────────────────────

describe('enrollBeneficiary', () => {
  it('enrolls a beneficiary', () => {
    const { system, programId } = makeReadySystem();
    expect(system.enrollBeneficiary(programId, 'user-1').success).toBe(true);
  });

  it('returns already-registered for duplicate enrollment', () => {
    const { system, programId } = makeReadySystem();
    system.enrollBeneficiary(programId, 'user-1');
    expect(system.enrollBeneficiary(programId, 'user-1')).toEqual({
      success: false,
      error: 'already-registered',
    });
  });

  it('allows same user in different programs', () => {
    const { system, fundId, programId } = makeReadySystem();
    const p2 = system.createProgram('Skill', 'SKILL_STIPEND', fundId, 200n) as {
      programId: string;
    };
    system.enrollBeneficiary(programId, 'user-1');
    expect(system.enrollBeneficiary(p2.programId, 'user-1').success).toBe(true);
  });

  it('returns program-not-found for unknown program', () => {
    const system = makeSystem();
    expect(system.enrollBeneficiary('ghost', 'user-1')).toEqual({
      success: false,
      error: 'program-not-found',
    });
  });
});

// ── distribute ────────────────────────────────────────────────────────────────

describe('distribute', () => {
  it('distributes to an enrolled beneficiary', () => {
    const { system, programId } = makeReadySystem();
    system.enrollBeneficiary(programId, 'user-1');
    const result = system.distribute(programId, 'user-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.event.amountKalon).toBe(1000n);
      expect(result.event.beneficiaryId).toBe('user-1');
    }
  });

  it('deducts from fund balance', () => {
    const { system, fundId, programId } = makeReadySystem();
    system.enrollBeneficiary(programId, 'user-1');
    system.distribute(programId, 'user-1');
    expect(system.getPool(fundId)?.balanceKalon).toBe(999_000n);
  });

  it('updates beneficiary record', () => {
    const { system, programId } = makeReadySystem();
    system.enrollBeneficiary(programId, 'user-1');
    system.distribute(programId, 'user-1');
    const record = system.getBeneficiaryRecord(programId, 'user-1');
    expect(record?.totalReceivedKalon).toBe(1000n);
    expect(record?.lastDistributionAt).not.toBeNull();
  });

  it('increments program distributionCount', () => {
    const { system, programId } = makeReadySystem();
    system.enrollBeneficiary(programId, 'user-1');
    system.distribute(programId, 'user-1');
    expect(system.getProgram(programId)?.distributionCount).toBe(1);
  });

  it('returns beneficiary-not-found for unenrolled user', () => {
    const { system, programId } = makeReadySystem();
    expect(system.distribute(programId, 'ghost')).toEqual({
      success: false,
      error: 'beneficiary-not-found',
    });
  });

  it('returns insufficient-funds when fund cannot cover amount', () => {
    const system = makeSystem();
    const fund = system.createFund('Small Fund', 500n) as { fundId: string };
    const program = system.createProgram('Big Program', 'EMERGENCY_RELIEF', fund.fundId, 1000n) as {
      programId: string;
    };
    system.enrollBeneficiary(program.programId, 'user-1');
    expect(system.distribute(program.programId, 'user-1')).toEqual({
      success: false,
      error: 'insufficient-funds',
    });
  });

  it('returns program-inactive for deactivated program', () => {
    const { system, programId } = makeReadySystem();
    system.enrollBeneficiary(programId, 'user-1');
    system.deactivateProgram(programId);
    expect(system.distribute(programId, 'user-1')).toEqual({
      success: false,
      error: 'program-inactive',
    });
  });
});

// ── distributeAll ─────────────────────────────────────────────────────────────

describe('distributeAll', () => {
  it('distributes to all enrolled beneficiaries', () => {
    const { system, programId } = makeReadySystem();
    system.enrollBeneficiary(programId, 'user-1');
    system.enrollBeneficiary(programId, 'user-2');
    system.enrollBeneficiary(programId, 'user-3');
    const result = system.distributeAll(programId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.distributed).toBe(3);
      expect(result.totalKalon).toBe(3000n);
    }
  });

  it('stops when fund runs out', () => {
    const system = makeSystem();
    const fund = system.createFund('Tight Fund', 2500n) as { fundId: string };
    const program = system.createProgram('Program', 'UBI_SUPPLEMENT', fund.fundId, 1000n) as {
      programId: string;
    };
    system.enrollBeneficiary(program.programId, 'user-1');
    system.enrollBeneficiary(program.programId, 'user-2');
    system.enrollBeneficiary(program.programId, 'user-3');
    const result = system.distributeAll(program.programId);
    if (result.success) {
      expect(result.distributed).toBe(2);
      expect(result.totalKalon).toBe(2000n);
    }
  });

  it('returns program-not-found for unknown program', () => {
    const system = makeSystem();
    expect(system.distributeAll('ghost')).toEqual({
      success: false,
      error: 'program-not-found',
    });
  });

  it('returns program-inactive for deactivated program', () => {
    const { system, programId } = makeReadySystem();
    system.deactivateProgram(programId);
    expect(system.distributeAll(programId)).toEqual({
      success: false,
      error: 'program-inactive',
    });
  });

  it('returns zero distributed for program with no beneficiaries', () => {
    const { system, programId } = makeReadySystem();
    const result = system.distributeAll(programId);
    if (result.success) {
      expect(result.distributed).toBe(0);
      expect(result.totalKalon).toBe(0n);
    }
  });
});

// ── deactivateProgram ─────────────────────────────────────────────────────────

describe('deactivateProgram', () => {
  it('deactivates a program', () => {
    const { system, programId } = makeReadySystem();
    expect(system.deactivateProgram(programId).success).toBe(true);
    expect(system.getProgram(programId)?.active).toBe(false);
  });

  it('returns program-not-found for unknown program', () => {
    const system = makeSystem();
    expect(system.deactivateProgram('ghost')).toEqual({
      success: false,
      error: 'program-not-found',
    });
  });
});
