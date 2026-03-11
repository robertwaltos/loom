import { describe, it, expect } from 'vitest';
import { createReputationBondSystem, type ReputationBondSystem } from '../reputation-bond.js';

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
  };
}

const ONE_YEAR_US = 31_536_000_000_000n;

function makeSystem() {
  const clock = createMockClock();
  const idGen = createMockIdGen();
  const logger = createMockLogger();
  const system = createReputationBondSystem({ clock, idGen, logger });
  return { system, clock, idGen, logger };
}

function makeSystemWithBonder(bonderId = 'bonder-1') {
  const ctx = makeSystem();
  ctx.system.registerBonder(bonderId);
  return ctx;
}

function makeActiveBond(system: ReputationBondSystem, bonderId = 'bonder-1', staked = 1000n) {
  const result = system.createBond(bonderId, 'beneficiary-1', staked, ONE_YEAR_US);
  if (typeof result === 'string') throw new Error('createBond failed: ' + result);
  return result;
}

// ── registerBonder ────────────────────────────────────────────────────────────

describe('registerBonder', () => {
  it('registers a new bonder successfully', () => {
    const { system } = makeSystem();
    expect(system.registerBonder('bonder-1').success).toBe(true);
  });

  it('returns error for duplicate bonder registration', () => {
    const { system } = makeSystem();
    system.registerBonder('bonder-1');
    expect(system.registerBonder('bonder-1').success).toBe(false);
  });

  it('initializes profile with zeroed stats', () => {
    const { system } = makeSystemWithBonder();
    const profile = system.getBonderProfile('bonder-1');
    expect(profile?.activeBonds).toBe(0);
    expect(profile?.totalStakedKalon).toBe(0n);
    expect(profile?.totalSlashedKalon).toBe(0n);
  });
});

// ── createBond ────────────────────────────────────────────────────────────────

describe('createBond', () => {
  it('creates a bond successfully', () => {
    const { system } = makeSystemWithBonder();
    const result = system.createBond('bonder-1', 'beneficiary-1', 1000n, ONE_YEAR_US);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.bonderId).toBe('bonder-1');
      expect(result.stakedKalon).toBe(1000n);
      expect(result.remainingKalon).toBe(1000n);
      expect(result.status).toBe('ACTIVE');
      expect(result.slashedAmount).toBe(0n);
    }
  });

  it('sets expiration time correctly', () => {
    const { system } = makeSystemWithBonder();
    const result = system.createBond('bonder-1', 'beneficiary-1', 1000n, ONE_YEAR_US);
    if (typeof result === 'object') {
      expect(result.expiresAt).toBe(1_000_000n + ONE_YEAR_US);
    }
  });

  it('returns bonder-not-found for unregistered bonder', () => {
    const { system } = makeSystem();
    expect(system.createBond('ghost', 'beneficiary-1', 1000n, ONE_YEAR_US)).toBe(
      'bonder-not-found',
    );
  });

  it('returns invalid-amount for zero stake', () => {
    const { system } = makeSystemWithBonder();
    expect(system.createBond('bonder-1', 'beneficiary-1', 0n, ONE_YEAR_US)).toBe('invalid-amount');
  });

  it('returns invalid-duration for zero duration', () => {
    const { system } = makeSystemWithBonder();
    expect(system.createBond('bonder-1', 'beneficiary-1', 1000n, 0n)).toBe('invalid-duration');
  });

  it('initializes slash history as empty', () => {
    const { system } = makeSystemWithBonder();
    const bond = makeActiveBond(system);
    expect(system.getSlashHistory(bond.bondId).length).toBe(0);
  });
});

// ── slashBond ─────────────────────────────────────────────────────────────────

describe('slashBond', () => {
  it('slashes a bond successfully', () => {
    const { system } = makeSystemWithBonder();
    const bond = makeActiveBond(system);
    const result = system.slashBond(bond.bondId, 200n, 'Misconduct');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.event.bondId).toBe(bond.bondId);
      expect(result.event.amount).toBe(200n);
      expect(result.event.reason).toBe('Misconduct');
    }
  });

  it('reduces remainingKalon after slash', () => {
    const { system } = makeSystemWithBonder();
    const bond = makeActiveBond(system);
    system.slashBond(bond.bondId, 300n, 'Violation');
    const updated = system.getBond(bond.bondId);
    expect(updated?.remainingKalon).toBe(700n);
    expect(updated?.slashedAmount).toBe(300n);
  });

  it('sets status to SLASHED when remainingKalon reaches zero', () => {
    const { system } = makeSystemWithBonder();
    const bond = makeActiveBond(system);
    system.slashBond(bond.bondId, 1000n, 'Full slash');
    expect(system.getBond(bond.bondId)?.status).toBe('SLASHED');
  });

  it('keeps status ACTIVE when partially slashed', () => {
    const { system } = makeSystemWithBonder();
    const bond = makeActiveBond(system);
    system.slashBond(bond.bondId, 500n, 'Partial');
    expect(system.getBond(bond.bondId)?.status).toBe('ACTIVE');
  });

  it('returns slash-exceeds-bond when amount exceeds remaining', () => {
    const { system } = makeSystemWithBonder();
    const bond = makeActiveBond(system);
    const result = system.slashBond(bond.bondId, 1001n, 'Too much');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('slash-exceeds-bond');
  });

  it('returns bond-not-found for unknown bond', () => {
    const { system } = makeSystem();
    const result = system.slashBond('ghost', 100n, 'Reason');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('bond-not-found');
  });

  it('returns wrong-status for non-ACTIVE bond', () => {
    const { system } = makeSystemWithBonder();
    const bond = makeActiveBond(system);
    system.releaseBond(bond.bondId);
    const result = system.slashBond(bond.bondId, 100n, 'Too late');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('wrong-status');
  });
});

// ── getSlashHistory ───────────────────────────────────────────────────────────

describe('getSlashHistory', () => {
  it('records slash events in history', () => {
    const { system } = makeSystemWithBonder();
    const bond = makeActiveBond(system);
    system.slashBond(bond.bondId, 100n, 'First');
    system.slashBond(bond.bondId, 50n, 'Second');
    expect(system.getSlashHistory(bond.bondId).length).toBe(2);
  });
});

// ── releaseBond ───────────────────────────────────────────────────────────────

describe('releaseBond', () => {
  it('releases an ACTIVE bond', () => {
    const { system } = makeSystemWithBonder();
    const bond = makeActiveBond(system);
    const result = system.releaseBond(bond.bondId);
    expect(result.success).toBe(true);
    expect(system.getBond(bond.bondId)?.status).toBe('RELEASED');
  });

  it('returns wrong-status if bond is already RELEASED', () => {
    const { system } = makeSystemWithBonder();
    const bond = makeActiveBond(system);
    system.releaseBond(bond.bondId);
    const result = system.releaseBond(bond.bondId);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('wrong-status');
  });

  it('returns bond-not-found for unknown bond', () => {
    const { system } = makeSystem();
    const result = system.releaseBond('ghost');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('bond-not-found');
  });
});

// ── expireBond ────────────────────────────────────────────────────────────────

describe('expireBond', () => {
  it('expires an ACTIVE bond', () => {
    const { system } = makeSystemWithBonder();
    const bond = makeActiveBond(system);
    expect(system.expireBond(bond.bondId).success).toBe(true);
    expect(system.getBond(bond.bondId)?.status).toBe('EXPIRED');
  });

  it('returns wrong-status if bond is already EXPIRED', () => {
    const { system } = makeSystemWithBonder();
    const bond = makeActiveBond(system);
    system.expireBond(bond.bondId);
    const result = system.expireBond(bond.bondId);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('wrong-status');
  });
});

// ── getBonderProfile ──────────────────────────────────────────────────────────

describe('getBonderProfile', () => {
  it('returns undefined for unregistered bonder', () => {
    const { system } = makeSystem();
    expect(system.getBonderProfile('ghost')).toBeUndefined();
  });

  it('counts active bonds correctly', () => {
    const { system } = makeSystemWithBonder();
    const b1 = makeActiveBond(system, 'bonder-1', 100n);
    makeActiveBond(system, 'bonder-1', 200n);
    system.releaseBond(b1.bondId);
    expect(system.getBonderProfile('bonder-1')?.activeBonds).toBe(1);
  });

  it('sums totalStakedKalon across all bonds', () => {
    const { system } = makeSystemWithBonder();
    makeActiveBond(system, 'bonder-1', 300n);
    makeActiveBond(system, 'bonder-1', 700n);
    expect(system.getBonderProfile('bonder-1')?.totalStakedKalon).toBe(1000n);
  });

  it('sums totalSlashedKalon across all bonds', () => {
    const { system } = makeSystemWithBonder();
    const b1 = makeActiveBond(system, 'bonder-1', 500n);
    const b2 = makeActiveBond(system, 'bonder-1', 500n);
    system.slashBond(b1.bondId, 100n, 'R1');
    system.slashBond(b2.bondId, 200n, 'R2');
    expect(system.getBonderProfile('bonder-1')?.totalSlashedKalon).toBe(300n);
  });
});
