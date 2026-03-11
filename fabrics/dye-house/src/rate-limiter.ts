/**
 * Rate Limiter — Sliding window rate control for API and action gating.
 *
 * Provides per-identity, per-action rate limiting using a sliding
 * window algorithm. Each action type has configurable limits:
 *   - Maximum requests per window
 *   - Window duration in microseconds
 *
 * Common use cases:
 *   - API endpoint throttling
 *   - Action cooldowns (survey initiation, trade execution)
 *   - Anti-abuse (chronicle spam, auction sniping)
 *
 * "The Dye House controls the flow. Too fast, and the dye runs."
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface RateLimitRule {
  readonly action: string;
  readonly maxRequests: number;
  readonly windowMicroseconds: number;
}

export interface RateLimitCheck {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAt: number;
  readonly retryAfterMicroseconds: number;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface RateLimiter {
  registerRule(rule: RateLimitRule): void;
  check(identityId: string, action: string): RateLimitCheck;
  consume(identityId: string, action: string): RateLimitCheck;
  reset(identityId: string, action: string): void;
  resetAll(identityId: string): void;
  getRuleCount(): number;
  cleanup(): number;
}

export interface RateLimiterDeps {
  readonly clock: { nowMicroseconds(): number };
}

// ─── State ──────────────────────────────────────────────────────────

interface WindowState {
  readonly timestamps: number[];
}

interface LimiterState {
  readonly rules: Map<string, RateLimitRule>;
  readonly windows: Map<string, WindowState>; // "identityId:action" → state
  readonly deps: RateLimiterDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createRateLimiter(deps: RateLimiterDeps): RateLimiter {
  const state: LimiterState = {
    rules: new Map(),
    windows: new Map(),
    deps,
  };

  return {
    registerRule: (r) => {
      registerRuleImpl(state, r);
    },
    check: (id, action) => checkImpl(state, id, action),
    consume: (id, action) => consumeImpl(state, id, action),
    reset: (id, action) => {
      resetImpl(state, id, action);
    },
    resetAll: (id) => {
      resetAllImpl(state, id);
    },
    getRuleCount: () => state.rules.size,
    cleanup: () => cleanupImpl(state),
  };
}

// ─── Rule Registration ──────────────────────────────────────────────

function registerRuleImpl(state: LimiterState, rule: RateLimitRule): void {
  state.rules.set(rule.action, rule);
}

// ─── Check ──────────────────────────────────────────────────────────

function checkImpl(state: LimiterState, identityId: string, action: string): RateLimitCheck {
  const rule = getRule(state, action);
  const now = state.deps.clock.nowMicroseconds();
  const key = windowKey(identityId, action);
  const window = getOrCreateWindow(state, key);

  pruneExpired(window, now, rule.windowMicroseconds);
  return buildCheck(window, rule, now);
}

// ─── Consume ────────────────────────────────────────────────────────

function consumeImpl(state: LimiterState, identityId: string, action: string): RateLimitCheck {
  const rule = getRule(state, action);
  const now = state.deps.clock.nowMicroseconds();
  const key = windowKey(identityId, action);
  const window = getOrCreateWindow(state, key);

  pruneExpired(window, now, rule.windowMicroseconds);

  if (window.timestamps.length >= rule.maxRequests) {
    return buildCheck(window, rule, now);
  }

  window.timestamps.push(now);
  return buildCheck(window, rule, now);
}

// ─── Reset ──────────────────────────────────────────────────────────

function resetImpl(state: LimiterState, identityId: string, action: string): void {
  state.windows.delete(windowKey(identityId, action));
}

function resetAllImpl(state: LimiterState, identityId: string): void {
  const prefix = identityId + ':';
  const toDelete: string[] = [];
  for (const key of state.windows.keys()) {
    if (key.startsWith(prefix)) toDelete.push(key);
  }
  for (const key of toDelete) {
    state.windows.delete(key);
  }
}

// ─── Cleanup ────────────────────────────────────────────────────────

function cleanupImpl(state: LimiterState): number {
  const now = state.deps.clock.nowMicroseconds();
  const toDelete: string[] = [];

  for (const [key, window] of state.windows.entries()) {
    const action = extractAction(key);
    const rule = state.rules.get(action);
    if (rule === undefined) {
      toDelete.push(key);
      continue;
    }
    pruneExpired(window, now, rule.windowMicroseconds);
    if (window.timestamps.length === 0) toDelete.push(key);
  }

  for (const key of toDelete) {
    state.windows.delete(key);
  }
  return toDelete.length;
}

// ─── Helpers ────────────────────────────────────────────────────────

function windowKey(identityId: string, action: string): string {
  return identityId + ':' + action;
}

function extractAction(key: string): string {
  const colonIdx = key.indexOf(':');
  return colonIdx >= 0 ? key.slice(colonIdx + 1) : key;
}

function getRule(state: LimiterState, action: string): RateLimitRule {
  const rule = state.rules.get(action);
  if (rule === undefined) {
    throw new Error('No rate limit rule for action: ' + action);
  }
  return rule;
}

function getOrCreateWindow(state: LimiterState, key: string): WindowState {
  const existing = state.windows.get(key);
  if (existing !== undefined) return existing;
  const window: WindowState = { timestamps: [] };
  state.windows.set(key, window);
  return window;
}

function pruneExpired(window: WindowState, now: number, windowUs: number): void {
  const cutoff = now - windowUs;
  while (window.timestamps.length > 0 && window.timestamps[0] !== undefined) {
    if (window.timestamps[0] <= cutoff) {
      window.timestamps.shift();
    } else {
      break;
    }
  }
}

function buildCheck(window: WindowState, rule: RateLimitRule, now: number): RateLimitCheck {
  const used = window.timestamps.length;
  const remaining = Math.max(0, rule.maxRequests - used);
  const allowed = used < rule.maxRequests;
  const resetAt = computeResetAt(window, now, rule.windowMicroseconds);
  const retryAfter = allowed ? 0 : Math.max(0, resetAt - now);
  return { allowed, remaining, resetAt, retryAfterMicroseconds: retryAfter };
}

function computeResetAt(window: WindowState, now: number, windowUs: number): number {
  if (window.timestamps.length === 0) return now;
  const oldest = window.timestamps[0];
  if (oldest === undefined) return now;
  return oldest + windowUs;
}
