import { describe, it, expect } from 'vitest';
import { createSecretSharingSystem } from '../secret-sharing.js';
import type { SecretSharingSystem, SecretMetadata, SecretShare } from '../secret-sharing.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem(): SecretSharingSystem {
  let now = 1_000_000n;
  return createSecretSharingSystem({
    clock: { nowMicroseconds: () => now++ },
    idGen: { next: () => 'id-' + String(++idCounter) },
    logger: { info: () => undefined, warn: () => undefined },
  });
}

function asSplit(r: { metadata: SecretMetadata; shares: ReadonlyArray<SecretShare> } | string): {
  metadata: SecretMetadata;
  shares: ReadonlyArray<SecretShare>;
} {
  if (typeof r === 'string') throw new Error('Expected split result, got: ' + r);
  return r;
}

function getShare(shares: ReadonlyArray<SecretShare>, index: number): SecretShare {
  const s = shares[index];
  if (s === undefined) throw new Error('Share at index ' + String(index) + ' does not exist');
  return s;
}

// ─── splitSecret ─────────────────────────────────────────────────────────────

describe('splitSecret', () => {
  it('creates metadata and shares for valid input', () => {
    const system = createTestSystem();
    const result = asSplit(system.splitSecret('my-secret', 2, ['alice', 'bob', 'charlie']));
    expect(result.metadata.threshold).toBe(2);
    expect(result.metadata.totalShares).toBe(3);
    expect(result.metadata.revealed).toBe(false);
    expect(result.shares).toHaveLength(3);
  });

  it('assigns share indices 1..n', () => {
    const system = createTestSystem();
    const { shares } = asSplit(system.splitSecret('s', 2, ['a', 'b']));
    expect(shares.map((s) => s.shareIndex)).toEqual([1, 2]);
  });

  it('each holder gets one share', () => {
    const system = createTestSystem();
    const { shares } = asSplit(system.splitSecret('s', 2, ['alice', 'bob']));
    const [first, second] = shares;
    expect(first?.holderId).toBe('alice');
    expect(second?.holderId).toBe('bob');
  });

  it('returns invalid-threshold when threshold < 2', () => {
    const system = createTestSystem();
    expect(system.splitSecret('s', 1, ['alice', 'bob'])).toBe('invalid-threshold');
  });

  it('returns invalid-threshold when threshold > holderIds.length', () => {
    const system = createTestSystem();
    expect(system.splitSecret('s', 3, ['alice', 'bob'])).toBe('invalid-threshold');
  });

  it('allows threshold = holderIds.length', () => {
    const system = createTestSystem();
    const result = system.splitSecret('s', 2, ['alice', 'bob']);
    expect(typeof result).not.toBe('string');
  });
});

// ─── accessShare ─────────────────────────────────────────────────────────────

describe('accessShare', () => {
  it('marks share as accessed by correct holder', () => {
    const system = createTestSystem();
    const { shares } = asSplit(system.splitSecret('s', 2, ['alice', 'bob']));
    const share = getShare(shares, 0);
    const result = system.accessShare(share.shareId, 'alice');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.share.accessed).toBe(true);
    }
  });

  it('returns share-not-found for unknown shareId', () => {
    const system = createTestSystem();
    expect(system.accessShare('bad-id', 'alice')).toEqual({
      success: false,
      error: 'share-not-found',
    });
  });

  it('returns holder-not-found when holderId does not match share', () => {
    const system = createTestSystem();
    const { shares } = asSplit(system.splitSecret('s', 2, ['alice', 'bob']));
    const share = getShare(shares, 0);
    expect(system.accessShare(share.shareId, 'bob')).toEqual({
      success: false,
      error: 'holder-not-found',
    });
  });
});

// ─── attemptReconstruction ───────────────────────────────────────────────────

describe('attemptReconstruction', () => {
  it('succeeds when enough shares have been accessed', () => {
    const system = createTestSystem();
    const { metadata, shares } = asSplit(system.splitSecret('s', 2, ['alice', 'bob', 'charlie']));
    system.accessShare(getShare(shares, 0).shareId, 'alice');
    system.accessShare(getShare(shares, 1).shareId, 'bob');
    const result = system.attemptReconstruction(metadata.secretId, ['alice', 'bob']);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.attempt.successful).toBe(true);
      expect(result.attempt.sharesPresented).toBe(2);
    }
  });

  it('fails when not enough shares accessed', () => {
    const system = createTestSystem();
    const { metadata, shares } = asSplit(system.splitSecret('s', 3, ['alice', 'bob', 'charlie']));
    system.accessShare(getShare(shares, 0).shareId, 'alice');
    const result = system.attemptReconstruction(metadata.secretId, ['alice']);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.attempt.successful).toBe(false);
    }
  });

  it('marks metadata as revealed on success', () => {
    const system = createTestSystem();
    const { metadata, shares } = asSplit(system.splitSecret('s', 2, ['alice', 'bob']));
    system.accessShare(getShare(shares, 0).shareId, 'alice');
    system.accessShare(getShare(shares, 1).shareId, 'bob');
    system.attemptReconstruction(metadata.secretId, ['alice', 'bob']);
    expect(system.getMetadata(metadata.secretId)?.revealed).toBe(true);
  });

  it('returns secret-already-revealed on second attempt after success', () => {
    const system = createTestSystem();
    const { metadata, shares } = asSplit(system.splitSecret('s', 2, ['alice', 'bob']));
    system.accessShare(getShare(shares, 0).shareId, 'alice');
    system.accessShare(getShare(shares, 1).shareId, 'bob');
    system.attemptReconstruction(metadata.secretId, ['alice', 'bob']);
    const second = system.attemptReconstruction(metadata.secretId, ['alice', 'bob']);
    expect(second).toEqual({ success: false, error: 'secret-already-revealed' });
  });

  it('returns secret-not-found for unknown secretId', () => {
    const system = createTestSystem();
    expect(system.attemptReconstruction('bad-id', ['alice'])).toEqual({
      success: false,
      error: 'secret-not-found',
    });
  });

  it('records reconstruction history', () => {
    const system = createTestSystem();
    const { metadata, shares } = asSplit(system.splitSecret('s', 2, ['alice', 'bob']));
    system.accessShare(getShare(shares, 0).shareId, 'alice');
    system.attemptReconstruction(metadata.secretId, ['alice']);
    expect(system.getReconstructionHistory(metadata.secretId)).toHaveLength(1);
  });
});

// ─── getMetadata / getShare / listShares ─────────────────────────────────────

describe('getMetadata, getShare, listShares', () => {
  it('returns undefined for unknown secretId', () => {
    const system = createTestSystem();
    expect(system.getMetadata('bad-id')).toBeUndefined();
  });

  it('returns undefined for unknown shareId', () => {
    const system = createTestSystem();
    expect(system.getShare('bad-id')).toBeUndefined();
  });

  it('listShares returns all shares for a secret', () => {
    const system = createTestSystem();
    const { metadata } = asSplit(system.splitSecret('s', 2, ['a', 'b', 'c']));
    expect(system.listShares(metadata.secretId)).toHaveLength(3);
  });

  it('listShares returns empty for unknown secretId', () => {
    const system = createTestSystem();
    expect(system.listShares('bad-id')).toHaveLength(0);
  });
});

// ─── getReconstructionHistory ─────────────────────────────────────────────────

describe('getReconstructionHistory', () => {
  it('returns empty array for secret with no attempts', () => {
    const system = createTestSystem();
    const { metadata } = asSplit(system.splitSecret('s', 2, ['alice', 'bob']));
    expect(system.getReconstructionHistory(metadata.secretId)).toHaveLength(0);
  });
});
