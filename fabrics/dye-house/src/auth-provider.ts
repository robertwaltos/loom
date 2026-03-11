/**
 * Auth Provider — External authentication to internal token bridge.
 *
 * The gatekeeper of The Loom. Validates external credentials (API keys,
 * OAuth tokens, platform-specific auth) and issues internal session
 * tokens via the Token Vault.
 *
 * Three authentication methods:
 *   1. API Key — Server-to-server or development authentication
 *   2. Platform Token — External OAuth/platform token validation
 *   3. Dynasty Credential — Direct dynasty ID + secret verification
 *
 * On successful authentication:
 *   - Issues a session token via the Token Vault
 *   - Records the authentication in the audit log
 *   - Returns the token for subsequent API calls
 *
 * Implements a port-compatible interface for the PlayerConnectOrchestrator's
 * ConnectTokenPort — allowing dye-house to plug directly into the
 * player connection pipeline.
 */

// ─── Port Interfaces ────────────────────────────────────────────────

export interface AuthTokenVaultPort {
  readonly issue: (dynastyId: string) => AuthIssuedToken;
  readonly validate: (tokenId: string) => AuthTokenValidation;
  readonly revoke: (tokenId: string) => void;
}

export interface AuthIssuedToken {
  readonly tokenId: string;
  readonly dynastyId: string;
  readonly expiresAt: number;
}

export interface AuthTokenValidation {
  readonly valid: boolean;
  readonly reason: string | null;
  readonly token: AuthValidatedToken | null;
}

export interface AuthValidatedToken {
  readonly tokenId: string;
  readonly dynastyId: string;
}

export interface AuthCredentialStore {
  readonly validateApiKey: (apiKey: string) => AuthCredentialResult;
  readonly validateDynastySecret: (dynastyId: string, secret: string) => boolean;
}

export interface AuthCredentialResult {
  readonly valid: boolean;
  readonly dynastyId: string | null;
}

export interface AuthAuditPort {
  readonly record: (entry: AuthAuditEntry) => void;
}

export interface AuthAuditEntry {
  readonly action: string;
  readonly dynastyId: string | null;
  readonly success: boolean;
  readonly reason: string;
  readonly at: number;
}

export interface AuthClockPort {
  readonly nowMicroseconds: () => number;
}

// ─── Types ──────────────────────────────────────────────────────────

export type AuthMethod = 'api_key' | 'dynasty_secret' | 'platform_token';

export interface AuthenticateParams {
  readonly method: AuthMethod;
  readonly apiKey?: string;
  readonly dynastyId?: string;
  readonly secret?: string;
  readonly platformToken?: string;
}

export type AuthenticateResult =
  | { readonly ok: true; readonly value: AuthSuccess }
  | { readonly ok: false; readonly error: AuthFailure };

export interface AuthSuccess {
  readonly tokenId: string;
  readonly dynastyId: string;
  readonly expiresAt: number;
  readonly method: AuthMethod;
}

export interface AuthFailure {
  readonly code: AuthErrorCode;
  readonly message: string;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'missing_credentials'
  | 'dynasty_not_found'
  | 'token_issuance_failed'
  | 'unsupported_method';

export interface ConnectTokenResult {
  readonly valid: boolean;
  readonly dynastyId: string | null;
  readonly reason: string | null;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface AuthProviderDeps {
  readonly tokenVault: AuthTokenVaultPort;
  readonly credentials: AuthCredentialStore;
  readonly audit: AuthAuditPort;
  readonly clock: AuthClockPort;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface AuthProvider {
  readonly authenticate: (params: AuthenticateParams) => AuthenticateResult;
  readonly validateToken: (tokenId: string) => ConnectTokenResult;
  readonly revokeToken: (tokenId: string) => void;
  readonly getStats: () => AuthProviderStats;
}

export interface AuthProviderStats {
  readonly totalAuthentications: number;
  readonly successfulAuthentications: number;
  readonly failedAuthentications: number;
}

// ─── State ──────────────────────────────────────────────────────────

interface AuthState {
  readonly deps: AuthProviderDeps;
  totalAuthentications: number;
  successfulAuthentications: number;
  failedAuthentications: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createAuthProvider(deps: AuthProviderDeps): AuthProvider {
  const state: AuthState = {
    deps,
    totalAuthentications: 0,
    successfulAuthentications: 0,
    failedAuthentications: 0,
  };

  return {
    authenticate: (params) => authenticateImpl(state, params),
    validateToken: (tokenId) => validateTokenImpl(state, tokenId),
    revokeToken: (tokenId) => {
      state.deps.tokenVault.revoke(tokenId);
    },
    getStats: () => buildStats(state),
  };
}

// ─── Authentication ─────────────────────────────────────────────────

function authenticateImpl(state: AuthState, params: AuthenticateParams): AuthenticateResult {
  state.totalAuthentications += 1;

  const resolved = resolveCredentials(state, params);
  if (!resolved.ok) {
    return recordFailure(state, resolved.error, null);
  }

  return issueTokenForDynasty(state, resolved.value, params.method);
}

// ─── Credential Resolution ──────────────────────────────────────────

interface ResolvedCredential {
  readonly dynastyId: string;
}

type ResolveResult =
  | { readonly ok: true; readonly value: ResolvedCredential }
  | { readonly ok: false; readonly error: AuthFailure };

function resolveCredentials(state: AuthState, params: AuthenticateParams): ResolveResult {
  switch (params.method) {
    case 'api_key':
      return resolveApiKey(state, params.apiKey);
    case 'dynasty_secret':
      return resolveDynastySecret(state, params.dynastyId, params.secret);
    case 'platform_token':
      return resolvePlatformToken(params.platformToken);
    default:
      return fail('unsupported_method', 'Unsupported authentication method');
  }
}

function resolveApiKey(state: AuthState, apiKey: string | undefined): ResolveResult {
  if (apiKey === undefined) {
    return fail('missing_credentials', 'API key is required');
  }
  const result = state.deps.credentials.validateApiKey(apiKey);
  if (!result.valid || result.dynastyId === null) {
    return fail('invalid_credentials', 'Invalid API key');
  }
  return { ok: true, value: { dynastyId: result.dynastyId } };
}

function resolveDynastySecret(
  state: AuthState,
  dynastyId: string | undefined,
  secret: string | undefined,
): ResolveResult {
  if (dynastyId === undefined || secret === undefined) {
    return fail('missing_credentials', 'Dynasty ID and secret are required');
  }
  const valid = state.deps.credentials.validateDynastySecret(dynastyId, secret);
  if (!valid) {
    return fail('invalid_credentials', 'Invalid dynasty credentials');
  }
  return { ok: true, value: { dynastyId } };
}

function resolvePlatformToken(platformToken: string | undefined): ResolveResult {
  if (platformToken === undefined) {
    return fail('missing_credentials', 'Platform token is required');
  }
  return fail('unsupported_method', 'Platform token auth not yet implemented');
}

// ─── Token Issuance ─────────────────────────────────────────────────

function issueTokenForDynasty(
  state: AuthState,
  credential: ResolvedCredential,
  method: AuthMethod,
): AuthenticateResult {
  try {
    const token = state.deps.tokenVault.issue(credential.dynastyId);
    recordSuccess(state, credential.dynastyId, method);
    return {
      ok: true,
      value: {
        tokenId: token.tokenId,
        dynastyId: credential.dynastyId,
        expiresAt: token.expiresAt,
        method,
      },
    };
  } catch {
    return recordFailure(
      state,
      {
        code: 'token_issuance_failed',
        message: 'Failed to issue session token',
      },
      credential.dynastyId,
    );
  }
}

// ─── Token Validation (ConnectTokenPort-compatible) ─────────────────

function validateTokenImpl(state: AuthState, tokenId: string): ConnectTokenResult {
  const validation = state.deps.tokenVault.validate(tokenId);
  if (validation.valid && validation.token !== null) {
    return {
      valid: true,
      dynastyId: validation.token.dynastyId,
      reason: null,
    };
  }
  return {
    valid: false,
    dynastyId: validation.token?.dynastyId ?? null,
    reason: validation.reason,
  };
}

// ─── Audit ──────────────────────────────────────────────────────────

function recordSuccess(state: AuthState, dynastyId: string, method: AuthMethod): void {
  state.successfulAuthentications += 1;
  state.deps.audit.record({
    action: 'authenticate.' + method,
    dynastyId,
    success: true,
    reason: 'Authentication successful',
    at: state.deps.clock.nowMicroseconds(),
  });
}

function recordFailure(
  state: AuthState,
  error: AuthFailure,
  dynastyId: string | null,
): AuthenticateResult {
  state.failedAuthentications += 1;
  state.deps.audit.record({
    action: 'authenticate.failure',
    dynastyId,
    success: false,
    reason: error.message,
    at: state.deps.clock.nowMicroseconds(),
  });
  return { ok: false, error };
}

// ─── Helpers ────────────────────────────────────────────────────────

function fail(code: AuthErrorCode, message: string): ResolveResult {
  return { ok: false, error: { code, message } };
}

function buildStats(state: AuthState): AuthProviderStats {
  return {
    totalAuthentications: state.totalAuthentications,
    successfulAuthentications: state.successfulAuthentications,
    failedAuthentications: state.failedAuthentications,
  };
}
