/**
 * world-bible-registry.ts — Canonical world data from The Concord World Design Bible.
 *
 * Encodes the 8 detailed launch worlds from the World Design Bible Vol 1
 * into WorldEntry structures. Each entry drives KALON issuance, governance,
 * character placement, and environmental setup.
 *
 * The five properties per world:
 *   1. Stellar Class → KALON issuance multiplier
 *   2. Node Density → Lattice resonance concentration
 *   3. Lattice Integrity → degradation from Ascendancy interference
 *   4. Population → NPC count, productivity index
 *   5. Historical State Hash → probability tables for events
 */

import type { WorldEntry } from '@loom/entities-contracts';

// ── Launch Worlds ───────────────────────────────────────────────

const ALKAHEST: WorldEntry = {
  worldNumber: 1,
  name: 'Alkahest',
  worldId: 'alkahest',
  stellarClassFull: 'G2V',
  stellarClass: 'G',
  nodeDensity: 8,
  population: 2_100_000_000,
  transientPopulation: 0,
  kalonIssuanceMillions: 52,
  latticeIntegrity: 97,
  sovereignty: 'assembly-common-trust',
  surveyYear: 0,
  characterSummary: 'The most historically significant and most politically complicated world in the Concord.',
  residentCharacterIds: [2, 3, 5, 6, 7, 8, 14, 15],
};

const MERIDIANS_REST: WorldEntry = {
  worldNumber: 2,
  name: "Meridian's Rest",
  worldId: 'meridians-rest',
  stellarClassFull: 'K1V',
  stellarClass: 'K',
  nodeDensity: 9,
  population: 890_000_000,
  transientPopulation: 0,
  kalonIssuanceMillions: 48,
  latticeIntegrity: 94,
  sovereignty: 'founding-family',
  surveyYear: 0,
  characterSummary: 'Beautiful and aware of it. One of the three highest-node-density worlds in the launch set.',
  residentCharacterIds: [],
};

const AMBER_REACH: WorldEntry = {
  worldNumber: 3,
  name: 'The Amber Reach',
  worldId: 'amber-reach',
  stellarClassFull: 'G5V',
  stellarClass: 'G',
  nodeDensity: 7,
  population: 3_400_000_000,
  transientPopulation: 0,
  kalonIssuanceMillions: 45,
  latticeIntegrity: 99,
  sovereignty: 'commonwealth-trust',
  surveyYear: 0,
  characterSummary: 'The most populous of the launch worlds and the most aggressively democratic.',
  residentCharacterIds: [],
};

const IRON_MERIDIAN: WorldEntry = {
  worldNumber: 4,
  name: 'Iron Meridian',
  worldId: 'iron-meridian',
  stellarClassFull: 'F8V',
  stellarClass: 'F',
  nodeDensity: 5,
  population: 450_000_000,
  transientPopulation: 0,
  kalonIssuanceMillions: 29,
  latticeIntegrity: 88,
  sovereignty: 'industrial-consortium',
  surveyYear: 0,
  characterSummary: 'The Concord\'s primary heavy industrial world. Not beautiful. The NPC population is proud of this.',
  residentCharacterIds: [],
};

const SELENES_CRADLE: WorldEntry = {
  worldNumber: 5,
  name: "Selene's Cradle",
  worldId: 'selenes-cradle',
  stellarClassFull: 'K3V',
  stellarClass: 'K',
  nodeDensity: 6,
  population: 1_200_000_000,
  transientPopulation: 0,
  kalonIssuanceMillions: 36,
  latticeIntegrity: 100,
  sovereignty: 'lattice-covenant',
  surveyYear: 0,
  characterSummary: 'The only launch world under Lattice Covenant administration. Integrity has never dropped below 100%.',
  residentCharacterIds: [10],
};

const VEIL_OF_KASS: WorldEntry = {
  worldNumber: 6,
  name: 'The Veil of Kass',
  worldId: 'veil-of-kass',
  stellarClassFull: 'Binary K2/M4',
  stellarClass: 'binary',
  nodeDensity: 8,
  population: 620_000_000,
  transientPopulation: 0,
  kalonIssuanceMillions: 58,
  latticeIntegrity: 82,
  sovereignty: 'contested',
  surveyYear: 0,
  characterSummary: 'The most politically volatile and most economically productive. Seven sovereignty transitions in 105 years.',
  residentCharacterIds: [],
};

const DEEP_TIDAL: WorldEntry = {
  worldNumber: 7,
  name: 'Deep Tidal',
  worldId: 'deep-tidal',
  stellarClassFull: 'M2V',
  stellarClass: 'M',
  nodeDensity: 4,
  population: 89_000_000,
  transientPopulation: 0,
  kalonIssuanceMillions: 14,
  latticeIntegrity: 96,
  sovereignty: 'survey-corps',
  surveyYear: 0,
  characterSummary: 'Permanently Survey Corps administered. Tidal locking creates Day Side, Night Side, and the Twilight Belt.',
  residentCharacterIds: [9, 11],
};

const VARANTHA_STATION: WorldEntry = {
  worldNumber: 8,
  name: 'Varantha Station',
  worldId: 'varantha-station',
  stellarClassFull: 'G8V',
  stellarClass: 'G',
  nodeDensity: 7,
  population: 340_000_000,
  transientPopulation: 2_300_000,
  kalonIssuanceMillions: 38,
  latticeIntegrity: 93,
  sovereignty: 'free-port-compact',
  surveyYear: 0,
  characterSummary: 'The Concord\'s primary commercial hub. The most KALON changes hands here.',
  residentCharacterIds: [12, 13],
};

// ── Registry ────────────────────────────────────────────────────

const CANON_WORLDS: ReadonlyArray<WorldEntry> = [
  ALKAHEST,
  MERIDIANS_REST,
  AMBER_REACH,
  IRON_MERIDIAN,
  SELENES_CRADLE,
  VEIL_OF_KASS,
  DEEP_TIDAL,
  VARANTHA_STATION,
];

const WORLD_BY_ID = new Map<string, WorldEntry>(
  CANON_WORLDS.map((w) => [w.worldId, w]),
);

// ── Public API ──────────────────────────────────────────────────

/** Get a world by its canonical world ID. */
export function getWorldById(worldId: string): WorldEntry | undefined {
  return WORLD_BY_ID.get(worldId);
}

/** Get all registered launch worlds. */
export function getAllWorlds(): ReadonlyArray<WorldEntry> {
  return CANON_WORLDS;
}

/** Get world count. */
export function getWorldCount(): number {
  return CANON_WORLDS.length;
}

/** Get worlds filtered by stellar class. */
export function getWorldsByStellarClass(stellarClass: WorldEntry['stellarClass']): ReadonlyArray<WorldEntry> {
  return CANON_WORLDS.filter((w) => w.stellarClass === stellarClass);
}

/** Get worlds filtered by sovereignty type. */
export function getWorldsBySovereignty(sovereignty: WorldEntry['sovereignty']): ReadonlyArray<WorldEntry> {
  return CANON_WORLDS.filter((w) => w.sovereignty === sovereignty);
}

/**
 * KALON issuance multiplier per stellar class.
 * Matches the World Design Bible specification.
 */
export const STELLAR_ISSUANCE_MULTIPLIER: Readonly<Record<string, number>> = {
  G: 1.0,
  K: 0.85,
  M: 0.6,
  F: 1.2,
  binary: 1.4,
  anomalous: 1.0,
};
