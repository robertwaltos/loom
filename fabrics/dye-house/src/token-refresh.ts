/**
 * token-refresh.ts — Token refresh and renewal service.
 *
 * Manages refresh tokens for session continuation. Tracks
 * refresh chains, enforces max refresh counts, and detects
 * refresh token reuse (potential compromise indicator).
 */

// ── Ports ────────────────────────────────────────────────────────

interface RefreshClock {
  readonly nowMicroseconds: () => number;
}

interface RefreshIdGenerator {
  readonly next: () => string;
}

interface TokenRefreshDeps {
  readonly clock: RefreshClock;
  readonly idGenerator: RefreshIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type RefreshStatus = 'active' | 'used' | 'revoked' | 'expired';

interface RefreshToken {
  readonly tokenId: string;
  readonly sessionId: string;
  readonly status: RefreshStatus;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly generation: number;
  readonly previousTokenId: string | undefined;
}

interface IssueRefreshParams {
  readonly sessionId: string;
  readonly ttlUs: number;
}

interface RefreshResult {
  readonly success: boolean;
  readonly newToken: RefreshToken | undefined;
  readonly reuseDetected: boolean;
}

interface TokenRefreshConfig {
  readonly maxGenerations: number;
}

interface RefreshStats {
  readonly totalTokens: number;
  readonly activeTokens: number;
  readonly usedTokens: number;
  readonly revokedTokens: number;
  readonly expiredTokens: number;
  readonly reuseAttempts: number;
}

interface TokenRefreshService {
  readonly issue: (params: IssueRefreshParams) => RefreshToken;
  readonly refresh: (tokenId: string, ttlUs: number) => RefreshResult;
  readonly revoke: (tokenId: string) => boolean;
  readonly revokeSession: (sessionId: string) => number;
  readonly getToken: (tokenId: string) => RefreshToken | undefined;
  readonly sweepExpired: () => number;
  readonly getStats: () => RefreshStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_REFRESH_CONFIG: TokenRefreshConfig = {
  maxGenerations: 50,
};

// ── State ────────────────────────────────────────────────────────

interface MutableRefreshToken {
  readonly tokenId: string;
  readonly sessionId: string;
  status: RefreshStatus;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly generation: number;
  readonly previousTokenId: string | undefined;
}

interface RefreshState {
  readonly deps: TokenRefreshDeps;
  readonly config: TokenRefreshConfig;
  readonly tokens: Map<string, MutableRefreshToken>;
  readonly sessionTokens: Map<string, string[]>;
  reuseAttempts: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(token: MutableRefreshToken): RefreshToken {
  return { ...token };
}

function addToSessionIndex(state: RefreshState, sessionId: string, tokenId: string): void {
  const list = state.sessionTokens.get(sessionId);
  if (list) {
    list.push(tokenId);
  } else {
    state.sessionTokens.set(sessionId, [tokenId]);
  }
}

// ── Operations ───────────────────────────────────────────────────

function issueImpl(state: RefreshState, params: IssueRefreshParams): RefreshToken {
  const now = state.deps.clock.nowMicroseconds();
  const token: MutableRefreshToken = {
    tokenId: state.deps.idGenerator.next(),
    sessionId: params.sessionId,
    status: 'active',
    createdAt: now,
    expiresAt: now + params.ttlUs,
    generation: 1,
    previousTokenId: undefined,
  };
  state.tokens.set(token.tokenId, token);
  addToSessionIndex(state, params.sessionId, token.tokenId);
  return toReadonly(token);
}

const FAIL_RESULT: RefreshResult = { success: false, newToken: undefined, reuseDetected: false };

function createNextToken(
  state: RefreshState, current: MutableRefreshToken, ttlUs: number, now: number,
): MutableRefreshToken {
  const next: MutableRefreshToken = {
    tokenId: state.deps.idGenerator.next(),
    sessionId: current.sessionId,
    status: 'active',
    createdAt: now,
    expiresAt: now + ttlUs,
    generation: current.generation + 1,
    previousTokenId: current.tokenId,
  };
  state.tokens.set(next.tokenId, next);
  addToSessionIndex(state, current.sessionId, next.tokenId);
  return next;
}

function refreshImpl(state: RefreshState, tokenId: string, ttlUs: number): RefreshResult {
  const current = state.tokens.get(tokenId);
  if (!current) return FAIL_RESULT;
  if (current.status === 'used') {
    state.reuseAttempts += 1;
    revokeSessionImpl(state, current.sessionId);
    return { success: false, newToken: undefined, reuseDetected: true };
  }
  if (current.status !== 'active') return FAIL_RESULT;
  if (current.generation >= state.config.maxGenerations) return FAIL_RESULT;
  current.status = 'used';
  const now = state.deps.clock.nowMicroseconds();
  if (now > current.expiresAt) {
    current.status = 'expired';
    return FAIL_RESULT;
  }
  const next = createNextToken(state, current, ttlUs, now);
  return { success: true, newToken: toReadonly(next), reuseDetected: false };
}

function revokeImpl(state: RefreshState, tokenId: string): boolean {
  const token = state.tokens.get(tokenId);
  if (!token) return false;
  if (token.status === 'revoked') return false;
  token.status = 'revoked';
  return true;
}

function revokeSessionImpl(state: RefreshState, sessionId: string): number {
  const ids = state.sessionTokens.get(sessionId) ?? [];
  let count = 0;
  for (const id of ids) {
    const token = state.tokens.get(id);
    if (token && token.status === 'active') {
      token.status = 'revoked';
      count += 1;
    }
  }
  return count;
}

function sweepExpiredImpl(state: RefreshState): number {
  const now = state.deps.clock.nowMicroseconds();
  let count = 0;
  for (const token of state.tokens.values()) {
    if (token.status === 'active' && now > token.expiresAt) {
      token.status = 'expired';
      count += 1;
    }
  }
  return count;
}

function getStatsImpl(state: RefreshState): RefreshStats {
  let active = 0;
  let used = 0;
  let revoked = 0;
  let expired = 0;
  for (const token of state.tokens.values()) {
    if (token.status === 'active') active += 1;
    else if (token.status === 'used') used += 1;
    else if (token.status === 'revoked') revoked += 1;
    else expired += 1;
  }
  return {
    totalTokens: state.tokens.size,
    activeTokens: active,
    usedTokens: used,
    revokedTokens: revoked,
    expiredTokens: expired,
    reuseAttempts: state.reuseAttempts,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createTokenRefreshService(
  deps: TokenRefreshDeps,
  config?: Partial<TokenRefreshConfig>,
): TokenRefreshService {
  const state: RefreshState = {
    deps,
    config: { ...DEFAULT_REFRESH_CONFIG, ...config },
    tokens: new Map(),
    sessionTokens: new Map(),
    reuseAttempts: 0,
  };
  return {
    issue: (p) => issueImpl(state, p),
    refresh: (id, ttl) => refreshImpl(state, id, ttl),
    revoke: (id) => revokeImpl(state, id),
    revokeSession: (id) => revokeSessionImpl(state, id),
    getToken: (id) => {
      const t = state.tokens.get(id);
      return t ? toReadonly(t) : undefined;
    },
    sweepExpired: () => sweepExpiredImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createTokenRefreshService, DEFAULT_REFRESH_CONFIG };
export type {
  TokenRefreshService,
  TokenRefreshDeps,
  TokenRefreshConfig,
  RefreshToken,
  RefreshStatus,
  IssueRefreshParams,
  RefreshResult,
  RefreshStats,
};
