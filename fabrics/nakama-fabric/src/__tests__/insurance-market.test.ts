import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInsuranceMarketSystem,
  type InsuranceMarketSystem,
  type PolicyType,
} from '../insurance-market.js';

function createMockClock() {
  let currentTime = 1000000n;
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

const MICRO_KALON = 1_000_000n;
const ONE_DAY = 86400n * MICRO_KALON;

describe('InsuranceMarketSystem', () => {
  let system: InsuranceMarketSystem;
  let clock: ReturnType<typeof createMockClock>;
  let idGen: ReturnType<typeof createMockIdGen>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
    system = createInsuranceMarketSystem({ clock, idGen, logger });
  });

  describe('issuePolicy', () => {
    it('issues policy successfully', () => {
      const result = system.issuePolicy(
        'dynasty1',
        'TRANSIT_LOSS',
        10000n * MICRO_KALON,
        1.0,
        30n * ONE_DAY,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.policy.policyId).toBe('id-1');
      }
    });

    it('returns error for invalid coverage limit', () => {
      const result = system.issuePolicy('dynasty1', 'TRANSIT_LOSS', 0n, 1.0, 30n * ONE_DAY);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-coverage-limit');
    });

    it('returns error for negative coverage limit', () => {
      const result = system.issuePolicy('dynasty1', 'TRANSIT_LOSS', -1000n, 1.0, 30n * ONE_DAY);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-coverage-limit');
    });

    it('returns error for invalid risk multiplier', () => {
      const result = system.issuePolicy(
        'dynasty1',
        'TRANSIT_LOSS',
        10000n * MICRO_KALON,
        -0.5,
        30n * ONE_DAY,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('invalid-risk-multiplier');
      }
    });

    it('returns error for invalid duration', () => {
      const result = system.issuePolicy('dynasty1', 'TRANSIT_LOSS', 10000n * MICRO_KALON, 1.0, 0n);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-duration');
    });

    it('sets policy active status to true', () => {
      const result = system.issuePolicy(
        'dynasty1',
        'LIFE',
        50000n * MICRO_KALON,
        1.0,
        365n * ONE_DAY,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.policy.active).toBe(true);
      }
    });

    it('sets expiration time based on duration', () => {
      const result = system.issuePolicy(
        'dynasty1',
        'CROP_FAILURE',
        20000n * MICRO_KALON,
        1.0,
        90n * ONE_DAY,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        const expectedExpiry = 1000000n + 90n * ONE_DAY;
        expect(result.policy.expiresAt).toBe(expectedExpiry);
      }
    });

    it('calculates premium based on policy type and coverage', () => {
      const result = system.issuePolicy(
        'dynasty1',
        'PROPERTY_DAMAGE',
        10000n * MICRO_KALON,
        1.0,
        60n * ONE_DAY,
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.policy.premium).toBeGreaterThan(0n);
      }
    });

    it('logs policy issuance', () => {
      logger.clear();
      system.issuePolicy('dynasty1', 'TRADE_DEFAULT', 15000n * MICRO_KALON, 1.0, 45n * ONE_DAY);
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      const log = logs[logs.length - 1];
      expect(log?.message).toBe('Insurance policy issued');
      expect(log?.meta?.policyType).toBe('TRADE_DEFAULT');
    });
  });

  describe('policy types', () => {
    const policyTypes: PolicyType[] = [
      'TRANSIT_LOSS',
      'PROPERTY_DAMAGE',
      'TRADE_DEFAULT',
      'LIFE',
      'CROP_FAILURE',
    ];

    it('supports all policy types', () => {
      for (const policyType of policyTypes) {
        const result = system.issuePolicy(
          'dynasty1',
          policyType,
          10000n * MICRO_KALON,
          1.0,
          30n * ONE_DAY,
        );
        expect(result.success).toBe(true);
      }
    });
  });

  describe('calculatePremium', () => {
    it('calculates base premium for TRANSIT_LOSS', () => {
      const calc = system.calculatePremium('TRANSIT_LOSS', 10000n * MICRO_KALON, 1.0);
      expect(calc.basePremium).toBeGreaterThan(0n);
      expect(calc.finalPremium).toBe(calc.basePremium);
    });

    it('applies risk multiplier to premium', () => {
      const calc1 = system.calculatePremium('PROPERTY_DAMAGE', 10000n * MICRO_KALON, 1.0);
      const calc2 = system.calculatePremium('PROPERTY_DAMAGE', 10000n * MICRO_KALON, 2.0);
      expect(calc2.finalPremium).toBeGreaterThan(calc1.finalPremium);
    });

    it('scales premium with coverage limit', () => {
      const calc1 = system.calculatePremium('LIFE', 10000n * MICRO_KALON, 1.0);
      const calc2 = system.calculatePremium('LIFE', 20000n * MICRO_KALON, 1.0);
      expect(calc2.finalPremium).toBeGreaterThan(calc1.finalPremium);
    });

    it('returns premium calculation details', () => {
      const calc = system.calculatePremium('CROP_FAILURE', 5000n * MICRO_KALON, 1.5);
      expect(calc.policyType).toBe('CROP_FAILURE');
      expect(calc.riskMultiplier).toBe(1.5);
      expect(calc.basePremium).toBeDefined();
      expect(calc.finalPremium).toBeDefined();
    });
  });

  describe('fileClaim', () => {
    let policyId: string;

    beforeEach(() => {
      const result = system.issuePolicy(
        'dynasty1',
        'TRANSIT_LOSS',
        10000n * MICRO_KALON,
        1.0,
        30n * ONE_DAY,
      );
      if (result.success) policyId = result.policy.policyId;
    });

    it('files claim successfully', () => {
      const result = system.fileClaim(policyId, 5000n * MICRO_KALON, 'evidence-hash-123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.claim.claimId).toBe('id-2');
      }
    });

    it('returns error for non-existent policy', () => {
      const result = system.fileClaim('bad-policy', 5000n * MICRO_KALON, 'evidence-hash-123');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('policy-not-found');
    });

    it('returns error for invalid claim amount', () => {
      const result = system.fileClaim(policyId, 0n, 'evidence-hash-123');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-claim-amount');
    });

    it('returns error for negative claim amount', () => {
      const result = system.fileClaim(policyId, -1000n, 'evidence-hash-123');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-claim-amount');
    });

    it('returns error when claim exceeds coverage', () => {
      const result = system.fileClaim(policyId, 15000n * MICRO_KALON, 'evidence-hash-123');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('claim-exceeds-coverage');
    });

    it('returns error for expired policy', () => {
      clock.advance(31n * ONE_DAY);
      const result = system.fileClaim(policyId, 5000n * MICRO_KALON, 'evidence-hash-123');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('policy-expired');
    });

    it('stores evidence hash in claim', () => {
      const result = system.fileClaim(policyId, 3000n * MICRO_KALON, 'evidence-xyz');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.claim.evidenceHash).toBe('evidence-xyz');
      }
    });

    it('initializes claim as unprocessed', () => {
      const result = system.fileClaim(policyId, 3000n * MICRO_KALON, 'evidence-abc');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.claim.processed).toBe(false);
        expect(result.claim.approved).toBe(false);
        expect(result.claim.payoutAmount).toBe(0n);
      }
    });

    it('logs claim filing', () => {
      logger.clear();
      system.fileClaim(policyId, 4000n * MICRO_KALON, 'evidence-def');
      const logs = logger.getLogs();
      const claimLog = logs.find((l) => l.message === 'Insurance claim filed');
      expect(claimLog).toBeDefined();
      expect(claimLog?.meta?.evidenceHash).toBe('evidence-def');
    });
  });

  describe('processClaim', () => {
    let policyId: string;
    let claimId: string;

    beforeEach(() => {
      const policyResult = system.issuePolicy(
        'dynasty1',
        'PROPERTY_DAMAGE',
        10000n * MICRO_KALON,
        1.0,
        30n * ONE_DAY,
      );
      if (policyResult.success) policyId = policyResult.policy.policyId;

      const claimResult = system.fileClaim(policyId, 5000n * MICRO_KALON, 'evidence-hash');
      if (claimResult.success) claimId = claimResult.claim.claimId;
    });

    it('processes approved claim successfully', () => {
      const result = system.processClaim(claimId, true);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payout).toBe(5000n * MICRO_KALON);
      }
    });

    it('processes denied claim successfully', () => {
      const result = system.processClaim(claimId, false);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.payout).toBe(0n);
      }
    });

    it('returns error for non-existent claim', () => {
      const result = system.processClaim('bad-claim', true);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('claim-not-found');
    });

    it('returns error when claim already processed', () => {
      system.processClaim(claimId, true);
      const result = system.processClaim(claimId, false);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('claim-already-processed');
      }
    });

    it('marks claim as processed', () => {
      system.processClaim(claimId, true);
      const claim = system.getClaim(claimId);
      expect(claim?.processed).toBe(true);
    });

    it('sets approved status correctly', () => {
      system.processClaim(claimId, true);
      const claim = system.getClaim(claimId);
      expect(claim?.approved).toBe(true);
    });

    it('sets payout amount for approved claim', () => {
      system.processClaim(claimId, true);
      const claim = system.getClaim(claimId);
      expect(claim?.payoutAmount).toBe(5000n * MICRO_KALON);
    });

    it('sets zero payout for denied claim', () => {
      system.processClaim(claimId, false);
      const claim = system.getClaim(claimId);
      expect(claim?.payoutAmount).toBe(0n);
    });

    it('caps payout at coverage limit', () => {
      const policyResult = system.issuePolicy(
        'dynasty2',
        'TRANSIT_LOSS',
        5000n * MICRO_KALON,
        1.0,
        30n * ONE_DAY,
      );
      if (policyResult.success) {
        const claimResult = system.fileClaim(
          policyResult.policy.policyId,
          5000n * MICRO_KALON,
          'evidence',
        );
        if (claimResult.success) {
          const result = system.processClaim(claimResult.claim.claimId, true);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.payout).toBe(5000n * MICRO_KALON);
          }
        }
      }
    });

    it('logs approved claim', () => {
      logger.clear();
      system.processClaim(claimId, true);
      const logs = logger.getLogs();
      const approveLog = logs.find((l) => l.message === 'Insurance claim approved');
      expect(approveLog).toBeDefined();
    });

    it('logs denied claim', () => {
      logger.clear();
      system.processClaim(claimId, false);
      const logs = logger.getLogs();
      const denyLog = logs.find((l) => l.message === 'Insurance claim denied');
      expect(denyLog).toBeDefined();
    });
  });

  describe('flagFraud', () => {
    let policyId: string;
    let claimId: string;

    beforeEach(() => {
      const policyResult = system.issuePolicy(
        'dynasty1',
        'TRADE_DEFAULT',
        10000n * MICRO_KALON,
        1.0,
        30n * ONE_DAY,
      );
      if (policyResult.success) policyId = policyResult.policy.policyId;

      const claimResult = system.fileClaim(policyId, 8000n * MICRO_KALON, 'suspicious-evidence');
      if (claimResult.success) claimId = claimResult.claim.claimId;
    });

    it('flags fraud successfully', () => {
      const result = system.flagFraud(claimId, 'Duplicate claim detected');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.flag.flagId).toBe('id-3');
      }
    });

    it('returns error for non-existent claim', () => {
      const result = system.flagFraud('bad-claim', 'Some reason');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('claim-not-found');
    });

    it('stores fraud reason', () => {
      const result = system.flagFraud(claimId, 'Evidence tampering suspected');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.flag.reason).toBe('Evidence tampering suspected');
      }
    });

    it('associates flag with claim and dynasty', () => {
      const result = system.flagFraud(claimId, 'Pattern matching fraud');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.flag.claimId).toBe(claimId);
        expect(result.flag.dynastyId).toBe('dynasty1');
      }
    });

    it('allows multiple flags on same claim', () => {
      const result1 = system.flagFraud(claimId, 'Reason 1');
      const result2 = system.flagFraud(claimId, 'Reason 2');
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('logs fraud flag', () => {
      logger.clear();
      system.flagFraud(claimId, 'Anomalous pattern');
      const logs = logger.getLogs();
      const fraudLog = logs.find((l) => l.message === 'Fraud flag raised');
      expect(fraudLog).toBeDefined();
      expect(fraudLog?.meta?.reason).toBe('Anomalous pattern');
    });
  });

  describe('getInsuranceReport', () => {
    it('returns empty report initially', () => {
      const report = system.getInsuranceReport();
      expect(report.totalPolicies).toBe(0);
      expect(report.activePolicies).toBe(0);
      expect(report.totalClaims).toBe(0);
      expect(report.approvedClaims).toBe(0);
      expect(report.deniedClaims).toBe(0);
      expect(report.fraudFlags).toBe(0);
      expect(report.totalPremiumsCollected).toBe(0n);
      expect(report.totalPayouts).toBe(0n);
    });

    it('counts total policies', () => {
      system.issuePolicy('dynasty1', 'TRANSIT_LOSS', 10000n * MICRO_KALON, 1.0, 30n * ONE_DAY);
      system.issuePolicy('dynasty2', 'LIFE', 50000n * MICRO_KALON, 1.0, 365n * ONE_DAY);

      const report = system.getInsuranceReport();
      expect(report.totalPolicies).toBe(2);
    });

    it('counts active policies', () => {
      system.issuePolicy('dynasty1', 'CROP_FAILURE', 20000n * MICRO_KALON, 1.0, 90n * ONE_DAY);
      const report = system.getInsuranceReport();
      expect(report.activePolicies).toBe(1);
    });

    it('counts total claims', () => {
      const policyResult = system.issuePolicy(
        'dynasty1',
        'PROPERTY_DAMAGE',
        10000n * MICRO_KALON,
        1.0,
        30n * ONE_DAY,
      );
      if (policyResult.success) {
        system.fileClaim(policyResult.policy.policyId, 5000n * MICRO_KALON, 'evidence1');
        system.fileClaim(policyResult.policy.policyId, 3000n * MICRO_KALON, 'evidence2');
      }

      const report = system.getInsuranceReport();
      expect(report.totalClaims).toBe(2);
    });

    it('counts approved and denied claims', () => {
      const policyResult = system.issuePolicy(
        'dynasty1',
        'TRADE_DEFAULT',
        10000n * MICRO_KALON,
        1.0,
        30n * ONE_DAY,
      );
      if (policyResult.success) {
        const claim1 = system.fileClaim(policyResult.policy.policyId, 4000n * MICRO_KALON, 'ev1');
        const claim2 = system.fileClaim(policyResult.policy.policyId, 3000n * MICRO_KALON, 'ev2');
        if (claim1.success) system.processClaim(claim1.claim.claimId, true);
        if (claim2.success) system.processClaim(claim2.claim.claimId, false);
      }

      const report = system.getInsuranceReport();
      expect(report.approvedClaims).toBe(1);
      expect(report.deniedClaims).toBe(1);
    });

    it('counts fraud flags', () => {
      const policyResult = system.issuePolicy(
        'dynasty1',
        'TRANSIT_LOSS',
        10000n * MICRO_KALON,
        1.0,
        30n * ONE_DAY,
      );
      if (policyResult.success) {
        const claimResult = system.fileClaim(
          policyResult.policy.policyId,
          5000n * MICRO_KALON,
          'evidence',
        );
        if (claimResult.success) {
          system.flagFraud(claimResult.claim.claimId, 'Suspicious');
        }
      }

      const report = system.getInsuranceReport();
      expect(report.fraudFlags).toBe(1);
    });

    it('tracks total premiums collected', () => {
      system.issuePolicy('dynasty1', 'LIFE', 10000n * MICRO_KALON, 1.0, 365n * ONE_DAY);
      const report = system.getInsuranceReport();
      expect(report.totalPremiumsCollected).toBeGreaterThan(0n);
    });

    it('tracks total payouts', () => {
      const policyResult = system.issuePolicy(
        'dynasty1',
        'PROPERTY_DAMAGE',
        10000n * MICRO_KALON,
        1.0,
        30n * ONE_DAY,
      );
      if (policyResult.success) {
        const claimResult = system.fileClaim(
          policyResult.policy.policyId,
          5000n * MICRO_KALON,
          'evidence',
        );
        if (claimResult.success) {
          system.processClaim(claimResult.claim.claimId, true);
        }
      }

      const report = system.getInsuranceReport();
      expect(report.totalPayouts).toBe(5000n * MICRO_KALON);
    });

    it('includes generation timestamp', () => {
      const report = system.getInsuranceReport();
      expect(report.generatedAt).toBe(1000000n);
    });
  });

  describe('renewPolicy', () => {
    let policyId: string;

    beforeEach(() => {
      const result = system.issuePolicy(
        'dynasty1',
        'TRANSIT_LOSS',
        10000n * MICRO_KALON,
        1.0,
        30n * ONE_DAY,
      );
      if (result.success) policyId = result.policy.policyId;
    });

    it('renews policy successfully', () => {
      const result = system.renewPolicy(policyId, 60n * ONE_DAY);
      expect(result.success).toBe(true);
    });

    it('returns error for non-existent policy', () => {
      const result = system.renewPolicy('bad-policy', 30n * ONE_DAY);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('policy-not-found');
    });

    it('returns error for invalid duration', () => {
      const result = system.renewPolicy(policyId, 0n);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-duration');
    });

    it('extends expiration time', () => {
      clock.advance(20n * ONE_DAY);
      const result = system.renewPolicy(policyId, 30n * ONE_DAY);
      expect(result.success).toBe(true);
      if (result.success) {
        const expectedExpiry = 1000000n + 20n * ONE_DAY + 30n * ONE_DAY;
        expect(result.policy.expiresAt).toBe(expectedExpiry);
      }
    });

    it('reactivates inactive policy', () => {
      const policy = system.getPolicy(policyId);
      if (policy) {
        const result = system.renewPolicy(policyId, 45n * ONE_DAY);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.policy.active).toBe(true);
        }
      }
    });

    it('collects renewal premium', () => {
      const reportBefore = system.getInsuranceReport();
      system.renewPolicy(policyId, 30n * ONE_DAY);
      const reportAfter = system.getInsuranceReport();
      expect(reportAfter.totalPremiumsCollected).toBeGreaterThan(
        reportBefore.totalPremiumsCollected,
      );
    });

    it('logs policy renewal', () => {
      logger.clear();
      system.renewPolicy(policyId, 30n * ONE_DAY);
      const logs = logger.getLogs();
      const renewLog = logs.find((l) => l.message === 'Insurance policy renewed');
      expect(renewLog).toBeDefined();
      expect(renewLog?.meta?.policyId).toBe(policyId);
    });
  });

  describe('getPolicy', () => {
    it('returns policy when found', () => {
      const issueResult = system.issuePolicy(
        'dynasty1',
        'LIFE',
        50000n * MICRO_KALON,
        1.0,
        365n * ONE_DAY,
      );
      if (issueResult.success) {
        const policy = system.getPolicy(issueResult.policy.policyId);
        expect(policy).toBeDefined();
        expect(policy?.dynastyId).toBe('dynasty1');
      }
    });

    it('returns undefined when not found', () => {
      const policy = system.getPolicy('bad-policy');
      expect(policy).toBeUndefined();
    });
  });

  describe('getClaim', () => {
    it('returns claim when found', () => {
      const policyResult = system.issuePolicy(
        'dynasty1',
        'CROP_FAILURE',
        20000n * MICRO_KALON,
        1.0,
        90n * ONE_DAY,
      );
      if (policyResult.success) {
        const claimResult = system.fileClaim(
          policyResult.policy.policyId,
          10000n * MICRO_KALON,
          'evidence',
        );
        if (claimResult.success) {
          const claim = system.getClaim(claimResult.claim.claimId);
          expect(claim).toBeDefined();
          expect(claim?.claimAmount).toBe(10000n * MICRO_KALON);
        }
      }
    });

    it('returns undefined when not found', () => {
      const claim = system.getClaim('bad-claim');
      expect(claim).toBeUndefined();
    });
  });

  describe('listPolicies', () => {
    it('returns empty array when no policies', () => {
      const policies = system.listPolicies('dynasty1');
      expect(policies.length).toBe(0);
    });

    it('returns policies for specific dynasty', () => {
      system.issuePolicy('dynasty1', 'TRANSIT_LOSS', 10000n * MICRO_KALON, 1.0, 30n * ONE_DAY);
      system.issuePolicy('dynasty1', 'LIFE', 50000n * MICRO_KALON, 1.0, 365n * ONE_DAY);
      system.issuePolicy('dynasty2', 'CROP_FAILURE', 20000n * MICRO_KALON, 1.0, 90n * ONE_DAY);

      const policies = system.listPolicies('dynasty1');
      expect(policies.length).toBe(2);
      expect(policies.every((p) => p.dynastyId === 'dynasty1')).toBe(true);
    });
  });

  describe('listClaims', () => {
    it('returns empty array when no claims', () => {
      const claims = system.listClaims('dynasty1');
      expect(claims.length).toBe(0);
    });

    it('returns claims for specific dynasty', () => {
      const policy1 = system.issuePolicy(
        'dynasty1',
        'PROPERTY_DAMAGE',
        10000n * MICRO_KALON,
        1.0,
        30n * ONE_DAY,
      );
      const policy2 = system.issuePolicy(
        'dynasty2',
        'TRANSIT_LOSS',
        15000n * MICRO_KALON,
        1.0,
        30n * ONE_DAY,
      );

      if (policy1.success) {
        system.fileClaim(policy1.policy.policyId, 5000n * MICRO_KALON, 'evidence1');
        system.fileClaim(policy1.policy.policyId, 3000n * MICRO_KALON, 'evidence2');
      }
      if (policy2.success) {
        system.fileClaim(policy2.policy.policyId, 8000n * MICRO_KALON, 'evidence3');
      }

      const claims = system.listClaims('dynasty1');
      expect(claims.length).toBe(2);
      expect(claims.every((c) => c.dynastyId === 'dynasty1')).toBe(true);
    });
  });

  describe('multiple dynasties integration', () => {
    it('manages policies and claims independently per dynasty', () => {
      const policy1 = system.issuePolicy(
        'dynasty1',
        'LIFE',
        50000n * MICRO_KALON,
        1.0,
        365n * ONE_DAY,
      );
      const policy2 = system.issuePolicy(
        'dynasty2',
        'TRANSIT_LOSS',
        10000n * MICRO_KALON,
        1.5,
        30n * ONE_DAY,
      );

      if (policy1.success && policy2.success) {
        system.fileClaim(policy1.policy.policyId, 20000n * MICRO_KALON, 'evidence1');
        system.fileClaim(policy2.policy.policyId, 5000n * MICRO_KALON, 'evidence2');

        const policies1 = system.listPolicies('dynasty1');
        const policies2 = system.listPolicies('dynasty2');
        const claims1 = system.listClaims('dynasty1');
        const claims2 = system.listClaims('dynasty2');

        expect(policies1.length).toBe(1);
        expect(policies2.length).toBe(1);
        expect(claims1.length).toBe(1);
        expect(claims2.length).toBe(1);
      }
    });
  });
});
