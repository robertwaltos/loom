/**
 * Loan System — Peer-to-peer KALON lending with interest and repayment tracking.
 *
 * Lenders post offers specifying max amount, interest rate (basis points),
 * and duration bounds. Borrowers request loans against offers. Loans move
 * through PENDING → ACTIVE → REPAID/DEFAULTED/CANCELLED states.
 *
 * Outstanding = principal + interest (computed at creation, integer math).
 * All KALON amounts in bigint micro-KALON (10^6 precision).
 * All timestamps in bigint microseconds.
 */

export type LoanId = string;
export type LenderId = string;
export type BorrowerId = string;

export type LoanStatus = 'PENDING' | 'ACTIVE' | 'REPAID' | 'DEFAULTED' | 'CANCELLED';

export type LoanError =
  | 'loan-not-found'
  | 'invalid-amount'
  | 'invalid-rate'
  | 'invalid-duration'
  | 'wrong-status'
  | 'not-borrower'
  | 'overpayment'
  | 'offer-not-found';

export interface Loan {
  readonly loanId: LoanId;
  readonly lenderId: LenderId;
  readonly borrowerId: BorrowerId;
  readonly principalKalon: bigint;
  readonly interestRateBps: number;
  readonly durationUs: bigint;
  readonly status: LoanStatus;
  readonly createdAt: bigint;
  readonly activatedAt: bigint | null;
  readonly dueAt: bigint | null;
  readonly totalRepaidKalon: bigint;
  readonly outstandingKalon: bigint;
}

export interface LoanRepayment {
  readonly repaymentId: string;
  readonly loanId: LoanId;
  readonly amountKalon: bigint;
  readonly paidAt: bigint;
}

export interface LoanOffer {
  readonly offerId: string;
  readonly lenderId: LenderId;
  readonly maxAmountKalon: bigint;
  readonly interestRateBps: number;
  readonly minDurationUs: bigint;
  readonly maxDurationUs: bigint;
  readonly active: boolean;
}

export interface LoanSystem {
  createOffer(
    lenderId: LenderId,
    maxAmountKalon: bigint,
    interestRateBps: number,
    minDurationUs: bigint,
    maxDurationUs: bigint,
  ): LoanOffer | LoanError;
  requestLoan(
    offerId: string,
    borrowerId: BorrowerId,
    amountKalon: bigint,
    durationUs: bigint,
  ): Loan | LoanError;
  activateLoan(
    loanId: LoanId,
  ): { readonly success: true } | { readonly success: false; readonly error: LoanError };
  repayLoan(
    loanId: LoanId,
    borrowerId: BorrowerId,
    amountKalon: bigint,
  ):
    | { readonly success: true; readonly repayment: LoanRepayment; readonly fullyRepaid: boolean }
    | { readonly success: false; readonly error: LoanError };
  defaultLoan(
    loanId: LoanId,
  ): { readonly success: true } | { readonly success: false; readonly error: LoanError };
  cancelLoan(
    loanId: LoanId,
  ): { readonly success: true } | { readonly success: false; readonly error: LoanError };
  getLoan(loanId: LoanId): Loan | undefined;
  getOffer(offerId: string): LoanOffer | undefined;
  getRepaymentHistory(loanId: LoanId): ReadonlyArray<LoanRepayment>;
}

interface MutableLoan {
  readonly loanId: LoanId;
  readonly lenderId: LenderId;
  readonly borrowerId: BorrowerId;
  readonly principalKalon: bigint;
  readonly interestRateBps: number;
  readonly durationUs: bigint;
  status: LoanStatus;
  readonly createdAt: bigint;
  activatedAt: bigint | null;
  dueAt: bigint | null;
  totalRepaidKalon: bigint;
  outstandingKalon: bigint;
}

interface LoanSystemState {
  readonly offers: Map<string, LoanOffer>;
  readonly loans: Map<LoanId, MutableLoan>;
  readonly repayments: Map<LoanId, LoanRepayment[]>;
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: { info(message: string, meta?: Record<string, unknown>): void };
}

export function createLoanSystem(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: { info(message: string, meta?: Record<string, unknown>): void };
}): LoanSystem {
  const state: LoanSystemState = {
    offers: new Map(),
    loans: new Map(),
    repayments: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    createOffer: (lenderId, max, rate, minDur, maxDur) =>
      createOfferImpl(state, lenderId, max, rate, minDur, maxDur),
    requestLoan: (offerId, borrowerId, amount, duration) =>
      requestLoanImpl(state, offerId, borrowerId, amount, duration),
    activateLoan: (loanId) => activateLoanImpl(state, loanId),
    repayLoan: (loanId, borrowerId, amount) => repayLoanImpl(state, loanId, borrowerId, amount),
    defaultLoan: (loanId) => defaultLoanImpl(state, loanId),
    cancelLoan: (loanId) => cancelLoanImpl(state, loanId),
    getLoan: (loanId) => state.loans.get(loanId),
    getOffer: (offerId) => state.offers.get(offerId),
    getRepaymentHistory: (loanId) => state.repayments.get(loanId) ?? [],
  };
}

function createOfferImpl(
  state: LoanSystemState,
  lenderId: LenderId,
  maxAmountKalon: bigint,
  interestRateBps: number,
  minDurationUs: bigint,
  maxDurationUs: bigint,
): LoanOffer | LoanError {
  if (interestRateBps < 0 || interestRateBps > 10000) return 'invalid-rate';
  if (maxAmountKalon < 1n) return 'invalid-amount';
  if (minDurationUs < 1n || maxDurationUs < minDurationUs) return 'invalid-duration';

  const offerId = state.idGen.generateId();
  const offer: LoanOffer = {
    offerId,
    lenderId,
    maxAmountKalon,
    interestRateBps,
    minDurationUs,
    maxDurationUs,
    active: true,
  };

  state.offers.set(offerId, offer);
  state.logger.info('Loan offer created', { offerId, lenderId });
  return offer;
}

function computeOutstanding(principalKalon: bigint, interestRateBps: number): bigint {
  const interest = (principalKalon * BigInt(interestRateBps)) / 10000n;
  return principalKalon + interest;
}

function buildLoan(
  offer: LoanOffer,
  borrowerId: BorrowerId,
  loanId: LoanId,
  amountKalon: bigint,
  durationUs: bigint,
  createdAt: bigint,
): MutableLoan {
  return {
    loanId,
    lenderId: offer.lenderId,
    borrowerId,
    principalKalon: amountKalon,
    interestRateBps: offer.interestRateBps,
    durationUs,
    status: 'PENDING',
    createdAt,
    activatedAt: null,
    dueAt: null,
    totalRepaidKalon: 0n,
    outstandingKalon: computeOutstanding(amountKalon, offer.interestRateBps),
  };
}

function requestLoanImpl(
  state: LoanSystemState,
  offerId: string,
  borrowerId: BorrowerId,
  amountKalon: bigint,
  durationUs: bigint,
): Loan | LoanError {
  const offer = state.offers.get(offerId);
  if (!offer) return 'offer-not-found';
  if (amountKalon < 1n || amountKalon > offer.maxAmountKalon) return 'invalid-amount';
  if (durationUs < offer.minDurationUs || durationUs > offer.maxDurationUs) {
    return 'invalid-duration';
  }

  const loanId = state.idGen.generateId();
  const loan = buildLoan(
    offer,
    borrowerId,
    loanId,
    amountKalon,
    durationUs,
    state.clock.nowMicroseconds(),
  );
  state.loans.set(loanId, loan);
  state.logger.info('Loan requested', { loanId, borrowerId, offerId });
  return loan;
}

function activateLoanImpl(
  state: LoanSystemState,
  loanId: LoanId,
): { readonly success: true } | { readonly success: false; readonly error: LoanError } {
  const loan = state.loans.get(loanId);
  if (!loan) return { success: false, error: 'loan-not-found' };
  if (loan.status !== 'PENDING') return { success: false, error: 'wrong-status' };

  const now = state.clock.nowMicroseconds();
  loan.status = 'ACTIVE';
  loan.activatedAt = now;
  loan.dueAt = now + loan.durationUs;

  state.logger.info('Loan activated', { loanId, dueAt: String(loan.dueAt) });
  return { success: true };
}

function repayLoanImpl(
  state: LoanSystemState,
  loanId: LoanId,
  borrowerId: BorrowerId,
  amountKalon: bigint,
):
  | { readonly success: true; readonly repayment: LoanRepayment; readonly fullyRepaid: boolean }
  | { readonly success: false; readonly error: LoanError } {
  const loan = state.loans.get(loanId);
  if (!loan) return { success: false, error: 'loan-not-found' };
  if (loan.status !== 'ACTIVE') return { success: false, error: 'wrong-status' };
  if (loan.borrowerId !== borrowerId) return { success: false, error: 'not-borrower' };
  if (amountKalon > loan.outstandingKalon) return { success: false, error: 'overpayment' };

  const repaymentId = state.idGen.generateId();
  const now = state.clock.nowMicroseconds();

  const repayment: LoanRepayment = { repaymentId, loanId, amountKalon, paidAt: now };

  loan.outstandingKalon -= amountKalon;
  loan.totalRepaidKalon += amountKalon;

  const fullyRepaid = loan.outstandingKalon === 0n;
  if (fullyRepaid) loan.status = 'REPAID';

  const history = state.repayments.get(loanId) ?? [];
  history.push(repayment);
  state.repayments.set(loanId, history);

  state.logger.info('Loan repayment made', {
    loanId,
    amountKalon: String(amountKalon),
    fullyRepaid,
  });
  return { success: true, repayment, fullyRepaid };
}

function defaultLoanImpl(
  state: LoanSystemState,
  loanId: LoanId,
): { readonly success: true } | { readonly success: false; readonly error: LoanError } {
  const loan = state.loans.get(loanId);
  if (!loan) return { success: false, error: 'loan-not-found' };
  if (loan.status !== 'ACTIVE') return { success: false, error: 'wrong-status' };

  loan.status = 'DEFAULTED';
  state.logger.info('Loan defaulted', { loanId });
  return { success: true };
}

function cancelLoanImpl(
  state: LoanSystemState,
  loanId: LoanId,
): { readonly success: true } | { readonly success: false; readonly error: LoanError } {
  const loan = state.loans.get(loanId);
  if (!loan) return { success: false, error: 'loan-not-found' };
  if (loan.status !== 'PENDING') return { success: false, error: 'wrong-status' };

  loan.status = 'CANCELLED';
  state.logger.info('Loan cancelled', { loanId });
  return { success: true };
}
