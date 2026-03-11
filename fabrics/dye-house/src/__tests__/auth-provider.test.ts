import { describe, it, expect } from 'vitest';
import { createAuthProvider } from '../auth-provider.js';
import type { AuthProviderDeps, AuthAuditEntry } from '../auth-provider.js';

function createMockDeps(overrides?: Partial<AuthProviderDeps>): AuthProviderDeps & {
  readonly auditEntries: AuthAuditEntry[];
  readonly issuedTokenIds: string[];
  readonly revokedTokenIds: string[];
} {
  let tokenCounter = 0;
  const auditEntries: AuthAuditEntry[] = [];
  const issuedTokenIds: string[] = [];
  const revokedTokenIds: string[] = [];

  return {
    auditEntries,
    issuedTokenIds,
    revokedTokenIds,
    tokenVault: {
      issue: (dynastyId) => {
        tokenCounter += 1;
        const tokenId = 'tok-' + String(tokenCounter);
        issuedTokenIds.push(tokenId);
        return { tokenId, dynastyId, expiresAt: 99_000_000 };
      },
      validate: (tokenId) => {
        if (tokenId === 'valid-tok') {
          return {
            valid: true,
            reason: null,
            token: { tokenId, dynastyId: 'd-1' },
          };
        }
        if (tokenId === 'expired-tok') {
          return {
            valid: false,
            reason: 'expired',
            token: { tokenId, dynastyId: 'd-1' },
          };
        }
        return { valid: false, reason: 'not_found', token: null };
      },
      revoke: (tokenId) => {
        revokedTokenIds.push(tokenId);
      },
      ...overrides?.tokenVault,
    },
    credentials: {
      validateApiKey: (key) => {
        if (key === 'good-key') return { valid: true, dynastyId: 'd-1' };
        return { valid: false, dynastyId: null };
      },
      validateDynastySecret: (dynastyId, secret) => {
        return dynastyId === 'd-1' && secret === 'correct-secret';
      },
      ...overrides?.credentials,
    },
    audit: {
      record: (entry) => {
        auditEntries.push(entry);
      },
      ...overrides?.audit,
    },
    clock: { nowMicroseconds: () => 1_000_000 },
  };
}

describe('AuthProvider — API key authentication', () => {
  it('issues token on valid API key', () => {
    const deps = createMockDeps();
    const auth = createAuthProvider(deps);

    const result = auth.authenticate({ method: 'api_key', apiKey: 'good-key' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.dynastyId).toBe('d-1');
      expect(result.value.method).toBe('api_key');
      expect(result.value.tokenId).toBe('tok-1');
    }
  });

  it('rejects invalid API key', () => {
    const deps = createMockDeps();
    const auth = createAuthProvider(deps);

    const result = auth.authenticate({ method: 'api_key', apiKey: 'bad-key' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_credentials');
    }
  });

  it('rejects missing API key', () => {
    const deps = createMockDeps();
    const auth = createAuthProvider(deps);

    const result = auth.authenticate({ method: 'api_key' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('missing_credentials');
    }
  });
});

describe('AuthProvider — dynasty secret authentication', () => {
  it('issues token on valid dynasty credentials', () => {
    const deps = createMockDeps();
    const auth = createAuthProvider(deps);

    const result = auth.authenticate({
      method: 'dynasty_secret',
      dynastyId: 'd-1',
      secret: 'correct-secret',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.dynastyId).toBe('d-1');
      expect(result.value.method).toBe('dynasty_secret');
    }
  });

  it('rejects invalid secret', () => {
    const deps = createMockDeps();
    const auth = createAuthProvider(deps);

    const result = auth.authenticate({
      method: 'dynasty_secret',
      dynastyId: 'd-1',
      secret: 'wrong-secret',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_credentials');
    }
  });
});

describe('AuthProvider — token validation', () => {
  it('validates active token as ConnectTokenPort', () => {
    const deps = createMockDeps();
    const auth = createAuthProvider(deps);

    const result = auth.validateToken('valid-tok');

    expect(result.valid).toBe(true);
    expect(result.dynastyId).toBe('d-1');
    expect(result.reason).toBeNull();
  });

  it('rejects expired token', () => {
    const deps = createMockDeps();
    const auth = createAuthProvider(deps);

    const result = auth.validateToken('expired-tok');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('expired');
    expect(result.dynastyId).toBe('d-1');
  });

  it('rejects unknown token', () => {
    const deps = createMockDeps();
    const auth = createAuthProvider(deps);

    const result = auth.validateToken('unknown-tok');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('not_found');
    expect(result.dynastyId).toBeNull();
  });
});

function auditAt(entries: ReadonlyArray<AuthAuditEntry>, index: number): AuthAuditEntry {
  const e = entries[index];
  if (e === undefined) throw new Error('Audit entry at ' + String(index) + ' not found');
  return e;
}

describe('AuthProvider — audit and stats', () => {
  it('records audit entries for success', () => {
    const deps = createMockDeps();
    const auth = createAuthProvider(deps);

    auth.authenticate({ method: 'api_key', apiKey: 'good-key' });

    expect(deps.auditEntries).toHaveLength(1);
    expect(auditAt(deps.auditEntries, 0).success).toBe(true);
    expect(auditAt(deps.auditEntries, 0).action).toBe('authenticate.api_key');
  });

  it('records audit entries for failure', () => {
    const deps = createMockDeps();
    const auth = createAuthProvider(deps);

    auth.authenticate({ method: 'api_key', apiKey: 'bad-key' });

    expect(deps.auditEntries).toHaveLength(1);
    expect(auditAt(deps.auditEntries, 0).success).toBe(false);
  });

  it('tracks authentication stats', () => {
    const deps = createMockDeps();
    const auth = createAuthProvider(deps);

    auth.authenticate({ method: 'api_key', apiKey: 'good-key' });
    auth.authenticate({ method: 'api_key', apiKey: 'bad-key' });

    const stats = auth.getStats();
    expect(stats.totalAuthentications).toBe(2);
    expect(stats.successfulAuthentications).toBe(1);
    expect(stats.failedAuthentications).toBe(1);
  });

  it('revokes tokens through vault', () => {
    const deps = createMockDeps();
    const auth = createAuthProvider(deps);

    auth.revokeToken('tok-to-revoke');

    expect(deps.revokedTokenIds).toEqual(['tok-to-revoke']);
  });
});
