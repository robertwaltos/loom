/**
 * Visual Effects System — Lumen lighting, volumetric clouds,
 * PBR material orchestration, and seasonal visual transitions.
 *
 * The Loom manages aesthetic state; UE5 renders it. This module
 * drives the parameters that control lighting, atmosphere, materials,
 * and seasonal visuals per world and zone.
 *
 *   - Lumen lighting: time-compressed day/night with global illumination
 *   - Volumetric clouds: weather-driven cloud formations and density
 *   - Material library: 200+ PBR materials with biome-aware selection
 *   - Seasonal visual transitions: foliage color, snow coverage, bloom
 *
 * "Light is the first thread woven into every world."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface VfxClockPort {
  readonly now: () => bigint;
}

export interface VfxIdPort {
  readonly next: () => string;
}

export interface VfxLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface VfxEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface VfxStorePort {
  readonly saveLightingState: (state: LightingState) => Promise<void>;
  readonly getLightingState: (worldId: string) => Promise<LightingState | undefined>;
  readonly saveCloudState: (state: CloudState) => Promise<void>;
  readonly getCloudState: (worldId: string) => Promise<CloudState | undefined>;
  readonly saveMaterialPalette: (palette: MaterialPalette) => Promise<void>;
  readonly getMaterialPalette: (biome: string) => Promise<MaterialPalette | undefined>;
  readonly saveSeasonalState: (state: SeasonalVisualState) => Promise<void>;
  readonly getSeasonalState: (worldId: string) => Promise<SeasonalVisualState | undefined>;
  readonly listMaterials: (category: MaterialCategory) => Promise<readonly PbrMaterial[]>;
}

// ─── Constants ──────────────────────────────────────────────────────

const DAY_CYCLE_HOURS = 24;
const DAWN_HOUR = 5.5;
const DUSK_HOUR = 19.5;
const GOLDEN_HOUR_SPAN = 1.0;

const MIN_SUN_INTENSITY_LUX = 0;
const MAX_SUN_INTENSITY_LUX = 120_000;
const MOONLIGHT_LUX = 0.25;

const CLOUD_DENSITY_CLEAR = 0.05;
const CLOUD_DENSITY_OVERCAST = 0.95;
const CLOUD_HEIGHT_BASE_M = 1500;
const CLOUD_HEIGHT_CEILING_M = 8000;

const SEASON_TRANSITION_BLEND_DURATION_MS = 3600_000;

export const MATERIAL_CATEGORIES = [
  'terrain',
  'vegetation',
  'mineral',
  'water',
  'architectural',
  'organic',
  'atmospheric',
  'crystalline',
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

export const LIGHTING_MODES = ['lumen-gi', 'baked', 'hybrid'] as const;
export type LightingMode = (typeof LIGHTING_MODES)[number];

// ─── Types ──────────────────────────────────────────────────────────

export interface SunPosition {
  readonly azimuth: number;
  readonly elevation: number;
  readonly intensityLux: number;
}

export interface MoonPhase {
  readonly phase: number;
  readonly illumination: number;
}

export interface LightingState {
  readonly worldId: string;
  readonly gameHour: number;
  readonly sunPosition: SunPosition;
  readonly moonPhase: MoonPhase;
  readonly ambientIntensity: number;
  readonly shadowSoftness: number;
  readonly giBounceFactor: number;
  readonly lightingMode: LightingMode;
  readonly colorTemperatureK: number;
  readonly updatedAtMs: number;
}

export interface CloudLayer {
  readonly altitudeM: number;
  readonly density: number;
  readonly coverage: number;
  readonly windSpeedMs: number;
  readonly windDirectionDeg: number;
  readonly typeId: CloudFormationType;
}

export type CloudFormationType =
  | 'cumulus'
  | 'stratus'
  | 'cirrus'
  | 'cumulonimbus'
  | 'nimbostratus'
  | 'altocumulus';

export interface CloudState {
  readonly worldId: string;
  readonly layers: readonly CloudLayer[];
  readonly overallCoverage: number;
  readonly precipitationProbability: number;
  readonly volumetricEnabled: boolean;
  readonly updatedAtMs: number;
}

export interface PbrMaterial {
  readonly materialId: string;
  readonly name: string;
  readonly category: MaterialCategory;
  readonly albedoHex: string;
  readonly roughness: number;
  readonly metallic: number;
  readonly normalStrength: number;
  readonly emissive: boolean;
  readonly subsurfaceScattering: boolean;
  readonly windReactive: boolean;
  readonly biomes: readonly string[];
}

export interface MaterialPalette {
  readonly biome: string;
  readonly materials: readonly PbrMaterial[];
  readonly terrainBlendWeights: Readonly<Record<string, number>>;
}

export interface FoliageVisual {
  readonly colorShift: readonly [number, number, number];
  readonly leafDensity: number;
  readonly windSway: number;
}

export interface SnowVisual {
  readonly coverage: number;
  readonly depth: number;
  readonly meltRate: number;
}

export interface BloomVisual {
  readonly flowerDensity: number;
  readonly pollenParticles: boolean;
  readonly colorVariance: number;
}

export interface SeasonalVisualState {
  readonly worldId: string;
  readonly currentSeason: Season;
  readonly transitionProgress: number;
  readonly foliage: FoliageVisual;
  readonly snow: SnowVisual;
  readonly bloom: BloomVisual;
  readonly grassTint: readonly [number, number, number];
  readonly updatedAtMs: number;
}

// ─── Seasonal Presets ───────────────────────────────────────────────

const SEASONAL_PRESETS: Readonly<Record<Season, Omit<SeasonalVisualState, 'worldId' | 'currentSeason' | 'transitionProgress' | 'updatedAtMs'>>> = {
  spring: {
    foliage: { colorShift: [0.2, 0.8, 0.15], leafDensity: 0.7, windSway: 0.4 },
    snow: { coverage: 0.0, depth: 0.0, meltRate: 0.1 },
    bloom: { flowerDensity: 0.8, pollenParticles: true, colorVariance: 0.6 },
    grassTint: [0.3, 0.75, 0.2],
  },
  summer: {
    foliage: { colorShift: [0.15, 0.9, 0.1], leafDensity: 1.0, windSway: 0.2 },
    snow: { coverage: 0.0, depth: 0.0, meltRate: 0.0 },
    bloom: { flowerDensity: 0.4, pollenParticles: false, colorVariance: 0.3 },
    grassTint: [0.25, 0.85, 0.15],
  },
  autumn: {
    foliage: { colorShift: [0.8, 0.4, 0.1], leafDensity: 0.5, windSway: 0.6 },
    snow: { coverage: 0.0, depth: 0.0, meltRate: 0.0 },
    bloom: { flowerDensity: 0.05, pollenParticles: false, colorVariance: 0.1 },
    grassTint: [0.6, 0.5, 0.2],
  },
  winter: {
    foliage: { colorShift: [0.3, 0.3, 0.3], leafDensity: 0.1, windSway: 0.1 },
    snow: { coverage: 0.8, depth: 0.3, meltRate: 0.0 },
    bloom: { flowerDensity: 0.0, pollenParticles: false, colorVariance: 0.0 },
    grassTint: [0.5, 0.55, 0.5],
  },
};

// ─── Weather-to-Cloud Mapping ───────────────────────────────────────

const WEATHER_CLOUD_MAP: Readonly<Record<string, Partial<Pick<CloudLayer, 'density' | 'coverage'>>>> = {
  CLEAR: { density: CLOUD_DENSITY_CLEAR, coverage: 0.1 },
  CLOUDY: { density: 0.5, coverage: 0.6 },
  RAIN: { density: 0.7, coverage: 0.8 },
  STORM: { density: CLOUD_DENSITY_OVERCAST, coverage: 1.0 },
  SNOW: { density: 0.6, coverage: 0.75 },
  FOG: { density: 0.3, coverage: 0.4 },
  DUST_STORM: { density: 0.2, coverage: 0.3 },
};

// ─── Helper Functions ───────────────────────────────────────────────

function makeEvent(
  type: string,
  payload: unknown,
  ids: VfxIdPort,
  clock: VfxClockPort,
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
      sourceFabricId: 'visual-effects',
      schemaVersion: 1,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

function lerpColor(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): readonly [number, number, number] {
  const ct = clamp(t, 0, 1);
  return [lerp(a[0], b[0], ct), lerp(a[1], b[1], ct), lerp(a[2], b[2], ct)];
}

// ─── Sun Position Calculator ────────────────────────────────────────

export function computeSunPosition(gameHour: number, latitude: number): SunPosition {
  const hourAngle = ((gameHour / DAY_CYCLE_HOURS) * 360 - 180) * (Math.PI / 180);
  const latRad = latitude * (Math.PI / 180);
  const declination = 23.44 * Math.sin((2 * Math.PI * (284 + gameHour)) / 365);
  const declRad = declination * (Math.PI / 180);

  const elevation = Math.asin(
    Math.sin(latRad) * Math.sin(declRad) +
    Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngle),
  ) * (180 / Math.PI);

  const azimuth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(latRad) - Math.tan(declRad) * Math.cos(latRad),
  ) * (180 / Math.PI);

  const elevationNorm = clamp(elevation, -90, 90);
  const intensityLux = elevationNorm > 0
    ? lerp(MIN_SUN_INTENSITY_LUX, MAX_SUN_INTENSITY_LUX, elevationNorm / 90)
    : MOONLIGHT_LUX;

  return { azimuth: (azimuth + 360) % 360, elevation: elevationNorm, intensityLux };
}

// ─── Lighting State Builder ─────────────────────────────────────────

export function computeLightingState(
  worldId: string,
  gameHour: number,
  latitude: number,
  clock: VfxClockPort,
): LightingState {
  const sun = computeSunPosition(gameHour, latitude);
  const isDay = sun.elevation > 0;
  const isGoldenHour =
    (gameHour >= DAWN_HOUR && gameHour < DAWN_HOUR + GOLDEN_HOUR_SPAN) ||
    (gameHour >= DUSK_HOUR - GOLDEN_HOUR_SPAN && gameHour < DUSK_HOUR);

  const colorTemperatureK = isGoldenHour
    ? 3500
    : isDay
      ? 6500
      : 12000;

  const moonDay = (Number(clock.now()) / 86_400_000) % 29.53;
  const moonIllumination = 0.5 * (1 - Math.cos((2 * Math.PI * moonDay) / 29.53));

  return {
    worldId,
    gameHour,
    sunPosition: sun,
    moonPhase: { phase: moonDay / 29.53, illumination: moonIllumination },
    ambientIntensity: isDay ? lerp(0.3, 1.0, sun.elevation / 90) : lerp(0.02, 0.1, moonIllumination),
    shadowSoftness: isGoldenHour ? 0.8 : isDay ? 0.3 : 1.0,
    giBounceFactor: isDay ? 1.0 : 0.15,
    lightingMode: 'lumen-gi',
    colorTemperatureK,
    updatedAtMs: Number(clock.now()),
  };
}

// ─── Cloud State Builder ────────────────────────────────────────────

export function computeCloudState(
  worldId: string,
  weatherType: string,
  windSpeedMs: number,
  windDirectionDeg: number,
  clock: VfxClockPort,
): CloudState {
  const mapping = WEATHER_CLOUD_MAP[weatherType] ?? WEATHER_CLOUD_MAP['CLEAR'];
  const density = mapping?.density ?? CLOUD_DENSITY_CLEAR;
  const coverage = mapping?.coverage ?? 0.1;

  const baseLayer: CloudLayer = {
    altitudeM: CLOUD_HEIGHT_BASE_M,
    density,
    coverage,
    windSpeedMs,
    windDirectionDeg,
    typeId: weatherType === 'STORM' ? 'cumulonimbus' : weatherType === 'RAIN' ? 'nimbostratus' : 'cumulus',
  };

  const highLayer: CloudLayer = {
    altitudeM: CLOUD_HEIGHT_CEILING_M,
    density: density * 0.3,
    coverage: coverage * 0.4,
    windSpeedMs: windSpeedMs * 1.5,
    windDirectionDeg: (windDirectionDeg + 15) % 360,
    typeId: 'cirrus',
  };

  const precipitationProbability = weatherType === 'RAIN' || weatherType === 'STORM'
    ? 0.9
    : weatherType === 'SNOW'
      ? 0.75
      : 0.05;

  return {
    worldId,
    layers: [baseLayer, highLayer],
    overallCoverage: coverage,
    precipitationProbability,
    volumetricEnabled: true,
    updatedAtMs: Number(clock.now()),
  };
}

// ─── Seasonal Visual Transition ─────────────────────────────────────

export function computeSeasonalVisuals(
  worldId: string,
  currentSeason: Season,
  transitionProgress: number,
  clock: VfxClockPort,
): SeasonalVisualState {
  const currentIdx = SEASONS.indexOf(currentSeason);
  const nextIdx = (currentIdx + 1) % SEASONS.length;
  const nextSeason = SEASONS[nextIdx];
  const t = clamp(transitionProgress, 0, 1);

  const current = SEASONAL_PRESETS[currentSeason];
  const next = SEASONAL_PRESETS[nextSeason];

  return {
    worldId,
    currentSeason,
    transitionProgress: t,
    foliage: {
      colorShift: lerpColor(current.foliage.colorShift, next.foliage.colorShift, t),
      leafDensity: lerp(current.foliage.leafDensity, next.foliage.leafDensity, t),
      windSway: lerp(current.foliage.windSway, next.foliage.windSway, t),
    },
    snow: {
      coverage: lerp(current.snow.coverage, next.snow.coverage, t),
      depth: lerp(current.snow.depth, next.snow.depth, t),
      meltRate: lerp(current.snow.meltRate, next.snow.meltRate, t),
    },
    bloom: {
      flowerDensity: lerp(current.bloom.flowerDensity, next.bloom.flowerDensity, t),
      pollenParticles: t < 0.5 ? current.bloom.pollenParticles : next.bloom.pollenParticles,
      colorVariance: lerp(current.bloom.colorVariance, next.bloom.colorVariance, t),
    },
    grassTint: lerpColor(current.grassTint, next.grassTint, t),
    updatedAtMs: Number(clock.now()),
  };
}

// ─── Material Library ───────────────────────────────────────────────

export function createDefaultMaterialLibrary(): readonly PbrMaterial[] {
  const materials: PbrMaterial[] = [];
  let idx = 0;

  const addMat = (
    name: string,
    category: MaterialCategory,
    opts: Partial<PbrMaterial>,
  ): void => {
    idx++;
    materials.push({
      materialId: `mat-${String(idx).padStart(3, '0')}`,
      name,
      category,
      albedoHex: opts.albedoHex ?? '#808080',
      roughness: opts.roughness ?? 0.5,
      metallic: opts.metallic ?? 0.0,
      normalStrength: opts.normalStrength ?? 1.0,
      emissive: opts.emissive ?? false,
      subsurfaceScattering: opts.subsurfaceScattering ?? false,
      windReactive: opts.windReactive ?? false,
      biomes: opts.biomes ?? ['temperate'],
    });
  };

  // Terrain — 30 materials
  addMat('Grass Lush', 'terrain', { albedoHex: '#3A7D1A', roughness: 0.85, biomes: ['temperate', 'tropical'] });
  addMat('Grass Dry', 'terrain', { albedoHex: '#8B7D3A', roughness: 0.9, biomes: ['savanna', 'arid'] });
  addMat('Grass Snow', 'terrain', { albedoHex: '#C8D8C0', roughness: 0.75, biomes: ['tundra', 'alpine'] });
  addMat('Dirt Path', 'terrain', { albedoHex: '#6B4423', roughness: 0.95 });
  addMat('Fertile Soil', 'terrain', { albedoHex: '#3E2C1A', roughness: 0.92 });
  addMat('Sand Fine', 'terrain', { albedoHex: '#D4B482', roughness: 0.88, biomes: ['desert', 'coastal'] });
  addMat('Sand Red', 'terrain', { albedoHex: '#C4523A', roughness: 0.87, biomes: ['desert'] });
  addMat('Gravel Coarse', 'terrain', { albedoHex: '#7A7A7A', roughness: 0.93 });
  addMat('Mud Wet', 'terrain', { albedoHex: '#3C2A14', roughness: 0.7, biomes: ['swamp', 'tropical'] });
  addMat('Clay Red', 'terrain', { albedoHex: '#9A4A2A', roughness: 0.82 });
  addMat('Snow Fresh', 'terrain', { albedoHex: '#F0F4F8', roughness: 0.6, biomes: ['tundra', 'alpine'] });
  addMat('Snow Packed', 'terrain', { albedoHex: '#D8E0E8', roughness: 0.65, biomes: ['tundra'] });
  addMat('Ice Glacial', 'terrain', { albedoHex: '#B8D4E8', roughness: 0.15, metallic: 0.02, biomes: ['tundra'] });
  addMat('Volcanic Rock', 'terrain', { albedoHex: '#2A2A2A', roughness: 0.88, biomes: ['volcanic'] });
  addMat('Obsidian', 'terrain', { albedoHex: '#0A0A0A', roughness: 0.08, metallic: 0.05, biomes: ['volcanic'] });
  addMat('Limestone', 'terrain', { albedoHex: '#C8BCA0', roughness: 0.78 });
  addMat('Sandstone', 'terrain', { albedoHex: '#D4A460', roughness: 0.82 });
  addMat('Slate', 'terrain', { albedoHex: '#4A4A50', roughness: 0.7 });
  addMat('Marble White', 'terrain', { albedoHex: '#E8E0D8', roughness: 0.25, metallic: 0.01 });
  addMat('Granite Grey', 'terrain', { albedoHex: '#6A6A6A', roughness: 0.75 });
  addMat('Chalk', 'terrain', { albedoHex: '#F0EDE0', roughness: 0.95, biomes: ['coastal'] });
  addMat('Peat', 'terrain', { albedoHex: '#2A1E0A', roughness: 0.9, biomes: ['swamp', 'temperate'] });
  addMat('River Bed', 'terrain', { albedoHex: '#5A5040', roughness: 0.65 });
  addMat('Coral Sand', 'terrain', { albedoHex: '#F0D8C0', roughness: 0.8, biomes: ['coastal', 'tropical'] });
  addMat('Ash Volcanic', 'terrain', { albedoHex: '#3A3A3A', roughness: 0.92, biomes: ['volcanic'] });
  addMat('Mossy Rock', 'terrain', { albedoHex: '#4A6A3A', roughness: 0.8, biomes: ['temperate', 'tropical'] });
  addMat('Permafrost', 'terrain', { albedoHex: '#8A9AAA', roughness: 0.72, biomes: ['tundra'] });
  addMat('Desert Crust', 'terrain', { albedoHex: '#B8A070', roughness: 0.9, biomes: ['desert'] });
  addMat('Terracotta', 'terrain', { albedoHex: '#C86A3A', roughness: 0.85 });
  addMat('Basalt', 'terrain', { albedoHex: '#3A3A40', roughness: 0.8, biomes: ['volcanic', 'coastal'] });

  // Vegetation — 30 materials
  addMat('Oak Bark', 'vegetation', { albedoHex: '#5A3A1A', roughness: 0.9, windReactive: true });
  addMat('Birch Bark', 'vegetation', { albedoHex: '#E8DCC8', roughness: 0.85, windReactive: true });
  addMat('Pine Bark', 'vegetation', { albedoHex: '#4A2E1A', roughness: 0.92, windReactive: true, biomes: ['alpine'] });
  addMat('Palm Trunk', 'vegetation', { albedoHex: '#6A5040', roughness: 0.88, biomes: ['tropical'] });
  addMat('Bamboo', 'vegetation', { albedoHex: '#8AA040', roughness: 0.6, windReactive: true, biomes: ['tropical'] });
  addMat('Leaf Broadleaf', 'vegetation', { albedoHex: '#2A6A10', subsurfaceScattering: true, windReactive: true });
  addMat('Leaf Needle', 'vegetation', { albedoHex: '#1A4A0A', subsurfaceScattering: true, windReactive: true, biomes: ['alpine'] });
  addMat('Leaf Tropical', 'vegetation', { albedoHex: '#1A8A1A', subsurfaceScattering: true, windReactive: true, biomes: ['tropical'] });
  addMat('Leaf Autumn Red', 'vegetation', { albedoHex: '#C8321A', subsurfaceScattering: true, windReactive: true });
  addMat('Leaf Autumn Gold', 'vegetation', { albedoHex: '#D4A020', subsurfaceScattering: true, windReactive: true });
  addMat('Moss', 'vegetation', { albedoHex: '#3A5A20', roughness: 0.92, biomes: ['temperate', 'swamp'] });
  addMat('Lichen', 'vegetation', { albedoHex: '#8AAA70', roughness: 0.88 });
  addMat('Fern', 'vegetation', { albedoHex: '#2A6A2A', subsurfaceScattering: true, windReactive: true });
  addMat('Cactus', 'vegetation', { albedoHex: '#3A7A30', roughness: 0.7, biomes: ['desert'] });
  addMat('Seaweed', 'vegetation', { albedoHex: '#1A4A3A', windReactive: true, biomes: ['coastal'] });
  addMat('Mushroom Cap', 'vegetation', { albedoHex: '#8A4020', roughness: 0.6, subsurfaceScattering: true });
  addMat('Vine', 'vegetation', { albedoHex: '#2A5A1A', windReactive: true, biomes: ['tropical'] });
  addMat('Flower Petal', 'vegetation', { albedoHex: '#E080A0', subsurfaceScattering: true, windReactive: true });
  addMat('Berry Bush', 'vegetation', { albedoHex: '#3A5A2A', windReactive: true });
  addMat('Wheat', 'vegetation', { albedoHex: '#D4B060', windReactive: true, biomes: ['temperate', 'savanna'] });
  addMat('Rice Paddy', 'vegetation', { albedoHex: '#6AA050', windReactive: true, biomes: ['tropical'] });
  addMat('Mangrove', 'vegetation', { albedoHex: '#3A4A20', roughness: 0.85, biomes: ['tropical', 'coastal'] });
  addMat('Cherry Blossom', 'vegetation', { albedoHex: '#F0A0B0', subsurfaceScattering: true, windReactive: true });
  addMat('Willow Leaf', 'vegetation', { albedoHex: '#5A8A3A', subsurfaceScattering: true, windReactive: true });
  addMat('Dead Branch', 'vegetation', { albedoHex: '#5A4030', roughness: 0.93, windReactive: false });
  addMat('Root Exposed', 'vegetation', { albedoHex: '#4A3020', roughness: 0.88 });
  addMat('Coral Live', 'vegetation', { albedoHex: '#E07050', roughness: 0.6, biomes: ['coastal'] });
  addMat('Coral Dead', 'vegetation', { albedoHex: '#C8B8A8', roughness: 0.8, biomes: ['coastal'] });
  addMat('Kelp', 'vegetation', { albedoHex: '#2A4A1A', windReactive: true, biomes: ['coastal'] });
  addMat('Tundra Scrub', 'vegetation', { albedoHex: '#6A7A50', roughness: 0.85, biomes: ['tundra'] });

  // Mineral — 25 materials
  addMat('Iron Ore', 'mineral', { albedoHex: '#4A3A2A', roughness: 0.8, metallic: 0.3 });
  addMat('Gold Ore', 'mineral', { albedoHex: '#D4A830', roughness: 0.4, metallic: 0.9 });
  addMat('Silver Ore', 'mineral', { albedoHex: '#C0C0C8', roughness: 0.3, metallic: 0.85 });
  addMat('Copper Ore', 'mineral', { albedoHex: '#B87333', roughness: 0.5, metallic: 0.7 });
  addMat('Crystal Quartz', 'crystalline', { albedoHex: '#E8E0F0', roughness: 0.1, metallic: 0.02, emissive: false });
  addMat('Crystal Amethyst', 'crystalline', { albedoHex: '#8050A0', roughness: 0.12, subsurfaceScattering: true });
  addMat('Crystal Ruby', 'crystalline', { albedoHex: '#C81030', roughness: 0.08, subsurfaceScattering: true });
  addMat('Crystal Sapphire', 'crystalline', { albedoHex: '#2050C0', roughness: 0.08, subsurfaceScattering: true });
  addMat('Crystal Emerald', 'crystalline', { albedoHex: '#30A050', roughness: 0.1, subsurfaceScattering: true });
  addMat('Gem Diamond', 'crystalline', { albedoHex: '#F0F8FF', roughness: 0.02, metallic: 0.04 });
  addMat('Lapis Lazuli', 'mineral', { albedoHex: '#1A3A8A', roughness: 0.55 });
  addMat('Jade', 'mineral', { albedoHex: '#30885A', roughness: 0.4, subsurfaceScattering: true });
  addMat('Coal', 'mineral', { albedoHex: '#1A1A1A', roughness: 0.85 });
  addMat('Salt Crystal', 'crystalline', { albedoHex: '#F0E8E0', roughness: 0.2 });
  addMat('Sulfur', 'mineral', { albedoHex: '#D4D020', roughness: 0.7 });
  addMat('Tin Ore', 'mineral', { albedoHex: '#8A8A80', roughness: 0.65, metallic: 0.5 });
  addMat('Zinc Ore', 'mineral', { albedoHex: '#7A8A8A', roughness: 0.7, metallic: 0.45 });
  addMat('Mythril', 'mineral', { albedoHex: '#A0B8D4', roughness: 0.15, metallic: 0.95, emissive: true });
  addMat('Darksteel', 'mineral', { albedoHex: '#2A2A30', roughness: 0.2, metallic: 0.9 });
  addMat('Moonstone', 'crystalline', { albedoHex: '#D0D8F0', roughness: 0.18, emissive: true, subsurfaceScattering: true });
  addMat('Amber', 'mineral', { albedoHex: '#D08020', roughness: 0.3, subsurfaceScattering: true });
  addMat('Opal', 'crystalline', { albedoHex: '#D8E0F0', roughness: 0.15, subsurfaceScattering: true });
  addMat('Turquoise', 'mineral', { albedoHex: '#40C0C0', roughness: 0.4 });
  addMat('Malachite', 'mineral', { albedoHex: '#208040', roughness: 0.5 });
  addMat('Onyx', 'mineral', { albedoHex: '#0A0A0A', roughness: 0.1, metallic: 0.03 });

  // Water — 15 materials
  addMat('Ocean Deep', 'water', { albedoHex: '#0A2A5A', roughness: 0.02, metallic: 0.04 });
  addMat('Ocean Shallow', 'water', { albedoHex: '#1A6A8A', roughness: 0.05, metallic: 0.03 });
  addMat('River Fresh', 'water', { albedoHex: '#2A5A6A', roughness: 0.06, metallic: 0.02 });
  addMat('Lake Calm', 'water', { albedoHex: '#1A4A6A', roughness: 0.03, metallic: 0.03 });
  addMat('Waterfall Foam', 'water', { albedoHex: '#E0F0F8', roughness: 0.3, subsurfaceScattering: true });
  addMat('Swamp Water', 'water', { albedoHex: '#3A4A2A', roughness: 0.15, biomes: ['swamp'] });
  addMat('Ice Surface', 'water', { albedoHex: '#C0D8E8', roughness: 0.08, biomes: ['tundra'] });
  addMat('Rain Puddle', 'water', { albedoHex: '#4A5A6A', roughness: 0.04 });
  addMat('Lava Flow', 'water', { albedoHex: '#F04010', roughness: 0.35, emissive: true, biomes: ['volcanic'] });
  addMat('Lava Cooled', 'water', { albedoHex: '#2A1A1A', roughness: 0.9, biomes: ['volcanic'] });
  addMat('Hot Spring', 'water', { albedoHex: '#40A0B0', roughness: 0.1, biomes: ['volcanic'] });
  addMat('Acid Pool', 'water', { albedoHex: '#80D030', roughness: 0.08, emissive: true });
  addMat('Oasis', 'water', { albedoHex: '#20708A', roughness: 0.05, biomes: ['desert'] });
  addMat('Frozen Lake', 'water', { albedoHex: '#B8D0E0', roughness: 0.06, biomes: ['tundra', 'alpine'] });
  addMat('Marsh', 'water', { albedoHex: '#4A5A3A', roughness: 0.2, biomes: ['swamp'] });

  // Architectural — 30 materials
  addMat('Stone Brick', 'architectural', { albedoHex: '#8A8A80', roughness: 0.8 });
  addMat('Stone Brick Mossy', 'architectural', { albedoHex: '#6A7A60', roughness: 0.82 });
  addMat('Cobblestone', 'architectural', { albedoHex: '#6A6A6A', roughness: 0.85 });
  addMat('Brick Red', 'architectural', { albedoHex: '#A0442A', roughness: 0.82 });
  addMat('Wood Plank Oak', 'architectural', { albedoHex: '#8A6A3A', roughness: 0.75 });
  addMat('Wood Plank Dark', 'architectural', { albedoHex: '#3A2A1A', roughness: 0.78 });
  addMat('Wood Plank Birch', 'architectural', { albedoHex: '#D4C0A0', roughness: 0.72 });
  addMat('Thatch Roof', 'architectural', { albedoHex: '#8A7A40', roughness: 0.93 });
  addMat('Tile Roof Clay', 'architectural', { albedoHex: '#B05A30', roughness: 0.7 });
  addMat('Tile Roof Slate', 'architectural', { albedoHex: '#4A4A50', roughness: 0.65 });
  addMat('Plaster White', 'architectural', { albedoHex: '#F0E8D8', roughness: 0.8 });
  addMat('Plaster Adobe', 'architectural', { albedoHex: '#C4A070', roughness: 0.82, biomes: ['desert', 'arid'] });
  addMat('Iron Fence', 'architectural', { albedoHex: '#2A2A2A', roughness: 0.4, metallic: 0.8 });
  addMat('Bronze Trim', 'architectural', { albedoHex: '#8A6A2A', roughness: 0.35, metallic: 0.75 });
  addMat('Gold Trim', 'architectural', { albedoHex: '#D4A830', roughness: 0.25, metallic: 0.9 });
  addMat('Glass Window', 'architectural', { albedoHex: '#C0D0E0', roughness: 0.05, metallic: 0.04 });
  addMat('Stained Glass', 'architectural', { albedoHex: '#6050A0', roughness: 0.08, emissive: true });
  addMat('Marble Floor', 'architectural', { albedoHex: '#E8E0D0', roughness: 0.2, metallic: 0.01 });
  addMat('Carpet Woven', 'architectural', { albedoHex: '#8A2A2A', roughness: 0.95 });
  addMat('Flag Fabric', 'architectural', { albedoHex: '#3A3A8A', roughness: 0.85, windReactive: true });
  addMat('Rope', 'architectural', { albedoHex: '#8A7A50', roughness: 0.9 });
  addMat('Leather Stretched', 'architectural', { albedoHex: '#5A3A1A', roughness: 0.7 });
  addMat('Paper Scroll', 'architectural', { albedoHex: '#E8D8B8', roughness: 0.88 });
  addMat('Wax Candle', 'architectural', { albedoHex: '#E8D8A0', roughness: 0.5, subsurfaceScattering: true });
  addMat('Metal Shield', 'architectural', { albedoHex: '#6A6A70', roughness: 0.35, metallic: 0.8 });
  addMat('Crystal Lamp', 'architectural', { albedoHex: '#D8E8F0', roughness: 0.05, emissive: true });
  addMat('Road Paved', 'architectural', { albedoHex: '#5A5A5A', roughness: 0.8 });
  addMat('Bridge Timber', 'architectural', { albedoHex: '#6A4A2A', roughness: 0.82 });
  addMat('Wall Ruin', 'architectural', { albedoHex: '#7A7A6A', roughness: 0.88 });
  addMat('Dock Plank', 'architectural', { albedoHex: '#6A5A40', roughness: 0.8, biomes: ['coastal'] });

  // Organic — 20 materials
  addMat('Skin Human', 'organic', { albedoHex: '#D4A880', subsurfaceScattering: true });
  addMat('Skin Elf', 'organic', { albedoHex: '#E0D0B0', subsurfaceScattering: true });
  addMat('Skin Dwarf', 'organic', { albedoHex: '#C09060', subsurfaceScattering: true });
  addMat('Fur Wolf', 'organic', { albedoHex: '#5A4A3A', roughness: 0.9, subsurfaceScattering: true });
  addMat('Fur Bear', 'organic', { albedoHex: '#3A2A1A', roughness: 0.92, subsurfaceScattering: true });
  addMat('Scale Dragon', 'organic', { albedoHex: '#2A4A2A', roughness: 0.4, metallic: 0.3 });
  addMat('Scale Fish', 'organic', { albedoHex: '#6A8A9A', roughness: 0.2, metallic: 0.15 });
  addMat('Feather', 'organic', { albedoHex: '#D0C8B0', roughness: 0.6, windReactive: true });
  addMat('Horn', 'organic', { albedoHex: '#C8B080', roughness: 0.45 });
  addMat('Bone', 'organic', { albedoHex: '#E0D8C0', roughness: 0.65 });
  addMat('Chitin', 'organic', { albedoHex: '#3A3020', roughness: 0.3, metallic: 0.1 });
  addMat('Silk Fabric', 'organic', { albedoHex: '#E8D8F0', roughness: 0.15 });
  addMat('Wool', 'organic', { albedoHex: '#E0D8C8', roughness: 0.95 });
  addMat('Leather Tanned', 'organic', { albedoHex: '#6A3A1A', roughness: 0.72 });
  addMat('Shell', 'organic', { albedoHex: '#E0D0B8', roughness: 0.3, metallic: 0.05, biomes: ['coastal'] });
  addMat('Ink', 'organic', { albedoHex: '#1A0A2A', roughness: 0.2 });
  addMat('Blood', 'organic', { albedoHex: '#8A1010', roughness: 0.3 });
  addMat('Wax Natural', 'organic', { albedoHex: '#D8C880', roughness: 0.5, subsurfaceScattering: true });
  addMat('Resin', 'organic', { albedoHex: '#B08020', roughness: 0.2, subsurfaceScattering: true });
  addMat('Parchment', 'organic', { albedoHex: '#E8D8B0', roughness: 0.85 });

  // Atmospheric — 20 materials
  addMat('Smoke Light', 'atmospheric', { albedoHex: '#A0A0A0', roughness: 0.5 });
  addMat('Smoke Dense', 'atmospheric', { albedoHex: '#3A3A3A', roughness: 0.6 });
  addMat('Mist', 'atmospheric', { albedoHex: '#D0D8E0', roughness: 0.3, subsurfaceScattering: true });
  addMat('Fog Dense', 'atmospheric', { albedoHex: '#B0B8C0', roughness: 0.35, subsurfaceScattering: true });
  addMat('Dust Particle', 'atmospheric', { albedoHex: '#C0A870', roughness: 0.8 });
  addMat('Spark', 'atmospheric', { albedoHex: '#F0A020', emissive: true });
  addMat('Ember', 'atmospheric', { albedoHex: '#E04010', emissive: true });
  addMat('Firefly', 'atmospheric', { albedoHex: '#A0E040', emissive: true });
  addMat('Magic Particle A', 'atmospheric', { albedoHex: '#6040D0', emissive: true });
  addMat('Magic Particle B', 'atmospheric', { albedoHex: '#40D0B0', emissive: true });
  addMat('Aurora Particle', 'atmospheric', { albedoHex: '#30E080', emissive: true, biomes: ['tundra'] });
  addMat('Rain Drop', 'atmospheric', { albedoHex: '#8090A0', roughness: 0.02 });
  addMat('Snow Flake', 'atmospheric', { albedoHex: '#F0F4F8', roughness: 0.6, biomes: ['tundra', 'alpine'] });
  addMat('Pollen', 'atmospheric', { albedoHex: '#E0D040', roughness: 0.7 });
  addMat('Ash', 'atmospheric', { albedoHex: '#5A5A5A', roughness: 0.85, biomes: ['volcanic'] });
  addMat('Sand Grain', 'atmospheric', { albedoHex: '#D4B482', roughness: 0.9, biomes: ['desert'] });
  addMat('Bubble', 'atmospheric', { albedoHex: '#D0E0F0', roughness: 0.02, metallic: 0.05 });
  addMat('Lightning Trail', 'atmospheric', { albedoHex: '#A0C0F0', emissive: true });
  addMat('Soul Wisp', 'atmospheric', { albedoHex: '#80A0D0', emissive: true, subsurfaceScattering: true });
  addMat('Portal Energy', 'atmospheric', { albedoHex: '#8040E0', emissive: true });

  // Weave / Lattice energy — 20 materials (Loom-specific)
  addMat('Lattice Strand Bright', 'atmospheric', { albedoHex: '#40E0FF', roughness: 0.05, emissive: true });
  addMat('Lattice Strand Dark', 'atmospheric', { albedoHex: '#1030A0', roughness: 0.05, emissive: true });
  addMat('Weave Anchor Glow', 'atmospheric', { albedoHex: '#F0A000', roughness: 0.02, emissive: true });
  addMat('Silfen Web Fiber', 'atmospheric', { albedoHex: '#C8D4FF', roughness: 0.1, subsurfaceScattering: true, emissive: true });
  addMat('Resonance Pulse', 'atmospheric', { albedoHex: '#E040C0', roughness: 0.0, emissive: true });
  addMat('Temporal Rift', 'atmospheric', { albedoHex: '#202080', roughness: 0.0, emissive: true });
  addMat('Kalon Shimmer', 'atmospheric', { albedoHex: '#FFD700', roughness: 0.02, metallic: 0.9, emissive: true });
  addMat('Void Tear', 'atmospheric', { albedoHex: '#080010', roughness: 0.0, metallic: 0.0, emissive: false });
  addMat('Aether Wash', 'atmospheric', { albedoHex: '#88C0FF', roughness: 0.0, subsurfaceScattering: true, emissive: true });
  addMat('Drake Flame', 'atmospheric', { albedoHex: '#FF6010', roughness: 0.0, emissive: true });
  addMat('Frost Bolt Trail', 'atmospheric', { albedoHex: '#90D0FF', roughness: 0.08, emissive: true, biomes: ['tundra', 'alpine'] });
  addMat('Holy Light Ray', 'atmospheric', { albedoHex: '#FFF8D0', roughness: 0.0, emissive: true });
  addMat('Shadow Tendril', 'atmospheric', { albedoHex: '#0A0A18', roughness: 0.5, emissive: false });
  addMat('Miasma Cloud', 'atmospheric', { albedoHex: '#304020', roughness: 0.5, subsurfaceScattering: true });
  addMat('Celestial Dust', 'atmospheric', { albedoHex: '#D0E8FF', roughness: 0.3, emissive: true });
  addMat('Weave Zone Border', 'atmospheric', { albedoHex: '#6080FF', roughness: 0.02, emissive: true });
  addMat('Lattice Node Core', 'atmospheric', { albedoHex: '#FFFFFF', roughness: 0.0, emissive: true });
  addMat('Resonance Ring', 'atmospheric', { albedoHex: '#FF80C0', roughness: 0.0, emissive: true });
  addMat('Fracture Crack Glow', 'atmospheric', { albedoHex: '#FF2020', roughness: 0.0, emissive: true });
  addMat('Memory Trace', 'atmospheric', { albedoHex: '#A0C0E0', roughness: 0.1, emissive: true, subsurfaceScattering: true });

  // Fabric / Textile — 12 materials
  addMat('Linen Coarse', 'organic', { albedoHex: '#D8CC98', roughness: 0.92 });
  addMat('Velvet Deep Red', 'organic', { albedoHex: '#700018', roughness: 0.98 });
  addMat('Brocade Gold', 'organic', { albedoHex: '#C09020', roughness: 0.6, metallic: 0.2 });
  addMat('Canvas Rough', 'organic', { albedoHex: '#B0A880', roughness: 0.93, windReactive: true });
  addMat('Chain Mail', 'mineral', { albedoHex: '#7A7A7A', roughness: 0.3, metallic: 0.85 });
  addMat('Plate Steel', 'mineral', { albedoHex: '#909090', roughness: 0.18, metallic: 0.95 });
  addMat('Tanned Hide Heavy', 'organic', { albedoHex: '#7A4A28', roughness: 0.76 });
  addMat('Satin Silver', 'organic', { albedoHex: '#D0D8E0', roughness: 0.12, metallic: 0.08 });
  addMat('Embroidered Trim', 'organic', { albedoHex: '#8050A8', roughness: 0.7 });
  addMat('Burlap Sack', 'organic', { albedoHex: '#A89060', roughness: 0.95 });
  addMat('Torn Cloth', 'organic', { albedoHex: '#B8A888', roughness: 0.9, windReactive: true });
  addMat('Banner Dyed', 'architectural', { albedoHex: '#3A5A8A', roughness: 0.82, windReactive: true });

  return materials;
}

// ─── Visual Effects Engine ──────────────────────────────────────────

export interface VisualEffectsEngine {
  readonly updateLighting: (worldId: string, gameHour: number, latitude: number) => Promise<LightingState>;
  readonly updateClouds: (
    worldId: string,
    weatherType: string,
    windSpeedMs: number,
    windDirectionDeg: number,
  ) => Promise<CloudState>;
  readonly updateSeasonalVisuals: (
    worldId: string,
    currentSeason: Season,
    transitionProgress: number,
  ) => Promise<SeasonalVisualState>;
  readonly getMaterialLibrary: () => readonly PbrMaterial[];
  readonly getMaterialsForBiome: (biome: string) => readonly PbrMaterial[];
  readonly getMaterialsByCategory: (category: MaterialCategory) => readonly PbrMaterial[];
}

export interface VfxEngineDeps {
  readonly clock: VfxClockPort;
  readonly ids: VfxIdPort;
  readonly log: VfxLogPort;
  readonly events: VfxEventPort;
  readonly store: VfxStorePort;
}

export function createVisualEffectsEngine(deps: VfxEngineDeps): VisualEffectsEngine {
  const materialLibrary = createDefaultMaterialLibrary();

  return {
    async updateLighting(worldId, gameHour, latitude) {
      const state = computeLightingState(worldId, gameHour, latitude, deps.clock);
      await deps.store.saveLightingState(state);
      deps.events.emit(makeEvent('vfx.lighting.updated', state, deps.ids, deps.clock));
      deps.log.info('Lighting updated', { worldId, gameHour, mode: state.lightingMode });
      return state;
    },

    async updateClouds(worldId, weatherType, windSpeedMs, windDirectionDeg) {
      const state = computeCloudState(worldId, weatherType, windSpeedMs, windDirectionDeg, deps.clock);
      await deps.store.saveCloudState(state);
      deps.events.emit(makeEvent('vfx.clouds.updated', state, deps.ids, deps.clock));
      deps.log.info('Cloud state updated', { worldId, weatherType, coverage: state.overallCoverage });
      return state;
    },

    async updateSeasonalVisuals(worldId, currentSeason, transitionProgress) {
      const state = computeSeasonalVisuals(worldId, currentSeason, transitionProgress, deps.clock);
      await deps.store.saveSeasonalState(state);
      deps.events.emit(makeEvent('vfx.season.updated', state, deps.ids, deps.clock));
      deps.log.info('Seasonal visuals updated', { worldId, currentSeason, transitionProgress });
      return state;
    },

    getMaterialLibrary() {
      return materialLibrary;
    },

    getMaterialsForBiome(biome) {
      return materialLibrary.filter((m) => m.biomes.includes(biome));
    },

    getMaterialsByCategory(category) {
      return materialLibrary.filter((m) => m.category === category);
    },
  };
}
