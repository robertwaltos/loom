import { describe, it, expect } from 'vitest';
import { createZeroTrustGatewaySystem } from '../zero-trust-gateway.js';
import type {
  ZeroTrustGatewaySystem,
  TrustPolicy,
  VerificationResult,
} from '../zero-trust-gateway.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem(): { system: ZeroTrustGatewaySystem; advanceTime: (us: bigint) => void } {
  let now = 1_000_000n;
  return {
    system: createZeroTrustGatewaySystem({
      clock: { nowMicroseconds: () => now },
      idGen: { next: () => 'id-' + String(++idCounter) },
      logger: { info: () => undefined, warn: () => undefined },
    }),
    advanceTime(us: bigint) {
      now += us;
    },
  };
}

function asPolicy(r: TrustPolicy | string): TrustPolicy {
  if (typeof r === 'string') throw new Error('Expected TrustPolicy, got: ' + r);
  return r;
}

function asVerification(r: VerificationResult): VerificationResult {
  return r;
}

// ─── registerPrincipal ────────────────────────────────────────────────────────

describe('registerPrincipal', () => {
  it('registers a new principal with default UNTRUSTED level', () => {
    const { system } = createTestSystem();
    const result = system.registerPrincipal('p1');
    expect(result).toEqual({ success: true });
    const principal = system.getPrincipal('p1');
    expect(principal?.trustScore).toBe(0);
    expect(principal?.trustLevel).toBe('UNTRUSTED');
    expect(principal?.lastVerifiedAt).toBeNull();
  });

  it('registers principal with initial attributes', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1', ['admin', 'verified-email']);
    const principal = system.getPrincipal('p1');
    expect(principal?.attributes).toContain('admin');
    expect(principal?.attributes).toContain('verified-email');
  });

  it('returns already-registered for duplicate principal', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    const result = system.registerPrincipal('p1');
    expect(result).toEqual({ success: false, error: 'already-registered' });
  });
});

// ─── updateTrustScore ─────────────────────────────────────────────────────────

describe('updateTrustScore', () => {
  it('maps score 0-20 to UNTRUSTED', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    system.updateTrustScore('p1', 15);
    expect(system.getPrincipal('p1')?.trustLevel).toBe('UNTRUSTED');
  });

  it('maps score 21-40 to LOW', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    system.updateTrustScore('p1', 30);
    expect(system.getPrincipal('p1')?.trustLevel).toBe('LOW');
  });

  it('maps score 41-60 to MEDIUM', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    system.updateTrustScore('p1', 50);
    expect(system.getPrincipal('p1')?.trustLevel).toBe('MEDIUM');
  });

  it('maps score 61-80 to HIGH', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    system.updateTrustScore('p1', 70);
    expect(system.getPrincipal('p1')?.trustLevel).toBe('HIGH');
  });

  it('maps score 81-100 to VERIFIED', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    system.updateTrustScore('p1', 90);
    expect(system.getPrincipal('p1')?.trustLevel).toBe('VERIFIED');
  });

  it('returns invalid-trust-score for score > 100', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    expect(system.updateTrustScore('p1', 101)).toEqual({
      success: false,
      error: 'invalid-trust-score',
    });
  });

  it('returns invalid-trust-score for negative score', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    expect(system.updateTrustScore('p1', -1)).toEqual({
      success: false,
      error: 'invalid-trust-score',
    });
  });

  it('returns principal-not-found for unknown principal', () => {
    const { system } = createTestSystem();
    expect(system.updateTrustScore('unknown', 50)).toEqual({
      success: false,
      error: 'principal-not-found',
    });
  });
});

// ─── addAttribute ─────────────────────────────────────────────────────────────

describe('addAttribute', () => {
  it('adds attribute to principal', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    system.addAttribute('p1', 'mfa-verified');
    expect(system.getPrincipal('p1')?.attributes).toContain('mfa-verified');
  });

  it('does not duplicate existing attribute', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1', ['mfa-verified']);
    system.addAttribute('p1', 'mfa-verified');
    expect(system.getPrincipal('p1')?.attributes.filter((a) => a === 'mfa-verified').length).toBe(
      1,
    );
  });

  it('returns principal-not-found for unknown principal', () => {
    const { system } = createTestSystem();
    expect(system.addAttribute('unknown', 'attr')).toEqual({
      success: false,
      error: 'principal-not-found',
    });
  });
});

// ─── createPolicy ─────────────────────────────────────────────────────────────

describe('createPolicy', () => {
  it('creates an active policy', () => {
    const { system } = createTestSystem();
    const policy = asPolicy(system.createPolicy('admin-access', 'HIGH', ['admin']));
    expect(policy.name).toBe('admin-access');
    expect(policy.requiredTrustLevel).toBe('HIGH');
    expect(policy.requiredAttributes).toContain('admin');
    expect(policy.active).toBe(true);
  });

  it('retrieves policy by id', () => {
    const { system } = createTestSystem();
    const policy = asPolicy(system.createPolicy('test-policy', 'MEDIUM', []));
    expect(system.getPolicy(policy.policyId)).toBeDefined();
  });
});

// ─── verifyAccess — no policy ─────────────────────────────────────────────────

describe('verifyAccess — no policy', () => {
  it('grants access for non-UNTRUSTED principal without policy', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    system.updateTrustScore('p1', 50);
    const result = asVerification(system.verifyAccess('p1', null));
    expect(result.granted).toBe(true);
    expect(result.trustLevel).toBe('MEDIUM');
  });

  it('denies access for UNTRUSTED principal without policy', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    const result = asVerification(system.verifyAccess('p1', null));
    expect(result.granted).toBe(false);
  });

  it('returns granted=false for unknown principal', () => {
    const { system } = createTestSystem();
    const result = asVerification(system.verifyAccess('unknown', null));
    expect(result.granted).toBe(false);
    expect(result.reason).toBe('principal-not-found');
  });

  it('updates lastVerifiedAt on verification', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    system.updateTrustScore('p1', 60);
    system.verifyAccess('p1', null);
    expect(system.getPrincipal('p1')?.lastVerifiedAt).not.toBeNull();
  });
});

// ─── verifyAccess — with policy ───────────────────────────────────────────────

describe('verifyAccess — with policy', () => {
  it('grants access when trust level and attributes satisfy policy', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1', ['admin']);
    system.updateTrustScore('p1', 70);
    const policy = asPolicy(system.createPolicy('admin-access', 'HIGH', ['admin']));
    const result = system.verifyAccess('p1', policy.policyId);
    expect(result.granted).toBe(true);
  });

  it('denies when trust level is insufficient', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1', ['admin']);
    system.updateTrustScore('p1', 30);
    const policy = asPolicy(system.createPolicy('admin-access', 'HIGH', ['admin']));
    const result = system.verifyAccess('p1', policy.policyId);
    expect(result.granted).toBe(false);
    expect(result.reason).toBe('insufficient-trust-level');
  });

  it('denies when required attribute is missing', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    system.updateTrustScore('p1', 90);
    const policy = asPolicy(system.createPolicy('admin-access', 'VERIFIED', ['admin']));
    const result = system.verifyAccess('p1', policy.policyId);
    expect(result.granted).toBe(false);
  });

  it('returns policy-not-found reason for unknown policyId', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    system.updateTrustScore('p1', 90);
    const result = system.verifyAccess('p1', 'nonexistent-policy');
    expect(result.granted).toBe(false);
    expect(result.reason).toBe('policy-not-found');
  });
});

// ─── getVerificationHistory ───────────────────────────────────────────────────

describe('getVerificationHistory', () => {
  it('returns limited history entries', () => {
    const { system } = createTestSystem();
    system.registerPrincipal('p1');
    system.updateTrustScore('p1', 70);
    const policy = asPolicy(system.createPolicy('pol', 'HIGH', []));
    system.verifyAccess('p1', policy.policyId);
    system.verifyAccess('p1', policy.policyId);
    system.verifyAccess('p1', policy.policyId);
    const history = system.getVerificationHistory('p1', 2);
    expect(history.length).toBe(2);
  });

  it('returns empty array for unknown principal', () => {
    const { system } = createTestSystem();
    expect(system.getVerificationHistory('unknown', 10)).toHaveLength(0);
  });
});
