import { describe, expect, it } from 'vitest';
import { createLoanSystem } from '../loan-system.js';

describe('loan-system simulation', () => {
  const ONE_DAY = 86_400_000_000n;

  const make = () => {
    let now = 1_000_000n;
    let ids = 0;
    return {
      system: createLoanSystem({
        clock: { nowMicroseconds: () => now },
        idGen: { generateId: () => `loan-${++ids}` },
        logger: { info: () => undefined },
      }),
      advance: (delta: bigint) => {
        now += delta;
      },
    };
  };

  it('simulates offer creation, activation, staged repayment, and full closeout', () => {
    const { system } = make();

    const offer = system.createOffer('lender-a', 10_000n * 1_000_000n, 1200, ONE_DAY, 30n * ONE_DAY);
    expect(typeof offer).toBe('object');
    if (typeof offer === 'string') return;

    const loan = system.requestLoan(offer.offerId, 'borrower-a', 2_000n * 1_000_000n, 14n * ONE_DAY);
    expect(typeof loan).toBe('object');
    if (typeof loan === 'string') return;

    const activated = system.activateLoan(loan.loanId);
    expect(activated.success).toBe(true);

    const firstPay = system.repayLoan(loan.loanId, 'borrower-a', loan.outstandingKalon / 3n);
    expect(firstPay.success).toBe(true);
    if (!firstPay.success) return;
    expect(firstPay.fullyRepaid).toBe(false);

    const remaining = system.getLoan(loan.loanId)?.outstandingKalon ?? 0n;
    const secondPay = system.repayLoan(loan.loanId, 'borrower-a', remaining);
    expect(secondPay.success).toBe(true);
    if (!secondPay.success) return;
    expect(secondPay.fullyRepaid).toBe(true);

    expect(system.getLoan(loan.loanId)?.status).toBe('REPAID');
    expect(system.getRepaymentHistory(loan.loanId)).toHaveLength(2);
  });

  it('simulates cancellation and default branches for separate loans', () => {
    const { system } = make();

    const offer = system.createOffer('lender-b', 5_000n * 1_000_000n, 500, ONE_DAY, 10n * ONE_DAY);
    expect(typeof offer).toBe('object');
    if (typeof offer === 'string') return;

    const toCancel = system.requestLoan(offer.offerId, 'borrower-c', 1_000n * 1_000_000n, 3n * ONE_DAY);
    const toDefault = system.requestLoan(offer.offerId, 'borrower-d', 1_200n * 1_000_000n, 4n * ONE_DAY);
    expect(typeof toCancel).toBe('object');
    expect(typeof toDefault).toBe('object');
    if (typeof toCancel === 'string' || typeof toDefault === 'string') return;

    const cancelled = system.cancelLoan(toCancel.loanId);
    expect(cancelled.success).toBe(true);
    expect(system.getLoan(toCancel.loanId)?.status).toBe('CANCELLED');

    system.activateLoan(toDefault.loanId);
    const defaulted = system.defaultLoan(toDefault.loanId);
    expect(defaulted.success).toBe(true);
    expect(system.getLoan(toDefault.loanId)?.status).toBe('DEFAULTED');
  });
});
