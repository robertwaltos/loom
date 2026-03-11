/**
 * Tests for OAuth Provider
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createOAuthProvider,
  registerClient,
  deactivateClient,
  getClient,
  registerScope,
  validateScope,
  listScopes,
  createAuthorizationGrant,
  exchangeCodeForToken,
  issueToken,
  refreshToken,
  introspectToken,
  revokeToken,
  revokeAllClientTokens,
  getClientStats,
  getActiveTokenCount,
  getRevocationCount,
  type OAuthState,
  type ClockPort,
  type IdPort,
  type LogPort,
  type GrantType,
} from '../oauth-provider.js';

// ============================================================================
// Test Ports
// ============================================================================

function createTestClock(): ClockPort {
  let currentMicros = 1_000_000_000n;
  return {
    nowMicros: () => {
      currentMicros = currentMicros + 1000n;
      return currentMicros;
    },
  };
}

function createTestId(): IdPort {
  let counter = 0;
  return {
    generate: () => {
      counter++;
      return 'id-' + String(counter);
    },
  };
}

function createTestLog(): LogPort {
  const logs: Array<string> = [];
  return {
    info: (msg: string) => logs.push('INFO: ' + msg),
    warn: (msg: string) => logs.push('WARN: ' + msg),
    error: (msg: string) => logs.push('ERROR: ' + msg),
  };
}

// ============================================================================
// Test Setup
// ============================================================================

describe('OAuth Provider', () => {
  let state: OAuthState;
  let clock: ClockPort;
  let id: IdPort;
  let log: LogPort;

  beforeEach(() => {
    clock = createTestClock();
    id = createTestId();
    log = createTestLog();
    state = createOAuthProvider(clock, id, log, 3600, 86400, 600);
  });

  // ============================================================================
  // Client Registration
  // ============================================================================

  describe('registerClient', () => {
    it('should register a new client', () => {
      const result = registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read', 'write'],
        ['AUTHORIZATION_CODE'],
      );

      expect(result).not.toBe('client-exists');
      if (typeof result !== 'string') {
        expect(result.clientId).toBe('client-1');
        expect(result.active).toBe(true);
      }
    });

    it('should return client-exists if already registered', () => {
      registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['AUTHORIZATION_CODE'],
      );

      const result = registerClient(
        state,
        'client-1',
        'secret-2',
        ['https://app.com/callback'],
        ['read'],
        ['AUTHORIZATION_CODE'],
      );

      expect(result).toBe('client-exists');
    });

    it('should track creation timestamp', () => {
      const result = registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['AUTHORIZATION_CODE'],
      );

      if (typeof result !== 'string') {
        expect(result.createdAtMicros).toBeGreaterThan(0n);
      }
    });

    it('should store redirect URIs', () => {
      const result = registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback', 'https://app.com/callback2'],
        ['read'],
        ['AUTHORIZATION_CODE'],
      );

      if (typeof result !== 'string') {
        expect(result.redirectUris.length).toBe(2);
      }
    });

    it('should store allowed scopes', () => {
      const result = registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read', 'write', 'admin'],
        ['AUTHORIZATION_CODE'],
      );

      if (typeof result !== 'string') {
        expect(result.allowedScopes.length).toBe(3);
      }
    });

    it('should store allowed grants', () => {
      const result = registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['AUTHORIZATION_CODE', 'REFRESH_TOKEN'],
      );

      if (typeof result !== 'string') {
        expect(result.allowedGrants.length).toBe(2);
      }
    });
  });

  describe('deactivateClient', () => {
    it('should return client-not-found for unknown client', () => {
      const result = deactivateClient(state, 'unknown');
      expect(result).toBe('client-not-found');
    });

    it('should deactivate a client', () => {
      registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['AUTHORIZATION_CODE'],
      );

      const result = deactivateClient(state, 'client-1');
      if (typeof result !== 'string') {
        expect(result.active).toBe(false);
      }
    });
  });

  describe('getClient', () => {
    it('should return client-not-found for unknown client', () => {
      const result = getClient(state, 'unknown');
      expect(result).toBe('client-not-found');
    });

    it('should return client by ID', () => {
      registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['AUTHORIZATION_CODE'],
      );

      const result = getClient(state, 'client-1');
      if (typeof result !== 'string') {
        expect(result.clientId).toBe('client-1');
      }
    });
  });

  // ============================================================================
  // Scope Management
  // ============================================================================

  describe('registerScope', () => {
    it('should register a new scope', () => {
      const result = registerScope(state, 'read', 'Read access', false);
      expect(result).not.toBe('scope-exists');
      if (typeof result !== 'string') {
        expect(result.name).toBe('read');
      }
    });

    it('should return scope-exists if already registered', () => {
      registerScope(state, 'read', 'Read access', false);
      const result = registerScope(state, 'read', 'Different description', false);
      expect(result).toBe('scope-exists');
    });

    it('should mark scope as restricted', () => {
      const result = registerScope(state, 'admin', 'Admin access', true);
      if (typeof result !== 'string') {
        expect(result.restricted).toBe(true);
      }
    });

    it('should track creation timestamp', () => {
      const result = registerScope(state, 'read', 'Read access', false);
      if (typeof result !== 'string') {
        expect(result.createdAtMicros).toBeGreaterThan(0n);
      }
    });
  });

  describe('validateScope', () => {
    beforeEach(() => {
      registerScope(state, 'read', 'Read access', false);
      registerScope(state, 'write', 'Write access', false);
      registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read', 'write'],
        ['AUTHORIZATION_CODE'],
      );
    });

    it('should return client-not-found for unknown client', () => {
      const result = validateScope(state, 'unknown', ['read']);
      expect(result).toBe('client-not-found');
    });

    it('should return invalid-scope for unknown scope', () => {
      const result = validateScope(state, 'client-1', ['unknown']);
      expect(result).toBe('invalid-scope');
    });

    it('should return invalid-scope if client not allowed', () => {
      registerScope(state, 'admin', 'Admin access', true);
      const result = validateScope(state, 'client-1', ['admin']);
      expect(result).toBe('invalid-scope');
    });

    it('should return requested scopes if valid', () => {
      const result = validateScope(state, 'client-1', ['read', 'write']);
      expect(result).toEqual(['read', 'write']);
    });
  });

  describe('listScopes', () => {
    it('should return empty array when no scopes', () => {
      const scopes = listScopes(state);
      expect(scopes).toEqual([]);
    });

    it('should return all scopes', () => {
      registerScope(state, 'read', 'Read access', false);
      registerScope(state, 'write', 'Write access', false);
      const scopes = listScopes(state);
      expect(scopes.length).toBe(2);
    });
  });

  // ============================================================================
  // Authorization Code Flow
  // ============================================================================

  describe('createAuthorizationGrant', () => {
    beforeEach(() => {
      registerScope(state, 'read', 'Read access', false);
      registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['AUTHORIZATION_CODE'],
      );
    });

    it('should return client-not-found for unknown client', () => {
      const result = createAuthorizationGrant(
        state,
        'unknown',
        ['read'],
        'https://app.com/callback',
      );
      expect(result).toBe('client-not-found');
    });

    it('should return invalid-grant if client inactive', () => {
      deactivateClient(state, 'client-1');
      const result = createAuthorizationGrant(
        state,
        'client-1',
        ['read'],
        'https://app.com/callback',
      );
      expect(result).toBe('invalid-grant');
    });

    it('should return invalid-grant if grant type not allowed', () => {
      registerClient(
        state,
        'client-2',
        'secret-2',
        ['https://app.com/callback'],
        ['read'],
        ['CLIENT_CREDENTIALS'],
      );

      const result = createAuthorizationGrant(
        state,
        'client-2',
        ['read'],
        'https://app.com/callback',
      );
      expect(result).toBe('invalid-grant');
    });

    it('should return invalid-grant if redirect URI not registered', () => {
      const result = createAuthorizationGrant(
        state,
        'client-1',
        ['read'],
        'https://evil.com/callback',
      );
      expect(result).toBe('invalid-grant');
    });

    it('should return invalid-scope for invalid scopes', () => {
      registerScope(state, 'write', 'Write access', false);
      const result = createAuthorizationGrant(
        state,
        'client-1',
        ['write'],
        'https://app.com/callback',
      );
      expect(result).toBe('invalid-scope');
    });

    it('should create authorization grant', () => {
      const result = createAuthorizationGrant(
        state,
        'client-1',
        ['read'],
        'https://app.com/callback',
      );
      expect(result).not.toBe('client-not-found');
      expect(result).not.toBe('invalid-grant');
      expect(result).not.toBe('invalid-scope');
      if (typeof result !== 'string') {
        expect(result.grantType).toBe('AUTHORIZATION_CODE');
        expect(result.code).toBeDefined();
      }
    });

    it('should set expiry time', () => {
      const result = createAuthorizationGrant(
        state,
        'client-1',
        ['read'],
        'https://app.com/callback',
      );
      if (typeof result !== 'string') {
        expect(result.expiresAtMicros).toBeGreaterThan(result.createdAtMicros);
      }
    });
  });

  describe('exchangeCodeForToken', () => {
    beforeEach(() => {
      registerScope(state, 'read', 'Read access', false);
      registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['AUTHORIZATION_CODE'],
      );
    });

    it('should return invalid-code for unknown code', () => {
      const result = exchangeCodeForToken(
        state,
        'unknown',
        'client-1',
        'secret-1',
        'https://app.com/callback',
      );
      expect(result).toBe('invalid-code');
    });

    it('should return invalid-code if code already used', () => {
      const grant = createAuthorizationGrant(
        state,
        'client-1',
        ['read'],
        'https://app.com/callback',
      );
      if (typeof grant !== 'string' && grant.code) {
        exchangeCodeForToken(state, grant.code, 'client-1', 'secret-1', 'https://app.com/callback');
        const result = exchangeCodeForToken(
          state,
          grant.code,
          'client-1',
          'secret-1',
          'https://app.com/callback',
        );
        expect(result).toBe('invalid-code');
      }
    });

    it('should return invalid-client if client ID mismatch', () => {
      const grant = createAuthorizationGrant(
        state,
        'client-1',
        ['read'],
        'https://app.com/callback',
      );
      if (typeof grant !== 'string' && grant.code) {
        const result = exchangeCodeForToken(
          state,
          grant.code,
          'client-2',
          'secret-1',
          'https://app.com/callback',
        );
        expect(result).toBe('invalid-client');
      }
    });

    it('should return invalid-client if redirect URI mismatch', () => {
      const grant = createAuthorizationGrant(
        state,
        'client-1',
        ['read'],
        'https://app.com/callback',
      );
      if (typeof grant !== 'string' && grant.code) {
        const result = exchangeCodeForToken(
          state,
          grant.code,
          'client-1',
          'secret-1',
          'https://evil.com/callback',
        );
        expect(result).toBe('invalid-client');
      }
    });

    it('should return invalid-client if secret mismatch', () => {
      const grant = createAuthorizationGrant(
        state,
        'client-1',
        ['read'],
        'https://app.com/callback',
      );
      if (typeof grant !== 'string' && grant.code) {
        const result = exchangeCodeForToken(
          state,
          grant.code,
          'client-1',
          'wrong-secret',
          'https://app.com/callback',
        );
        expect(result).toBe('invalid-client');
      }
    });

    it('should issue access token', () => {
      const grant = createAuthorizationGrant(
        state,
        'client-1',
        ['read'],
        'https://app.com/callback',
      );
      if (typeof grant !== 'string' && grant.code) {
        const result = exchangeCodeForToken(
          state,
          grant.code,
          'client-1',
          'secret-1',
          'https://app.com/callback',
        );
        if (typeof result !== 'string') {
          expect(result.tokenType).toBe('ACCESS');
          expect(result.scopes).toEqual(['read']);
        }
      }
    });

    it('should link refresh token', () => {
      const grant = createAuthorizationGrant(
        state,
        'client-1',
        ['read'],
        'https://app.com/callback',
      );
      if (typeof grant !== 'string' && grant.code) {
        const result = exchangeCodeForToken(
          state,
          grant.code,
          'client-1',
          'secret-1',
          'https://app.com/callback',
        );
        if (typeof result !== 'string') {
          expect(result.refreshTokenId).toBeDefined();
        }
      }
    });
  });

  // ============================================================================
  // Token Issuance
  // ============================================================================

  describe('issueToken', () => {
    beforeEach(() => {
      registerScope(state, 'read', 'Read access', false);
      registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['CLIENT_CREDENTIALS'],
      );
    });

    it('should return invalid-client for unknown client', () => {
      const result = issueToken(state, 'unknown', 'secret', 'CLIENT_CREDENTIALS', ['read']);
      expect(result).toBe('invalid-client');
    });

    it('should return invalid-client for wrong secret', () => {
      const result = issueToken(state, 'client-1', 'wrong', 'CLIENT_CREDENTIALS', ['read']);
      expect(result).toBe('invalid-client');
    });

    it('should return invalid-client for inactive client', () => {
      deactivateClient(state, 'client-1');
      const result = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      expect(result).toBe('invalid-client');
    });

    it('should return invalid-grant for disallowed grant type', () => {
      const result = issueToken(state, 'client-1', 'secret-1', 'AUTHORIZATION_CODE', ['read']);
      expect(result).toBe('invalid-grant');
    });

    it('should return invalid-scope for invalid scopes', () => {
      const result = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['admin']);
      expect(result).toBe('invalid-scope');
    });

    it('should issue access token for CLIENT_CREDENTIALS', () => {
      const result = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      if (typeof result !== 'string') {
        expect(result.tokenType).toBe('ACCESS');
        expect(result.clientId).toBe('client-1');
      }
    });

    it('should set token expiry', () => {
      const result = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      if (typeof result !== 'string') {
        expect(result.expiresAtMicros).toBeGreaterThan(result.issuedAtMicros);
      }
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      registerScope(state, 'read', 'Read access', false);
      registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['AUTHORIZATION_CODE'],
      );
    });

    it('should return invalid-token for unknown token', () => {
      const result = refreshToken(state, 'unknown', 'client-1', 'secret-1');
      expect(result).toBe('invalid-token');
    });

    it('should return invalid-client for wrong client', () => {
      const grant = createAuthorizationGrant(
        state,
        'client-1',
        ['read'],
        'https://app.com/callback',
      );
      if (typeof grant !== 'string' && grant.code) {
        const token = exchangeCodeForToken(
          state,
          grant.code,
          'client-1',
          'secret-1',
          'https://app.com/callback',
        );
        if (typeof token !== 'string' && token.refreshTokenId) {
          const refreshTok = state.tokens.get(token.refreshTokenId);
          if (refreshTok) {
            const result = refreshToken(state, refreshTok.value, 'client-2', 'secret-1');
            expect(result).toBe('invalid-client');
          }
        }
      }
    });

    it('should return invalid-client for wrong secret', () => {
      const grant = createAuthorizationGrant(
        state,
        'client-1',
        ['read'],
        'https://app.com/callback',
      );
      if (typeof grant !== 'string' && grant.code) {
        const token = exchangeCodeForToken(
          state,
          grant.code,
          'client-1',
          'secret-1',
          'https://app.com/callback',
        );
        if (typeof token !== 'string' && token.refreshTokenId) {
          const refreshTok = state.tokens.get(token.refreshTokenId);
          if (refreshTok) {
            const result = refreshToken(state, refreshTok.value, 'client-1', 'wrong');
            expect(result).toBe('invalid-client');
          }
        }
      }
    });

    it('should issue new access token', () => {
      const grant = createAuthorizationGrant(
        state,
        'client-1',
        ['read'],
        'https://app.com/callback',
      );
      if (typeof grant !== 'string' && grant.code) {
        const token = exchangeCodeForToken(
          state,
          grant.code,
          'client-1',
          'secret-1',
          'https://app.com/callback',
        );
        if (typeof token !== 'string' && token.refreshTokenId) {
          const refreshTok = state.tokens.get(token.refreshTokenId);
          if (refreshTok) {
            const result = refreshToken(state, refreshTok.value, 'client-1', 'secret-1');
            if (typeof result !== 'string') {
              expect(result.tokenType).toBe('ACCESS');
            }
          }
        }
      }
    });
  });

  // ============================================================================
  // Token Introspection
  // ============================================================================

  describe('introspectToken', () => {
    beforeEach(() => {
      registerScope(state, 'read', 'Read access', false);
      registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['CLIENT_CREDENTIALS'],
      );
    });

    it('should return inactive for unknown token', () => {
      const result = introspectToken(state, 'unknown');
      expect(result.active).toBe(false);
    });

    it('should return inactive for revoked token', () => {
      const token = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      if (typeof token !== 'string') {
        revokeToken(state, token.value, 'test');
        const result = introspectToken(state, token.value);
        expect(result.active).toBe(false);
      }
    });

    it('should return active for valid token', () => {
      const token = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      if (typeof token !== 'string') {
        const result = introspectToken(state, token.value);
        expect(result.active).toBe(true);
      }
    });

    it('should return token details for valid token', () => {
      const token = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      if (typeof token !== 'string') {
        const result = introspectToken(state, token.value);
        expect(result.tokenType).toBe('ACCESS');
        expect(result.clientId).toBe('client-1');
        expect(result.scopes).toEqual(['read']);
      }
    });
  });

  // ============================================================================
  // Token Revocation
  // ============================================================================

  describe('revokeToken', () => {
    beforeEach(() => {
      registerScope(state, 'read', 'Read access', false);
      registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['CLIENT_CREDENTIALS'],
      );
    });

    it('should return token-not-found for unknown token', () => {
      const result = revokeToken(state, 'unknown', 'test');
      expect(result).toBe('token-not-found');
    });

    it('should revoke a token', () => {
      const token = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      if (typeof token !== 'string') {
        const result = revokeToken(state, token.value, 'test-reason');
        if (typeof result !== 'string') {
          expect(result.tokenId).toBe(token.tokenId);
          expect(result.reason).toBe('test-reason');
        }
      }
    });

    it('should track revocation timestamp', () => {
      const token = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      if (typeof token !== 'string') {
        const result = revokeToken(state, token.value, 'test');
        if (typeof result !== 'string') {
          expect(result.revokedAtMicros).toBeGreaterThan(0n);
        }
      }
    });

    it('should increment revocation count', () => {
      const token = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      if (typeof token !== 'string') {
        revokeToken(state, token.value, 'test');
        expect(getRevocationCount(state)).toBe(1);
      }
    });
  });

  describe('revokeAllClientTokens', () => {
    beforeEach(() => {
      registerScope(state, 'read', 'Read access', false);
      registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['CLIENT_CREDENTIALS'],
      );
    });

    it('should return zero for client with no tokens', () => {
      const count = revokeAllClientTokens(state, 'client-1', 'test');
      expect(count).toBe(0);
    });

    it('should revoke all client tokens', () => {
      issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);

      const count = revokeAllClientTokens(state, 'client-1', 'test');
      expect(count).toBe(2);
    });

    it('should not revoke already revoked tokens', () => {
      const t1 = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);

      if (typeof t1 !== 'string') {
        revokeToken(state, t1.value, 'manual');
      }

      const count = revokeAllClientTokens(state, 'client-1', 'test');
      expect(count).toBe(1);
    });
  });

  // ============================================================================
  // Statistics
  // ============================================================================

  describe('getClientStats', () => {
    beforeEach(() => {
      registerScope(state, 'read', 'Read access', false);
      registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['CLIENT_CREDENTIALS', 'AUTHORIZATION_CODE'],
      );
    });

    it('should return client-not-found for unknown client', () => {
      const result = getClientStats(state, 'unknown');
      expect(result).toBe('client-not-found');
    });

    it('should track total tokens issued', () => {
      issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);

      const stats = getClientStats(state, 'client-1');
      if (typeof stats !== 'string') {
        expect(stats.totalTokensIssued).toBe(2);
      }
    });

    it('should track active tokens', () => {
      issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      const stats = getClientStats(state, 'client-1');
      if (typeof stats !== 'string') {
        expect(stats.activeTokens).toBe(1);
      }
    });

    it('should track revoked tokens', () => {
      const token = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      if (typeof token !== 'string') {
        revokeToken(state, token.value, 'test');
      }

      const stats = getClientStats(state, 'client-1');
      if (typeof stats !== 'string') {
        expect(stats.revokedTokens).toBe(1);
      }
    });

    it('should track total grants', () => {
      createAuthorizationGrant(state, 'client-1', ['read'], 'https://app.com/callback');
      createAuthorizationGrant(state, 'client-1', ['read'], 'https://app.com/callback');

      const stats = getClientStats(state, 'client-1');
      if (typeof stats !== 'string') {
        expect(stats.totalGrants).toBe(2);
      }
    });
  });

  describe('getActiveTokenCount', () => {
    beforeEach(() => {
      registerScope(state, 'read', 'Read access', false);
      registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['CLIENT_CREDENTIALS'],
      );
    });

    it('should return zero when no tokens', () => {
      expect(getActiveTokenCount(state)).toBe(0);
    });

    it('should count active tokens', () => {
      issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      expect(getActiveTokenCount(state)).toBe(2);
    });

    it('should not count revoked tokens', () => {
      const t1 = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);

      if (typeof t1 !== 'string') {
        revokeToken(state, t1.value, 'test');
      }

      expect(getActiveTokenCount(state)).toBe(1);
    });
  });

  describe('getRevocationCount', () => {
    beforeEach(() => {
      registerScope(state, 'read', 'Read access', false);
      registerClient(
        state,
        'client-1',
        'secret-1',
        ['https://app.com/callback'],
        ['read'],
        ['CLIENT_CREDENTIALS'],
      );
    });

    it('should return zero when no revocations', () => {
      expect(getRevocationCount(state)).toBe(0);
    });

    it('should count revocations', () => {
      const t1 = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);
      const t2 = issueToken(state, 'client-1', 'secret-1', 'CLIENT_CREDENTIALS', ['read']);

      if (typeof t1 !== 'string') {
        revokeToken(state, t1.value, 'test');
      }
      if (typeof t2 !== 'string') {
        revokeToken(state, t2.value, 'test');
      }

      expect(getRevocationCount(state)).toBe(2);
    });
  });
});
