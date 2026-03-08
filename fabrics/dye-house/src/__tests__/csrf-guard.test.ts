import { describe, it, expect } from 'vitest';
import { createCsrfGuard, DEFAULT_CSRF_CONFIG } from '../csrf-guard.js';
import type { CsrfGuardDeps, CsrfConfig } from '../csrf-guard.js';

function createDeps(startTime = 1000): { deps: CsrfGuardDeps; advance: (t: number) => void } {
  let time = startTime;
  let id = 0;
  return {
    deps: {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'csrf-' + String(id++) },
    },
    advance: (t: number) => { time += t; },
  };
}

const HOUR = 3_600_000_000;

describe('CsrfGuard — generate', () => {
  it('generates a token bound to a session', () => {
    const { deps } = createDeps();
    const guard = createCsrfGuard(deps);
    const tok = guard.generate('sess-1');
    expect(tok.token).toBe('csrf-0');
    expect(tok.sessionId).toBe('sess-1');
    expect(tok.used).toBe(false);
    expect(tok.expiresAt).toBeGreaterThan(tok.createdAt);
  });
});

describe('CsrfGuard — validate', () => {
  it('validates a correct token', () => {
    const { deps } = createDeps();
    const guard = createCsrfGuard(deps);
    const tok = guard.generate('sess-1');
    expect(guard.validate('sess-1', tok.token)).toBe('valid');
  });

  it('rejects wrong session', () => {
    const { deps } = createDeps();
    const guard = createCsrfGuard(deps);
    const tok = guard.generate('sess-1');
    expect(guard.validate('sess-2', tok.token)).toBe('invalid');
  });

  it('rejects unknown token', () => {
    const { deps } = createDeps();
    const guard = createCsrfGuard(deps);
    expect(guard.validate('sess-1', 'bogus')).toBe('invalid');
  });

  it('rejects expired token', () => {
    const { deps, advance } = createDeps();
    const guard = createCsrfGuard(deps);
    const tok = guard.generate('sess-1');
    advance(2 * HOUR);
    expect(guard.validate('sess-1', tok.token)).toBe('expired');
  });

  it('rejects already-used token in one-time mode', () => {
    const { deps } = createDeps();
    const guard = createCsrfGuard(deps);
    const tok = guard.generate('sess-1');
    guard.validate('sess-1', tok.token);
    expect(guard.validate('sess-1', tok.token)).toBe('already_used');
  });

  it('allows reuse when one-time-use is disabled', () => {
    const { deps } = createDeps();
    const config: CsrfConfig = { ttlMicro: HOUR, oneTimeUse: false };
    const guard = createCsrfGuard(deps, config);
    const tok = guard.generate('sess-1');
    guard.validate('sess-1', tok.token);
    expect(guard.validate('sess-1', tok.token)).toBe('valid');
  });
});

describe('CsrfGuard — revoke / cleanup', () => {
  it('revokes all tokens for a session', () => {
    const { deps } = createDeps();
    const guard = createCsrfGuard(deps);
    guard.generate('sess-1');
    guard.generate('sess-1');
    guard.generate('sess-2');
    expect(guard.revoke('sess-1')).toBe(2);
    expect(guard.getStats().totalTokens).toBe(1);
  });

  it('cleans up expired tokens', () => {
    const { deps, advance } = createDeps();
    const guard = createCsrfGuard(deps);
    guard.generate('sess-1');
    advance(2 * HOUR);
    guard.generate('sess-2');
    expect(guard.cleanup()).toBe(1);
    expect(guard.getStats().totalTokens).toBe(1);
  });
});

describe('CsrfGuard — getStats', () => {
  it('reports validation and rejection counts', () => {
    const { deps } = createDeps();
    const guard = createCsrfGuard(deps);
    const tok = guard.generate('sess-1');
    guard.validate('sess-1', tok.token);
    guard.validate('sess-1', 'bad');
    const stats = guard.getStats();
    expect(stats.validations).toBe(1);
    expect(stats.rejections).toBe(1);
    expect(stats.totalTokens).toBe(1);
  });

  it('exports default config', () => {
    expect(DEFAULT_CSRF_CONFIG.ttlMicro).toBe(HOUR);
    expect(DEFAULT_CSRF_CONFIG.oneTimeUse).toBe(true);
  });
});
