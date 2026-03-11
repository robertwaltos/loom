/**
 * OAuth Provider — OAuth 2.0 flow management
 * Handles authorization code, client credentials, refresh token flows
 */

// ============================================================================
// Ports (zero external dependencies)
// ============================================================================

type ClockPort = {
  nowMicros: () => bigint;
};

type IdPort = {
  generate: () => string;
};

type LogPort = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
};

// ============================================================================
// Types
// ============================================================================

type GrantType = 'AUTHORIZATION_CODE' | 'CLIENT_CREDENTIALS' | 'REFRESH_TOKEN' | 'PASSWORD';

type TokenType = 'ACCESS' | 'REFRESH';

type OAuthClient = {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUris: Array<string>;
  readonly allowedScopes: Array<string>;
  readonly allowedGrants: Array<GrantType>;
  readonly createdAtMicros: bigint;
  readonly active: boolean;
};

type OAuthScope = {
  readonly name: string;
  readonly description: string;
  readonly restricted: boolean;
  readonly createdAtMicros: bigint;
};

type OAuthToken = {
  readonly tokenId: string;
  readonly clientId: string;
  readonly tokenType: TokenType;
  readonly value: string;
  readonly scopes: Array<string>;
  readonly expiresAtMicros: bigint;
  readonly issuedAtMicros: bigint;
  readonly refreshTokenId?: string;
  readonly revoked: boolean;
};

type TokenGrant = {
  readonly grantId: string;
  readonly clientId: string;
  readonly grantType: GrantType;
  readonly scopes: Array<string>;
  readonly code?: string;
  readonly redirectUri?: string;
  readonly createdAtMicros: bigint;
  readonly expiresAtMicros: bigint;
  readonly used: boolean;
};

type IntrospectionResult = {
  readonly active: boolean;
  readonly tokenType?: TokenType;
  readonly clientId?: string;
  readonly scopes?: Array<string>;
  readonly expiresAtMicros?: bigint;
  readonly issuedAtMicros?: bigint;
};

type RevocationRecord = {
  readonly tokenId: string;
  readonly clientId: string;
  readonly revokedAtMicros: bigint;
  readonly reason: string;
};

type ClientStats = {
  readonly clientId: string;
  readonly totalTokensIssued: number;
  readonly activeTokens: number;
  readonly revokedTokens: number;
  readonly totalGrants: number;
};

// ============================================================================
// State
// ============================================================================

type OAuthState = {
  readonly clock: ClockPort;
  readonly id: IdPort;
  readonly log: LogPort;
  readonly clients: Map<string, OAuthClient>;
  readonly scopes: Map<string, OAuthScope>;
  readonly tokens: Map<string, OAuthToken>;
  readonly grants: Map<string, TokenGrant>;
  readonly revocations: Array<RevocationRecord>;
  readonly tokensByClient: Map<string, Set<string>>;
  readonly accessTtlMicros: bigint;
  readonly refreshTtlMicros: bigint;
  readonly codeTtlMicros: bigint;
};

// ============================================================================
// Factory
// ============================================================================

export function createOAuthProvider(
  clock: ClockPort,
  id: IdPort,
  log: LogPort,
  accessTtlSeconds: number,
  refreshTtlSeconds: number,
  codeTtlSeconds: number,
): OAuthState {
  return {
    clock,
    id,
    log,
    clients: new Map(),
    scopes: new Map(),
    tokens: new Map(),
    grants: new Map(),
    revocations: [],
    tokensByClient: new Map(),
    accessTtlMicros: BigInt(accessTtlSeconds) * 1_000_000n,
    refreshTtlMicros: BigInt(refreshTtlSeconds) * 1_000_000n,
    codeTtlMicros: BigInt(codeTtlSeconds) * 1_000_000n,
  };
}

// ============================================================================
// Client Registration
// ============================================================================

export function registerClient(
  state: OAuthState,
  clientId: string,
  clientSecret: string,
  redirectUris: Array<string>,
  allowedScopes: Array<string>,
  allowedGrants: Array<GrantType>,
): OAuthClient | 'client-exists' {
  if (state.clients.has(clientId)) {
    return 'client-exists';
  }

  const client: OAuthClient = {
    clientId,
    clientSecret,
    redirectUris,
    allowedScopes,
    allowedGrants,
    createdAtMicros: state.clock.nowMicros(),
    active: true,
  };

  state.clients.set(clientId, client);
  state.tokensByClient.set(clientId, new Set());
  state.log.info('OAuth client registered: ' + clientId);
  return client;
}

export function deactivateClient(
  state: OAuthState,
  clientId: string,
): OAuthClient | 'client-not-found' {
  const client = state.clients.get(clientId);
  if (!client) {
    return 'client-not-found';
  }

  const updated: OAuthClient = {
    ...client,
    active: false,
  };

  state.clients.set(clientId, updated);
  state.log.warn('OAuth client deactivated: ' + clientId);
  return updated;
}

export function getClient(state: OAuthState, clientId: string): OAuthClient | 'client-not-found' {
  const client = state.clients.get(clientId);
  return client || 'client-not-found';
}

// ============================================================================
// Scope Management
// ============================================================================

export function registerScope(
  state: OAuthState,
  name: string,
  description: string,
  restricted: boolean,
): OAuthScope | 'scope-exists' {
  if (state.scopes.has(name)) {
    return 'scope-exists';
  }

  const scope: OAuthScope = {
    name,
    description,
    restricted,
    createdAtMicros: state.clock.nowMicros(),
  };

  state.scopes.set(name, scope);
  state.log.info('OAuth scope registered: ' + name);
  return scope;
}

export function validateScope(
  state: OAuthState,
  clientId: string,
  requestedScopes: Array<string>,
): Array<string> | 'client-not-found' | 'invalid-scope' {
  const client = state.clients.get(clientId);
  if (!client) {
    return 'client-not-found';
  }

  for (const scopeName of requestedScopes) {
    if (!state.scopes.has(scopeName)) {
      return 'invalid-scope';
    }

    if (!client.allowedScopes.includes(scopeName)) {
      return 'invalid-scope';
    }
  }

  return requestedScopes;
}

export function listScopes(state: OAuthState): Array<OAuthScope> {
  return Array.from(state.scopes.values());
}

// ============================================================================
// Authorization Code Flow
// ============================================================================

export function createAuthorizationGrant(
  state: OAuthState,
  clientId: string,
  scopes: Array<string>,
  redirectUri: string,
): TokenGrant | 'client-not-found' | 'invalid-grant' | 'invalid-scope' {
  const client = state.clients.get(clientId);
  if (!client) {
    return 'client-not-found';
  }

  if (!client.active) {
    return 'invalid-grant';
  }

  if (!client.allowedGrants.includes('AUTHORIZATION_CODE')) {
    return 'invalid-grant';
  }

  if (!client.redirectUris.includes(redirectUri)) {
    return 'invalid-grant';
  }

  const scopeValidation = validateScope(state, clientId, scopes);
  if (typeof scopeValidation === 'string') {
    return 'invalid-scope';
  }

  const grantId = state.id.generate();
  const code = state.id.generate();
  const now = state.clock.nowMicros();

  const grant: TokenGrant = {
    grantId,
    clientId,
    grantType: 'AUTHORIZATION_CODE',
    scopes,
    code,
    redirectUri,
    createdAtMicros: now,
    expiresAtMicros: now + state.codeTtlMicros,
    used: false,
  };

  state.grants.set(code, grant);
  const msg = 'Authorization grant created: ' + grantId;
  state.log.info(msg);
  return grant;
}

export function exchangeCodeForToken(
  state: OAuthState,
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): OAuthToken | 'invalid-code' | 'invalid-client' | 'code-expired' {
  const grant = state.grants.get(code);
  if (!grant) {
    return 'invalid-code';
  }

  if (grant.used) {
    return 'invalid-code';
  }

  if (grant.clientId !== clientId) {
    return 'invalid-client';
  }

  if (grant.redirectUri !== redirectUri) {
    return 'invalid-client';
  }

  const client = state.clients.get(clientId);
  if (!client || client.clientSecret !== clientSecret) {
    return 'invalid-client';
  }

  const now = state.clock.nowMicros();
  if (now > grant.expiresAtMicros) {
    return 'code-expired';
  }

  const updated: TokenGrant = {
    ...grant,
    used: true,
  };
  state.grants.set(code, updated);

  const accessToken = issueAccessToken(state, clientId, grant.scopes);
  const refreshToken = issueRefreshToken(state, clientId, grant.scopes);

  if (typeof accessToken === 'string' || typeof refreshToken === 'string') {
    return 'invalid-code';
  }

  const linkedAccess: OAuthToken = {
    ...accessToken,
    refreshTokenId: refreshToken.tokenId,
  };

  state.tokens.set(accessToken.tokenId, linkedAccess);
  return linkedAccess;
}

// ============================================================================
// Token Issuance
// ============================================================================

export function issueToken(
  state: OAuthState,
  clientId: string,
  clientSecret: string,
  grantType: GrantType,
  scopes: Array<string>,
): OAuthToken | 'invalid-client' | 'invalid-grant' | 'invalid-scope' {
  const client = state.clients.get(clientId);
  if (!client || client.clientSecret !== clientSecret) {
    return 'invalid-client';
  }

  if (!client.active) {
    return 'invalid-client';
  }

  if (!client.allowedGrants.includes(grantType)) {
    return 'invalid-grant';
  }

  const scopeValidation = validateScope(state, clientId, scopes);
  if (typeof scopeValidation === 'string') {
    return 'invalid-scope';
  }

  if (grantType === 'CLIENT_CREDENTIALS') {
    return issueAccessToken(state, clientId, scopes);
  }

  return 'invalid-grant';
}

export function refreshToken(
  state: OAuthState,
  refreshTokenValue: string,
  clientId: string,
  clientSecret: string,
): OAuthToken | 'invalid-token' | 'invalid-client' | 'token-expired' {
  const refreshTok = findTokenByValue(state, refreshTokenValue);
  if (!refreshTok) {
    return 'invalid-token';
  }

  if (refreshTok.revoked) {
    return 'invalid-token';
  }

  if (refreshTok.clientId !== clientId) {
    return 'invalid-client';
  }

  const client = state.clients.get(clientId);
  if (!client || client.clientSecret !== clientSecret) {
    return 'invalid-client';
  }

  const now = state.clock.nowMicros();
  if (now > refreshTok.expiresAtMicros) {
    return 'token-expired';
  }

  return issueAccessToken(state, clientId, refreshTok.scopes);
}

// ============================================================================
// Token Introspection
// ============================================================================

export function introspectToken(state: OAuthState, tokenValue: string): IntrospectionResult {
  const token = findTokenByValue(state, tokenValue);

  if (!token) {
    return { active: false };
  }

  if (token.revoked) {
    return { active: false };
  }

  const now = state.clock.nowMicros();
  if (now > token.expiresAtMicros) {
    return { active: false };
  }

  return {
    active: true,
    tokenType: token.tokenType,
    clientId: token.clientId,
    scopes: token.scopes,
    expiresAtMicros: token.expiresAtMicros,
    issuedAtMicros: token.issuedAtMicros,
  };
}

// ============================================================================
// Token Revocation
// ============================================================================

export function revokeToken(
  state: OAuthState,
  tokenValue: string,
  reason: string,
): RevocationRecord | 'token-not-found' {
  const token = findTokenByValue(state, tokenValue);
  if (!token) {
    return 'token-not-found';
  }

  const updated: OAuthToken = {
    ...token,
    revoked: true,
  };

  state.tokens.set(token.tokenId, updated);

  const record: RevocationRecord = {
    tokenId: token.tokenId,
    clientId: token.clientId,
    revokedAtMicros: state.clock.nowMicros(),
    reason,
  };

  state.revocations.push(record);
  const msg = 'Token revoked: ' + token.tokenId + ' (' + reason + ')';
  state.log.warn(msg);
  return record;
}

export function revokeAllClientTokens(state: OAuthState, clientId: string, reason: string): number {
  const tokenIds = state.tokensByClient.get(clientId);
  if (!tokenIds) {
    return 0;
  }

  let count = 0;
  for (const tokenId of tokenIds) {
    const token = state.tokens.get(tokenId);
    if (token && !token.revoked) {
      const result = revokeToken(state, token.value, reason);
      if (typeof result !== 'string') {
        count++;
      }
    }
  }

  return count;
}

// ============================================================================
// Statistics
// ============================================================================

export function getClientStats(
  state: OAuthState,
  clientId: string,
): ClientStats | 'client-not-found' {
  const client = state.clients.get(clientId);
  if (!client) {
    return 'client-not-found';
  }

  const tokenIds = state.tokensByClient.get(clientId) || new Set();
  let totalTokensIssued = 0;
  let activeTokens = 0;
  let revokedTokens = 0;

  for (const tokenId of tokenIds) {
    const token = state.tokens.get(tokenId);
    if (token) {
      totalTokensIssued++;
      if (token.revoked) {
        revokedTokens++;
      } else if (state.clock.nowMicros() <= token.expiresAtMicros) {
        activeTokens++;
      }
    }
  }

  let totalGrants = 0;
  for (const grant of state.grants.values()) {
    if (grant.clientId === clientId) {
      totalGrants++;
    }
  }

  return {
    clientId,
    totalTokensIssued,
    activeTokens,
    revokedTokens,
    totalGrants,
  };
}

export function getActiveTokenCount(state: OAuthState): number {
  let count = 0;
  const now = state.clock.nowMicros();

  for (const token of state.tokens.values()) {
    if (!token.revoked && now <= token.expiresAtMicros) {
      count++;
    }
  }

  return count;
}

export function getRevocationCount(state: OAuthState): number {
  return state.revocations.length;
}

// ============================================================================
// Helpers
// ============================================================================

function issueAccessToken(
  state: OAuthState,
  clientId: string,
  scopes: Array<string>,
): OAuthToken | 'invalid-client' {
  const client = state.clients.get(clientId);
  if (!client) {
    return 'invalid-client';
  }

  const tokenId = state.id.generate();
  const value = state.id.generate();
  const now = state.clock.nowMicros();

  const token: OAuthToken = {
    tokenId,
    clientId,
    tokenType: 'ACCESS',
    value,
    scopes,
    expiresAtMicros: now + state.accessTtlMicros,
    issuedAtMicros: now,
    revoked: false,
  };

  state.tokens.set(tokenId, token);
  addTokenToClient(state, clientId, tokenId);
  state.log.info('Access token issued: ' + tokenId);
  return token;
}

function issueRefreshToken(
  state: OAuthState,
  clientId: string,
  scopes: Array<string>,
): OAuthToken | 'invalid-client' {
  const client = state.clients.get(clientId);
  if (!client) {
    return 'invalid-client';
  }

  const tokenId = state.id.generate();
  const value = state.id.generate();
  const now = state.clock.nowMicros();

  const token: OAuthToken = {
    tokenId,
    clientId,
    tokenType: 'REFRESH',
    value,
    scopes,
    expiresAtMicros: now + state.refreshTtlMicros,
    issuedAtMicros: now,
    revoked: false,
  };

  state.tokens.set(tokenId, token);
  addTokenToClient(state, clientId, tokenId);
  state.log.info('Refresh token issued: ' + tokenId);
  return token;
}

function findTokenByValue(state: OAuthState, value: string): OAuthToken | undefined {
  for (const token of state.tokens.values()) {
    if (token.value === value) {
      return token;
    }
  }
  return undefined;
}

function addTokenToClient(state: OAuthState, clientId: string, tokenId: string): void {
  const tokens = state.tokensByClient.get(clientId);
  if (tokens) {
    tokens.add(tokenId);
  }
}

// ============================================================================
// Exports
// ============================================================================

export type {
  ClockPort,
  IdPort,
  LogPort,
  GrantType,
  TokenType,
  OAuthClient,
  OAuthScope,
  OAuthToken,
  TokenGrant,
  IntrospectionResult,
  RevocationRecord,
  ClientStats,
  OAuthState,
};
