/**
 * csrf-guard.ts — Cross-site request forgery protection.
 *
 * Generates and validates CSRF tokens per session. Tokens are
 * bound to a session identifier, have configurable TTL, and
 * support one-time-use validation.
 */

// ── Ports ────────────────────────────────────────────────────────

interface CsrfClock {
  readonly nowMicroseconds: () => number;
}

interface CsrfIdGenerator {
  readonly next: () => string;
}

interface CsrfGuardDeps {
  readonly clock: CsrfClock;
  readonly idGenerator: CsrfIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface CsrfToken {
  readonly token: string;
  readonly sessionId: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly used: boolean;
}

interface CsrfConfig {
  readonly ttlMicro: number;
  readonly oneTimeUse: boolean;
}

type CsrfValidationResult = 'valid' | 'invalid' | 'expired' | 'already_used';

interface CsrfGuardStats {
  readonly totalTokens: number;
  readonly activeTokens: number;
  readonly validations: number;
  readonly rejections: number;
}

interface CsrfGuard {
  readonly generate: (sessionId: string) => CsrfToken;
  readonly validate: (sessionId: string, token: string) => CsrfValidationResult;
  readonly revoke: (sessionId: string) => number;
  readonly cleanup: () => number;
  readonly getStats: () => CsrfGuardStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_CSRF_CONFIG: CsrfConfig = {
  ttlMicro: 3_600_000_000, // 1 hour
  oneTimeUse: true,
};

// ── State ────────────────────────────────────────────────────────

interface MutableToken {
  readonly token: string;
  readonly sessionId: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  used: boolean;
}

interface GuardState {
  readonly deps: CsrfGuardDeps;
  readonly config: CsrfConfig;
  readonly tokens: Map<string, MutableToken>;
  validations: number;
  rejections: number;
}

// ── Operations ───────────────────────────────────────────────────

function generateImpl(state: GuardState, sessionId: string): CsrfToken {
  const now = state.deps.clock.nowMicroseconds();
  const tok: MutableToken = {
    token: state.deps.idGenerator.next(),
    sessionId,
    createdAt: now,
    expiresAt: now + state.config.ttlMicro,
    used: false,
  };
  state.tokens.set(tok.token, tok);
  return { ...tok };
}

function validateImpl(state: GuardState, sessionId: string, token: string): CsrfValidationResult {
  const tok = state.tokens.get(token);
  if (!tok || tok.sessionId !== sessionId) {
    state.rejections++;
    return 'invalid';
  }
  const now = state.deps.clock.nowMicroseconds();
  if (now >= tok.expiresAt) {
    state.rejections++;
    return 'expired';
  }
  if (tok.used && state.config.oneTimeUse) {
    state.rejections++;
    return 'already_used';
  }
  tok.used = true;
  state.validations++;
  return 'valid';
}

function revokeImpl(state: GuardState, sessionId: string): number {
  let count = 0;
  for (const [key, tok] of state.tokens.entries()) {
    if (tok.sessionId === sessionId) {
      state.tokens.delete(key);
      count++;
    }
  }
  return count;
}

function cleanupImpl(state: GuardState): number {
  const now = state.deps.clock.nowMicroseconds();
  let count = 0;
  for (const [key, tok] of state.tokens.entries()) {
    if (now >= tok.expiresAt) {
      state.tokens.delete(key);
      count++;
    }
  }
  return count;
}

function getStatsImpl(state: GuardState): CsrfGuardStats {
  const now = state.deps.clock.nowMicroseconds();
  let active = 0;
  for (const tok of state.tokens.values()) {
    if (now < tok.expiresAt && !tok.used) active++;
  }
  return {
    totalTokens: state.tokens.size,
    activeTokens: active,
    validations: state.validations,
    rejections: state.rejections,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createCsrfGuard(deps: CsrfGuardDeps, config: CsrfConfig = DEFAULT_CSRF_CONFIG): CsrfGuard {
  const state: GuardState = {
    deps,
    config,
    tokens: new Map(),
    validations: 0,
    rejections: 0,
  };
  return {
    generate: (sid) => generateImpl(state, sid),
    validate: (sid, tok) => validateImpl(state, sid, tok),
    revoke: (sid) => revokeImpl(state, sid),
    cleanup: () => cleanupImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createCsrfGuard, DEFAULT_CSRF_CONFIG };
export type {
  CsrfGuard,
  CsrfGuardDeps,
  CsrfConfig,
  CsrfToken,
  CsrfValidationResult,
  CsrfGuardStats,
};
