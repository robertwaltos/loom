/**
 * world-amber-reach.ts — World Seed: The Amber Reach
 *
 * The Amber Reach is the most populous world in the Concord and the most
 * aggressively democratic. 3.4 billion people. Every governance decision
 * goes to a binding referendum. The queue for referendums has never once
 * cleared; there are currently 847 pending questions. The residents regard
 * this as a feature.
 *
 * WORLD CHARACTER
 * ───────────────
 * The Commonwealth Trust that governs the Amber Reach operates on a legal
 * premise that other worlds find either inspiring or exhausting: every
 * adult resident is a deliberant. There are no representatives, only
 * mandates. The civil service exists solely to implement the outcomes of
 * votes and to ensure the next vote is properly constituted.
 *
 * The world's name comes from its sun — a G5V star that produces amber-
 * spectrum afternoon light distinctly warmer than Alkahest's. The Amber
 * Cascade, a tiered river formation at the civic centre, catches this
 * light and turns the whole administrative district gold for an hour each
 * day. Planning documents for the original settlement included specific
 * requirements for this effect. The Reach has always known what it was.
 *
 * NODE DENSITY: 7
 * ───────────────
 * Sufficient for reliable Lattice transit. The resonance here feels
 * broader than at Meridian's Rest or Alkahest — less concentrated but
 * more pervasive. Residents say the Lattice on the Amber Reach "listens
 * to crowds." Scholars have not confirmed or denied this description.
 *
 * KEY CHARACTERS
 * ──────────────
 * PEOPLE'S TRIBUNE OSEI-AMARA — The Tribune is not a position of power;
 *   it is a position of logistics. The Tribune ensures referendums are
 *   correctly constituted. The current holder of this role has overseen
 *   three hundred and twelve binding votes. They have opinions about
 *   none of them, officially. Interactions: talk.
 *
 * LABOR REGISTRAR NKECHI BABALOLA — Manages the labor allocation mandate
 *   records. Every work assignment on the Amber Reach flows from a
 *   mandate. Every mandate is on file. Every file is cross-referenced
 *   with the KALON issuance tables. This office has never made an error
 *   that was not caught in the same working day. Interactions: talk, inspect.
 *
 * CHRONICLE SUBMISSION OFFICER ADISA — The officer responsible for
 *   assessing and forwarding events to the Pillar board for inscription
 *   consideration. Has a backlog. Has always had a backlog. Interactions: talk.
 *
 * REACH MARKET EXCHANGE COORDINATOR — Manages the clearinghouse for KALON
 *   exchange within the Reach. Reports to the labor mandate board. Not an
 *   independent position. Interactions: talk, trade.
 *
 * SURVEY REGISTRAR YEMI OKAFOR-NWOSU — Administers the Reach's open
 *   survey registration program. Any resident may register a survey claim;
 *   the results belong to the Commonwealth. This officer processes around
 *   forty claims a week. Interactions: talk, inspect.
 *
 * INTERACTABLE OBJECTS
 * ────────────────────
 * THE AMBER FORUM — The primary civic deliberation space. The referendum
 *   boards are here — every pending question posted, every active vote
 *   counting. The noise level is proportional to the number of pending
 *   referendums. Interactable: inspect, use (opens referendum viewer).
 *
 * THE REFERENDUM PILLAR — Equivalent to Alkahest's Chronicle Pillar but
 *   different: it records not events but binding vote outcomes. Every
 *   mandate in the Reach's history is inscribed, with the vote count.
 *   Interactable: inspect.
 *
 * REACH MARKET EXCHANGE — The KALON clearinghouse. Transactions audited
 *   and publicly posted. No private transactions on the Amber Reach.
 *   Interactable: inspect, use.
 *
 * THE AMBER CASCADE — The tiered river formation at the civic centre.
 *   Amber light for one hour a day. The settlement planners built the
 *   entire layout to face this. Interactable: inspect.
 *
 * SURVEY MARKER — AR-YEAR23 — Original survey stake. The year inscribed
 *   is Year 23 despite the Amber Reach being a founding world — the first
 *   marker was lost in a flooding event in Year 22. This is the second
 *   marker. Itoro Adeyemi-Okafor has noted the discrepancy. Interactable:
 *   inspect.
 *
 * LABOR MANDATE ARCHIVE — The full record of every labor assignment in
 *   the Reach since Year 0. Publicly accessible. Very large. Interactable:
 *   inspect.
 */

import type { WorldSeedConfig, NpcSeed, ObjectSeed, SpawnPointSeed } from '../world-seed-system.js';

// ── World Constants ───────────────────────────────────────────────────────────

export const WORLD_AMBER_REACH_ID = 'amber-reach';
export const WORLD_AMBER_REACH_DISPLAY_NAME = 'The Amber Reach';

/** Distance from Origin in light-years (inner arc). */
export const WORLD_AMBER_REACH_DISTANCE_LY = 23;

/** Lattice node density at the Amber Reach. */
export const WORLD_AMBER_REACH_NODE_DENSITY = 7;

/** Number of pending referendums at world initialisation (canonical figure). */
export const WORLD_AMBER_REACH_PENDING_REFERENDUMS = 847;

// ── Spawn Points ──────────────────────────────────────────────────────────────

const SPAWN_POINTS: ReadonlyArray<SpawnPointSeed> = [
  // ── Player arrival points ──
  // Primary: Forum approach concourse, central civic district.
  { position: { x: 0,   y: 0, z: 0  }, spawnType: 'player', capacity: 20 },
  // Secondary: Market Exchange quarter.
  { position: { x: 90,  y: 0, z: 40 }, spawnType: 'player', capacity: 15 },
  // Tertiary: Survey district, near the Survey Registrar.
  { position: { x: -80, y: 0, z: 60 }, spawnType: 'player', capacity: 10 },
  // Quaternary: Labor mandate district.
  { position: { x: 40,  y: 0, z: -50}, spawnType: 'player', capacity: 10 },

  // ── NPC stations ──
  // Index 4: People's Tribune — Tribune administration hall.
  { position: { x: 15,  y: 0, z: 20  }, spawnType: 'npc', capacity: 1 },
  // Index 5: Labor Registrar Nkechi Babalola — labor mandate office.
  { position: { x: 45,  y: 0, z: -45 }, spawnType: 'npc', capacity: 1 },
  // Index 6: Chronicle Submission Officer Adisa — Pillar registry desk.
  { position: { x: 5,   y: 0, z: 15  }, spawnType: 'npc', capacity: 1 },
  // Index 7: Market Exchange Coordinator — clearinghouse floor.
  { position: { x: 95,  y: 0, z: 35  }, spawnType: 'npc', capacity: 1 },
  // Index 8: Survey Registrar Yemi Okafor-Nwosu — survey district office.
  { position: { x: -75, y: 0, z: 65  }, spawnType: 'npc', capacity: 1 },
];

// ── NPCs ──────────────────────────────────────────────────────────────────────

const NPCS: ReadonlyArray<NpcSeed> = [
  // People's Tribune Osei-Amara (tier 2, neutral — position not power)
  {
    spawnPointIndex: 4,
    displayName: "People's Tribune Osei-Amara",
    tier: 2,
    hostility: 'neutral',
    health: 300,
    interactions: ['talk'],
  },
  // Labor Registrar Nkechi Babalola (tier 1, friendly, efficient)
  {
    spawnPointIndex: 5,
    displayName: 'Nkechi Babalola',
    tier: 1,
    hostility: 'friendly',
    health: 200,
    interactions: ['talk', 'inspect'],
  },
  // Chronicle Submission Officer Adisa (tier 1, friendly)
  {
    spawnPointIndex: 6,
    displayName: 'Chronicle Submission Officer Adisa',
    tier: 1,
    hostility: 'friendly',
    health: 180,
    interactions: ['talk'],
  },
  // Market Exchange Coordinator (tier 1, neutral, trade-enabled)
  {
    spawnPointIndex: 7,
    displayName: 'Reach Market Exchange Coordinator',
    tier: 1,
    hostility: 'neutral',
    health: 200,
    interactions: ['talk', 'trade'],
  },
  // Survey Registrar Yemi Okafor-Nwosu (tier 1, friendly)
  {
    spawnPointIndex: 8,
    displayName: 'Survey Registrar Yemi Okafor-Nwosu',
    tier: 1,
    hostility: 'friendly',
    health: 200,
    interactions: ['talk', 'inspect'],
  },
];

// ── Objects ───────────────────────────────────────────────────────────────────

const OBJECTS: ReadonlyArray<ObjectSeed> = [
  // The Amber Forum — referendum boards; use opens referendum viewer.
  {
    position: { x: 12,  y: 0, z: 18  },
    entityType: 'object',
    displayName: 'The Amber Forum',
    interactions: ['inspect', 'use'],
  },
  // The Referendum Pillar — binding vote outcomes since Year 0.
  {
    position: { x: 8,   y: 0, z: 22  },
    entityType: 'object',
    displayName: 'The Referendum Pillar',
    interactions: ['inspect'],
  },
  // Reach Market Exchange — KALON clearinghouse; use accesses live rates.
  {
    position: { x: 88,  y: 0, z: 38  },
    entityType: 'object',
    displayName: 'Reach Market Exchange',
    interactions: ['inspect', 'use'],
  },
  // The Amber Cascade — tiered river formation, amber light for one hour.
  {
    position: { x: -15, y: 0, z: 30  },
    entityType: 'object',
    displayName: 'The Amber Cascade',
    interactions: ['inspect'],
  },
  // Survey Marker — AR-Year23 — the second marker; first was lost Year 22.
  {
    position: { x: -78, y: 0, z: 70  },
    entityType: 'object',
    displayName: 'Survey Marker — AR-Year23',
    interactions: ['inspect'],
  },
  // Labor Mandate Archive — full public record of all labor assignments.
  {
    position: { x: 42,  y: 0, z: -42 },
    entityType: 'object',
    displayName: 'Labor Mandate Archive',
    interactions: ['inspect'],
    health: 500, // structurally reinforced — the entire record of labor
  },
];

// ── World Seed Export ─────────────────────────────────────────────────────────

/**
 * The canonical WorldSeedConfig for The Amber Reach — World 3.
 *
 * Pass to seedWorld() during server initialisation when this world loads.
 * The application tier must also:
 *   - Register the Amber Reach node cluster with lattice-node.ts
 *     (density: WORLD_AMBER_REACH_NODE_DENSITY)
 *   - Activate the Amber Forum referendum viewer on use interaction
 *   - Set the Amber Cascade's amber-light trigger for the one-hour cycle
 */
export const WORLD_AMBER_REACH_SEED: WorldSeedConfig = {
  worldId: WORLD_AMBER_REACH_ID,
  spawnPoints: SPAWN_POINTS,
  npcs: NPCS,
  objects: OBJECTS,
};

/**
 * Lore summary for the galaxy map tooltip and the Chronicle index.
 */
export const WORLD_AMBER_REACH_LORE_SUMMARY = [
  `Distance from Origin: ${WORLD_AMBER_REACH_DISTANCE_LY} LY (inner arc).`,
  `Lattice node density: ${WORLD_AMBER_REACH_NODE_DENSITY}. Pending referendums: ${WORLD_AMBER_REACH_PENDING_REFERENDUMS}.`,
  `Population: 3.4 billion (most populous launch world). Sovereignty: Commonwealth Trust.`,
  `Every governance decision is a binding referendum. No representatives, only mandates.`,
  `Status: Open. The most aggressively democratic world in the Concord.`,
].join('\n');
