import { describe, it, expect, beforeEach } from 'vitest';
import { createLoanSystem, type LoanSystem, type LoanOffer, type Loan } from '../loan-system.js';

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

const ONE_DAY = 86_400_000_000n;
const PRINCIPAL = 1_000_000n;

function makeSystem() {
  const clock = createMockClock();
  const idGen = createMockIdGen();
  const logger = createMockLogger();
  const system = createLoanSystem({ clock, idGen, logger });
  return { system, clock, idGen, logger };
}

function makeOffer(system: LoanSystem, rateBps = 1000): LoanOffer {
  return system.createOffer(
    'lender-1',
    PRINCIPAL * 10n,
    rateBps,
    ONE_DAY,
    30n * ONE_DAY,
  ) as LoanOffer;
}

function makePendingLoan(system: LoanSystem): Loan {
  const offer = makeOffer(system);
  return system.requestLoan(offer.offerId, 'borrower-1', PRINCIPAL, 7n * ONE_DAY) as Loan;
}

function makeActiveLoan(system: LoanSystem): Loan {
  const loan = makePendingLoan(system);
  system.activateLoan(loan.loanId);
  return system.getLoan(loan.loanId) as Loan;
}

// ── createOffer ───────────────────────────────────────────────────────────────

describe('LoanSystem — createOffer', () => {
  it('creates a loan offer with correct fields', () => {
    const { system } = makeSystem();
    const r = system.createOffer('lender-1', PRINCIPAL, 500, ONE_DAY, 30n * ONE_DAY);
    expect(typeof r).toBe('object');
    const offer = r as LoanOffer;
    expect(offer.interestRateBps).toBe(500);
    expect(offer.active).toBe(true);
  });

  it('returns invalid-rate for negative rate', () => {
    const { system } = makeSystem();
    expect(system.createOffer('l', PRINCIPAL, -1, ONE_DAY, 30n * ONE_DAY)).toBe('invalid-rate');
  });

  it('returns invalid-rate for rate above 10000', () => {
    const { system } = makeSystem();
    expect(system.createOffer('l', PRINCIPAL, 10001, ONE_DAY, 30n * ONE_DAY)).toBe('invalid-rate');
  });

  it('allows zero interest rate', () => {
    const { system } = makeSystem();
    expect(typeof system.createOffer('l', PRINCIPAL, 0, ONE_DAY, 30n * ONE_DAY)).toBe('object');
  });

  it('allows max interest rate 10000', () => {
    const { system } = makeSystem();
    expect(typeof system.createOffer('l', PRINCIPAL, 10000, ONE_DAY, 30n * ONE_DAY)).toBe('object');
  });

  it('returns invalid-amount when maxAmount is zero', () => {
    const { system } = makeSystem();
    expect(system.createOffer('l', 0n, 500, ONE_DAY, 30n * ONE_DAY)).toBe('invalid-amount');
  });

  it('returns invalid-duration when min exceeds max', () => {
    const { system } = makeSystem();
    expect(system.createOffer('l', PRINCIPAL, 500, 30n * ONE_DAY, ONE_DAY)).toBe(
      'invalid-duration',
    );
  });

  it('getOffer returns offer after creation', () => {
    const { system } = makeSystem();
    const offer = makeOffer(system);
    expect(system.getOffer(offer.offerId)).toBeDefined();
  });

  it('getOffer returns undefined for unknown id', () => {
    const { system } = makeSystem();
    expect(system.getOffer('nope')).toBeUndefined();
  });
});

// ── requestLoan ───────────────────────────────────────────────────────────────

describe('LoanSystem — requestLoan', () => {
  let system: LoanSystem;
  let offerId: string;

  beforeEach(() => {
    system = makeSystem().system;
    offerId = makeOffer(system).offerId;
  });

  it('creates loan in PENDING status with null activatedAt', () => {
    const r = system.requestLoan(offerId, 'borrower-1', PRINCIPAL, 7n * ONE_DAY);
    const loan = r as Loan;
    expect(loan.status).toBe('PENDING');
    expect(loan.activatedAt).toBeNull();
    expect(loan.dueAt).toBeNull();
  });

  it('computes outstanding correctly at 1000 bps (10%)', () => {
    const loan = system.requestLoan(offerId, 'borrower-1', PRINCIPAL, 7n * ONE_DAY) as Loan;
    expect(loan.outstandingKalon).toBe(PRINCIPAL + PRINCIPAL / 10n);
  });

  it('returns offer-not-found for unknown offer', () => {
    expect(system.requestLoan('bad', 'b', PRINCIPAL, 7n * ONE_DAY)).toBe('offer-not-found');
  });

  it('returns invalid-amount when amount exceeds max', () => {
    expect(system.requestLoan(offerId, 'b', PRINCIPAL * 100n, 7n * ONE_DAY)).toBe('invalid-amount');
  });

  it('returns invalid-amount for zero amount', () => {
    expect(system.requestLoan(offerId, 'b', 0n, 7n * ONE_DAY)).toBe('invalid-amount');
  });

  it('returns invalid-duration when duration too short', () => {
    expect(system.requestLoan(offerId, 'b', PRINCIPAL, 0n)).toBe('invalid-duration');
  });

  it('returns invalid-duration when duration too long', () => {
    expect(system.requestLoan(offerId, 'b', PRINCIPAL, 31n * ONE_DAY)).toBe('invalid-duration');
  });

  it('getLoan returns loan after request', () => {
    const loan = system.requestLoan(offerId, 'borrower-1', PRINCIPAL, 7n * ONE_DAY) as Loan;
    expect(system.getLoan(loan.loanId)).toBeDefined();
  });
});

// ── activateLoan ──────────────────────────────────────────────────────────────

describe('LoanSystem — activateLoan', () => {
  let system: LoanSystem;
  let loanId: string;

  beforeEach(() => {
    system = makeSystem().system;
    loanId = makePendingLoan(system).loanId;
  });

  it('moves loan from PENDING to ACTIVE', () => {
    expect(system.activateLoan(loanId).success).toBe(true);
    expect(system.getLoan(loanId)?.status).toBe('ACTIVE');
  });

  it('sets activatedAt and dueAt', () => {
    system.activateLoan(loanId);
    const loan = system.getLoan(loanId);
    expect(loan?.activatedAt).toBe(1_000_000n);
    expect(loan?.dueAt).toBe(1_000_000n + 7n * ONE_DAY);
  });

  it('returns loan-not-found for unknown id', () => {
    const r = system.activateLoan('nope');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('loan-not-found');
  });

  it('returns wrong-status when already active', () => {
    system.activateLoan(loanId);
    const r = system.activateLoan(loanId);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('wrong-status');
  });
});

// ── repayLoan ─────────────────────────────────────────────────────────────────

describe('LoanSystem — repayLoan', () => {
  let system: LoanSystem;
  let loan: Loan;

  beforeEach(() => {
    system = makeSystem().system;
    loan = makeActiveLoan(system);
  });

  it('partial repayment reduces outstanding', () => {
    const outstandingBefore = loan.outstandingKalon;
    const half = outstandingBefore / 2n;
    const r = system.repayLoan(loan.loanId, 'borrower-1', half);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.fullyRepaid).toBe(false);
      expect(system.getLoan(loan.loanId)?.outstandingKalon).toBe(outstandingBefore - half);
    }
  });

  it('full repayment transitions to REPAID', () => {
    const r = system.repayLoan(loan.loanId, 'borrower-1', loan.outstandingKalon);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.fullyRepaid).toBe(true);
      expect(system.getLoan(loan.loanId)?.status).toBe('REPAID');
    }
  });

  it('returns overpayment error when amount exceeds outstanding', () => {
    const r = system.repayLoan(loan.loanId, 'borrower-1', loan.outstandingKalon + 1n);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('overpayment');
  });

  it('returns not-borrower for wrong caller', () => {
    const r = system.repayLoan(loan.loanId, 'wrong', loan.outstandingKalon);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('not-borrower');
  });

  it('returns loan-not-found for unknown id', () => {
    const r = system.repayLoan('nope', 'borrower-1', loan.outstandingKalon);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('loan-not-found');
  });

  it('returns wrong-status on PENDING loan', () => {
    const offer = system.createOffer('lender-1', PRINCIPAL, 0, ONE_DAY, 30n * ONE_DAY) as LoanOffer;
    const pending = system.requestLoan(offer.offerId, 'borrower-1', PRINCIPAL, ONE_DAY) as Loan;
    const r = system.repayLoan(pending.loanId, 'borrower-1', 1n);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('wrong-status');
  });

  it('appends to repayment history', () => {
    const half = loan.outstandingKalon / 2n;
    system.repayLoan(loan.loanId, 'borrower-1', half);
    system.repayLoan(loan.loanId, 'borrower-1', loan.outstandingKalon - half);
    expect(system.getRepaymentHistory(loan.loanId).length).toBe(2);
  });

  it('getRepaymentHistory returns empty array for unknown loan', () => {
    expect(system.getRepaymentHistory('nope')).toHaveLength(0);
  });
});

// ── defaultLoan & cancelLoan ──────────────────────────────────────────────────

describe('LoanSystem — defaultLoan', () => {
  let system: LoanSystem;
  let loanId: string;

  beforeEach(() => {
    system = makeSystem().system;
    loanId = makeActiveLoan(system).loanId;
  });

  it('moves active loan to DEFAULTED', () => {
    expect(system.defaultLoan(loanId).success).toBe(true);
    expect(system.getLoan(loanId)?.status).toBe('DEFAULTED');
  });

  it('returns loan-not-found for unknown id', () => {
    const r = system.defaultLoan('nope');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('loan-not-found');
  });

  it('returns wrong-status on already DEFAULTED loan', () => {
    system.defaultLoan(loanId);
    const r = system.defaultLoan(loanId);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('wrong-status');
  });
});

describe('LoanSystem — cancelLoan', () => {
  let system: LoanSystem;
  let loanId: string;

  beforeEach(() => {
    system = makeSystem().system;
    loanId = makePendingLoan(system).loanId;
  });

  it('cancels a PENDING loan', () => {
    expect(system.cancelLoan(loanId).success).toBe(true);
    expect(system.getLoan(loanId)?.status).toBe('CANCELLED');
  });

  it('returns wrong-status when loan is ACTIVE', () => {
    system.activateLoan(loanId);
    const r = system.cancelLoan(loanId);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('wrong-status');
  });

  it('returns loan-not-found for unknown id', () => {
    const r = system.cancelLoan('nope');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('loan-not-found');
  });

  it('getLoan returns undefined for unknown loan', () => {
    expect(system.getLoan('nope')).toBeUndefined();
  });
});
