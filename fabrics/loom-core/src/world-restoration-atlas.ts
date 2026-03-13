/**
 * World Restoration Atlas
 *
 * Focused read model for the 50 canonical world restoration moments already
 * captured in world-fading-profiles.ts. This isolates the celebratory event,
 * guide reaction, and thematic core for systems that only need restoration
 * ceremony data instead of the full luminance-state registry.
 */

import { WORLD_FADING_PROFILES } from './world-fading-profiles.js';

// ── Constants ────────────────────────────────────────────────────

export const TOTAL_WORLD_RESTORATION_PROFILES = 50;

// ── Types ────────────────────────────────────────────────────────

export type RestorationProfileSource = 'world-fading-profile';

export interface WorldRestorationProfile {
  readonly worldId: string;
  readonly worldName: string;
  readonly guideId: string;
  readonly event: string;
  readonly guideReaction: string;
  readonly thematicCore: string;
  readonly source: RestorationProfileSource;
}

export interface WorldRestorationAtlasPort {
  readonly totalProfiles: number;
  getProfile(worldId: string): WorldRestorationProfile | undefined;
  all(): ReadonlyArray<WorldRestorationProfile>;
  getProfilesForRealm(
    realm: 'discovery' | 'expression' | 'exchange' | 'crossroads',
  ): ReadonlyArray<WorldRestorationProfile>;
  searchByText(query: string): ReadonlyArray<WorldRestorationProfile>;
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

// ── Canon Profiles ───────────────────────────────────────────────

const WORLD_RESTORATION_DATA: ReadonlyArray<WorldRestorationProfile> = WORLD_FADING_PROFILES.map((profile) => ({
  worldId: profile.worldId,
  worldName: profile.worldName,
  guideId: profile.guideId,
  event: profile.restorationMoment.event,
  guideReaction: profile.restorationMoment.guideReaction,
  thematicCore: profile.restorationMoment.thematicCore,
  source: 'world-fading-profile',
}));

// ── Implementation ───────────────────────────────────────────────

function getProfile(worldId: string): WorldRestorationProfile | undefined {
  return WORLD_RESTORATION_DATA.find((profile) => profile.worldId === worldId);
}

function all(): ReadonlyArray<WorldRestorationProfile> {
  return WORLD_RESTORATION_DATA;
}

function getProfilesForRealm(
  realm: 'discovery' | 'expression' | 'exchange' | 'crossroads',
): ReadonlyArray<WorldRestorationProfile> {
  const ids = realm === 'discovery'
    ? DISCOVERY_IDS
    : realm === 'expression'
      ? EXPRESSION_IDS
      : realm === 'exchange'
        ? EXCHANGE_IDS
        : CROSSROADS_IDS;

  return WORLD_RESTORATION_DATA.filter((profile) => ids.has(profile.worldId));
}

function searchByText(query: string): ReadonlyArray<WorldRestorationProfile> {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return [];
  }

  return WORLD_RESTORATION_DATA.filter((profile) => {
    const haystack = [
      profile.worldName,
      profile.guideId,
      profile.event,
      profile.guideReaction,
      profile.thematicCore,
    ].join(' ').toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function createWorldRestorationAtlas(): WorldRestorationAtlasPort {
  return {
    totalProfiles: TOTAL_WORLD_RESTORATION_PROFILES,
    getProfile,
    all,
    getProfilesForRealm,
    searchByText,
  };
}

export { WORLD_RESTORATION_DATA as WORLD_RESTORATION_ATLAS };