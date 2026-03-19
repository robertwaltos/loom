import { describe, it, expect, beforeEach } from 'vitest';
import {
  COMMONS_FUND_ID,
  TOTAL_DEFAULTED_LOANS,
  TOTAL_FORGIVEN_LOANS,
  CANONICAL_LOANS,
  calculateOutstandingBalance,
  createDebtLedgerService,
} from '../dynasty-debt-ledger.js';
import type {
  LoanRecord,
  DebtEvent,
  DebtLedgerService,
} from '../dynasty-debt-ledger.js';

function makeDeps() {
  let id = 0;
  return {
    clock: { nowMicroseconds: () => BigInt(Date.now()) * 1000n },
    idGenerator: { generateId: () => `id-${++id}` },
  };
}

function makeLoan(overrides: Partial<LoanRecord> = {}): LoanRecord {
  return {
    id: 'test-loan',
    lenderId: 'lender-a',
    borrowerId: 'borrower-a',
    principalMicro: 100_000_000n,
    interestRateBasisPoints: 500,
    schedule: 'FLAT_FEE',
    originatedYear: 1,
    dueDateYear: 10,
    status: 'ACTIVE',
    collateralType: 'NONE',
    totalRepaidMicro: 0n,
    purposeDescription: 'Test loan',
    isPublicRecord: true,
    ...overrides,
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

describe('constants', () => {
  it('COMMONS_FUND_ID is correct string', () => {
    expect(COMMONS_FUND_ID).toBe('commons-fund');
  });

  it('TOTAL_DEFAULTED_LOANS equals 2', () => {
    expect(TOTAL_DEFAULTED_LOANS).toBe(2);
  });

  it('TOTAL_FORGIVEN_LOANS equals 1', () => {
    expect(TOTAL_FORGIVEN_LOANS).toBe(1);
  });

  it('CANONICAL_LOANS has 12 entries', () => {
    expect(CANONICAL_LOANS).toHaveLength(12);
  });

  it('CANONICAL_LOANS contains expected number of ACTIVE loans', () => {
    const active = CANONICAL_LOANS.filter((l) => l.status === 'ACTIVE');
    expect(active).toHaveLength(2);
  });

  it('CANONICAL_LOANS contains expected number of DEFAULTED loans', () => {
    const defaulted = CANONICAL_LOANS.filter((l) => l.status === 'DEFAULTED');
    expect(defaulted).toHaveLength(TOTAL_DEFAULTED_LOANS);
  });

  it('CANONICAL_LOANS contains expected number of FORGIVEN loans', () => {
    const forgiven = CANONICAL_LOANS.filter((l) => l.status === 'FORGIVEN');
    expect(forgiven).toHaveLength(TOTAL_FORGIVEN_LOANS);
  });

  it('loan-002 uses WORLD_CLAIM collateral', () => {
    const loan = CANONICAL_LOANS.find((l) => l.id === 'loan-002');
    expect(loan?.collateralType).toBe('WORLD_CLAIM');
    expect(loan?.collateralRef).toBe('world-394');
  });
});

// ─── calculateOutstandingBalance (pure function) ─────────────────────────────

describe('calculateOutstandingBalance (pure)', () => {
  it('FLAT_FEE: outstanding = principal - repaid when positive', () => {
    const loan = makeLoan({
      schedule: 'FLAT_FEE',
      principalMicro: 100_000_000n,
      totalRepaidMicro: 40_000_000n,
    });
    expect(calculateOutstandingBalance(loan, 5)).toBe(60_000_000n);
  });

  it('FLAT_FEE: returns 0 when fully repaid', () => {
    const loan = makeLoan({
      schedule: 'FLAT_FEE',
      principalMicro: 100_000_000n,
      totalRepaidMicro: 100_000_000n,
    });
    expect(calculateOutstandingBalance(loan, 5)).toBe(0n);
  });

  it('FLAT_FEE: no penalty for currentYear <= originatedYear', () => {
    const loan = makeLoan({
      schedule: 'FLAT_FEE',
      originatedYear: 10,
      totalRepaidMicro: 0n,
    });
    expect(calculateOutstandingBalance(loan, 5)).toBe(100_000_000n);
  });

  it('SIMPLE: accrues interest correctly', () => {
    const loan = makeLoan({
      schedule: 'SIMPLE',
      principalMicro: 100_000_000n,
      interestRateBasisPoints: 1000, // 10%
      originatedYear: 0,
      totalRepaidMicro: 0n,
    });
    // years = 5, simple: 100M + 100M*1000*5/10000 = 100M + 50M = 150M
    expect(calculateOutstandingBalance(loan, 5)).toBe(150_000_000n);
  });

  it('COMPOUND: accrues compound interest', () => {
    const loan = makeLoan({
      schedule: 'COMPOUND',
      principalMicro: 100_000_000n,
      interestRateBasisPoints: 1000, // 10%
      originatedYear: 0,
      totalRepaidMicro: 0n,
    });
    // years=2: 100M * 1.1^2 = 121M
    const result = calculateOutstandingBalance(loan, 2);
    expect(result).toBe(121_000_000n);
  });

  it('PERFORMANCE_LINKED: 25% fixed premium over principal', () => {
    const loan = makeLoan({
      schedule: 'PERFORMANCE_LINKED',
      principalMicro: 400_000_000n,
      totalRepaidMicro: 0n,
    });
    // 400M * 125/100 = 500M
    expect(calculateOutstandingBalance(loan, 10)).toBe(500_000_000n);
  });

  it('PERFORMANCE_LINKED: returns 0 if repaid exceeds 125% mark', () => {
    const loan = makeLoan({
      schedule: 'PERFORMANCE_LINKED',
      principalMicro: 400_000_000n,
      totalRepaidMicro: 600_000_000n,
    });
    expect(calculateOutstandingBalance(loan, 10)).toBe(0n);
  });

  it('loan-007 (canonical PERFORMANCE_LINKED) has small remaining balance', () => {
    const loan = CANONICAL_LOANS.find((l) => l.id === 'loan-007')!;
    // 500B * 1.25 = 625B; repaid = 620B; outstanding = 5B
    expect(calculateOutstandingBalance(loan, 20)).toBe(5_000_000_000n);
  });
});

// ─── Service ─────────────────────────────────────────────────────────────────

describe('DebtLedgerService', () => {
  let service: DebtLedgerService;

  beforeEach(() => {
    service = createDebtLedgerService(makeDeps());
  });

  it('getLoan returns undefined for unknown id', () => {
    expect(service.getLoan('nonexistent')).toBeUndefined();
  });

  it('getLoan returns the loan for a known id', () => {
    const loan = service.getLoan('loan-001');
    expect(loan).toBeDefined();
    expect(loan?.id).toBe('loan-001');
    expect(loan?.status).toBe('REPAID');
  });

  it('getLoansByBorrower returns all loans for a borrower', () => {
    const loans = service.getLoansByBorrower('ascendancy-bloc');
    expect(loans).toHaveLength(0);
    const surveyLoans = service.getLoansByBorrower('survey-corps-emergency');
    expect(surveyLoans).toHaveLength(1);
    expect(surveyLoans[0]?.id).toBe('loan-008');
  });

  it('getLoansByLender returns all loans for a lender', () => {
    const loans = service.getLoansByLender(COMMONS_FUND_ID);
    // commons-fund lends loan-001,003,006,008,011
    expect(loans.length).toBeGreaterThanOrEqual(5);
  });

  it('getActiveLoans returns only ACTIVE loans', () => {
    const active = service.getActiveLoans();
    expect(active.length).toBeGreaterThan(0);
    for (const loan of active) {
      expect(loan.status).toBe('ACTIVE');
    }
  });

  it('getDefaultedLoans returns only DEFAULTED loans', () => {
    const defaulted = service.getDefaultedLoans();
    expect(defaulted).toHaveLength(TOTAL_DEFAULTED_LOANS);
    for (const loan of defaulted) {
      expect(loan.status).toBe('DEFAULTED');
    }
  });

  it('calculateOutstandingBalance returns 0n for unknown loan', () => {
    expect(service.calculateOutstandingBalance('nope', 100)).toBe(0n);
  });

  it('calculateOutstandingBalance for a canonical repaid loan is 0', () => {
    // loan-004: FLAT_FEE, repaid=principal
    const result = service.calculateOutstandingBalance('loan-004', 50);
    expect(result).toBe(0n);
  });

  it('calculateOutstandingBalance for a canonical active SIMPLE loan', () => {
    // loan-002: SIMPLE, 350bps, origYear=8, principal=200B, repaid=85B
    // at year 18: years=10, balance = 200B + 200B*350*10/10000 = 200B+70B = 270B
    // outstanding = 270B - 85B = 185B
    const result = service.calculateOutstandingBalance('loan-002', 18);
    expect(result).toBe(185_000_000_000n);
  });

  it('getDynastyDebtProfile returns zeroed profile for unknown dynasty', () => {
    const profile = service.getDynastyDebtProfile('dynasty-unknown-xyz');
    expect(profile.dynastyId).toBe('dynasty-unknown-xyz');
    expect(profile.totalBorrowedMicro).toBe(0n);
    expect(profile.totalLentMicro).toBe(0n);
    expect(profile.activeLoans).toHaveLength(0);
    expect(profile.defaultHistory).toBe(0);
    expect(profile.creditScore).toBe(70); // default for no borrowed loans
  });

  it('getDynastyDebtProfile computes correct values for known borrower', () => {
    // dynasty-meridian borrowed loan-002 (ACTIVE, 200B)
    const profile = service.getDynastyDebtProfile('dynasty-meridian');
    expect(profile.totalBorrowedMicro).toBe(200_000_000_000n);
    expect(profile.activeLoans).toHaveLength(1);
    expect(profile.defaultHistory).toBe(0);
  });

  it('getDynastyDebtProfile defaultHistory is 1 for defaulting dynasty', () => {
    const profile = service.getDynastyDebtProfile('dynasty-quarry');
    expect(profile.defaultHistory).toBe(1);
    expect(profile.creditScore).toBe(0);
  });

  it('recordDebtEvent and getLoanEvents round-trip', () => {
    const event: DebtEvent = {
      loanId: 'loan-002',
      year: 12,
      type: 'PAYMENT',
      amountMicro: 1_000_000n,
      notes: 'partial payment',
    };
    service.recordDebtEvent(event);
    const events = service.getLoanEvents('loan-002');
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('PAYMENT');
    expect(events[0]?.amountMicro).toBe(1_000_000n);
  });

  it('getLoanEvents returns empty array for loan with no events', () => {
    expect(service.getLoanEvents('loan-999')).toHaveLength(0);
  });

  it('multiple events accumulate for the same loan', () => {
    const makeEvent = (type: DebtEvent['type']): DebtEvent => ({
      loanId: 'loan-002',
      year: 10,
      type,
      amountMicro: 500n,
    });
    service.recordDebtEvent(makeEvent('PAYMENT'));
    service.recordDebtEvent(makeEvent('INTEREST_ACCRUAL'));
    expect(service.getLoanEvents('loan-002')).toHaveLength(2);
  });

  it('getTotalCommonsFundExposure returns 0 when no commons-fund loans are ACTIVE', () => {
    // In canonical data commons-fund loans are not ACTIVE
    const exposure = service.getTotalCommonsFundExposure();
    expect(exposure).toBe(0n);
  });

  it('getDynastyDebtProfile for commons-fund lender computes totalLentMicro', () => {
    const profile = service.getDynastyDebtProfile(COMMONS_FUND_ID);
    expect(profile.totalLentMicro).toBeGreaterThan(0n);
  });
});
