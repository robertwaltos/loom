/**
 * world-selenes-cradle.ts — World Seed: Selene's Cradle
 *
 * Selene's Cradle is the only launch world under Lattice Covenant
 * administration. Its lattice integrity has never once dropped below 100%.
 * In 105 years, across every political upheaval in the Concord, through
 * every governance crisis and sovereignty dispute on other worlds, Selene's
 * Cradle's nodes have held at full precision. The Covenant does not
 * advertise this. They do not need to.
 *
 * WORLD CHARACTER
 * ───────────────
 * 1.2 billion people under Covenant stewardship. The Cradle functions as
 * the Concord's primary node study site — not by designation, but by the
 * simple fact that researchers from every other world request transfer
 * here to be closer to the cleanest Lattice signal in the mapped galaxy.
 *
 * The world is named for Selene Voss, the first Lattice Covenant steward,
 * who chose this site specifically for what she detected in Year 1. What
 * she detected is the subject of ongoing scholarly disagreement. What she
 * recorded is the subject of one of Itoro Adeyemi-Okafor's more carefully
 * guarded Chronicle files.
 *
 * The landscape is gentle by design — Covenant settlements minimise
 * environmental disruption and build around node concentrations rather than
 * flattening terrain to accommodate grid layouts. Buildings here look like
 * they grew from the ground. Some of them, in the Lattice sense, did.
 *
 * NODE DENSITY: 6
 * ───────────────
 * Not the densest. But the cleanest. Node density 6 at perfect integrity
 * produces a signal-to-noise ratio that exceeds density-8 worlds operating
 * at normal degradation. The research value is therefore higher than the
 * raw number suggests. The Covenant tracks this distinction carefully and
 * does not publish the comparison.
 *
 * KEY CHARACTERS
 * ──────────────
 * BROTHER EKUNDAYO MANU — The current Lattice Covenant steward. Title
 *   'Brother' is Covenant tradition — not religious, despite the appearance.
 *   Ekundayo has stewarded the Cradle for forty-one years. He is the only
 *   person in the Concord who has personally verified every node in the
 *   cluster at full integrity at least once. He has done it three times.
 *   Interactions: talk, inspect.
 *
 * COVENANT SENIOR RESEARCHER AMARA — Senior research fellow. Has published
 *   more papers on Lattice node coherence than anyone active. Their primary
 *   finding — that node integrity is correlated with continuity of purpose
 *   in stewardship communities — has not been disputed, only ignored.
 *   Interactions: talk, inspect.
 *
 * NODE VERIFICATION WARDEN OSEI-VOSS — The operational node-check officer.
 *   Runs daily verification cycles on all active nodes. Has flagged zero
 *   degradation events in twelve years of service. Their predecessor in
 *   this role also flagged zero degradation events in thirty years of
 *   service. Interactions: inspect.
 *
 * INTERACTABLE OBJECTS
 * ────────────────────
 * THE COVENANT SANCTUM — The administrative heart of the Lattice Covenant
 *   on Selene's Cradle. Access is by appointment. The architecture is the
 *   same gentle organic-settlement style as the rest of the Cradle — no
 *   fortification, no security theatre. The integrity of the place is its
 *   own protection. Interactable: inspect.
 *
 * NODE CLUSTER — SELENE PRIMARY — The strongest node cluster on the world.
 *   The coordinates Selene Voss wrote down in Year 1. Still active. Still
 *   at the same position. Interactable: inspect, use.
 *
 * THE SELENE VOSS MEMORIAL MARKER — Year 30 installation. Plain stone with
 *   her name, her steward years, and one sentence: 'She listened.' The
 *   sentence is controversial. The Covenant declined to comment when asked
 *   to elaborate. Interactable: inspect.
 *
 * COVENANT RESEARCH ARCHIVE — The accumulated study records for Selene's
 *   Cradle node cluster. Every researcher who has studied here has
 *   contributed. The archive is technically open. Practically, reading it
 *   requires a background in Lattice coherence theory and twenty-three
 *   years. Interactable: inspect.
 *
 * INTEGRITY VERIFICATION BOARD — The daily node-check log. Twelve years of
 *   zero-degradation entries in Node Verification Warden Osei-Voss's hand.
 *   Thirty additional years before that. Very long. Very consistent.
 *   Interactable: inspect.
 */

import type { WorldSeedConfig, NpcSeed, ObjectSeed, SpawnPointSeed } from '../world-seed-system.js';

// ── World Constants ───────────────────────────────────────────────────────────

export const WORLD_SELENES_CRADLE_ID = 'selenes-cradle';
export const WORLD_SELENES_CRADLE_DISPLAY_NAME = "Selene's Cradle";

/** Distance from Origin in light-years (inner-to-mid arc). */
export const WORLD_SELENES_CRADLE_DISTANCE_LY = 57;

/** Lattice node density at Selene's Cradle. */
export const WORLD_SELENES_CRADLE_NODE_DENSITY = 6;

/** Lattice integrity — has never dropped below this value. */
export const WORLD_SELENES_CRADLE_LATTICE_INTEGRITY = 100;

/** Years since the Covenant has logged any degradation event (zero). */
export const WORLD_SELENES_CRADLE_DEGRADATION_EVENTS = 0;

// ── Spawn Points ──────────────────────────────────────────────────────────────

const SPAWN_POINTS: ReadonlyArray<SpawnPointSeed> = [
  // ── Player arrival points ──
  // Primary: Covenant settlement main approach path.
  { position: { x: 0,   y: 0, z: 0  }, spawnType: 'player', capacity: 15 },
  // Secondary: Research archive entrance path.
  { position: { x: -50, y: 0, z: 60 }, spawnType: 'player', capacity: 10 },

  // ── NPC stations ──
  // Index 2: Brother Ekundayo Manu — Covenant Sanctum entrance.
  { position: { x: 35,  y: 0, z: 30 }, spawnType: 'npc', capacity: 1 },
  // Index 3: Covenant Senior Researcher Amara — research study.
  { position: { x: -45, y: 0, z: 65 }, spawnType: 'npc', capacity: 1 },
  // Index 4: Node Verification Warden Osei-Voss — primary node cluster post.
  { position: { x: -10, y: 0, z: 20 }, spawnType: 'npc', capacity: 1 },
];

// ── NPCs ──────────────────────────────────────────────────────────────────────

const NPCS: ReadonlyArray<NpcSeed> = [
  // Brother Ekundayo Manu — Lattice Covenant steward (TIER_3, neutral, extended role)
  {
    spawnPointIndex: 2,
    displayName: 'Ekundayo Manu',
    tier: 2,
    hostility: 'neutral',
    health: 300,
    interactions: ['talk', 'inspect'],
  },
  // Covenant Senior Researcher Amara (tier 1, friendly)
  {
    spawnPointIndex: 3,
    displayName: 'Covenant Senior Researcher Amara',
    tier: 1,
    hostility: 'friendly',
    health: 200,
    interactions: ['talk', 'inspect'],
  },
  // Node Verification Warden Osei-Voss (tier 0, friendly — non-combatant)
  {
    spawnPointIndex: 4,
    displayName: 'Node Verification Warden Osei-Voss',
    tier: 0,
    hostility: 'friendly',
    health: 1,
    interactions: ['inspect'],
  },
];

// ── Objects ───────────────────────────────────────────────────────────────────

const OBJECTS: ReadonlyArray<ObjectSeed> = [
  // The Covenant Sanctum — administrative heart; access by appointment.
  {
    position: { x: 38,  y: 0, z: 34  },
    entityType: 'object',
    displayName: 'The Covenant Sanctum',
    interactions: ['inspect'],
    health: 600, // structurally reinforced — integrity is its own protection
  },
  // Node Cluster — Selene Primary — the original Year 1 coordinates.
  {
    position: { x: -8,  y: 0, z: 18  },
    entityType: 'object',
    displayName: 'Node Cluster — Selene Primary',
    interactions: ['inspect', 'use'],
  },
  // The Selene Voss Memorial Marker — "She listened." Year 30.
  {
    position: { x: 10,  y: 0, z: 5   },
    entityType: 'object',
    displayName: 'The Selene Voss Memorial Marker',
    interactions: ['inspect'],
  },
  // Covenant Research Archive — open in theory; vast in practice.
  {
    position: { x: -48, y: 0, z: 62  },
    entityType: 'object',
    displayName: 'Covenant Research Archive',
    interactions: ['inspect'],
  },
  // Integrity Verification Board — forty-two years of zero-degradation entries.
  {
    position: { x: -12, y: 0, z: 22  },
    entityType: 'object',
    displayName: 'Integrity Verification Board',
    interactions: ['inspect'],
  },
];

// ── World Seed Export ─────────────────────────────────────────────────────────

/**
 * The canonical WorldSeedConfig for Selene's Cradle — World 5.
 *
 * Pass to seedWorld() during server initialisation when this world loads.
 * The application tier must also:
 *   - Register the Selene's Cradle node cluster with lattice-node.ts
 *     (density: WORLD_SELENES_CRADLE_NODE_DENSITY,
 *      integrity: WORLD_SELENES_CRADLE_LATTICE_INTEGRITY)
 *   - Set Ekundayo Manu as the active Covenant steward in npc-relationship-registry.ts
 *   - Set Node Verification Warden Osei-Voss as non-combat-flagged in npc-ai-system.ts
 */
export const WORLD_SELENES_CRADLE_SEED: WorldSeedConfig = {
  worldId: WORLD_SELENES_CRADLE_ID,
  spawnPoints: SPAWN_POINTS,
  npcs: NPCS,
  objects: OBJECTS,
};

/**
 * Lore summary for the galaxy map tooltip and the Chronicle index.
 */
export const WORLD_SELENES_CRADLE_LORE_SUMMARY = [
  `Distance from Origin: ${WORLD_SELENES_CRADLE_DISTANCE_LY} LY (inner-to-mid arc).`,
  `Lattice node density: ${WORLD_SELENES_CRADLE_NODE_DENSITY}. Integrity: ${WORLD_SELENES_CRADLE_LATTICE_INTEGRITY}% — never degraded.`,
  `Population: 1.2 billion. Sovereignty: Lattice Covenant. Degradation events logged: ${WORLD_SELENES_CRADLE_DEGRADATION_EVENTS}.`,
  `The only launch world under Covenant administration. Named for Selene Voss, first steward.`,
  `Status: Open. Node integrity has never dropped below 100% in 105 years.`,
].join('\n');
