/**
 * Mobile Client System — integration tests
 *
 * Device profiling, mobile UI, cloud gaming,
 * offline mode, and cross-platform matchmaking.
 */

import { describe, it, expect } from 'vitest';
import {
  profileMobileDevice,
  computeMobileUiConfig,
  createCloudGamingSession,
  createOfflineStatePacket,
  addOfflineAction,
  syncOfflineState,
  sortActionsBySyncPriority,
  createCrossPlatformMatch,
  areInputCompatible,
  isSkillRatingCompatible,
  createMobileClientEngine,
  MOBILE_PLATFORMS,
  OFFLINE_FEATURES,
  type MobEngineDeps,
  type MobileDeviceProfile,
} from '../fabrics/loom-core/src/mobile-client-system';

// ─── Helpers ────────────────────────────────────────────────────────

let idCounter = 0;
function stubClock(): { readonly now: () => bigint } {
  return { now: () => BigInt(Date.now()) };
}
function stubIds(): { readonly next: () => string } {
  return { next: () => `id-${++idCounter}` };
}

function createDeps(): MobEngineDeps {
  return {
    clock: stubClock(),
    ids: stubIds(),
    log: { info: () => {}, warn: () => {}, error: () => {} },
    events: { emit: () => {} },
    store: {
      saveMobileProfile: async () => {},
      getMobileProfile: async () => undefined,
      saveUiConfig: async () => {},
      getUiConfig: async () => undefined,
      saveCloudSession: async () => {},
      getCloudSession: async () => undefined,
      saveOfflineState: async () => {},
      getOfflineState: async () => undefined,
      saveMatchmakingEntry: async () => {},
    },
  };
}

function makeProfile(overrides?: Partial<MobileDeviceProfile>): MobileDeviceProfile {
  const clock = stubClock();
  return profileMobileDevice(
    overrides?.deviceId ?? 'dev-1',
    overrides?.platform ?? 'ios',
    overrides?.osVersion ?? '17.0',
    overrides?.ramGb ?? 6,
    overrides?.screenWidthPx ?? 2556,
    overrides?.screenHeightPx ?? 1179,
    overrides?.screenDpi ?? 460,
    overrides?.batteryLevel ?? 0.8,
    overrides?.thermalState ?? 'nominal',
    clock,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('Mobile Client System', () => {
  describe('Device Profiling', () => {
    it('high RAM gets high GPU tier', () => {
      const profile = makeProfile({ ramGb: 8 });
      expect(profile.gpuTier).toBe('high');
    });

    it('medium RAM gets medium GPU tier', () => {
      const profile = makeProfile({ ramGb: 4 });
      expect(profile.gpuTier).toBe('medium');
    });

    it('low RAM gets low GPU tier', () => {
      const profile = makeProfile({ ramGb: 2 });
      expect(profile.gpuTier).toBe('low');
    });

    it('critical thermal blocks native rendering', () => {
      const profile = makeProfile({ ramGb: 8, thermalState: 'critical' });
      expect(profile.supportsNativeRendering).toBe(false);
    });

    it('low GPU blocks native rendering', () => {
      const profile = makeProfile({ ramGb: 2 });
      expect(profile.supportsNativeRendering).toBe(false);
    });

    it('high GPU + nominal thermal supports native', () => {
      const profile = makeProfile({ ramGb: 6, thermalState: 'nominal' });
      expect(profile.supportsNativeRendering).toBe(true);
    });
  });

  describe('Mobile UI Config', () => {
    it('touch targets are at least 48px', () => {
      const clock = stubClock();
      const config = computeMobileUiConfig('dev-1', 320, 1080, 1.0, clock);
      expect(config.touchTargetMinPx).toBeGreaterThanOrEqual(48);
    });

    it('high DPI screen gets larger base font', () => {
      const clock = stubClock();
      const config = computeMobileUiConfig('dev-1', 460, 2556, 1.0, clock);
      expect(config.fontSize).toBeGreaterThanOrEqual(18);
    });

    it('narrow screen enables simplified menus', () => {
      const clock = stubClock();
      const config = computeMobileUiConfig('dev-1', 320, 720, 1.0, clock);
      expect(config.simplifiedMenus).toBe(true);
    });

    it('wide screen disables simplified menus', () => {
      const clock = stubClock();
      const config = computeMobileUiConfig('dev-1', 320, 2556, 1.0, clock);
      expect(config.simplifiedMenus).toBe(false);
    });

    it('user scale preference is clamped', () => {
      const clock = stubClock();
      const config = computeMobileUiConfig('dev-1', 320, 1080, 5.0, clock);
      expect(config.uiScale).toBeLessThanOrEqual(2.0);
    });
  });

  describe('Cloud Gaming Fallback', () => {
    it('high bandwidth gets 1440p', () => {
      const profile = makeProfile({ ramGb: 2 });
      const ids = stubIds();
      const clock = stubClock();
      const session = createCloudGamingSession('p-1', 'pixel-streaming', profile, 25, ids, clock);
      expect(session.resolutionP).toBe(1440);
    });

    it('medium bandwidth gets 1080p', () => {
      const profile = makeProfile({ ramGb: 2 });
      const ids = stubIds();
      const clock = stubClock();
      const session = createCloudGamingSession('p-1', 'pixel-streaming', profile, 15, ids, clock);
      expect(session.resolutionP).toBe(1080);
    });

    it('low bandwidth gets 720p', () => {
      const profile = makeProfile({ ramGb: 2 });
      const ids = stubIds();
      const clock = stubClock();
      const session = createCloudGamingSession('p-1', 'pixel-streaming', profile, 5, ids, clock);
      expect(session.resolutionP).toBe(720);
    });

    it('low-spec device fallback reason mentions gpu', () => {
      const profile = makeProfile({ ramGb: 2 });
      const ids = stubIds();
      const clock = stubClock();
      const session = createCloudGamingSession('p-1', 'pixel-streaming', profile, 15, ids, clock);
      expect(session.fallbackReason).toContain('device-below-spec');
    });

    it('high-spec device fallback is user-requested', () => {
      const profile = makeProfile({ ramGb: 8 });
      const ids = stubIds();
      const clock = stubClock();
      const session = createCloudGamingSession('p-1', 'pixel-streaming', profile, 15, ids, clock);
      expect(session.fallbackReason).toBe('user-requested');
    });

    it('pixel streaming has lower latency', () => {
      const profile = makeProfile();
      const ids = stubIds();
      const clock = stubClock();
      const ps = createCloudGamingSession('p-1', 'pixel-streaming', profile, 15, ids, clock);
      const gn = createCloudGamingSession('p-1', 'geforce-now', profile, 15, ids, clock);
      expect(ps.latencyMs).toBeLessThan(gn.latencyMs);
    });
  });

  describe('Offline Mode', () => {
    it('creates offline packet with synced status', () => {
      const clock = stubClock();
      const packet = createOfflineStatePacket('player-1', ['estate-management', 'inventory'], null, ['sword', 'shield'], clock);
      expect(packet.syncStatus).toBe('synced');
      expect(packet.features.length).toBe(2);
      expect(packet.pendingActions.length).toBe(0);
    });

    it('adding action sets status to pending', () => {
      const clock = stubClock();
      const ids = stubIds();
      const packet = createOfflineStatePacket('player-1', ['inventory'], null, [], clock);
      const updated = addOfflineAction(packet, 'inventory', 'add-item', { itemId: 'potion' }, ids, clock);
      expect(updated.syncStatus).toBe('pending');
      expect(updated.pendingActions.length).toBe(1);
    });

    it('sync clears pending actions', () => {
      const clock = stubClock();
      const ids = stubIds();
      let packet = createOfflineStatePacket('player-1', ['inventory'], null, [], clock);
      packet = addOfflineAction(packet, 'inventory', 'add-item', { itemId: 'potion' }, ids, clock);
      const synced = syncOfflineState(packet, clock);
      expect(synced.syncStatus).toBe('synced');
      expect(synced.pendingActions.length).toBe(0);
    });

    it('sort by sync priority orders estate first', () => {
      const ids = stubIds();
      const clock = stubClock();
      let packet = createOfflineStatePacket('p-1', OFFLINE_FEATURES.slice(), null, [], clock);
      packet = addOfflineAction(packet, 'chat-history', 'send', { text: 'hi' }, ids, clock);
      packet = addOfflineAction(packet, 'estate-management', 'upgrade', { level: 2 }, ids, clock);
      packet = addOfflineAction(packet, 'inventory', 'add-item', { itemId: 'a' }, ids, clock);
      const sorted = sortActionsBySyncPriority(packet.pendingActions);
      expect(sorted[0].feature).toBe('estate-management');
      expect(sorted[1].feature).toBe('inventory');
    });
  });

  describe('Cross-Platform Matchmaking', () => {
    it('same input methods are compatible', () => {
      const ids = stubIds();
      const clock = stubClock();
      const a = createCrossPlatformMatch('p-1', 'ios', 'touch', 1500, ids, clock);
      const b = createCrossPlatformMatch('p-2', 'android', 'touch', 1450, ids, clock);
      expect(areInputCompatible(a, b)).toBe(true);
    });

    it('different input methods are incompatible', () => {
      const ids = stubIds();
      const clock = stubClock();
      const a = createCrossPlatformMatch('p-1', 'pc', 'keyboard-mouse', 1500, ids, clock);
      const b = createCrossPlatformMatch('p-2', 'ios', 'touch', 1500, ids, clock);
      expect(areInputCompatible(a, b)).toBe(false);
    });

    it('skill rating within range is compatible', () => {
      const ids = stubIds();
      const clock = stubClock();
      const a = createCrossPlatformMatch('p-1', 'pc', 'keyboard-mouse', 1500, ids, clock);
      const b = createCrossPlatformMatch('p-2', 'pc', 'keyboard-mouse', 1600, ids, clock);
      expect(isSkillRatingCompatible(a, b, 200)).toBe(true);
    });

    it('skill rating outside range is incompatible', () => {
      const ids = stubIds();
      const clock = stubClock();
      const a = createCrossPlatformMatch('p-1', 'pc', 'keyboard-mouse', 1000, ids, clock);
      const b = createCrossPlatformMatch('p-2', 'pc', 'keyboard-mouse', 1600, ids, clock);
      expect(isSkillRatingCompatible(a, b, 200)).toBe(false);
    });
  });

  describe('Mobile Client Engine', () => {
    it('profileDevice returns valid profile', async () => {
      const deps = createDeps();
      const engine = createMobileClientEngine(deps);
      const profile = await engine.profileDevice('dev-1', 'ios', '17.0', 6, 2556, 1179, 460, 0.8, 'nominal');
      expect(profile.gpuTier).toBe('high');
      expect(profile.supportsNativeRendering).toBe(true);
    });

    it('configureUi returns valid config', async () => {
      const deps = createDeps();
      const engine = createMobileClientEngine(deps);
      const config = await engine.configureUi('dev-1', 460, 2556, 1.0);
      expect(config.touchTargetMinPx).toBeGreaterThanOrEqual(48);
    });

    it('startCloudSession returns active session', async () => {
      const deps = createDeps();
      const engine = createMobileClientEngine(deps);
      const profile = makeProfile();
      const session = await engine.startCloudSession('p-1', 'pixel-streaming', profile, 15);
      expect(session.active).toBe(true);
      expect(session.provider).toBe('pixel-streaming');
    });

    it('offline workflow: go offline → add action → sync', async () => {
      const deps = createDeps();
      const engine = createMobileClientEngine(deps);
      const offline = await engine.goOffline('player-1', ['inventory'], null, ['sword']);
      expect(offline.syncStatus).toBe('synced');

      const updated = await engine.addOfflineAction('player-1', 'inventory', 'drop', { itemId: 'sword' });
      expect(updated?.syncStatus).toBe('pending');

      const synced = await engine.syncOnline('player-1');
      expect(synced?.syncStatus).toBe('synced');
      expect(synced?.pendingActions.length).toBe(0);
    });

    it('addOfflineAction returns undefined for unknown player', async () => {
      const deps = createDeps();
      const engine = createMobileClientEngine(deps);
      const result = await engine.addOfflineAction('unknown', 'inventory', 'add', {});
      expect(result).toBeUndefined();
    });

    it('matchPlayer creates valid match entry', async () => {
      const deps = createDeps();
      const engine = createMobileClientEngine(deps);
      const match = await engine.matchPlayer('p-1', 'ios', 'touch', 1500);
      expect(match.platform).toBe('ios');
      expect(match.inputMethod).toBe('touch');
      expect(match.inputPool).toBe('touch');
    });
  });
});
