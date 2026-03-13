/**
 * MetaHuman System — preset library, dynamic creation, body animation,
 * GPU performance profiling, progressive streaming, and LiveLink integration.
 *
 * The Loom manages MetaHuman identity and animation state;
 * UE5 renders the MetaHuman meshes, grooms, and morph targets.
 *
 *   - 50+ base presets: age, ethnicity, body type, facial structure
 *   - Dynamic creation: runtime parameter blending for unique NPCs
 *   - Body animation: full-body IK, gestures, idle personality loops
 *   - Performance profiling: GPU budget enforcement per quality tier
 *   - Progressive streaming: LOD-aware MetaHuman asset loading
 *   - LiveLink: mocap source registration for cinematics
 *
 * "Every face tells a dynasty's story."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface MhClockPort {
  readonly now: () => bigint;
}

export interface MhIdPort {
  readonly next: () => string;
}

export interface MhLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface MhEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface MhStorePort {
  readonly savePreset: (preset: MetaHumanPreset) => Promise<void>;
  readonly getPreset: (presetId: string) => Promise<MetaHumanPreset | undefined>;
  readonly listPresets: () => Promise<readonly MetaHumanPreset[]>;
  readonly saveInstance: (instance: MetaHumanInstance) => Promise<void>;
  readonly getInstance: (instanceId: string) => Promise<MetaHumanInstance | undefined>;
  readonly saveAnimationState: (state: BodyAnimationState) => Promise<void>;
  readonly getAnimationState: (entityId: string) => Promise<BodyAnimationState | undefined>;
  readonly savePerformanceSnapshot: (snap: GpuPerformanceSnapshot) => Promise<void>;
  readonly saveStreamingState: (state: StreamingState) => Promise<void>;
  readonly getStreamingState: (entityId: string) => Promise<StreamingState | undefined>;
  readonly saveLiveLinkSource: (source: LiveLinkSource) => Promise<void>;
  readonly getLiveLinkSource: (sourceId: string) => Promise<LiveLinkSource | undefined>;
  readonly listLiveLinkSources: () => Promise<readonly LiveLinkSource[]>;
}

// ─── Constants ──────────────────────────────────────────────────────

export const AGE_RANGES = ['child', 'teen', 'young-adult', 'adult', 'middle-aged', 'elder'] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

export const BODY_TYPES = ['slim', 'average', 'athletic', 'heavy', 'petite', 'tall'] as const;
export type BodyType = (typeof BODY_TYPES)[number];

export const ETHNICITY_BASES = [
  'european', 'african', 'east-asian', 'south-asian', 'middle-eastern',
  'indigenous-american', 'pacific-islander', 'mixed',
] as const;
export type EthnicityBase = (typeof ETHNICITY_BASES)[number];

export const PERSONALITY_IDLES = [
  'confident', 'shy', 'aggressive', 'relaxed', 'curious',
  'nervous', 'noble', 'humble', 'mischievous', 'stoic',
] as const;
export type PersonalityIdle = (typeof PERSONALITY_IDLES)[number];

export const GESTURE_TYPES = [
  'wave', 'bow', 'point', 'beckon', 'shrug', 'nod', 'shake-head',
  'salute', 'clap', 'thumbs-up', 'cross-arms', 'hand-on-hip',
] as const;
export type GestureType = (typeof GESTURE_TYPES)[number];

export const STREAMING_LODS = ['full', 'head-only', 'simplified', 'silhouette'] as const;
export type StreamingLod = (typeof STREAMING_LODS)[number];

const GPU_BUDGET_MS: Readonly<Record<string, number>> = {
  low: 4.0,
  medium: 3.0,
  high: 2.0,
  ultra: 1.5,
};

const MAX_METAHUMANS_FULL: Readonly<Record<string, number>> = {
  low: 5,
  medium: 15,
  high: 30,
  ultra: 60,
};

// ─── Types ──────────────────────────────────────────────────────────

export interface FacialStructure {
  readonly jawWidth: number;
  readonly cheekboneHeight: number;
  readonly noseWidth: number;
  readonly noseBridge: number;
  readonly eyeSpacing: number;
  readonly eyeSize: number;
  readonly lipFullness: number;
  readonly foreheadHeight: number;
  readonly chinLength: number;
  readonly earSize: number;
}

export interface BodyProportions {
  readonly height: number;
  readonly shoulderWidth: number;
  readonly hipWidth: number;
  readonly armLength: number;
  readonly legLength: number;
  readonly torsoLength: number;
  readonly muscleDefinition: number;
  readonly bodyFat: number;
}

export interface HairConfig {
  readonly style: string;
  readonly colorHex: string;
  readonly length: number;
  readonly curliness: number;
  readonly density: number;
}

export interface SkinConfig {
  readonly toneHex: string;
  readonly freckles: number;
  readonly wrinkles: number;
  readonly scars: number;
  readonly tattoos: number;
  readonly subsurfaceIntensity: number;
}

export interface MetaHumanPreset {
  readonly presetId: string;
  readonly name: string;
  readonly ageRange: AgeRange;
  readonly ethnicityBase: EthnicityBase;
  readonly bodyType: BodyType;
  readonly gender: 'male' | 'female' | 'non-binary';
  readonly facialStructure: FacialStructure;
  readonly bodyProportions: BodyProportions;
  readonly hair: HairConfig;
  readonly skin: SkinConfig;
  readonly personalityIdle: PersonalityIdle;
  readonly voicePitchHz: number;
}

export interface BlendedParameter {
  readonly parameterName: string;
  readonly sourcePresetA: string;
  readonly sourcePresetB: string;
  readonly blendFactor: number;
}

export interface MetaHumanInstance {
  readonly instanceId: string;
  readonly entityId: string;
  readonly basePresetId: string;
  readonly blendedParameters: readonly BlendedParameter[];
  readonly overrides: Readonly<Record<string, number>>;
  readonly createdAtMs: number;
}

export interface IkTarget {
  readonly boneName: string;
  readonly positionX: number;
  readonly positionY: number;
  readonly positionZ: number;
  readonly weight: number;
}

export interface BodyAnimationState {
  readonly entityId: string;
  readonly personalityIdle: PersonalityIdle;
  readonly activeGesture: GestureType | null;
  readonly gestureProgress: number;
  readonly ikTargets: readonly IkTarget[];
  readonly lookAtX: number;
  readonly lookAtY: number;
  readonly lookAtZ: number;
  readonly blinkRate: number;
  readonly breathingRate: number;
  readonly emotionIntensity: number;
  readonly updatedAtMs: number;
}

export interface GpuPerformanceSnapshot {
  readonly worldId: string;
  readonly qualityTier: string;
  readonly metaHumanCount: number;
  readonly fullLodCount: number;
  readonly simplifiedLodCount: number;
  readonly gpuTimeMs: number;
  readonly budgetMs: number;
  readonly withinBudget: boolean;
  readonly recommendation: string;
  readonly timestampMs: number;
}

export interface StreamingState {
  readonly entityId: string;
  readonly currentLod: StreamingLod;
  readonly distanceToCamera: number;
  readonly assetsLoaded: readonly string[];
  readonly totalAssets: number;
  readonly loadProgress: number;
  readonly priority: number;
  readonly updatedAtMs: number;
}

export interface LiveLinkSource {
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceType: 'mocap-suit' | 'facial-capture' | 'hand-tracking' | 'full-body';
  readonly ipAddress: string;
  readonly port: number;
  readonly active: boolean;
  readonly targetEntityId: string | null;
  readonly frameRate: number;
  readonly latencyMs: number;
  readonly registeredAtMs: number;
}

// ─── Helpers ────────────────────────────────────────────────────────

function makeEvent(
  type: string,
  payload: unknown,
  ids: MhIdPort,
  clock: MhClockPort,
): LoomEvent {
  return {
    type,
    payload,
    metadata: {
      eventId: ids.next(),
      correlationId: ids.next(),
      causationId: null,
      timestamp: Number(clock.now()),
      sequenceNumber: 0,
      sourceWorldId: '',
      sourceFabricId: 'metahuman-system',
      schemaVersion: 1,
    },
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

// ─── Preset Library ─────────────────────────────────────────────────

export function createDefaultPresetLibrary(ids: MhIdPort): readonly MetaHumanPreset[] {
  const presets: MetaHumanPreset[] = [];
  let idx = 0;

  const add = (
    name: string,
    gender: 'male' | 'female' | 'non-binary',
    age: AgeRange,
    eth: EthnicityBase,
    body: BodyType,
    idle: PersonalityIdle,
  ): void => {
    idx++;
    presets.push({
      presetId: `mh-preset-${String(idx).padStart(3, '0')}`,
      name,
      ageRange: age,
      ethnicityBase: eth,
      bodyType: body,
      gender,
      facialStructure: {
        jawWidth: 0.4 + Math.sin(idx) * 0.15,
        cheekboneHeight: 0.5 + Math.cos(idx) * 0.1,
        noseWidth: 0.45 + Math.sin(idx * 2) * 0.1,
        noseBridge: 0.5 + Math.cos(idx * 3) * 0.1,
        eyeSpacing: 0.5 + Math.sin(idx * 4) * 0.05,
        eyeSize: 0.5 + Math.cos(idx * 5) * 0.08,
        lipFullness: 0.5 + Math.sin(idx * 6) * 0.15,
        foreheadHeight: 0.5 + Math.cos(idx * 7) * 0.08,
        chinLength: 0.5 + Math.sin(idx * 8) * 0.1,
        earSize: 0.5 + Math.cos(idx * 9) * 0.05,
      },
      bodyProportions: {
        height: body === 'tall' ? 1.9 : body === 'petite' ? 1.55 : 1.72 + Math.sin(idx) * 0.08,
        shoulderWidth: body === 'athletic' ? 0.52 : 0.44 + Math.cos(idx) * 0.04,
        hipWidth: body === 'heavy' ? 0.48 : 0.38 + Math.sin(idx) * 0.04,
        armLength: 0.58 + Math.cos(idx) * 0.03,
        legLength: 0.82 + Math.sin(idx) * 0.04,
        torsoLength: 0.52 + Math.cos(idx) * 0.03,
        muscleDefinition: body === 'athletic' ? 0.8 : 0.4 + Math.sin(idx) * 0.2,
        bodyFat: body === 'heavy' ? 0.35 : body === 'slim' ? 0.12 : 0.22 + Math.cos(idx) * 0.06,
      },
      hair: {
        style: ['short-crop', 'medium-layered', 'long-straight', 'afro', 'braided', 'bun'][idx % 6],
        colorHex: ['#1A1A1A', '#4A2A0A', '#8A6A30', '#D4A060', '#C83020', '#E8E0D0'][idx % 6],
        length: [0.05, 0.15, 0.4, 0.2, 0.35, 0.1][idx % 6],
        curliness: [0.0, 0.2, 0.0, 0.9, 0.5, 0.1][idx % 6],
        density: 0.7 + Math.sin(idx) * 0.15,
      },
      skin: {
        toneHex: ['#F5DEB3', '#D2B48C', '#8B6914', '#3C1F0C', '#C4A882', '#E8C8A0'][idx % 6],
        freckles: age === 'child' || age === 'teen' ? 0.4 : 0.1,
        wrinkles: age === 'elder' ? 0.8 : age === 'middle-aged' ? 0.4 : 0.05,
        scars: 0,
        tattoos: 0,
        subsurfaceIntensity: 0.7,
      },
      personalityIdle: idle,
      voicePitchHz: gender === 'male' ? 110 + idx * 3 : gender === 'female' ? 220 + idx * 4 : 165 + idx * 3,
    });
  };

  // 52 diverse presets covering age/ethnicity/body/gender combinations
  add('Young Scholar', 'male', 'young-adult', 'european', 'slim', 'curious');
  add('Elder Sage', 'male', 'elder', 'east-asian', 'average', 'stoic');
  add('Warrior Queen', 'female', 'adult', 'african', 'athletic', 'confident');
  add('Village Child', 'female', 'child', 'south-asian', 'petite', 'curious');
  add('Merchant Lord', 'male', 'middle-aged', 'middle-eastern', 'heavy', 'noble');
  add('Forest Scout', 'female', 'teen', 'indigenous-american', 'slim', 'shy');
  add('Islander Fisher', 'male', 'adult', 'pacific-islander', 'athletic', 'relaxed');
  add('Mixed Artisan', 'non-binary', 'young-adult', 'mixed', 'average', 'mischievous');
  add('Noble Knight', 'male', 'adult', 'european', 'athletic', 'noble');
  add('Healer Elder', 'female', 'elder', 'african', 'average', 'humble');
  add('Street Urchin', 'male', 'child', 'mixed', 'slim', 'nervous');
  add('Blacksmith', 'male', 'middle-aged', 'european', 'heavy', 'stoic');
  add('Dancer', 'female', 'young-adult', 'south-asian', 'slim', 'confident');
  add('Monk', 'male', 'adult', 'east-asian', 'average', 'stoic');
  add('Pirate Captain', 'female', 'middle-aged', 'mixed', 'athletic', 'aggressive');
  add('Desert Nomad', 'male', 'adult', 'middle-eastern', 'tall', 'relaxed');
  add('Mountain Guide', 'female', 'adult', 'indigenous-american', 'athletic', 'confident');
  add('Court Jester', 'non-binary', 'young-adult', 'european', 'petite', 'mischievous');
  add('Tribal Chief', 'male', 'middle-aged', 'pacific-islander', 'heavy', 'noble');
  add('Apprentice Mage', 'female', 'teen', 'east-asian', 'slim', 'curious');
  add('Farmer', 'male', 'adult', 'european', 'average', 'humble');
  add('Tavern Keeper', 'female', 'middle-aged', 'african', 'heavy', 'relaxed');
  add('Royal Guard', 'male', 'young-adult', 'south-asian', 'athletic', 'stoic');
  add('Herbalist', 'female', 'elder', 'indigenous-american', 'petite', 'humble');
  add('Sailor', 'male', 'adult', 'pacific-islander', 'average', 'relaxed');
  add('Diplomat', 'non-binary', 'middle-aged', 'mixed', 'tall', 'noble');
  add('Stable Hand', 'male', 'teen', 'european', 'slim', 'shy');
  add('Weaver', 'female', 'adult', 'east-asian', 'petite', 'relaxed');
  add('Gladiator', 'male', 'young-adult', 'african', 'athletic', 'aggressive');
  add('Priestess', 'female', 'adult', 'middle-eastern', 'average', 'noble');
  add('Woodcutter', 'male', 'adult', 'european', 'heavy', 'stoic');
  add('Orphan', 'female', 'child', 'mixed', 'slim', 'nervous');
  add('Bard', 'male', 'young-adult', 'south-asian', 'average', 'mischievous');
  add('Alchemist', 'female', 'middle-aged', 'east-asian', 'slim', 'curious');
  add('Hunter', 'male', 'adult', 'indigenous-american', 'athletic', 'stoic');
  add('Cook', 'female', 'adult', 'pacific-islander', 'heavy', 'relaxed');
  add('Scribe', 'non-binary', 'young-adult', 'middle-eastern', 'slim', 'curious');
  add('General', 'male', 'middle-aged', 'african', 'tall', 'confident');
  add('Midwife', 'female', 'elder', 'european', 'average', 'humble');
  add('Thief', 'male', 'young-adult', 'east-asian', 'slim', 'nervous');
  add('Ambassador', 'female', 'adult', 'south-asian', 'tall', 'noble');
  add('Carpenter', 'male', 'adult', 'mixed', 'athletic', 'relaxed');
  add('Mystic', 'female', 'elder', 'african', 'petite', 'stoic');
  add('Squire', 'male', 'teen', 'european', 'average', 'shy');
  add('Governess', 'female', 'middle-aged', 'east-asian', 'average', 'confident');
  add('Falconer', 'male', 'adult', 'middle-eastern', 'slim', 'stoic');
  add('Innkeeper', 'female', 'adult', 'pacific-islander', 'average', 'relaxed');
  add('Street Performer', 'non-binary', 'young-adult', 'mixed', 'slim', 'mischievous');
  add('Warden', 'male', 'middle-aged', 'indigenous-american', 'tall', 'stoic');
  add('Potter', 'female', 'adult', 'european', 'petite', 'humble');
  add('Navigator', 'male', 'adult', 'african', 'average', 'confident');
  add('Spirit Caller', 'female', 'elder', 'south-asian', 'slim', 'stoic');

  return presets;
}

// ─── Dynamic Creation ───────────────────────────────────────────────

export function blendPresets(
  presetA: MetaHumanPreset,
  presetB: MetaHumanPreset,
  factor: number,
  ids: MhIdPort,
  entityId: string,
  clock: MhClockPort,
): MetaHumanInstance {
  const t = clamp(factor, 0, 1);

  const blendedParameters: BlendedParameter[] = [];
  const faceKeys: ReadonlyArray<keyof FacialStructure> = [
    'jawWidth', 'cheekboneHeight', 'noseWidth', 'noseBridge',
    'eyeSpacing', 'eyeSize', 'lipFullness', 'foreheadHeight', 'chinLength', 'earSize',
  ];

  const overrides: Record<string, number> = {};
  for (const key of faceKeys) {
    const blended = lerp(presetA.facialStructure[key], presetB.facialStructure[key], t);
    overrides[`face.${key}`] = blended;
    blendedParameters.push({
      parameterName: `face.${key}`,
      sourcePresetA: presetA.presetId,
      sourcePresetB: presetB.presetId,
      blendFactor: t,
    });
  }

  const bodyKeys: ReadonlyArray<keyof BodyProportions> = [
    'height', 'shoulderWidth', 'hipWidth', 'armLength',
    'legLength', 'torsoLength', 'muscleDefinition', 'bodyFat',
  ];
  for (const key of bodyKeys) {
    const blended = lerp(presetA.bodyProportions[key], presetB.bodyProportions[key], t);
    overrides[`body.${key}`] = blended;
  }

  overrides['voice.pitchHz'] = lerp(presetA.voicePitchHz, presetB.voicePitchHz, t);

  return {
    instanceId: ids.next(),
    entityId,
    basePresetId: t < 0.5 ? presetA.presetId : presetB.presetId,
    blendedParameters,
    overrides,
    createdAtMs: Number(clock.now()),
  };
}

// ─── Body Animation ─────────────────────────────────────────────────

export function computeBodyAnimation(
  entityId: string,
  personalityIdle: PersonalityIdle,
  gesture: GestureType | null,
  gestureProgress: number,
  lookAtTarget: readonly [number, number, number],
  emotionIntensity: number,
  clock: MhClockPort,
): BodyAnimationState {
  const t = Number(clock.now());
  const blinkRate = 0.3 + Math.sin(t / 3000) * 0.1;
  const breathingRate = personalityIdle === 'nervous' ? 0.8 : personalityIdle === 'relaxed' ? 0.3 : 0.5;

  const ikTargets: IkTarget[] = [];
  if (gesture === 'point') {
    ikTargets.push({
      boneName: 'hand_r',
      positionX: lookAtTarget[0],
      positionY: lookAtTarget[1],
      positionZ: lookAtTarget[2],
      weight: clamp(gestureProgress, 0, 1),
    });
  } else if (gesture === 'wave') {
    ikTargets.push({
      boneName: 'hand_r',
      positionX: 0.3,
      positionY: 0,
      positionZ: 1.8,
      weight: clamp(gestureProgress, 0, 1),
    });
  }

  return {
    entityId,
    personalityIdle,
    activeGesture: gesture,
    gestureProgress: clamp(gestureProgress, 0, 1),
    ikTargets,
    lookAtX: lookAtTarget[0],
    lookAtY: lookAtTarget[1],
    lookAtZ: lookAtTarget[2],
    blinkRate,
    breathingRate,
    emotionIntensity: clamp(emotionIntensity, 0, 1),
    updatedAtMs: Number(clock.now()),
  };
}

// ─── Performance Profiling ──────────────────────────────────────────

export function profileGpuPerformance(
  worldId: string,
  qualityTier: string,
  metaHumanCount: number,
  fullLodCount: number,
  simplifiedLodCount: number,
  measuredGpuTimeMs: number,
  clock: MhClockPort,
): GpuPerformanceSnapshot {
  const budgetMs = GPU_BUDGET_MS[qualityTier] ?? GPU_BUDGET_MS['medium'];
  const maxFull = MAX_METAHUMANS_FULL[qualityTier] ?? MAX_METAHUMANS_FULL['medium'];
  const withinBudget = measuredGpuTimeMs <= budgetMs;

  let recommendation = 'within-budget';
  if (!withinBudget) {
    if (fullLodCount > maxFull) {
      recommendation = `reduce-full-lod: max ${maxFull} at ${qualityTier} tier`;
    } else {
      recommendation = `lower-quality-tier: gpu-time ${measuredGpuTimeMs.toFixed(1)}ms exceeds ${budgetMs}ms budget`;
    }
  }

  return {
    worldId,
    qualityTier,
    metaHumanCount,
    fullLodCount,
    simplifiedLodCount,
    gpuTimeMs: measuredGpuTimeMs,
    budgetMs,
    withinBudget,
    recommendation,
    timestampMs: Number(clock.now()),
  };
}

// ─── Streaming ──────────────────────────────────────────────────────

export function computeStreamingLod(distanceToCamera: number): StreamingLod {
  if (distanceToCamera < 10) return 'full';
  if (distanceToCamera < 50) return 'head-only';
  if (distanceToCamera < 200) return 'simplified';
  return 'silhouette';
}

export function computeStreamingPriority(
  distanceToCamera: number,
  isPlayerFacing: boolean,
  isInConversation: boolean,
): number {
  let priority = 1000 / (distanceToCamera + 1);
  if (isPlayerFacing) priority *= 2;
  if (isInConversation) priority *= 5;
  return priority;
}

export function computeStreamingState(
  entityId: string,
  distanceToCamera: number,
  assetsLoaded: readonly string[],
  totalAssets: number,
  isPlayerFacing: boolean,
  isInConversation: boolean,
  clock: MhClockPort,
): StreamingState {
  return {
    entityId,
    currentLod: computeStreamingLod(distanceToCamera),
    distanceToCamera,
    assetsLoaded,
    totalAssets,
    loadProgress: totalAssets > 0 ? assetsLoaded.length / totalAssets : 0,
    priority: computeStreamingPriority(distanceToCamera, isPlayerFacing, isInConversation),
    updatedAtMs: Number(clock.now()),
  };
}

// ─── LiveLink ───────────────────────────────────────────────────────

export function createLiveLinkSource(
  sourceName: string,
  sourceType: LiveLinkSource['sourceType'],
  ipAddress: string,
  port: number,
  frameRate: number,
  ids: MhIdPort,
  clock: MhClockPort,
): LiveLinkSource {
  return {
    sourceId: ids.next(),
    sourceName,
    sourceType,
    ipAddress,
    port,
    active: true,
    targetEntityId: null,
    frameRate,
    latencyMs: 0,
    registeredAtMs: Number(clock.now()),
  };
}

export function bindLiveLinkToEntity(
  source: LiveLinkSource,
  entityId: string,
): LiveLinkSource {
  return { ...source, targetEntityId: entityId };
}

// ─── MetaHuman Engine ───────────────────────────────────────────────

export interface MetaHumanEngine {
  readonly getPresets: () => readonly MetaHumanPreset[];
  readonly getPreset: (presetId: string) => MetaHumanPreset | undefined;
  readonly createInstance: (entityId: string, presetIdA: string, presetIdB: string, blendFactor: number) => Promise<MetaHumanInstance | undefined>;
  readonly updateAnimation: (entityId: string, gesture: GestureType | null, gestureProgress: number, lookAt: readonly [number, number, number], emotionIntensity: number) => Promise<BodyAnimationState>;
  readonly profilePerformance: (worldId: string, qualityTier: string, metaHumanCount: number, fullLodCount: number, simplifiedLodCount: number, gpuTimeMs: number) => Promise<GpuPerformanceSnapshot>;
  readonly updateStreaming: (entityId: string, distanceToCamera: number, assetsLoaded: readonly string[], totalAssets: number, isPlayerFacing: boolean, isInConversation: boolean) => Promise<StreamingState>;
  readonly registerLiveLink: (sourceName: string, sourceType: LiveLinkSource['sourceType'], ipAddress: string, port: number, frameRate: number) => Promise<LiveLinkSource>;
  readonly bindLiveLink: (sourceId: string, entityId: string) => Promise<LiveLinkSource | undefined>;
}

export interface MhEngineDeps {
  readonly clock: MhClockPort;
  readonly ids: MhIdPort;
  readonly log: MhLogPort;
  readonly events: MhEventPort;
  readonly store: MhStorePort;
}

export function createMetaHumanEngine(deps: MhEngineDeps): MetaHumanEngine {
  const presetLibrary = createDefaultPresetLibrary(deps.ids);
  const presetMap = new Map(presetLibrary.map((p) => [p.presetId, p]));
  const liveLinkSources = new Map<string, LiveLinkSource>();

  return {
    getPresets() {
      return presetLibrary;
    },

    getPreset(presetId) {
      return presetMap.get(presetId);
    },

    async createInstance(entityId, presetIdA, presetIdB, blendFactor) {
      const a = presetMap.get(presetIdA);
      const b = presetMap.get(presetIdB);
      if (!a || !b) {
        deps.log.warn('Preset not found', { presetIdA, presetIdB });
        return undefined;
      }
      const instance = blendPresets(a, b, blendFactor, deps.ids, entityId, deps.clock);
      await deps.store.saveInstance(instance);
      deps.events.emit(makeEvent('metahuman.instance.created', instance, deps.ids, deps.clock));
      deps.log.info('MetaHuman instance created', { entityId, instanceId: instance.instanceId });
      return instance;
    },

    async updateAnimation(entityId, gesture, gestureProgress, lookAt, emotionIntensity) {
      const state = computeBodyAnimation(entityId, 'relaxed', gesture, gestureProgress, lookAt, emotionIntensity, deps.clock);
      await deps.store.saveAnimationState(state);
      deps.events.emit(makeEvent('metahuman.animation.updated', state, deps.ids, deps.clock));
      return state;
    },

    async profilePerformance(worldId, qualityTier, metaHumanCount, fullLodCount, simplifiedLodCount, gpuTimeMs) {
      const snap = profileGpuPerformance(worldId, qualityTier, metaHumanCount, fullLodCount, simplifiedLodCount, gpuTimeMs, deps.clock);
      await deps.store.savePerformanceSnapshot(snap);
      if (!snap.withinBudget) {
        deps.log.warn('GPU budget exceeded', { worldId, gpuTimeMs, budgetMs: snap.budgetMs });
      }
      deps.events.emit(makeEvent('metahuman.performance.profiled', snap, deps.ids, deps.clock));
      return snap;
    },

    async updateStreaming(entityId, distanceToCamera, assetsLoaded, totalAssets, isPlayerFacing, isInConversation) {
      const state = computeStreamingState(entityId, distanceToCamera, assetsLoaded, totalAssets, isPlayerFacing, isInConversation, deps.clock);
      await deps.store.saveStreamingState(state);
      deps.events.emit(makeEvent('metahuman.streaming.updated', state, deps.ids, deps.clock));
      return state;
    },

    async registerLiveLink(sourceName, sourceType, ipAddress, port, frameRate) {
      const source = createLiveLinkSource(sourceName, sourceType, ipAddress, port, frameRate, deps.ids, deps.clock);
      liveLinkSources.set(source.sourceId, source);
      await deps.store.saveLiveLinkSource(source);
      deps.events.emit(makeEvent('metahuman.livelink.registered', source, deps.ids, deps.clock));
      deps.log.info('LiveLink source registered', { sourceId: source.sourceId, sourceName });
      return source;
    },

    async bindLiveLink(sourceId, entityId) {
      const source = liveLinkSources.get(sourceId);
      if (!source) {
        deps.log.warn('LiveLink source not found', { sourceId });
        return undefined;
      }
      const bound = bindLiveLinkToEntity(source, entityId);
      liveLinkSources.set(sourceId, bound);
      await deps.store.saveLiveLinkSource(bound);
      deps.events.emit(makeEvent('metahuman.livelink.bound', bound, deps.ids, deps.clock));
      return bound;
    },
  };
}
