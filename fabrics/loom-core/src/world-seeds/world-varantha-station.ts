/**
 * world-varantha-station.ts — World Seed: Varantha Station
 *
 * Varantha Station is the Concord's primary commercial hub. More KALON
 * changes hands here than on any other world. The permanent population
 * of 340 million is supplemented at any given time by approximately 2.3
 * million transient residents — traders, transit passengers, seasonal
 * labour contractors, and a category the Free Port Compact calls
 * "unclassified commercial visitors" that accounts for roughly 240,000
 * people the Compact cannot track very well and has decided not to try.
 *
 * SOVEREIGNTY: FREE PORT COMPACT
 * ────────────────────────────────
 * The Free Port Compact is an internal agreement, not a treaty with the
 * Assembly. Varantha Station declared free-port status in Year 38 after
 * successfully arguing in Chronicle review that the Assembly's standard
 * trading protocols were incompatible with the volume of transactions
 * the world naturally processed. The Assembly agreed to a review. The
 * review lasted nine years. The Compact has been operating without
 * challenge since Year 47. Eight worlds have formal trade agreements
 * with Varantha Station. The other worlds trade with Varantha Station
 * informally and in larger volumes.
 *
 * THE G8V STAR
 * ────────────
 * An older, slightly cooler G-type star. Good photovoltaic output; steady
 * node density of 7. No special stellar effects — just reliable light
 * and reliable Lattice transit. The Compact considers this ideal. Drama
 * belongs in the ledger columns, not the sky.
 *
 * NODE DENSITY: 7
 * ───────────────
 * Solid. Sufficient. The Compact invests in node stability rather than
 * expansion — they need reliability for transaction throughput, not
 * novelty. The Varantha node cluster has the best uptime record of any
 * launch world cluster, maintained by a Survey Corps liaison team that
 * the Compact pays at premium rates and treats very well.
 *
 * KEY CHARACTERS
 * ──────────────
 * DAGNA THORVALDSEN-MBEKI — The Compact's KALON Oversight Director.
 *   Technically a KALON Oversight appointment reporting to the Concord
 *   Assembly rather than the Compact, but the Compact was part of the
 *   selection process and Dagna's operational relationship with Varantha
 *   Station is constructive. Tracks all KALON flows in and out. Known
 *   for very precise language and very precise records. Interactions:
 *   talk, inspect.
 *
 * LUCA OKONKWO-REINHOLT — Survey Corps liaison for the Varantha node
 *   cluster. Responsible for the cluster's industry-leading uptime.
 *   Handles node certification, maintenance scheduling, and the
 *   Compact's quarterly infrastructure report. Has a standing request
 *   in with the Corps for one additional junior technician; has been
 *   making this request for three years. Interactions: talk.
 *
 * COMPACT TRADE REGISTRAR VOSS-AMARA — Tracks incoming and outgoing trade
 *   declarations. Manages the formal side of a system that still has a
 *   large informal side. Tier 1. Interactions: talk, trade.
 *
 * TRANSIT BERTH COORDINATOR OSEI-FERREIRA — Manages the 2.3 million
 *   transient population's berth allocations and transit clearances.
 *   The logistics are not small. Tier 1. Interactions: talk, inspect.
 *
 * FREE PORT COMPACT HISTORICAL ARCHIVIST — Maintains the records from Year
 *   38 through the nine-year review and into the current period. Non-
 *   combatant. The Year 38 declaration document is the archivist's primary
 *   reference and point of pride. Tier 0. Interactions: talk, inspect.
 *
 * INTERACTABLE OBJECTS
 * ────────────────────
 * THE VARANTHA EXCHANGE — The primary KALON exchange floor. Highest
 *   transaction volume in the Concord by a significant margin. Use opens
 *   the live KALON flow dashboard. Interactable: inspect, use.
 *
 * THE FREE PORT COMPACT CHARTER — Year 38 declaration, Year 47 confirmation,
 *   eight formal trade agreement annexes. The most annotated governing
 *   document in the Concord. Interactable: inspect.
 *
 * NODE CLUSTER — VARANTHA STATION (DENSITY 7) — Best uptime in the Concord.
 *   Use opens transit bridge to any connected world. Interactable: inspect, use.
 *
 * TRANSIT BERTH MANIFEST — CURRENT PERIOD — The live register of transient
 *   population assignments. 2.3 million entries, updated continuously.
 *   Interactable: inspect.
 *
 * KALON OVERSIGHT RECORDS — ANNUAL SUMMARY — Dagna Thorvaldsen-Mbeki's
 *   annual summary reports. Filed annually since Year 89. Each report is
 *   precise, accurate, and very long. Interactable: inspect.
 */

import type { WorldSeedConfig, NpcSeed, ObjectSeed, SpawnPointSeed } from '../world-seed-system.js';

// ── World Constants ───────────────────────────────────────────────────────────

export const WORLD_VARANTHA_STATION_ID = 'varantha-station';
export const WORLD_VARANTHA_STATION_DISPLAY_NAME = 'Varantha Station';

/** Distance from Origin in light-years (outer arc). */
export const WORLD_VARANTHA_STATION_DISTANCE_LY = 134;

/** Lattice node density at Varantha Station — best uptime in the Concord. */
export const WORLD_VARANTHA_STATION_NODE_DENSITY = 7;

/** Permanent resident population. */
export const WORLD_VARANTHA_STATION_POPULATION = 340_000_000;

/** Transient resident population (traders, transit, seasonal labour). */
export const WORLD_VARANTHA_STATION_TRANSIENT_POPULATION = 2_300_000;

// ── Spawn Points ──────────────────────────────────────────────────────────────

const SPAWN_POINTS: ReadonlyArray<SpawnPointSeed> = [
  // ── Player arrival points ──
  // Primary: Varantha Exchange district — the commercial and administrative centre.
  { position: { x: 0,    y: 0, z: 0  }, spawnType: 'player', capacity: 25 },
  // Secondary: Transit Berth sector — for arriving transient visitors.
  { position: { x: 90,   y: 0, z: 40 }, spawnType: 'player', capacity: 15 },
  // Tertiary: Node Cluster area — Survey Corps liaison sector.
  { position: { x: -60,  y: 0, z: 20 }, spawnType: 'player', capacity: 10 },

  // ── NPC stations ──
  // Index 3: Dagna Thorvaldsen-Mbeki — KALON Oversight office.
  { position: { x: 22,   y: 0, z: 18 }, spawnType: 'npc', capacity: 1 },
  // Index 4: Luca Okonkwo-Reinholt — node cluster maintenance station.
  { position: { x: -58,  y: 0, z: 22 }, spawnType: 'npc', capacity: 1 },
  // Index 5: Compact Trade Registrar Voss-Amara — trade declarations office.
  { position: { x: 10,   y: 0, z: 8  }, spawnType: 'npc', capacity: 1 },
  // Index 6: Transit Berth Coordinator Osei-Ferreira — berth allocation post.
  { position: { x: 88,   y: 0, z: 38 }, spawnType: 'npc', capacity: 1 },
  // Index 7: Free Port Compact Historical Archivist — compact archive.
  { position: { x: -15,  y: 0, z: 10 }, spawnType: 'npc', capacity: 1 },
];

// ── NPCs ──────────────────────────────────────────────────────────────────────

const NPCS: ReadonlyArray<NpcSeed> = [
  // Dagna Thorvaldsen-Mbeki — KALON Oversight Director (tier 2, neutral)
  {
    spawnPointIndex: 3,
    displayName: 'Dagna Thorvaldsen-Mbeki',
    tier: 2,
    hostility: 'neutral',
    health: 300,
    interactions: ['talk', 'inspect'],
  },
  // Luca Okonkwo-Reinholt — Survey Corps node liaison (tier 2, neutral)
  {
    spawnPointIndex: 4,
    displayName: 'Luca Okonkwo-Reinholt',
    tier: 2,
    hostility: 'neutral',
    health: 300,
    interactions: ['talk'],
  },
  // Compact Trade Registrar Voss-Amara (tier 1, neutral — trade-enabled)
  {
    spawnPointIndex: 5,
    displayName: 'Compact Trade Registrar Voss-Amara',
    tier: 1,
    hostility: 'neutral',
    health: 230,
    interactions: ['talk', 'trade'],
  },
  // Transit Berth Coordinator Osei-Ferreira (tier 1, friendly)
  {
    spawnPointIndex: 6,
    displayName: 'Transit Berth Coordinator Osei-Ferreira',
    tier: 1,
    hostility: 'friendly',
    health: 210,
    interactions: ['talk', 'inspect'],
  },
  // Free Port Compact Historical Archivist (tier 0, friendly — non-combatant)
  {
    spawnPointIndex: 7,
    displayName: 'Free Port Compact Historical Archivist',
    tier: 0,
    hostility: 'friendly',
    health: 1,
    interactions: ['talk', 'inspect'],
  },
];

// ── Objects ───────────────────────────────────────────────────────────────────

const OBJECTS: ReadonlyArray<ObjectSeed> = [
  // The Varantha Exchange — highest KALON transaction volume; use opens dashboard.
  {
    position: { x: 12,   y: 0, z: 10  },
    entityType: 'object',
    displayName: 'The Varantha Exchange',
    interactions: ['inspect', 'use'],
  },
  // The Free Port Compact Charter — Year 38 declaration; most annotated in Concord.
  {
    position: { x: -13,  y: 0, z: 8   },
    entityType: 'object',
    displayName: 'The Free Port Compact Charter',
    interactions: ['inspect'],
  },
  // Node Cluster — Varantha Station (Density 7) — best uptime; use opens transit.
  {
    position: { x: -62,  y: 0, z: 21  },
    entityType: 'object',
    displayName: 'Node Cluster — Varantha Station',
    interactions: ['inspect', 'use'],
    health: 700,
  },
  // Transit Berth Manifest — Current Period — 2.3 million transient entries.
  {
    position: { x: 90,   y: 0, z: 36  },
    entityType: 'object',
    displayName: 'Transit Berth Manifest — Current Period',
    interactions: ['inspect'],
  },
  // KALON Oversight Records — Annual Summary — Dagna's precise annual reports.
  {
    position: { x: 24,   y: 0, z: 16  },
    entityType: 'object',
    displayName: 'KALON Oversight Records — Annual Summary',
    interactions: ['inspect'],
  },
];

// ── World Seed Export ─────────────────────────────────────────────────────────

/**
 * The canonical WorldSeedConfig for Varantha Station — World 8.
 *
 * Pass to seedWorld() during server initialisation when this world loads.
 * The application tier must also:
 *   - Register the Varantha Station node cluster with lattice-node.ts
 *     (density: WORLD_VARANTHA_STATION_NODE_DENSITY — premium uptime SLA)
 *   - Activate the Varantha Exchange KALON flow dashboard on use interaction
 *   - Set Node Cluster use to open full Concord transit bridge
 *   - Flag the Historical Archivist as non-combatant (tier 0, health 1)
 *   - Track transient population separately from permanent population
 *     (WORLD_VARANTHA_STATION_TRANSIENT_POPULATION)
 */
export const WORLD_VARANTHA_STATION_SEED: WorldSeedConfig = {
  worldId: WORLD_VARANTHA_STATION_ID,
  spawnPoints: SPAWN_POINTS,
  npcs: NPCS,
  objects: OBJECTS,
};

/**
 * Lore summary for the galaxy map tooltip and the Chronicle index.
 */
export const WORLD_VARANTHA_STATION_LORE_SUMMARY = [
  `Distance from Origin: ${WORLD_VARANTHA_STATION_DISTANCE_LY} LY (outer arc). Class G8V.`,
  `Lattice node density: ${WORLD_VARANTHA_STATION_NODE_DENSITY} — best uptime record in the Concord.`,
  `Population: ${WORLD_VARANTHA_STATION_POPULATION.toLocaleString()} permanent + ${WORLD_VARANTHA_STATION_TRANSIENT_POPULATION.toLocaleString()} transient.`,
  `Sovereignty: Free Port Compact (declared Year 38, confirmed Year 47).`,
  `Status: Open. The Concord's primary commercial hub. Most KALON changes hands here.`,
].join('\n');
