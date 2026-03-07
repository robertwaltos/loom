import { describe, it, expect } from 'vitest';
import { createTokenVault, DEFAULT_TOKEN_CONFIG } from '../token-vault.js';
import type {
  TokenVault,
  TokenVaultDeps,
  TokenVaultConfig,
} from '../token-vault.js';

// ─── Test Helpers ───────────────────────────────────────────────────

const US_PER_HOUR = 60 * 60 * 1_000_000;

function createTestVault(
  configOverrides?: Partial<TokenVaultConfig>,
  startTime = 1_000_000,
): { vault: TokenVault; advanceTime: (us: number) => void } {
  let currentTime = startTime;
  let idCounter = 0;

  const config: TokenVaultConfig = {
    ...DEFAULT_TOKEN_CONFIG,
    ...configOverrides,
  };

  const deps: TokenVaultDeps = {
    idGenerator: {
      next() {
        idCounter += 1;
        return 'tok-' + String(idCounter);
      },
    },
    clock: { nowMicroseconds: () => currentTime },
    config,
  };

  return {
    vault: createTokenVault(deps),
    advanceTime(us: number) {
      currentTime += us;
    },
  };
}

// ─── Issuance ───────────────────────────────────────────────────────

describe('Token vault issuance', () => {
  it('issues a session token', () => {
    const { vault } = createTestVault();
    const token = vault.issue('dyn-1');
    expect(token.tokenId).toBe('tok-1');
    expect(token.dynastyId).toBe('dyn-1');
    expect(token.isRevoked).toBe(false);
  });

  it('sets expiry based on TTL config', () => {
    const { vault } = createTestVault({ ttlMicroseconds: 2 * US_PER_HOUR });
    const token = vault.issue('dyn-1');
    expect(token.expiresAt).toBe(1_000_000 + 2 * US_PER_HOUR);
  });

  it('increments count', () => {
    const { vault } = createTestVault();
    expect(vault.count()).toBe(0);
    vault.issue('dyn-1');
    vault.issue('dyn-2');
    expect(vault.count()).toBe(2);
  });

  it('enforces session limit per dynasty', () => {
    const { vault } = createTestVault({ maxSessionsPerDynasty: 2 });
    vault.issue('dyn-1');
    vault.issue('dyn-1');
    expect(() => vault.issue('dyn-1')).toThrow('session limit');
  });

  it('allows sessions for different dynasties independently', () => {
    const { vault } = createTestVault({ maxSessionsPerDynasty: 1 });
    vault.issue('dyn-1');
    const t2 = vault.issue('dyn-2');
    expect(t2.dynastyId).toBe('dyn-2');
  });
});

// ─── Validation ─────────────────────────────────────────────────────

describe('Token vault validation', () => {
  it('validates active token', () => {
    const { vault } = createTestVault();
    vault.issue('dyn-1');
    const result = vault.validate('tok-1');
    expect(result.valid).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.token?.dynastyId).toBe('dyn-1');
  });

  it('rejects unknown token', () => {
    const { vault } = createTestVault();
    const result = vault.validate('nonexistent');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('not_found');
  });

  it('rejects expired token', () => {
    const { vault, advanceTime } = createTestVault({
      ttlMicroseconds: US_PER_HOUR,
    });
    vault.issue('dyn-1');
    advanceTime(2 * US_PER_HOUR);
    const result = vault.validate('tok-1');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('expired');
  });

  it('rejects revoked token', () => {
    const { vault } = createTestVault();
    vault.issue('dyn-1');
    vault.revoke('tok-1');
    const result = vault.validate('tok-1');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('revoked');
  });
});

// ─── Refresh ────────────────────────────────────────────────────────

describe('Token vault refresh', () => {
  it('extends token expiry', () => {
    const { vault, advanceTime } = createTestVault({
      ttlMicroseconds: 2 * US_PER_HOUR,
      refreshExtendsMicroseconds: 4 * US_PER_HOUR,
    });
    vault.issue('dyn-1');
    advanceTime(US_PER_HOUR);
    const refreshed = vault.refresh('tok-1');
    // 1_000_000 (start) + 1h (advance) + 4h (refresh extend)
    expect(refreshed.expiresAt).toBe(1_000_000 + US_PER_HOUR + 4 * US_PER_HOUR);
  });

  it('updates refreshedAt timestamp', () => {
    const { vault, advanceTime } = createTestVault();
    vault.issue('dyn-1');
    advanceTime(US_PER_HOUR);
    const refreshed = vault.refresh('tok-1');
    expect(refreshed.refreshedAt).toBe(1_000_000 + US_PER_HOUR);
  });

  it('throws for unknown token', () => {
    const { vault } = createTestVault();
    expect(() => vault.refresh('nonexistent')).toThrow('not found');
  });

  it('throws for revoked token', () => {
    const { vault } = createTestVault();
    vault.issue('dyn-1');
    vault.revoke('tok-1');
    expect(() => vault.refresh('tok-1')).toThrow('revoked');
  });
});

// ─── Revocation ─────────────────────────────────────────────────────

describe('Token vault revocation', () => {
  it('revokes a single token', () => {
    const { vault } = createTestVault();
    vault.issue('dyn-1');
    vault.revoke('tok-1');
    expect(vault.validate('tok-1').valid).toBe(false);
  });

  it('revokes all tokens for a dynasty', () => {
    const { vault } = createTestVault();
    vault.issue('dyn-1');
    vault.issue('dyn-1');
    const revoked = vault.revokeAllForDynasty('dyn-1');
    expect(revoked).toBe(2);
    expect(vault.activeCount()).toBe(0);
  });

  it('returns zero when no tokens to revoke', () => {
    const { vault } = createTestVault();
    expect(vault.revokeAllForDynasty('dyn-99')).toBe(0);
  });

  it('does not double-count already revoked tokens', () => {
    const { vault } = createTestVault();
    vault.issue('dyn-1');
    vault.issue('dyn-1');
    vault.revoke('tok-1');
    const revoked = vault.revokeAllForDynasty('dyn-1');
    expect(revoked).toBe(1); // only tok-2 was still active
  });

  it('handles revocation of nonexistent token gracefully', () => {
    const { vault } = createTestVault();
    expect(() => { vault.revoke('nonexistent'); }).not.toThrow();
  });
});

// ─── Active Sessions ────────────────────────────────────────────────

describe('Token vault active sessions', () => {
  it('returns active sessions for dynasty', () => {
    const { vault } = createTestVault();
    vault.issue('dyn-1');
    vault.issue('dyn-1');
    vault.issue('dyn-2');
    const sessions = vault.getActiveSessions('dyn-1');
    expect(sessions).toHaveLength(2);
  });

  it('excludes revoked sessions', () => {
    const { vault } = createTestVault();
    vault.issue('dyn-1');
    vault.issue('dyn-1');
    vault.revoke('tok-1');
    const sessions = vault.getActiveSessions('dyn-1');
    expect(sessions).toHaveLength(1);
  });

  it('excludes expired sessions', () => {
    const { vault, advanceTime } = createTestVault({
      ttlMicroseconds: US_PER_HOUR,
    });
    vault.issue('dyn-1');
    advanceTime(2 * US_PER_HOUR);
    const sessions = vault.getActiveSessions('dyn-1');
    expect(sessions).toHaveLength(0);
  });

  it('counts active tokens across all dynasties', () => {
    const { vault } = createTestVault();
    vault.issue('dyn-1');
    vault.issue('dyn-2');
    vault.revoke('tok-1');
    expect(vault.activeCount()).toBe(1);
  });
});

// ─── Cleanup ────────────────────────────────────────────────────────

describe('Token vault cleanup', () => {
  it('removes expired tokens', () => {
    const { vault, advanceTime } = createTestVault({
      ttlMicroseconds: US_PER_HOUR,
    });
    vault.issue('dyn-1');
    vault.issue('dyn-2');
    advanceTime(2 * US_PER_HOUR);
    const cleaned = vault.cleanup();
    expect(cleaned).toBe(2);
    expect(vault.count()).toBe(0);
  });

  it('removes revoked tokens', () => {
    const { vault } = createTestVault();
    vault.issue('dyn-1');
    vault.revoke('tok-1');
    const cleaned = vault.cleanup();
    expect(cleaned).toBe(1);
    expect(vault.count()).toBe(0);
  });

  it('preserves active tokens', () => {
    const { vault } = createTestVault();
    vault.issue('dyn-1');
    const cleaned = vault.cleanup();
    expect(cleaned).toBe(0);
    expect(vault.count()).toBe(1);
  });

  it('frees session slots after cleanup', () => {
    const { vault, advanceTime } = createTestVault({
      ttlMicroseconds: US_PER_HOUR,
      maxSessionsPerDynasty: 1,
    });
    vault.issue('dyn-1');
    advanceTime(2 * US_PER_HOUR);
    vault.cleanup();
    const newToken = vault.issue('dyn-1');
    expect(newToken.dynastyId).toBe('dyn-1');
  });
});

// ─── Default Config ─────────────────────────────────────────────────

describe('Token vault default config', () => {
  it('has 24-hour TTL', () => {
    expect(DEFAULT_TOKEN_CONFIG.ttlMicroseconds).toBe(24 * US_PER_HOUR);
  });

  it('allows 5 sessions per dynasty', () => {
    expect(DEFAULT_TOKEN_CONFIG.maxSessionsPerDynasty).toBe(5);
  });

  it('has 12-hour refresh extension', () => {
    expect(DEFAULT_TOKEN_CONFIG.refreshExtendsMicroseconds).toBe(12 * US_PER_HOUR);
  });
});
