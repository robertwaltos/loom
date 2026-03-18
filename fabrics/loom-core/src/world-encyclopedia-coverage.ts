/**
 * World Encyclopedia Coverage
 *
 * Coverage read model for the current 50-world canon against the existing
 * encyclopedia registry. This module intentionally performs exact world-ID
 * matching only, so callers can see which current worlds have direct entry
 * coverage and which encyclopedia entries still live under legacy world IDs.
 */

import {
  ENCYCLOPEDIA_ENTRIES,
  TOTAL_ENCYCLOPEDIA_ENTRIES,
  type EntryType,
} from './encyclopedia-entries.js';
import { WORLD_DESIGN_ATLAS } from './world-design-atlas.js';

// ── Constants ────────────────────────────────────────────────────

export const TOTAL_WORLD_ENCYCLOPEDIA_COVERAGE_PROFILES = 50;
export const ACTUAL_ENCYCLOPEDIA_ENTRY_TOTAL = ENCYCLOPEDIA_ENTRIES.length;

// ── Types ────────────────────────────────────────────────────────

export type EncyclopediaCoverageStatus = 'direct-entries' | 'no-direct-entries';

export interface WorldEncyclopediaCoverageProfile {
  readonly worldId: string;
  readonly worldName: string;
  readonly guideId: string;
  readonly directEntryCount: number;
  readonly directEntryIds: ReadonlyArray<string>;
  readonly directEntryTypes: ReadonlyArray<EntryType>;
  readonly historicalFigures: ReadonlyArray<string>;
  readonly coverageStatus: EncyclopediaCoverageStatus;
}

export interface LegacyEncyclopediaWorldCoverage {
  readonly legacyWorldId: string;
  readonly totalEntries: number;
}

export interface WorldEncyclopediaCoveragePort {
  readonly totalProfiles: number;
  readonly totalLegacyWorldIds: number;
  readonly declaredEncyclopediaEntryTotal: number;
  readonly actualEncyclopediaEntryTotal: number;
  getProfile(worldId: string): WorldEncyclopediaCoverageProfile | undefined;
  all(): ReadonlyArray<WorldEncyclopediaCoverageProfile>;
  getProfilesWithDirectEntries(): ReadonlyArray<WorldEncyclopediaCoverageProfile>;
  getProfilesWithoutDirectEntries(): ReadonlyArray<WorldEncyclopediaCoverageProfile>;
  getLegacyWorldCoverage(): ReadonlyArray<LegacyEncyclopediaWorldCoverage>;
}

// ── Helpers ──────────────────────────────────────────────────────

function unique<T>(values: ReadonlyArray<T>): ReadonlyArray<T> {
  return [...new Set(values)];
}

const CANON_WORLD_IDS = new Set(WORLD_DESIGN_ATLAS.map((profile) => profile.worldId));

const DIRECT_ENTRIES_BY_WORLD = new Map<string, typeof ENCYCLOPEDIA_ENTRIES>(
  WORLD_DESIGN_ATLAS.map((profile) => [
    profile.worldId,
    ENCYCLOPEDIA_ENTRIES.filter((entry) => entry.worldId === profile.worldId),
  ]),
);

// ── Canon Coverage Profiles ─────────────────────────────────────

const WORLD_ENCYCLOPEDIA_COVERAGE_DATA: ReadonlyArray<WorldEncyclopediaCoverageProfile> = WORLD_DESIGN_ATLAS.map((profile) => {
  const directEntries = DIRECT_ENTRIES_BY_WORLD.get(profile.worldId) ?? [];

  return {
    worldId: profile.worldId,
    worldName: profile.worldName,
    guideId: profile.guideId,
    directEntryCount: directEntries.length,
    directEntryIds: directEntries.map((entry) => entry.entryId),
    directEntryTypes: unique(directEntries.map((entry) => entry.type)),
    historicalFigures: unique(
      directEntries.flatMap((entry) => entry.historicalFigures ?? []),
    ),
    coverageStatus: directEntries.length > 0 ? 'direct-entries' : 'no-direct-entries',
  };
});

const LEGACY_ENCYCLOPEDIA_WORLD_COVERAGE: ReadonlyArray<LegacyEncyclopediaWorldCoverage> = unique(
  ENCYCLOPEDIA_ENTRIES
    .map((entry) => entry.worldId)
    .filter((worldId) => !CANON_WORLD_IDS.has(worldId)),
).map((legacyWorldId) => ({
  legacyWorldId,
  totalEntries: ENCYCLOPEDIA_ENTRIES.filter((entry) => entry.worldId === legacyWorldId).length,
})).sort((left, right) => left.legacyWorldId.localeCompare(right.legacyWorldId));

export const TOTAL_LEGACY_ENCYCLOPEDIA_WORLD_IDS = LEGACY_ENCYCLOPEDIA_WORLD_COVERAGE.length;

// ── Implementation ───────────────────────────────────────────────

function getProfile(worldId: string): WorldEncyclopediaCoverageProfile | undefined {
  return WORLD_ENCYCLOPEDIA_COVERAGE_DATA.find((profile) => profile.worldId === worldId);
}

function all(): ReadonlyArray<WorldEncyclopediaCoverageProfile> {
  return WORLD_ENCYCLOPEDIA_COVERAGE_DATA;
}

function getProfilesWithDirectEntries(): ReadonlyArray<WorldEncyclopediaCoverageProfile> {
  return WORLD_ENCYCLOPEDIA_COVERAGE_DATA.filter((profile) => profile.directEntryCount > 0);
}

function getProfilesWithoutDirectEntries(): ReadonlyArray<WorldEncyclopediaCoverageProfile> {
  return WORLD_ENCYCLOPEDIA_COVERAGE_DATA.filter((profile) => profile.directEntryCount === 0);
}

function getLegacyWorldCoverage(): ReadonlyArray<LegacyEncyclopediaWorldCoverage> {
  return LEGACY_ENCYCLOPEDIA_WORLD_COVERAGE;
}

export function createWorldEncyclopediaCoverage(): WorldEncyclopediaCoveragePort {
  return {
    totalProfiles: TOTAL_WORLD_ENCYCLOPEDIA_COVERAGE_PROFILES,
    totalLegacyWorldIds: TOTAL_LEGACY_ENCYCLOPEDIA_WORLD_IDS,
    declaredEncyclopediaEntryTotal: TOTAL_ENCYCLOPEDIA_ENTRIES,
    actualEncyclopediaEntryTotal: ACTUAL_ENCYCLOPEDIA_ENTRY_TOTAL,
    getProfile,
    all,
    getProfilesWithDirectEntries,
    getProfilesWithoutDirectEntries,
    getLegacyWorldCoverage,
  };
}

// Sanity check: exact-match direct coverage plus legacy coverage must account
// for every encyclopedia entry currently in the registry.
if (
  WORLD_ENCYCLOPEDIA_COVERAGE_DATA.reduce((sum, profile) => sum + profile.directEntryCount, 0)
  + LEGACY_ENCYCLOPEDIA_WORLD_COVERAGE.reduce((sum, legacy) => sum + legacy.totalEntries, 0)
  !== ACTUAL_ENCYCLOPEDIA_ENTRY_TOTAL
) {
  throw new Error('World encyclopedia coverage does not account for all encyclopedia entries.');
}

export {
  LEGACY_ENCYCLOPEDIA_WORLD_COVERAGE,
  WORLD_ENCYCLOPEDIA_COVERAGE_DATA as WORLD_ENCYCLOPEDIA_COVERAGE,
};