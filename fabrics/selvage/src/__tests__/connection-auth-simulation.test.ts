import { describe, it, expect } from 'vitest';
import { createConnectionAuthenticator } from '../connection-auth.js';

let nextId = 0;
function makeAuth(maxPerDynasty = 5) {
  nextId = 0;
  return createConnectionAuthenticator({
    tokenPort: {
      validate: (token: string) => {
        if (token === 'valid-token') return { valid: true, reason: undefined, dynastyId: 'dynasty-A' };
        if (token === 'dynasty-b-token') return { valid: true, reason: undefined, dynastyId: 'dynasty-B' };
        return { valid: false, reason: 'invalid-token', dynastyId: undefined };
      },
    },
    idGenerator: { next: () => `session-${++nextId}` },
    clock: { nowMicroseconds: () => Date.now() * 1_000 },
    config: { maxConnectionsPerDynasty: maxPerDynasty },
  });
}

describe('Connection Auth Simulation', () => {
  it('authenticates connections with valid tokens', () => {
    const auth = makeAuth();

    const r1 = auth.authenticate('conn-1', 'valid-token');
    expect(r1.authenticated).toBe(true);
    expect(r1.dynastyId).toBe('dynasty-A');
    expect(typeof r1.sessionId).toBe('string');

    expect(auth.isAuthenticated('conn-1')).toBe(true);
    expect(auth.isAuthenticated('conn-unknown')).toBe(false);
  });

  it('rejects connections with invalid tokens', () => {
    const auth = makeAuth();
    const r = auth.authenticate('conn-bad', 'wrong-token');
    expect(r.authenticated).toBe(false);
    expect(r.sessionId).toBeUndefined();
    expect(auth.isAuthenticated('conn-bad')).toBe(false);
  });

  it('revokes sessions and prevents further access', () => {
    const auth = makeAuth();
    const r = auth.authenticate('conn-2', 'valid-token');
    expect(r.authenticated).toBe(true);

    auth.deauthenticate('conn-2');
    expect(auth.isAuthenticated('conn-2')).toBe(false);
    expect(auth.sessionCount()).toBe(0);
  });

  it('enforces max connections per dynasty', () => {
    const auth = makeAuth(2);

    auth.authenticate('c1', 'dynasty-b-token');
    auth.authenticate('c2', 'dynasty-b-token');
    const r3 = auth.authenticate('c3', 'dynasty-b-token');

    expect(r3.authenticated).toBe(false);
    expect(r3.reason).toBeDefined();
  });
});
