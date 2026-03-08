import { describe, it, expect } from 'vitest';
import { createConnectionAuthenticator } from '../connection-auth.js';
import type {
  ConnectionAuthDeps,
  TokenValidationPort,
  AuthResult,
} from '../connection-auth.js';

function makeValidTokenPort(dynastyId: string): TokenValidationPort {
  return {
    validate: () => ({ valid: true, reason: null, dynastyId }),
  };
}

function makeInvalidTokenPort(reason: string): TokenValidationPort {
  return {
    validate: () => ({ valid: false, reason, dynastyId: null }),
  };
}

function makeDeps(overrides?: Partial<ConnectionAuthDeps>): ConnectionAuthDeps {
  let idCounter = 0;
  let time = 1_000_000;
  return {
    tokenPort: makeValidTokenPort('dynasty-1'),
    idGenerator: { next: () => 'session-' + String(++idCounter) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    config: { maxConnectionsPerDynasty: 3 },
    ...overrides,
  };
}

function isSuccess(result: AuthResult): result is { authenticated: true; dynastyId: string; tokenId: string; sessionId: string } {
  return result.authenticated;
}

describe('ConnectionAuthenticator — authentication', () => {
  it('authenticates with valid token', () => {
    const auth = createConnectionAuthenticator(makeDeps());
    const result = auth.authenticate('conn-1', 'token-1');

    expect(result.authenticated).toBe(true);
    if (isSuccess(result)) {
      expect(result.dynastyId).toBe('dynasty-1');
      expect(result.tokenId).toBe('token-1');
      expect(result.sessionId).toBeTruthy();
    }
  });

  it('rejects invalid token', () => {
    const auth = createConnectionAuthenticator(makeDeps({
      tokenPort: makeInvalidTokenPort('not_found'),
    }));
    const result = auth.authenticate('conn-1', 'bad-token');

    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.reason).toBe('token_invalid');
    }
  });

  it('rejects expired token', () => {
    const auth = createConnectionAuthenticator(makeDeps({
      tokenPort: makeInvalidTokenPort('expired'),
    }));
    const result = auth.authenticate('conn-1', 'expired-token');

    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.reason).toBe('token_expired');
    }
  });

  it('rejects revoked token', () => {
    const auth = createConnectionAuthenticator(makeDeps({
      tokenPort: makeInvalidTokenPort('revoked'),
    }));
    const result = auth.authenticate('conn-1', 'revoked-token');

    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.reason).toBe('token_revoked');
    }
  });

  it('tracks session count', () => {
    const auth = createConnectionAuthenticator(makeDeps());
    expect(auth.sessionCount()).toBe(0);

    auth.authenticate('conn-1', 'token-1');
    expect(auth.sessionCount()).toBe(1);

    auth.authenticate('conn-2', 'token-2');
    expect(auth.sessionCount()).toBe(2);
  });
});

describe('ConnectionAuthenticator — max connections', () => {
  it('enforces max connections per dynasty', () => {
    const auth = createConnectionAuthenticator(makeDeps({
      config: { maxConnectionsPerDynasty: 2 },
    }));

    auth.authenticate('conn-1', 'token-1');
    auth.authenticate('conn-2', 'token-2');
    const result = auth.authenticate('conn-3', 'token-3');

    expect(result.authenticated).toBe(false);
    if (!result.authenticated) {
      expect(result.reason).toBe('max_connections_exceeded');
    }
  });

  it('allows new connection after deauth frees a slot', () => {
    const auth = createConnectionAuthenticator(makeDeps({
      config: { maxConnectionsPerDynasty: 1 },
    }));

    auth.authenticate('conn-1', 'token-1');
    auth.deauthenticate('conn-1');
    const result = auth.authenticate('conn-2', 'token-2');

    expect(result.authenticated).toBe(true);
  });

  it('tracks per-dynasty count correctly', () => {
    let callCount = 0;
    const auth = createConnectionAuthenticator(makeDeps({
      tokenPort: {
        validate: () => {
          callCount++;
          const did = callCount <= 2 ? 'dynasty-A' : 'dynasty-B';
          return { valid: true, reason: null, dynastyId: did };
        },
      },
      config: { maxConnectionsPerDynasty: 2 },
    }));

    auth.authenticate('conn-1', 'token-1');
    auth.authenticate('conn-2', 'token-2');
    auth.authenticate('conn-3', 'token-3');

    expect(auth.connectionCountForDynasty('dynasty-A')).toBe(2);
    expect(auth.connectionCountForDynasty('dynasty-B')).toBe(1);
  });
});

describe('ConnectionAuthenticator — deauthentication', () => {
  it('removes session on deauthenticate', () => {
    const auth = createConnectionAuthenticator(makeDeps());
    auth.authenticate('conn-1', 'token-1');

    const removed = auth.deauthenticate('conn-1');
    expect(removed).toBe(true);
    expect(auth.isAuthenticated('conn-1')).toBe(false);
    expect(auth.sessionCount()).toBe(0);
  });

  it('returns false for unknown connection', () => {
    const auth = createConnectionAuthenticator(makeDeps());
    expect(auth.deauthenticate('unknown')).toBe(false);
  });

  it('decrements dynasty count on deauth', () => {
    const auth = createConnectionAuthenticator(makeDeps());
    auth.authenticate('conn-1', 'token-1');
    auth.authenticate('conn-2', 'token-2');

    auth.deauthenticate('conn-1');
    expect(auth.connectionCountForDynasty('dynasty-1')).toBe(1);
  });

  it('cleans up dynasty tracking when last connection removed', () => {
    const auth = createConnectionAuthenticator(makeDeps());
    auth.authenticate('conn-1', 'token-1');
    auth.deauthenticate('conn-1');

    expect(auth.connectionCountForDynasty('dynasty-1')).toBe(0);
    expect(auth.getSessionsByDynasty('dynasty-1')).toHaveLength(0);
  });
});

describe('ConnectionAuthenticator — queries', () => {
  it('retrieves session by connection ID', () => {
    const auth = createConnectionAuthenticator(makeDeps());
    auth.authenticate('conn-1', 'token-1');

    const session = auth.getSession('conn-1');
    expect(session?.connectionId).toBe('conn-1');
    expect(session?.dynastyId).toBe('dynasty-1');
    expect(session?.tokenId).toBe('token-1');
    expect(session?.authenticatedAt).toBeGreaterThan(0);
  });

  it('returns undefined for unauthenticated connection', () => {
    const auth = createConnectionAuthenticator(makeDeps());
    expect(auth.getSession('unknown')).toBeUndefined();
  });

  it('retrieves sessions by dynasty', () => {
    const auth = createConnectionAuthenticator(makeDeps());
    auth.authenticate('conn-1', 'token-1');
    auth.authenticate('conn-2', 'token-2');

    const sessions = auth.getSessionsByDynasty('dynasty-1');
    expect(sessions).toHaveLength(2);
  });

  it('isAuthenticated returns correct status', () => {
    const auth = createConnectionAuthenticator(makeDeps());
    expect(auth.isAuthenticated('conn-1')).toBe(false);

    auth.authenticate('conn-1', 'token-1');
    expect(auth.isAuthenticated('conn-1')).toBe(true);
  });
});
