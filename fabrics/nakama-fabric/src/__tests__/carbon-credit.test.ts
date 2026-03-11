import { describe, it, expect } from 'vitest';
import { createCarbonCreditSystem, type CarbonCreditSystem } from '../carbon-credit.js';

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

function makeSystem() {
  const clock = createMockClock();
  const idGen = createMockIdGen();
  const logger = createMockLogger();
  const system = createCarbonCreditSystem({ clock, idGen, logger });
  return { system, clock, idGen, logger };
}

function makeSystemWithHolder(holderId = 'world-1') {
  const ctx = makeSystem();
  ctx.system.registerHolder(holderId);
  return ctx;
}

function makeProjectInSystem(system: CarbonCreditSystem, holderId = 'world-1', capacity = 500n) {
  const result = system.createProject(holderId, 'Test Project', capacity);
  if (typeof result === 'string') throw new Error('createProject failed: ' + result);
  return result;
}

// ── registerHolder ────────────────────────────────────────────────────────────

describe('registerHolder', () => {
  it('registers a new holder successfully', () => {
    const { system } = makeSystem();
    const result = system.registerHolder('world-1');
    expect(result.success).toBe(true);
  });

  it('returns already-registered for duplicate holder', () => {
    const { system } = makeSystem();
    system.registerHolder('world-1');
    const result = system.registerHolder('world-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-registered');
  });

  it('initializes balance at zero for new holder', () => {
    const { system } = makeSystem();
    system.registerHolder('world-1');
    const balance = system.getBalance('world-1');
    expect(balance?.totalEarned).toBe(0n);
    expect(balance?.totalSpent).toBe(0n);
    expect(balance?.available).toBe(0n);
  });

  it('logs holder registration', () => {
    const { system, logger } = makeSystem();
    logger.clear();
    system.registerHolder('world-1');
    expect(logger.getLogs().some((l) => l.message === 'Carbon credit holder registered')).toBe(
      true,
    );
  });
});

// ── createProject ─────────────────────────────────────────────────────────────

describe('createProject', () => {
  it('creates a project for a registered holder', () => {
    const { system } = makeSystemWithHolder();
    const result = system.createProject('world-1', 'Reforestation Alpha', 1000n);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.holderId).toBe('world-1');
      expect(result.name).toBe('Reforestation Alpha');
      expect(result.creditCapacity).toBe(1000n);
      expect(result.active).toBe(true);
      expect(result.creditsIssued).toBe(0n);
    }
  });

  it('returns holder-not-found for unregistered holder', () => {
    const { system } = makeSystem();
    expect(system.createProject('ghost', 'Project', 1000n)).toBe('holder-not-found');
  });

  it('returns invalid-amount for zero capacity', () => {
    const { system } = makeSystemWithHolder();
    expect(system.createProject('world-1', 'Project', 0n)).toBe('invalid-amount');
  });

  it('returns invalid-amount for negative capacity', () => {
    const { system } = makeSystemWithHolder();
    expect(system.createProject('world-1', 'Project', -1n)).toBe('invalid-amount');
  });
});

// ── issueCredits ──────────────────────────────────────────────────────────────

describe('issueCredits', () => {
  it('issues credits to holder successfully', () => {
    const { system } = makeSystemWithHolder();
    const project = makeProjectInSystem(system);
    const result = system.issueCredits(project.projectId, 100n);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transaction.type).toBe('ISSUE');
      expect(result.transaction.amount).toBe(100n);
      expect(result.transaction.toHolder).toBe('world-1');
      expect(result.transaction.fromHolder).toBeNull();
    }
  });

  it('increases holder balance on issue', () => {
    const { system } = makeSystemWithHolder();
    const project = makeProjectInSystem(system);
    system.issueCredits(project.projectId, 200n);
    const balance = system.getBalance('world-1');
    expect(balance?.totalEarned).toBe(200n);
    expect(balance?.available).toBe(200n);
  });

  it('returns invalid-amount for zero amount', () => {
    const { system } = makeSystemWithHolder();
    const project = makeProjectInSystem(system);
    const result = system.issueCredits(project.projectId, 0n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-amount');
  });

  it('returns project-not-found for unknown project', () => {
    const { system } = makeSystem();
    const result = system.issueCredits('ghost-project', 10n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('project-not-found');
  });

  it('returns error when issuance exceeds capacity', () => {
    const { system } = makeSystemWithHolder();
    const project = makeProjectInSystem(system, 'world-1', 400n);
    system.issueCredits(project.projectId, 300n);
    const result = system.issueCredits(project.projectId, 200n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('insufficient-credits');
  });

  it('tracks creditsIssued on project', () => {
    const { system } = makeSystemWithHolder();
    const project = makeProjectInSystem(system);
    system.issueCredits(project.projectId, 150n);
    expect(system.getProject(project.projectId)?.creditsIssued).toBe(150n);
  });
});

// ── transferCredits ───────────────────────────────────────────────────────────

describe('transferCredits', () => {
  function makeTransferContext() {
    const ctx = makeSystemWithHolder('world-1');
    ctx.system.registerHolder('world-2');
    const project = makeProjectInSystem(ctx.system, 'world-1', 1000n);
    ctx.system.issueCredits(project.projectId, 500n);
    return ctx;
  }

  it('transfers credits between holders', () => {
    const { system } = makeTransferContext();
    const result = system.transferCredits('world-1', 'world-2', 200n);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transaction.type).toBe('TRANSFER');
      expect(result.transaction.fromHolder).toBe('world-1');
      expect(result.transaction.toHolder).toBe('world-2');
    }
  });

  it('adjusts both balances on transfer', () => {
    const { system } = makeTransferContext();
    system.transferCredits('world-1', 'world-2', 200n);
    expect(system.getBalance('world-1')?.available).toBe(300n);
    expect(system.getBalance('world-2')?.available).toBe(200n);
  });

  it('returns insufficient-credits when from lacks funds', () => {
    const { system } = makeTransferContext();
    const result = system.transferCredits('world-1', 'world-2', 600n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('insufficient-credits');
  });

  it('returns holder-not-found for unknown sender', () => {
    const { system } = makeTransferContext();
    const result = system.transferCredits('ghost', 'world-2', 10n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('holder-not-found');
  });

  it('returns holder-not-found for unknown recipient', () => {
    const { system } = makeTransferContext();
    const result = system.transferCredits('world-1', 'ghost', 10n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('holder-not-found');
  });
});

// ── retireCredits ─────────────────────────────────────────────────────────────

describe('retireCredits', () => {
  function makeRetireContext() {
    const ctx = makeSystemWithHolder();
    const project = makeProjectInSystem(ctx.system, 'world-1', 500n);
    ctx.system.issueCredits(project.projectId, 300n);
    return ctx;
  }

  it('retires credits from a holder', () => {
    const { system } = makeRetireContext();
    const result = system.retireCredits('world-1', 100n);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transaction.type).toBe('RETIRE');
      expect(result.transaction.fromHolder).toBe('world-1');
      expect(result.transaction.toHolder).toBeNull();
    }
  });

  it('reduces available balance after retirement', () => {
    const { system } = makeRetireContext();
    system.retireCredits('world-1', 100n);
    const balance = system.getBalance('world-1');
    expect(balance?.available).toBe(200n);
    expect(balance?.totalSpent).toBe(100n);
  });

  it('returns insufficient-credits when retiring too many', () => {
    const { system } = makeRetireContext();
    const result = system.retireCredits('world-1', 400n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('insufficient-credits');
  });

  it('returns holder-not-found for unregistered holder', () => {
    const { system } = makeSystem();
    const result = system.retireCredits('ghost', 10n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('holder-not-found');
  });
});

// ── getTransactionHistory ─────────────────────────────────────────────────────

describe('getTransactionHistory', () => {
  it('returns transactions involving the holder', () => {
    const { system } = makeSystemWithHolder('world-1');
    system.registerHolder('world-2');
    const project = makeProjectInSystem(system, 'world-1', 500n);
    system.issueCredits(project.projectId, 300n);
    system.transferCredits('world-1', 'world-2', 100n);
    system.retireCredits('world-1', 50n);
    expect(system.getTransactionHistory('world-1', 10).length).toBe(3);
  });

  it('respects the limit parameter', () => {
    const { system } = makeSystemWithHolder();
    const project = makeProjectInSystem(system, 'world-1', 1000n);
    system.issueCredits(project.projectId, 100n);
    system.retireCredits('world-1', 10n);
    system.retireCredits('world-1', 10n);
    expect(system.getTransactionHistory('world-1', 2).length).toBe(2);
  });

  it('returns empty array for holder with no transactions', () => {
    const { system } = makeSystemWithHolder();
    expect(system.getTransactionHistory('world-1', 10).length).toBe(0);
  });
});
