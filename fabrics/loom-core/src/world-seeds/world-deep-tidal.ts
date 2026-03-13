/**
 * world-deep-tidal.ts — World Seed: Deep Tidal
 *
 * Deep Tidal is permanently Survey Corps administered — not because no one
 * else wants it, but because the administrative challenge of a tidal-locked
 * M2V world was, in the early years, genuinely beyond the capacity of any
 * commercial operator who attempted it. Three attempts. Three withdrawals.
 * The Survey Corps arrived in Year 31, assessed the situation, and has not
 * left. They administer 89 million people across three fundamentally
 * different planetary environments, and they are good at it.
 *
 * TIDAL LOCKING
 * ─────────────
 * Deep Tidal is locked to its M2V star. One face perpetually toward the
 * star; one face permanently away; a narrow belt — the Twilight Belt —
 * where the sun sits fixed near the horizon. The Survey Corps long ago
 * stopped trying to impose a unified planetary administrative structure
 * across all three zones. Each zone governs itself according to the logic
 * of its environment. The Admiral's office coordinates between them.
 *
 * The Day Side: Extreme irradiance managed by albedo structures and deep
 * subsurface habitation. 23 million residents. Highly industrial; the
 * Survey Corps runs the surface extraction operations.
 *
 * The Night Side: Cold, dark, lit by infrared. Predominantly research
 * installations. 19 million residents. The Survey Corps astronomical
 * observatory on the Night Side is among the finest vantage points in the
 * Concord for deep-field observation.
 *
 * The Twilight Belt: The habitable zone where the vast majority of Deep
 * Tidal's population lives. 47 million residents. The permanent near-
 * horizon sun produces a specific quality of light that residents consider
 * unremarkable and visitors find spectacular. The Corps administrative
 * headquarters is here.
 *
 * NODE DENSITY: 4
 * ───────────────
 * The lowest of any launch world. An M2V star produces limited photovoltaic
 * output; what the Lattice nodes receive is shared across three very
 * different zones with very different transit demands. The Survey Corps has
 * formally requested a node amplification study. The request is in queue.
 *
 * KEY CHARACTERS
 * ──────────────
 * ADMIRAL YARA SUNDARAM-CHEN — The senior Survey Corps commander for Deep
 *   Tidal. The rank of Admiral here is an administrative designation, not
 *   naval; the Corps adapted maritime governance terminology for tidal-locked
 *   worlds. Runs the three-zone administrative system from the Twilight Belt
 *   HQ with a thoroughness that is either admirable or exhausting depending
 *   on whether you are a subordinate. Interactions: talk, inspect.
 *
 * CAPTAIN ODALYS FERREIRA-ASANTE — Survey Corps operations captain. When
 *   she was assigned to Deep Tidal six years ago, her first recorded
 *   administrative note was: "The node density is inadequate. I will file
 *   a request." She has filed four requests. The queue is long. She is
 *   related, by a family connection she rarely discusses, to Dr. Cassia
 *   Ferreira-Asante of world-499. Interactions: talk, inspect.
 *
 * TWILIGHT BELT LIAISON OKONKWO — The civilian-side administrative bridge
 *   between the Survey Corps and the 47 million Belt residents. Has been
 *   in the liaison office for eighteen years and knows the Twilight Belt
 *   better than anyone alive. Interactions: talk.
 *
 * NIGHT SIDE RESEARCH STATION DIRECTOR VOSS-CHEN — Runs the Night Side
 *   observatory and research installation. Deeply resistant to any
 *   suggestion that the observatory should be relocated or subordinated
 *   to another world's research programme. Has documentation prepared.
 *   Interactions: talk, inspect.
 *
 * SURVEY CORPS FIELD ARCHIVIST ACHEBE — Maintains the field survey records
 *   for all three zones. Non-combatant. The archives pre-date the current
 *   administrative regime. Interactions: talk, inspect.
 *
 * INTERACTABLE OBJECTS
 * ────────────────────
 * THE ADMIRALTY OPERATIONS BOARD — The three-zone coordination display in
 *   the Twilight Belt HQ. Real-time status of Day Side, Night Side, and
 *   Belt operations. Use opens the current zone status log.
 *   Interactable: inspect, use.
 *
 * THE TWILIGHT OBSERVATORY PLATFORM — Not the Night Side observatory; this
 *   is a smaller installation in the Belt, positioned to study the terminator
 *   effect. Open to visitors. Interactable: inspect.
 *
 * NODE CLUSTER — DEEP TIDAL (DENSITY 4) — Four nodes serving three very
 *   different population zones. The cluster monitor shows utilisation stats.
 *   Uses: bridge transit request. Interactable: inspect, use.
 *
 * SURVEY CORPS TIDAL LOCK ASSESSMENT — FIRST SURVEY, YEAR 31 — The original
 *   Corps assessment document that led to their assumption of administration.
 *   Three commercial withdrawal notices are archived alongside it.
 *   Interactable: inspect.
 *
 * TWILIGHT BELT ZONE CHARTER — The administrative document governing Belt
 *   self-governance under Corps oversight. Currently in its fourth revision.
 *   The fourth revision is disputed. Interactable: inspect.
 */

import type { WorldSeedConfig, NpcSeed, ObjectSeed, SpawnPointSeed } from '../world-seed-system.js';

// ── World Constants ───────────────────────────────────────────────────────────

export const WORLD_DEEP_TIDAL_ID = 'deep-tidal';
export const WORLD_DEEP_TIDAL_DISPLAY_NAME = 'Deep Tidal';

/** Distance from Origin in light-years (outer arc). */
export const WORLD_DEEP_TIDAL_DISTANCE_LY = 112;

/** Lattice node density at Deep Tidal — lowest of all launch worlds. */
export const WORLD_DEEP_TIDAL_NODE_DENSITY = 4;

/** Number of distinct tidal zones (Day Side, Night Side, Twilight Belt). */
export const WORLD_DEEP_TIDAL_TIDAL_ZONE_COUNT = 3;

/** Twilight Belt resident population (majority of planetary population). */
export const WORLD_DEEP_TIDAL_TWILIGHT_BELT_POPULATION = 47_000_000;

// ── Spawn Points ──────────────────────────────────────────────────────────────

const SPAWN_POINTS: ReadonlyArray<SpawnPointSeed> = [
  // ── Player arrival points ──
  // Primary: Twilight Belt HQ approach — administrative and habitation hub.
  { position: { x: 0,   y: 0, z: 0  }, spawnType: 'player', capacity: 20 },
  // Secondary: Twilight Observatory Platform approach.
  { position: { x: 80,  y: 0, z: 30 }, spawnType: 'player', capacity: 8  },
  // Tertiary: Node Cluster perimeter — for Lattice-focused arrivals.
  { position: { x: -50, y: 0, z: 20 }, spawnType: 'player', capacity: 8  },

  // ── NPC stations ──
  // Index 3: Admiral Yara Sundaram-Chen — Admiralty Operations Board.
  { position: { x: 20,  y: 0, z: 15 }, spawnType: 'npc', capacity: 1 },
  // Index 4: Captain Odalys Ferreira-Asante — operations command annex.
  { position: { x: 15,  y: 0, z: 8  }, spawnType: 'npc', capacity: 1 },
  // Index 5: Twilight Belt Liaison Okonkwo — civilian liaison office.
  { position: { x: -5,  y: 0, z: 25 }, spawnType: 'npc', capacity: 1 },
  // Index 6: Night Side Research Station Director Voss-Chen — secure comms.
  { position: { x: 10,  y: 0, z: 30 }, spawnType: 'npc', capacity: 1 },
  // Index 7: Survey Corps Field Archivist Achebe — survey records office.
  { position: { x: -20, y: 0, z: 5  }, spawnType: 'npc', capacity: 1 },
];

// ── NPCs ──────────────────────────────────────────────────────────────────────

const NPCS: ReadonlyArray<NpcSeed> = [
  // Admiral Yara Sundaram-Chen (tier 2, neutral — senior command)
  {
    spawnPointIndex: 3,
    displayName: 'Admiral Yara Sundaram-Chen',
    tier: 2,
    hostility: 'neutral',
    health: 500,
    interactions: ['talk', 'inspect'],
  },
  // Captain Odalys Ferreira-Asante (tier 2, neutral — operations)
  {
    spawnPointIndex: 4,
    displayName: 'Captain Odalys Ferreira-Asante',
    tier: 2,
    hostility: 'neutral',
    health: 400,
    interactions: ['talk', 'inspect'],
  },
  // Twilight Belt Liaison Okonkwo (tier 1, friendly — civilian liaison)
  {
    spawnPointIndex: 5,
    displayName: 'Twilight Belt Liaison Okonkwo',
    tier: 1,
    hostility: 'friendly',
    health: 200,
    interactions: ['talk'],
  },
  // Night Side Research Station Director Voss-Chen (tier 1, neutral)
  {
    spawnPointIndex: 6,
    displayName: 'Research Station Director Voss-Chen',
    tier: 1,
    hostility: 'neutral',
    health: 220,
    interactions: ['talk', 'inspect'],
  },
  // Survey Corps Field Archivist Achebe (tier 0, friendly — non-combatant)
  {
    spawnPointIndex: 7,
    displayName: 'Survey Corps Field Archivist Achebe',
    tier: 0,
    hostility: 'friendly',
    health: 1,
    interactions: ['talk', 'inspect'],
  },
];

// ── Objects ───────────────────────────────────────────────────────────────────

const OBJECTS: ReadonlyArray<ObjectSeed> = [
  // The Admiralty Operations Board — three-zone status; use opens zone log.
  {
    position: { x: 18,  y: 0, z: 12  },
    entityType: 'object',
    displayName: 'The Admiralty Operations Board',
    interactions: ['inspect', 'use'],
  },
  // The Twilight Observatory Platform — terminator study installation.
  {
    position: { x: 82,  y: 0, z: 28  },
    entityType: 'object',
    displayName: 'The Twilight Observatory Platform',
    interactions: ['inspect'],
  },
  // Node Cluster — Deep Tidal (Density 4) — lowest density; bridge transit.
  {
    position: { x: -52, y: 0, z: 18  },
    entityType: 'object',
    displayName: 'Node Cluster — Deep Tidal',
    interactions: ['inspect', 'use'],
    health: 600,
  },
  // Survey Corps Tidal Lock Assessment — First Survey, Year 31.
  {
    position: { x: -18, y: 0, z: 6   },
    entityType: 'object',
    displayName: 'Survey Corps Tidal Lock Assessment — First Survey, Year 31',
    interactions: ['inspect'],
  },
  // Twilight Belt Zone Charter — fourth revision, currently disputed.
  {
    position: { x: -8,  y: 0, z: 22  },
    entityType: 'object',
    displayName: 'Twilight Belt Zone Charter',
    interactions: ['inspect'],
  },
];

// ── World Seed Export ─────────────────────────────────────────────────────────

/**
 * The canonical WorldSeedConfig for Deep Tidal — World 7.
 *
 * Pass to seedWorld() during server initialisation when this world loads.
 * The application tier must also:
 *   - Register the Deep Tidal node cluster with lattice-node.ts
 *     (density: WORLD_DEEP_TIDAL_NODE_DENSITY — Survey Corps amplification
 *      study pending)
 *   - Set the three tidal zone context flags (day-side, night-side, twilight-belt)
 *   - Activate the Admiralty Operations Board zone log on use interaction
 *   - Flag Archivist Achebe as non-combatant (tier 0, health 1)
 *   - Note Odalys Ferreira-Asante family connection to world-499 Cassia
 */
export const WORLD_DEEP_TIDAL_SEED: WorldSeedConfig = {
  worldId: WORLD_DEEP_TIDAL_ID,
  spawnPoints: SPAWN_POINTS,
  npcs: NPCS,
  objects: OBJECTS,
};

/**
 * Lore summary for the galaxy map tooltip and the Chronicle index.
 */
export const WORLD_DEEP_TIDAL_LORE_SUMMARY = [
  `Distance from Origin: ${WORLD_DEEP_TIDAL_DISTANCE_LY} LY (outer arc). Class M2V — tidal-locked.`,
  `Lattice node density: ${WORLD_DEEP_TIDAL_NODE_DENSITY} — lowest of all launch worlds. Amplification study pending.`,
  `Tidal zones: ${WORLD_DEEP_TIDAL_TIDAL_ZONE_COUNT} (Day Side, Night Side, Twilight Belt). Belt population: ${WORLD_DEEP_TIDAL_TWILIGHT_BELT_POPULATION.toLocaleString()}.`,
  `Sovereignty: Survey Corps (permanent administration since Year 31).`,
  `Status: Open. Administered by Admiral Yara Sundaram-Chen.`,
].join('\n');
