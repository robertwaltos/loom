import { describe, it, expect } from 'vitest';
import {
  profileMobileDevice,
  computeMobileUiConfig,
  createCloudGamingSession,
  createOfflineStatePacket,
  addOfflineAction,
  syncOfflineState,
  sortActionsBySyncPriority,
  computeInputPool,
  createCrossPlatformMatch,
  areInputCompatible,
  isSkillRatingCompatible,
  MOBILE_PLATFORMS,
  INPUT_METHODS,
  CLOUD_PROVIDERS,
  OFFLINE_FEATURES,
} from '../mobile-client-system.js';

describe('mobile-client-system simulation', () => {
  const mockClock = { now: () => BigInt(1_000_000) };
  let idCounter = 0;
  const mockIds = { next: () => `id-${++idCounter}` };

  // ── constants ─────────────────────────────────────────────────────

  it('MOBILE_PLATFORMS is a non-empty array', () => {
    expect(Array.isArray(MOBILE_PLATFORMS)).toBe(true);
    expect(MOBILE_PLATFORMS.length).toBeGreaterThan(0);
  });

  it('INPUT_METHODS is a non-empty array', () => {
    expect(Array.isArray(INPUT_METHODS)).toBe(true);
    expect(INPUT_METHODS.length).toBeGreaterThan(0);
  });

  it('CLOUD_PROVIDERS is a non-empty array', () => {
    expect(Array.isArray(CLOUD_PROVIDERS)).toBe(true);
    expect(CLOUD_PROVIDERS.length).toBeGreaterThan(0);
  });

  it('OFFLINE_FEATURES is a non-empty array', () => {
    expect(Array.isArray(OFFLINE_FEATURES)).toBe(true);
    expect(OFFLINE_FEATURES.length).toBeGreaterThan(0);
  });

  // ── profileMobileDevice ───────────────────────────────────────────

  describe('profileMobileDevice', () => {
    it('returns a profile with a deviceId field', () => {
      const profile = profileMobileDevice('device-1', 'ios', '15.0', 4, 1080, 1920, 326, 0.8, 'normal', mockClock);
      expect(profile).toHaveProperty('deviceId');
      expect(profile.deviceId).toBe('device-1');
    });

    it('returns a profile with a platform field', () => {
      const profile = profileMobileDevice('device-2', 'android', '12.0', 8, 1440, 3200, 480, 0.9, 'normal', mockClock);
      expect(profile.platform).toBe('android');
    });
  });

  // ── computeMobileUiConfig ─────────────────────────────────────────

  describe('computeMobileUiConfig', () => {
    it('returns config with a scale field', () => {
      const cfg = computeMobileUiConfig('device-1', 320, 1080, 1.0, mockClock);
      expect(cfg).toHaveProperty('uiScale');
    });

    it('includes deviceId in the config', () => {
      const cfg = computeMobileUiConfig('device-99', 480, 1920, 2.0, mockClock);
      expect(cfg.deviceId).toBe('device-99');
    });
  });

  // ── createCloudGamingSession ──────────────────────────────────────

  describe('createCloudGamingSession', () => {
    it('returns a session with sessionId and provider', () => {
      const deviceProfile = profileMobileDevice('device-1', 'ios', '15.0', 4, 1080, 1920, 326, 0.8, 'normal', mockClock);
      const session = createCloudGamingSession('player-1', 'geforce-now', deviceProfile, 20, mockIds, mockClock);
      expect(session).toHaveProperty('sessionId');
      expect(session.provider).toBe('geforce-now');
    });
  });

  // ── createOfflineStatePacket / addOfflineAction / syncOfflineState ─

  describe('offline state', () => {
    it('createOfflineStatePacket returns a packet', () => {
      const packet = createOfflineStatePacket('player-1', ['inventory'], null, [], mockClock);
      expect(packet).toHaveProperty('playerId');
      expect(packet.playerId).toBe('player-1');
      expect(Array.isArray(packet.pendingActions)).toBe(true);
    });

    it('addOfflineAction appends an action to the packet', () => {
      const packet = createOfflineStatePacket('player-1', ['inventory'], null, [], mockClock);
      const updated = addOfflineAction(packet, 'inventory', 'buy-item', {}, mockIds, mockClock);
      expect(updated.pendingActions.length).toBe(1);
    });

    it('syncOfflineState clears pending actions and sets syncStatus to synced', () => {
      const packet = createOfflineStatePacket('player-1', ['inventory'], null, [], mockClock);
      const withAction = addOfflineAction(packet, 'inventory', 'buy-item', {}, mockIds, mockClock);
      const result = syncOfflineState(withAction, mockClock);
      expect(result.syncStatus).toBe('synced');
      expect(result.pendingActions.length).toBe(0);
    });
  });

  // ── sortActionsBySyncPriority ─────────────────────────────────────

  describe('sortActionsBySyncPriority', () => {
    it('sorts estate-management before inventory', () => {
      const actions = [
        { feature: 'inventory', actionId: '1', actionType: 'test', payload: {}, createdAtMs: 0 },
        { feature: 'estate-management', actionId: '2', actionType: 'test', payload: {}, createdAtMs: 0 },
      ];
      const sorted = sortActionsBySyncPriority(actions as any);
      expect(sorted[0].feature).toBe('estate-management');
      expect(sorted[1].feature).toBe('inventory');
    });

    it('sorts chat-history after quest-log', () => {
      const actions = [
        { feature: 'chat-history', actionId: '1', actionType: 'test', payload: {}, createdAtMs: 0 },
        { feature: 'quest-log', actionId: '2', actionType: 'test', payload: {}, createdAtMs: 0 },
      ];
      const sorted = sortActionsBySyncPriority(actions as any);
      expect(sorted[0].feature).toBe('quest-log');
      expect(sorted[1].feature).toBe('chat-history');
    });

    it('correctly sorts all 5 priority types', () => {
      const actions = [
        { feature: 'character-sheet', actionId: '1', actionType: 'test', payload: {}, createdAtMs: 0 },
        { feature: 'chat-history', actionId: '2', actionType: 'test', payload: {}, createdAtMs: 0 },
        { feature: 'quest-log', actionId: '3', actionType: 'test', payload: {}, createdAtMs: 0 },
        { feature: 'inventory', actionId: '4', actionType: 'test', payload: {}, createdAtMs: 0 },
        { feature: 'estate-management', actionId: '5', actionType: 'test', payload: {}, createdAtMs: 0 },
      ];
      const sorted = sortActionsBySyncPriority(actions as any);
      const features = sorted.map((a: any) => a.feature);
      expect(features).toEqual([
        'estate-management',
        'inventory',
        'quest-log',
        'chat-history',
        'character-sheet',
      ]);
    });
  });

  // ── computeInputPool ──────────────────────────────────────────────

  describe('computeInputPool', () => {
    it('returns a pool identifier for a given input method', () => {
      const pool = computeInputPool('touch');
      expect(typeof pool).toBe('string');
    });
  });

  // ── createCrossPlatformMatch ──────────────────────────────────────

  describe('createCrossPlatformMatch', () => {
    it('returns a match object with a matchId', () => {
      const match = createCrossPlatformMatch('p1', 'ios', 'touch', 1200, mockIds, mockClock);
      expect(match).toHaveProperty('matchId');
      expect(match.playerId).toBe('p1');
    });
  });

  // ── areInputCompatible ────────────────────────────────────────────

  describe('areInputCompatible', () => {
    it('returns true when both players share the same inputPool', () => {
      const a = createCrossPlatformMatch('p1', 'ios', 'touch', 1200, mockIds, mockClock);
      const b = createCrossPlatformMatch('p2', 'ios', 'touch', 1200, mockIds, mockClock);
      expect(areInputCompatible(a, b)).toBe(true);
    });

    it('returns false when players have different inputPools', () => {
      const a = createCrossPlatformMatch('p1', 'ios', 'touch', 1200, mockIds, mockClock);
      const b = createCrossPlatformMatch('p2', 'pc', 'keyboard-mouse', 1200, mockIds, mockClock);
      expect(areInputCompatible(a, b)).toBe(false);
    });
  });

  // ── isSkillRatingCompatible ───────────────────────────────────────

  describe('isSkillRatingCompatible', () => {
    it('returns true when ratings are within maxDiff', () => {
      const a = createCrossPlatformMatch('p1', 'ios', 'touch', 1200, mockIds, mockClock);
      const b = createCrossPlatformMatch('p2', 'ios', 'touch', 1250, mockIds, mockClock);
      expect(isSkillRatingCompatible(a, b, 100)).toBe(true);
    });

    it('returns true when ratings are exactly maxDiff apart', () => {
      const a = createCrossPlatformMatch('p1', 'ios', 'touch', 1000, mockIds, mockClock);
      const b = createCrossPlatformMatch('p2', 'ios', 'touch', 1100, mockIds, mockClock);
      expect(isSkillRatingCompatible(a, b, 100)).toBe(true);
    });

    it('returns false when ratings exceed maxDiff', () => {
      const a = createCrossPlatformMatch('p1', 'ios', 'touch', 1000, mockIds, mockClock);
      const b = createCrossPlatformMatch('p2', 'ios', 'touch', 1200, mockIds, mockClock);
      expect(isSkillRatingCompatible(a, b, 100)).toBe(false);
    });
  });
});
