/**
 * Mobile Client System — iOS/Android orchestration, mobile UI,
 * cloud gaming fallback, offline mode, and cross-platform matchmaking.
 *
 * The Loom drives mobile sessions. UE5 cross-compiles (or Pixel Streams)
 * on the rendering side; this module manages mobile-specific lifecycle,
 * input mapping, offline state sync, and platform-aware matchmaking.
 *
 *   - Native mobile client config: iOS + Android build targets
 *   - Mobile-specific UI: larger touch targets, simplified menus
 *   - Cloud gaming fallback: Pixel Streaming for low-spec devices
 *   - Offline mode: local state with sync-on-reconnect
 *   - Cross-platform play: input-aware matchmaking
 *
 * "Every player, every device."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface MobClockPort {
  readonly now: () => bigint;
}

export interface MobIdPort {
  readonly next: () => string;
}

export interface MobLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface MobEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface MobStorePort {
  readonly saveMobileProfile: (profile: MobileDeviceProfile) => Promise<void>;
  readonly getMobileProfile: (deviceId: string) => Promise<MobileDeviceProfile | undefined>;
  readonly saveUiConfig: (config: MobileUiConfig) => Promise<void>;
  readonly getUiConfig: (deviceId: string) => Promise<MobileUiConfig | undefined>;
  readonly saveCloudSession: (session: CloudGamingSession) => Promise<void>;
  readonly getCloudSession: (sessionId: string) => Promise<CloudGamingSession | undefined>;
  readonly saveOfflineState: (state: OfflineStatePacket) => Promise<void>;
  readonly getOfflineState: (playerId: string) => Promise<OfflineStatePacket | undefined>;
  readonly saveMatchmakingEntry: (entry: CrossPlatformMatch) => Promise<void>;
}

// ─── Constants ──────────────────────────────────────────────────────

export const MOBILE_PLATFORMS = ['ios', 'android'] as const;
export type MobilePlatform = (typeof MOBILE_PLATFORMS)[number];

export const INPUT_METHODS = ['touch', 'gamepad', 'keyboard-mouse'] as const;
export type InputMethod = (typeof INPUT_METHODS)[number];

export const CLOUD_PROVIDERS = ['pixel-streaming', 'geforce-now', 'xbox-cloud'] as const;
export type CloudProvider = (typeof CLOUD_PROVIDERS)[number];

export const OFFLINE_FEATURES = [
  'estate-management', 'inventory', 'chat-history', 'quest-log', 'character-sheet',
] as const;
export type OfflineFeature = (typeof OFFLINE_FEATURES)[number];

const MIN_TOUCH_TARGET_PX = 48;
const DEFAULT_UI_SCALE = 1.2;

const CLOUD_QUALITY_TIERS: Readonly<Record<string, number>> = {
  low: 720,
  medium: 1080,
  high: 1440,
};

const OFFLINE_SYNC_PRIORITIES: Readonly<Record<OfflineFeature, number>> = {
  'estate-management': 1,
  'inventory': 2,
  'chat-history': 4,
  'quest-log': 3,
  'character-sheet': 5,
};

// ─── Types ──────────────────────────────────────────────────────────

export interface MobileDeviceProfile {
  readonly deviceId: string;
  readonly platform: MobilePlatform;
  readonly osVersion: string;
  readonly ramGb: number;
  readonly gpuTier: 'low' | 'medium' | 'high';
  readonly screenWidthPx: number;
  readonly screenHeightPx: number;
  readonly screenDpi: number;
  readonly batteryLevel: number;
  readonly thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
  readonly supportsNativeRendering: boolean;
  readonly estimatedAtMs: number;
}

export interface MobileUiConfig {
  readonly deviceId: string;
  readonly touchTargetMinPx: number;
  readonly uiScale: number;
  readonly simplifiedMenus: boolean;
  readonly fontSize: number;
  readonly buttonSpacing: number;
  readonly gestureEnabled: boolean;
  readonly hapticEnabled: boolean;
  readonly portraitSupported: boolean;
  readonly updatedAtMs: number;
}

export interface CloudGamingSession {
  readonly sessionId: string;
  readonly playerId: string;
  readonly provider: CloudProvider;
  readonly resolutionP: number;
  readonly bitrateKbps: number;
  readonly latencyMs: number;
  readonly active: boolean;
  readonly fallbackReason: string;
  readonly startedAtMs: number;
}

export interface OfflineStatePacket {
  readonly playerId: string;
  readonly features: readonly OfflineFeature[];
  readonly estateSnapshot: Record<string, unknown> | null;
  readonly inventorySnapshot: readonly string[];
  readonly pendingActions: readonly OfflineAction[];
  readonly lastSyncedAtMs: number;
  readonly offlineSinceMs: number;
  readonly syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict';
}

export interface OfflineAction {
  readonly actionId: string;
  readonly feature: OfflineFeature;
  readonly actionType: string;
  readonly payload: Record<string, unknown>;
  readonly createdAtMs: number;
}

export interface CrossPlatformMatch {
  readonly matchId: string;
  readonly playerId: string;
  readonly platform: MobilePlatform | 'pc' | 'console';
  readonly inputMethod: InputMethod;
  readonly skillRating: number;
  readonly inputPool: InputMethod;
  readonly matchedAtMs: number;
}

// ─── Helpers ────────────────────────────────────────────────────────

function makeEvent(type: string, payload: unknown, ids: MobIdPort, clock: MobClockPort): LoomEvent {
  return {
    eventId: ids.next(),
    type,
    payload,
    timestamp: Number(clock.now()),
    correlationId: ids.next(),
    causationId: ids.next(),
    sequenceNumber: 0,
    sourceWorldId: '',
    sourceFabricId: 'mobile-client',
    schemaVersion: 1,
    metadata: {},
  } as LoomEvent;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Device Profiling ───────────────────────────────────────────────

export function profileMobileDevice(
  deviceId: string,
  platform: MobilePlatform,
  osVersion: string,
  ramGb: number,
  screenWidthPx: number,
  screenHeightPx: number,
  screenDpi: number,
  batteryLevel: number,
  thermalState: MobileDeviceProfile['thermalState'],
  clock: MobClockPort,
): MobileDeviceProfile {
  const gpuTier: MobileDeviceProfile['gpuTier'] =
    ramGb >= 6 ? 'high' : ramGb >= 4 ? 'medium' : 'low';

  const supportsNativeRendering = gpuTier !== 'low' && thermalState !== 'critical';

  return {
    deviceId,
    platform,
    osVersion,
    ramGb,
    gpuTier,
    screenWidthPx,
    screenHeightPx,
    screenDpi,
    batteryLevel,
    thermalState,
    supportsNativeRendering,
    estimatedAtMs: Number(clock.now()),
  };
}

// ─── Mobile UI ──────────────────────────────────────────────────────

export function computeMobileUiConfig(
  deviceId: string,
  screenDpi: number,
  screenWidthPx: number,
  userScalePreference: number,
  clock: MobClockPort,
): MobileUiConfig {
  const baseFontSize = screenDpi > 400 ? 18 : screenDpi > 300 ? 16 : 14;
  const uiScale = clamp(userScalePreference * DEFAULT_UI_SCALE, 0.5, 2.0);
  const fontSize = Math.round(baseFontSize * uiScale);
  const touchTarget = Math.max(MIN_TOUCH_TARGET_PX, Math.round(MIN_TOUCH_TARGET_PX * uiScale));
  const buttonSpacing = Math.round(touchTarget * 0.25);
  const simplifiedMenus = screenWidthPx < 1080;

  return {
    deviceId,
    touchTargetMinPx: touchTarget,
    uiScale,
    simplifiedMenus,
    fontSize,
    buttonSpacing,
    gestureEnabled: true,
    hapticEnabled: true,
    portraitSupported: screenWidthPx < 1200,
    updatedAtMs: Number(clock.now()),
  };
}

// ─── Cloud Gaming Fallback ──────────────────────────────────────────

export function createCloudGamingSession(
  playerId: string,
  provider: CloudProvider,
  deviceProfile: MobileDeviceProfile,
  bandwidthMbps: number,
  ids: MobIdPort,
  clock: MobClockPort,
): CloudGamingSession {
  const resolution = bandwidthMbps >= 20 ? 'high' : bandwidthMbps >= 10 ? 'medium' : 'low';
  const resolutionP = CLOUD_QUALITY_TIERS[resolution];
  const bitrateKbps = Math.round(bandwidthMbps * 800);
  const estimatedLatency = provider === 'pixel-streaming' ? 20 : 40;
  const fallbackReason = deviceProfile.supportsNativeRendering
    ? 'user-requested'
    : `device-below-spec: gpu=${deviceProfile.gpuTier}, thermal=${deviceProfile.thermalState}`;

  return {
    sessionId: ids.next(),
    playerId,
    provider,
    resolutionP,
    bitrateKbps,
    latencyMs: estimatedLatency,
    active: true,
    fallbackReason,
    startedAtMs: Number(clock.now()),
  };
}

// ─── Offline Mode ───────────────────────────────────────────────────

export function createOfflineStatePacket(
  playerId: string,
  availableFeatures: readonly OfflineFeature[],
  estateSnapshot: Record<string, unknown> | null,
  inventorySnapshot: readonly string[],
  clock: MobClockPort,
): OfflineStatePacket {
  return {
    playerId,
    features: availableFeatures,
    estateSnapshot,
    inventorySnapshot,
    pendingActions: [],
    lastSyncedAtMs: Number(clock.now()),
    offlineSinceMs: Number(clock.now()),
    syncStatus: 'synced',
  };
}

export function addOfflineAction(
  packet: OfflineStatePacket,
  feature: OfflineFeature,
  actionType: string,
  payload: Record<string, unknown>,
  ids: MobIdPort,
  clock: MobClockPort,
): OfflineStatePacket {
  const action: OfflineAction = {
    actionId: ids.next(),
    feature,
    actionType,
    payload,
    createdAtMs: Number(clock.now()),
  };
  return {
    ...packet,
    pendingActions: [...packet.pendingActions, action],
    syncStatus: 'pending',
  };
}

export function syncOfflineState(
  packet: OfflineStatePacket,
  clock: MobClockPort,
): OfflineStatePacket {
  return {
    ...packet,
    pendingActions: [],
    lastSyncedAtMs: Number(clock.now()),
    syncStatus: 'synced',
  };
}

export function sortActionsBySyncPriority(
  actions: readonly OfflineAction[],
): readonly OfflineAction[] {
  return [...actions].sort((a, b) => {
    const pa = OFFLINE_SYNC_PRIORITIES[a.feature] ?? 10;
    const pb = OFFLINE_SYNC_PRIORITIES[b.feature] ?? 10;
    return pa - pb;
  });
}

// ─── Cross-Platform Matchmaking ─────────────────────────────────────

export function computeInputPool(inputMethod: InputMethod): InputMethod {
  return inputMethod;
}

export function createCrossPlatformMatch(
  playerId: string,
  platform: CrossPlatformMatch['platform'],
  inputMethod: InputMethod,
  skillRating: number,
  ids: MobIdPort,
  clock: MobClockPort,
): CrossPlatformMatch {
  return {
    matchId: ids.next(),
    playerId,
    platform,
    inputMethod,
    skillRating,
    inputPool: computeInputPool(inputMethod),
    matchedAtMs: Number(clock.now()),
  };
}

export function areInputCompatible(
  playerA: CrossPlatformMatch,
  playerB: CrossPlatformMatch,
): boolean {
  return playerA.inputPool === playerB.inputPool;
}

export function isSkillRatingCompatible(
  playerA: CrossPlatformMatch,
  playerB: CrossPlatformMatch,
  maxDifference: number,
): boolean {
  return Math.abs(playerA.skillRating - playerB.skillRating) <= maxDifference;
}

// ─── Mobile Client Engine ───────────────────────────────────────────

export interface MobileClientEngine {
  readonly profileDevice: (deviceId: string, platform: MobilePlatform, osVersion: string, ramGb: number, screenWidthPx: number, screenHeightPx: number, screenDpi: number, batteryLevel: number, thermalState: MobileDeviceProfile['thermalState']) => Promise<MobileDeviceProfile>;
  readonly configureUi: (deviceId: string, screenDpi: number, screenWidthPx: number, userScalePreference: number) => Promise<MobileUiConfig>;
  readonly startCloudSession: (playerId: string, provider: CloudProvider, deviceProfile: MobileDeviceProfile, bandwidthMbps: number) => Promise<CloudGamingSession>;
  readonly goOffline: (playerId: string, features: readonly OfflineFeature[], estateSnapshot: Record<string, unknown> | null, inventorySnapshot: readonly string[]) => Promise<OfflineStatePacket>;
  readonly addOfflineAction: (playerId: string, feature: OfflineFeature, actionType: string, payload: Record<string, unknown>) => Promise<OfflineStatePacket | undefined>;
  readonly syncOnline: (playerId: string) => Promise<OfflineStatePacket | undefined>;
  readonly matchPlayer: (playerId: string, platform: CrossPlatformMatch['platform'], inputMethod: InputMethod, skillRating: number) => Promise<CrossPlatformMatch>;
}

export interface MobEngineDeps {
  readonly clock: MobClockPort;
  readonly ids: MobIdPort;
  readonly log: MobLogPort;
  readonly events: MobEventPort;
  readonly store: MobStorePort;
}

export function createMobileClientEngine(deps: MobEngineDeps): MobileClientEngine {
  const offlineStates = new Map<string, OfflineStatePacket>();

  return {
    async profileDevice(deviceId, platform, osVersion, ramGb, screenWidthPx, screenHeightPx, screenDpi, batteryLevel, thermalState) {
      const profile = profileMobileDevice(deviceId, platform, osVersion, ramGb, screenWidthPx, screenHeightPx, screenDpi, batteryLevel, thermalState, deps.clock);
      await deps.store.saveMobileProfile(profile);
      deps.events.emit(makeEvent('mobile.device.profiled', profile, deps.ids, deps.clock));
      deps.log.info('Mobile device profiled', { deviceId, gpuTier: profile.gpuTier });
      return profile;
    },

    async configureUi(deviceId, screenDpi, screenWidthPx, userScalePreference) {
      const config = computeMobileUiConfig(deviceId, screenDpi, screenWidthPx, userScalePreference, deps.clock);
      await deps.store.saveUiConfig(config);
      deps.events.emit(makeEvent('mobile.ui.configured', config, deps.ids, deps.clock));
      return config;
    },

    async startCloudSession(playerId, provider, deviceProfile, bandwidthMbps) {
      const session = createCloudGamingSession(playerId, provider, deviceProfile, bandwidthMbps, deps.ids, deps.clock);
      await deps.store.saveCloudSession(session);
      deps.events.emit(makeEvent('mobile.cloud.session.started', session, deps.ids, deps.clock));
      deps.log.info('Cloud gaming session started', { sessionId: session.sessionId, provider, resolutionP: session.resolutionP });
      return session;
    },

    async goOffline(playerId, features, estateSnapshot, inventorySnapshot) {
      const packet = createOfflineStatePacket(playerId, features, estateSnapshot, inventorySnapshot, deps.clock);
      offlineStates.set(playerId, packet);
      await deps.store.saveOfflineState(packet);
      deps.events.emit(makeEvent('mobile.offline.entered', { playerId, features }, deps.ids, deps.clock));
      deps.log.info('Player went offline', { playerId, featureCount: features.length });
      return packet;
    },

    async addOfflineAction(playerId, feature, actionType, payload) {
      const current = offlineStates.get(playerId);
      if (!current) {
        deps.log.warn('No offline state found', { playerId });
        return undefined;
      }
      const updated = addOfflineAction(current, feature, actionType, payload, deps.ids, deps.clock);
      offlineStates.set(playerId, updated);
      await deps.store.saveOfflineState(updated);
      return updated;
    },

    async syncOnline(playerId) {
      const current = offlineStates.get(playerId);
      if (!current) {
        deps.log.warn('No offline state to sync', { playerId });
        return undefined;
      }
      const synced = syncOfflineState(current, deps.clock);
      offlineStates.set(playerId, synced);
      await deps.store.saveOfflineState(synced);
      deps.events.emit(makeEvent('mobile.offline.synced', { playerId, actionsSynced: current.pendingActions.length }, deps.ids, deps.clock));
      deps.log.info('Offline state synced', { playerId, actionsSynced: current.pendingActions.length });
      return synced;
    },

    async matchPlayer(playerId, platform, inputMethod, skillRating) {
      const match = createCrossPlatformMatch(playerId, platform, inputMethod, skillRating, deps.ids, deps.clock);
      await deps.store.saveMatchmakingEntry(match);
      deps.events.emit(makeEvent('mobile.matchmaking.created', match, deps.ids, deps.clock));
      return match;
    },
  };
}
