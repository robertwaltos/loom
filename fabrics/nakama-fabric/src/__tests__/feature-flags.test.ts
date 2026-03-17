import { describe, it, expect } from 'vitest';
import { createFeatureFlagEngine } from '../feature-flags.js';

describe('FeatureFlagEngine — default behaviour', () => {
  it('undefined flag returns false from isEnabled', () => {
    const engine = createFeatureFlagEngine();
    expect(engine.isEnabled('nonexistent', 'player1')).toBe(false);
  });

  it('flag disabled by default returns false', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'new-combat', defaultValue: false, description: 'New combat system' });
    expect(engine.isEnabled('new-combat', 'player1')).toBe(false);
  });

  it('getValue returns fallback when flag has 0% rollout', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'theme', defaultValue: 'dark', description: 'UI theme', rolloutPct: 0 });
    expect(engine.getValue('theme', 'player1', 'light')).toBe('light');
  });

  it('getValue returns fallback for unknown flag', () => {
    const engine = createFeatureFlagEngine();
    expect(engine.getValue('ghost', 'player1', 42)).toBe(42);
  });
});

describe('FeatureFlagEngine — rollout percentage', () => {
  it('flag with 100% rollout is always enabled', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'full', defaultValue: true, description: 'test', rolloutPct: 100 });
    expect(engine.isEnabled('full', 'player-a')).toBe(true);
    expect(engine.isEnabled('full', 'player-b')).toBe(true);
    expect(engine.isEnabled('full', 'player-c')).toBe(true);
  });

  it('flag with 0% rollout is always disabled', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'zero', defaultValue: true, description: 'test', rolloutPct: 0 });
    expect(engine.isEnabled('zero', 'player-a')).toBe(false);
    expect(engine.isEnabled('zero', 'player-b')).toBe(false);
    expect(engine.isEnabled('zero', 'player-c')).toBe(false);
  });

  it('rollout result is deterministic for the same player', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'partial', defaultValue: true, description: 'test', rolloutPct: 50 });
    const r1 = engine.isEnabled('partial', 'player-abc-123');
    const r2 = engine.isEnabled('partial', 'player-abc-123');
    expect(r1).toBe(r2);
  });

  it('different players can get different results at 50%', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'partial', defaultValue: true, description: 'test', rolloutPct: 50 });
    // With enough players one should be in and one should be out
    const results = new Set(
      ['alice', 'bob', 'charlie', 'dave', 'eve', 'frank', 'grace', 'hank'].map(p =>
        engine.isEnabled('partial', p),
      ),
    );
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('FeatureFlagEngine — allow/deny lists', () => {
  it('allowList player gets flag even at 0%', () => {
    const engine = createFeatureFlagEngine();
    engine.define({
      name: 'vip-feature',
      defaultValue: true,
      description: 'VIP feature',
      rolloutPct: 0,
      allowList: ['vip-player-1'],
    });
    expect(engine.isEnabled('vip-feature', 'vip-player-1')).toBe(true);
    expect(engine.isEnabled('vip-feature', 'regular-player')).toBe(false);
  });

  it('denyList player is denied even at 100%', () => {
    const engine = createFeatureFlagEngine();
    engine.define({
      name: 'restricted',
      defaultValue: true,
      description: 'Feature with blocked player',
      rolloutPct: 100,
      denyList: ['banned-player-1'],
    });
    expect(engine.isEnabled('restricted', 'banned-player-1')).toBe(false);
    expect(engine.isEnabled('restricted', 'normal-player')).toBe(true);
  });

  it('denyList takes precedence over allowList', () => {
    const engine = createFeatureFlagEngine();
    engine.define({
      name: 'conflict',
      defaultValue: true,
      description: 'test',
      rolloutPct: 100,
      allowList: ['player-x'],
      denyList: ['player-x'],
    });
    expect(engine.isEnabled('conflict', 'player-x')).toBe(false);
  });
});

describe('FeatureFlagEngine — overrides', () => {
  it('override(true) enables flag globally regardless of rollout', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'kill-switch', defaultValue: true, description: 'test', rolloutPct: 0 });
    engine.override('kill-switch', true);
    expect(engine.isEnabled('kill-switch', 'player1')).toBe(true);
    expect(engine.isEnabled('kill-switch', 'player2')).toBe(true);
  });

  it('override(false) disables flag globally regardless of rollout', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'kill-switch', defaultValue: true, description: 'test', rolloutPct: 100 });
    engine.override('kill-switch', false);
    expect(engine.isEnabled('kill-switch', 'player1')).toBe(false);
    expect(engine.isEnabled('kill-switch', 'player2')).toBe(false);
  });

  it('clearOverride restores normal rollout logic', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'toggle', defaultValue: true, description: 'test', rolloutPct: 0 });
    engine.override('toggle', true);
    expect(engine.isEnabled('toggle', 'player1')).toBe(true);
    engine.clearOverride('toggle');
    expect(engine.isEnabled('toggle', 'player1')).toBe(false);
  });

  it('override takes precedence over denyList', () => {
    const engine = createFeatureFlagEngine();
    engine.define({
      name: 'force-enable',
      defaultValue: true,
      description: 'test',
      rolloutPct: 0,
      denyList: ['player1'],
    });
    engine.override('force-enable', true);
    expect(engine.isEnabled('force-enable', 'player1')).toBe(true);
  });
});

describe('FeatureFlagEngine — typed values', () => {
  it('string-valued flag returns defaultValue when enabled', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'ui-theme', defaultValue: 'dark', description: 'test', rolloutPct: 100 });
    expect(engine.getValue('ui-theme', 'player1', 'light')).toBe('dark');
  });

  it('string-valued flag returns fallback when disabled', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'ui-theme', defaultValue: 'dark', description: 'test', rolloutPct: 0 });
    expect(engine.getValue('ui-theme', 'player1', 'light')).toBe('light');
  });

  it('number-valued flag returns defaultValue when enabled', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'xp-mult', defaultValue: 2, description: 'test', rolloutPct: 100 });
    expect(engine.getValue('xp-mult', 'player1', 1)).toBe(2);
  });

  it('number-valued flag returns fallback when disabled', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'xp-mult', defaultValue: 2, description: 'test', rolloutPct: 0 });
    expect(engine.getValue('xp-mult', 'player1', 1)).toBe(1);
  });
});

describe('FeatureFlagEngine — listFlags', () => {
  it('listFlags reflects accurate enabled/rolloutPct state', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'flag-on', defaultValue: true, description: 'Always on', rolloutPct: 100 });
    engine.define({ name: 'flag-off', defaultValue: false, description: 'Always off', rolloutPct: 0 });

    const list = engine.listFlags();
    expect(list).toHaveLength(2);

    const on = list.find(f => f.name === 'flag-on');
    const off = list.find(f => f.name === 'flag-off');

    expect(on?.enabled).toBe(true);
    expect(on?.rolloutPct).toBe(100);
    expect(off?.enabled).toBe(false);
    expect(off?.rolloutPct).toBe(0);
  });

  it('listFlags reflects runtime override', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'flag-a', defaultValue: false, description: 'test', rolloutPct: 0 });
    engine.override('flag-a', true);

    const list = engine.listFlags();
    const a = list.find(f => f.name === 'flag-a');
    expect(a?.enabled).toBe(true);
  });

  it('listFlags uses default rolloutPct of 0 for undefined rollout', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'no-rollout', defaultValue: false, description: 'test' });

    const list = engine.listFlags();
    const f = list.find(fl => fl.name === 'no-rollout');
    expect(f?.rolloutPct).toBe(0);
    expect(f?.enabled).toBe(false);
  });
});

describe('FeatureFlagEngine — multiple flags & idempotency', () => {
  it('multiple flags are independent of each other', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'alpha', defaultValue: true, description: 'Alpha', rolloutPct: 100 });
    engine.define({ name: 'beta', defaultValue: true, description: 'Beta', rolloutPct: 0 });

    expect(engine.isEnabled('alpha', 'player1')).toBe(true);
    expect(engine.isEnabled('beta', 'player1')).toBe(false);

    engine.override('beta', true);
    expect(engine.isEnabled('alpha', 'player1')).toBe(true);
    expect(engine.isEnabled('beta', 'player1')).toBe(true);

    engine.clearOverride('beta');
    expect(engine.isEnabled('alpha', 'player1')).toBe(true);
    expect(engine.isEnabled('beta', 'player1')).toBe(false);
  });

  it('define is idempotent — first definition wins', () => {
    const engine = createFeatureFlagEngine();
    engine.define({ name: 'flag', defaultValue: true, description: 'Original', rolloutPct: 100 });
    engine.define({ name: 'flag', defaultValue: false, description: 'Duplicate', rolloutPct: 0 });
    expect(engine.isEnabled('flag', 'player1')).toBe(true);
  });

  it('custom hashFn is used for rollout decisions', () => {
    let callCount = 0;
    const engine = createFeatureFlagEngine({
      hashFn: () => {
        callCount++;
        return 50;
      },
    });
    engine.define({ name: 'feat-in', defaultValue: true, description: 'test', rolloutPct: 51 });
    engine.define({ name: 'feat-out', defaultValue: true, description: 'test', rolloutPct: 50 });

    expect(engine.isEnabled('feat-in', 'any-player')).toBe(true);
    expect(engine.isEnabled('feat-out', 'any-player')).toBe(false);
    expect(callCount).toBeGreaterThan(0);
  });
});
