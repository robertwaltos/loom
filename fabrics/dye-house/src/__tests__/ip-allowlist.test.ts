import { describe, it, expect } from 'vitest';
import { createIpAllowlist } from '../ip-allowlist.js';
import type { AllowlistDeps } from '../ip-allowlist.js';

function makeDeps(): AllowlistDeps & { advance: (us: number) => void } {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time },
    advance: (us: number) => {
      time += us;
    },
  };
}

describe('IpAllowlist — allow and block', () => {
  it('adds an allowed address', () => {
    const list = createIpAllowlist(makeDeps());
    expect(list.allow({ address: '192.168.1.1', reason: 'trusted' })).toBe(true);
    expect(list.getEntry('192.168.1.1')?.status).toBe('allowed');
  });

  it('rejects duplicate allow', () => {
    const list = createIpAllowlist(makeDeps());
    list.allow({ address: '10.0.0.1', reason: 'internal' });
    expect(list.allow({ address: '10.0.0.1', reason: 'dup' })).toBe(false);
  });

  it('blocks an address', () => {
    const list = createIpAllowlist(makeDeps());
    expect(list.block({ address: '1.2.3.4', reason: 'suspicious' })).toBe(true);
    expect(list.getEntry('1.2.3.4')?.status).toBe('blocked');
  });

  it('transitions allowed to blocked', () => {
    const list = createIpAllowlist(makeDeps());
    list.allow({ address: '10.0.0.1', reason: 'internal' });
    list.block({ address: '10.0.0.1', reason: 'compromised' });
    expect(list.getEntry('10.0.0.1')?.status).toBe('blocked');
  });

  it('removes an entry', () => {
    const list = createIpAllowlist(makeDeps());
    list.allow({ address: '10.0.0.1', reason: 'internal' });
    expect(list.remove('10.0.0.1')).toBe(true);
    expect(list.getEntry('10.0.0.1')).toBeUndefined();
  });

  it('returns false for unknown removal', () => {
    const list = createIpAllowlist(makeDeps());
    expect(list.remove('unknown')).toBe(false);
  });
});

describe('IpAllowlist — check', () => {
  it('allows listed address', () => {
    const list = createIpAllowlist(makeDeps());
    list.allow({ address: '192.168.1.1', reason: 'trusted' });
    const result = list.check('192.168.1.1');
    expect(result.allowed).toBe(true);
  });

  it('denies unlisted address', () => {
    const list = createIpAllowlist(makeDeps());
    const result = list.check('1.2.3.4');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('not in allowlist');
  });

  it('denies blocked address', () => {
    const list = createIpAllowlist(makeDeps());
    list.block({ address: '1.2.3.4', reason: 'attack source' });
    const result = list.check('1.2.3.4');
    expect(result.allowed).toBe(false);
  });

  it('denies expired address', () => {
    const deps = makeDeps();
    const list = createIpAllowlist(deps);
    list.allow({ address: '10.0.0.1', reason: 'temp', expiresAt: 5_000_000 });
    deps.advance(10_000_000);
    const result = list.check('10.0.0.1');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('entry expired');
  });
});

describe('IpAllowlist — listing', () => {
  it('lists allowed entries', () => {
    const list = createIpAllowlist(makeDeps());
    list.allow({ address: '10.0.0.1', reason: 'a' });
    list.allow({ address: '10.0.0.2', reason: 'b' });
    list.block({ address: '1.2.3.4', reason: 'bad' });
    expect(list.listAllowed()).toHaveLength(2);
    expect(list.listBlocked()).toHaveLength(1);
  });
});

describe('IpAllowlist — sweep expired', () => {
  it('sweeps expired entries', () => {
    const deps = makeDeps();
    const list = createIpAllowlist(deps);
    list.allow({ address: '10.0.0.1', reason: 'temp', expiresAt: 5_000_000 });
    list.allow({ address: '10.0.0.2', reason: 'permanent' });
    deps.advance(10_000_000);
    const count = list.sweepExpired();
    expect(count).toBe(1);
  });
});

describe('IpAllowlist — stats', () => {
  it('starts with zero stats', () => {
    const list = createIpAllowlist(makeDeps());
    const stats = list.getStats();
    expect(stats.totalEntries).toBe(0);
    expect(stats.totalChecks).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const list = createIpAllowlist(makeDeps());
    list.allow({ address: '10.0.0.1', reason: 'a' });
    list.block({ address: '1.2.3.4', reason: 'b' });
    list.check('10.0.0.1');
    list.check('9.9.9.9');
    const stats = list.getStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.allowedEntries).toBe(1);
    expect(stats.blockedEntries).toBe(1);
    expect(stats.totalChecks).toBe(2);
    expect(stats.totalDenials).toBe(1);
  });
});
