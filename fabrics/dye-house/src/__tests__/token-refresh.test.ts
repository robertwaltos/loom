import { describe, it, expect } from 'vitest';
import { createTokenRefreshService } from '../token-refresh.js';
import type { TokenRefreshDeps } from '../token-refresh.js';

function makeDeps(): TokenRefreshDeps & { advance: (us: number) => void } {
  let id = 0;
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time },
    idGenerator: { next: () => 'rt-' + String(++id) },
    advance: (us: number) => {
      time += us;
    },
  };
}

describe('TokenRefreshService — issue', () => {
  it('issues a refresh token', () => {
    const svc = createTokenRefreshService(makeDeps());
    const token = svc.issue({ sessionId: 'sess-1', ttlUs: 10_000_000 });
    expect(token.tokenId).toBe('rt-1');
    expect(token.sessionId).toBe('sess-1');
    expect(token.status).toBe('active');
    expect(token.generation).toBe(1);
  });

  it('retrieves a token by ID', () => {
    const svc = createTokenRefreshService(makeDeps());
    const token = svc.issue({ sessionId: 'sess-1', ttlUs: 10_000_000 });
    const retrieved = svc.getToken(token.tokenId);
    expect(retrieved?.tokenId).toBe(token.tokenId);
  });

  it('returns undefined for unknown token', () => {
    const svc = createTokenRefreshService(makeDeps());
    expect(svc.getToken('unknown')).toBeUndefined();
  });
});

describe('TokenRefreshService — refresh', () => {
  it('refreshes an active token', () => {
    const svc = createTokenRefreshService(makeDeps());
    const token = svc.issue({ sessionId: 'sess-1', ttlUs: 10_000_000 });
    const result = svc.refresh(token.tokenId, 10_000_000);
    expect(result.success).toBe(true);
    expect(result.newToken?.generation).toBe(2);
    expect(result.newToken?.previousTokenId).toBe(token.tokenId);
  });

  it('marks old token as used after refresh', () => {
    const svc = createTokenRefreshService(makeDeps());
    const token = svc.issue({ sessionId: 'sess-1', ttlUs: 10_000_000 });
    svc.refresh(token.tokenId, 10_000_000);
    const old = svc.getToken(token.tokenId);
    expect(old?.status).toBe('used');
  });

  it('detects token reuse and revokes session', () => {
    const svc = createTokenRefreshService(makeDeps());
    const token = svc.issue({ sessionId: 'sess-1', ttlUs: 10_000_000 });
    svc.refresh(token.tokenId, 10_000_000);
    const result = svc.refresh(token.tokenId, 10_000_000);
    expect(result.success).toBe(false);
    expect(result.reuseDetected).toBe(true);
  });

  it('fails for unknown token', () => {
    const svc = createTokenRefreshService(makeDeps());
    const result = svc.refresh('unknown', 10_000_000);
    expect(result.success).toBe(false);
    expect(result.reuseDetected).toBe(false);
  });

  it('fails for expired token', () => {
    const deps = makeDeps();
    const svc = createTokenRefreshService(deps);
    const token = svc.issue({ sessionId: 'sess-1', ttlUs: 5_000_000 });
    deps.advance(10_000_000);
    const result = svc.refresh(token.tokenId, 5_000_000);
    expect(result.success).toBe(false);
  });

  it('enforces max generations', () => {
    const svc = createTokenRefreshService(makeDeps(), { maxGenerations: 2 });
    const t1 = svc.issue({ sessionId: 'sess-1', ttlUs: 10_000_000 });
    const r1 = svc.refresh(t1.tokenId, 10_000_000);
    expect(r1.success).toBe(true);
    const r2 = svc.refresh(r1.newToken?.tokenId ?? '', 10_000_000);
    expect(r2.success).toBe(false);
  });
});

describe('TokenRefreshService — revoke', () => {
  it('revokes a token', () => {
    const svc = createTokenRefreshService(makeDeps());
    const token = svc.issue({ sessionId: 'sess-1', ttlUs: 10_000_000 });
    expect(svc.revoke(token.tokenId)).toBe(true);
    expect(svc.getToken(token.tokenId)?.status).toBe('revoked');
  });

  it('returns false for unknown token', () => {
    const svc = createTokenRefreshService(makeDeps());
    expect(svc.revoke('unknown')).toBe(false);
  });

  it('returns false for already revoked token', () => {
    const svc = createTokenRefreshService(makeDeps());
    const token = svc.issue({ sessionId: 'sess-1', ttlUs: 10_000_000 });
    svc.revoke(token.tokenId);
    expect(svc.revoke(token.tokenId)).toBe(false);
  });

  it('revokes all active tokens for a session', () => {
    const svc = createTokenRefreshService(makeDeps());
    svc.issue({ sessionId: 'sess-1', ttlUs: 10_000_000 });
    svc.issue({ sessionId: 'sess-1', ttlUs: 10_000_000 });
    const count = svc.revokeSession('sess-1');
    expect(count).toBe(2);
  });
});

describe('TokenRefreshService — sweep', () => {
  it('sweeps expired tokens', () => {
    const deps = makeDeps();
    const svc = createTokenRefreshService(deps);
    svc.issue({ sessionId: 'sess-1', ttlUs: 5_000_000 });
    svc.issue({ sessionId: 'sess-2', ttlUs: 20_000_000 });
    deps.advance(10_000_000);
    const count = svc.sweepExpired();
    expect(count).toBe(1);
  });
});

describe('TokenRefreshService — stats', () => {
  it('starts with zero stats', () => {
    const svc = createTokenRefreshService(makeDeps());
    const stats = svc.getStats();
    expect(stats.totalTokens).toBe(0);
    expect(stats.reuseAttempts).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const svc = createTokenRefreshService(makeDeps());
    const t1 = svc.issue({ sessionId: 'sess-1', ttlUs: 10_000_000 });
    svc.refresh(t1.tokenId, 10_000_000);
    const stats = svc.getStats();
    expect(stats.totalTokens).toBe(2);
    expect(stats.activeTokens).toBe(1);
    expect(stats.usedTokens).toBe(1);
  });
});
