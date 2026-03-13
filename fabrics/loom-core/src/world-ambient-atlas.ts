/**
 * World Ambient Atlas
 *
 * Canonical registry for ambient creature/effect presence across all 50 Koydo
 * Worlds. Uses the restored ambient state from world-fading-profiles.ts for
 * complete coverage, and preserves the explicit Ambient Life lists that appear
 * in Expansion Bible v5 Part 2 for the first 10 worlds.
 */

import { WORLD_DESIGN_ATLAS } from './world-design-atlas.js';
import { WORLD_FADING_PROFILES } from './world-fading-profiles.js';

// ── Constants ────────────────────────────────────────────────────

export const TOTAL_WORLD_AMBIENT_PROFILES = 50;

// ── Types ────────────────────────────────────────────────────────

export type AmbientProfileSource = 'fading-profile' | 'hybrid';

export interface AmbientElement {
  readonly name: string;
  readonly detail: string;
}

export interface WorldAmbientProfile {
  readonly worldId: string;
  readonly worldName: string;
  readonly guideId: string;
  readonly restoredAmbientLife: string;
  readonly explicitAmbientElements: ReadonlyArray<AmbientElement>;
  readonly source: AmbientProfileSource;
}

export interface WorldAmbientAtlasPort {
  readonly totalProfiles: number;
  getProfile(worldId: string): WorldAmbientProfile | undefined;
  all(): ReadonlyArray<WorldAmbientProfile>;
  getProfilesWithExplicitAmbientLife(): ReadonlyArray<WorldAmbientProfile>;
  getProfilesForRealm(
    realm: 'discovery' | 'expression' | 'exchange' | 'crossroads',
  ): ReadonlyArray<WorldAmbientProfile>;
}

// ── Realm Tags ───────────────────────────────────────────────────

const DISCOVERY_IDS = new Set([
  'cloud-kingdom', 'savanna-workshop', 'tideline-bay', 'meadow-lab',
  'starfall-observatory', 'number-garden', 'calculation-caves', 'magnet-hills',
  'circuit-marsh', 'code-canyon', 'body-atlas', 'frost-peaks',
  'greenhouse-spiral', 'data-stream', 'map-room',
]);

const EXPRESSION_IDS = new Set([
  'story-tree', 'rhyme-docks', 'letter-forge', 'reading-reef',
  'grammar-bridge', 'vocabulary-jungle', 'punctuation-station', 'debate-arena',
  'diary-lighthouse', 'spelling-mines', 'translation-garden', 'nonfiction-fleet',
  'illustration-cove', 'folklore-bazaar', 'editing-tower',
]);

const EXCHANGE_IDS = new Set([
  'market-square', 'savings-vault', 'budget-kitchen', 'entrepreneur-workshop',
  'sharing-meadow', 'investment-greenhouse', 'needs-wants-bridge', 'barter-docks',
  'debt-glacier', 'job-fair', 'charity-harbor', 'tax-office',
]);

const CROSSROADS_IDS = new Set([
  'great-archive', 'workshop-crossroads', 'discovery-trail', 'thinking-grove',
  'wellness-garden', 'time-gallery', 'music-meadow', 'everywhere',
]);

// ── Explicit Ambient Life From Expansion Bible v5 ───────────────

const EXPLICIT_AMBIENT_BY_WORLD = new Map<string, ReadonlyArray<AmbientElement>>([
  ['cloud-kingdom', [
    { name: 'Cloud foxes', detail: 'Translucent creatures made of mist.' },
    { name: 'Wind sprites', detail: 'Visible only during gusts.' },
    { name: 'Prism beetles', detail: 'Create tiny rainbows when they cross sunlight.' },
  ]],
  ['savanna-workshop', [
    { name: 'Weaver birds', detail: 'Build nests using engineering principles.' },
    { name: 'Dung beetles', detail: 'Roll perfect spheres that echo geometry.' },
    { name: 'Termite mounds', detail: 'Visible in the distance as natural engineering marvels.' },
  ]],
  ['tideline-bay', [
    { name: 'Schools of fish', detail: 'React to the child’s presence.' },
    { name: 'Dolphins', detail: 'Visible from the surface.' },
    { name: 'Bioluminescent jellyfish', detail: 'Drift at depth.' },
    { name: 'Mantis shrimp', detail: 'Most colorful animal in the bay.' },
    { name: 'Whale song', detail: 'Echoes from beyond the map boundary.' },
  ]],
  ['meadow-lab', [
    { name: 'Butterflies', detail: 'Species change seasonally and appear everywhere.' },
    { name: 'Dormouse', detail: 'Sleeps in a different spot each visit.' },
    { name: 'Earthworms', detail: 'Visible through the glass floor.' },
    { name: 'Birdsong', detail: 'Scientifically accurate to the biome.' },
  ]],
  ['starfall-observatory', [
    { name: 'Fireflies', detail: 'Form constellation patterns.' },
    { name: 'Barn owl', detail: 'Acts as a symbol of night wisdom.' },
    { name: 'Shooting stars', detail: 'Appear as subtle rewards when a child completes a task.' },
  ]],
  ['number-garden', [
    { name: 'Snails', detail: 'Carry perfect logarithmic spiral shells.' },
    { name: 'Ants', detail: 'March in formation like counting made visible.' },
    { name: 'Spiderwebs', detail: 'Catch dew in geometric patterns.' },
  ]],
  ['calculation-caves', [
    { name: 'Crystal moths', detail: 'Have transparent mathematical wings.' },
    { name: 'Echo bats', detail: 'Their sounds multiply as they fly.' },
    { name: 'Blind cave fish', detail: 'Sensitive to vibration in the same way Cal senses mathematical truth.' },
  ]],
  ['magnet-hills', [
    { name: 'Compass deer', detail: 'Antlers always point north.' },
    { name: 'Lodestone beetles', detail: 'Stick to everything metallic.' },
    { name: 'Aurora moths', detail: 'Create northern-light effects in groups.' },
  ]],
  ['circuit-marsh', [
    { name: 'Electric eels', detail: 'Move through the creek.' },
    { name: 'Fireflies', detail: 'Pulse in sync like alternating current.' },
    { name: 'Frogs', detail: 'Croaks create sparks.' },
  ]],
  ['code-canyon', [
    { name: 'Pixel sprites', detail: 'Tiny versions of Pixel representing programming concepts.' },
    { name: 'Debug moths', detail: 'Literal descendants of the original bug.' },
    { name: 'Cursor birds', detail: 'Follow the child’s gaze.' },
  ]],
]);

// ── Canon Profiles ───────────────────────────────────────────────

const WORLD_AMBIENT_DATA: ReadonlyArray<WorldAmbientProfile> = WORLD_DESIGN_ATLAS.map((designProfile) => {
  const fadingProfile = WORLD_FADING_PROFILES.find((profile) => profile.worldId === designProfile.worldId);
  if (fadingProfile === undefined) {
    throw new Error(`Missing fading profile for ${designProfile.worldId}`);
  }

  const explicitAmbientElements = EXPLICIT_AMBIENT_BY_WORLD.get(designProfile.worldId) ?? [];

  return {
    worldId: designProfile.worldId,
    worldName: designProfile.worldName,
    guideId: designProfile.guideId,
    restoredAmbientLife: fadingProfile.high.ambientLife,
    explicitAmbientElements,
    source: explicitAmbientElements.length > 0 ? 'hybrid' : 'fading-profile',
  };
});

// ── Implementation ───────────────────────────────────────────────

function getProfile(worldId: string): WorldAmbientProfile | undefined {
  return WORLD_AMBIENT_DATA.find((profile) => profile.worldId === worldId);
}

function all(): ReadonlyArray<WorldAmbientProfile> {
  return WORLD_AMBIENT_DATA;
}

function getProfilesWithExplicitAmbientLife(): ReadonlyArray<WorldAmbientProfile> {
  return WORLD_AMBIENT_DATA.filter((profile) => profile.explicitAmbientElements.length > 0);
}

function getProfilesForRealm(
  realm: 'discovery' | 'expression' | 'exchange' | 'crossroads',
): ReadonlyArray<WorldAmbientProfile> {
  const ids = realm === 'discovery'
    ? DISCOVERY_IDS
    : realm === 'expression'
      ? EXPRESSION_IDS
      : realm === 'exchange'
        ? EXCHANGE_IDS
        : CROSSROADS_IDS;

  return WORLD_AMBIENT_DATA.filter((profile) => ids.has(profile.worldId));
}

export function createWorldAmbientAtlas(): WorldAmbientAtlasPort {
  return {
    totalProfiles: TOTAL_WORLD_AMBIENT_PROFILES,
    getProfile,
    all,
    getProfilesWithExplicitAmbientLife,
    getProfilesForRealm,
  };
}

export { WORLD_AMBIENT_DATA as WORLD_AMBIENT_ATLAS };