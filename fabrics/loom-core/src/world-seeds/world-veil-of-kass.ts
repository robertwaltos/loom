/**
 * world-veil-of-kass.ts — World Seed: The Veil of Kass
 *
 * The Veil of Kass is the most politically volatile and the most
 * economically productive launch world. Seven sovereignty transitions in
 * 105 years. 620 million people who have, across those transitions,
 * developed a relationship with instability that borders on expertise.
 *
 * WORLD CHARACTER
 * ───────────────
 * Binary system: K2 and M4 orbiting each other at close range. The tidal
 * forces produce a unique atmospheric effect — a luminous haze at certain
 * orbital positions that refracts the paired-star light into what early
 * surveyors called "the veil." The name stuck. The effect is beautiful.
 * The political situation has not historically been.
 *
 * The current sovereignty holder is the Free Commerce Syndicate — the
 * fifth administration in the world's history and, so far, the longest-
 * running consecutive governance at twenty-one years. The Syndicate's
 * theory of governance is minimal interference in trade plus aggressive
 * investment in the Lattice transit infrastructure that makes trade
 * possible. Node density 8 is partly natural; partly the result of
 * forty years of Syndicate investment in node amplification.
 *
 * THE KALON QUESTION
 * ──────────────────
 * The Veil of Kass issues more KALON per cycle than any other world
 * (58 million per cycle). This is because the binary-star system produces
 * exceptional photovoltaic output, which the Syndicate converts into
 * productive capacity, which the Lattice economy rewards. The Assembly
 * has enquired about this formula seventeen times. The Syndicate has
 * responded to all seventeen enquiries with the same answer: efficiency.
 *
 * NODE DENSITY: 8
 * ───────────────
 * Matched only by Alkahest. Here, though, density-8 is partly engineered.
 * The Syndicate's Node Amplification Programme — completed Year 83 — added
 * three synthetic nodes to the cluster. The Lattice Covenant has not
 * formally objected. The Covenant's position on synthetic nodes is a
 * document that has been in draft status since Year 84.
 *
 * KEY CHARACTERS
 * ──────────────
 * SYNDICATE DIRECTOR RAEL KASS-VOSS — The seventh Director. Named for the
 *   world, which is named for a person named Kass who may or may not have
 *   existed. The Director does not find this ironic. Manages the Syndicate's
 *   operations with a practical directness that other worlds find refreshing
 *   until they are on the receiving end of it. Interactions: talk, trade.
 *
 * COMMERCE REGISTRAR DJEMBA-NWOSU — Tracks every KALON transaction
 *   routed through Veil of Kass. Every transaction. The Registrar's office
 *   is the single most data-dense room in the Concord. They are aware of
 *   this and consider it an achievement. Interactions: talk, inspect.
 *
 * SOVEREIGNTY TRANSIT OFFICER ADISA-VOSS — Manages the transit records
 *   from all seven sovereignty periods. Is the only person on the world who
 *   knows the contents of the sealed records from the third administration.
 *   Does not discuss the sealed records. Interactions: talk, inspect.
 *
 * NODE AMPLIFICATION TECHNICIAN SOREN MERIDIAN — Survey Corps liaison to
 *   the synthetic node programme. Not from the Veil of Kass; seconded from
 *   Meridian's Rest. Professionally interested in the Covenant's draft
 *   objection document. Nobody at the Covenant will return their calls.
 *   Interactions: talk, inspect.
 *
 * FREE PORT TRANSIT BROKER AMARA-KASS — The primary outbound trade broker.
 *   Manages the allocation of outbound cargo to receiving worlds. Has more
 *   standing trade relationships than any other broker in the Concord.
 *   Interactions: talk, trade.
 *
 * INTERACTABLE OBJECTS
 * ────────────────────
 * THE VEIL EXCHANGE — The Syndicate's primary KALON trading floor. The
 *   highest-volume KALON exchange in the Concord. Use opens the live
 *   exchange rate viewer. Interactable: inspect, use.
 *
 * THE SOVEREIGNTY RECORD BOARD — All seven administration transitions
 *   documented. The entries from transitions two and five are notably
 *   brief. Transition three's entry was amended in Year 97 with three
 *   words. Itoro Adeyemi-Okafor filed a Chronicle annotation.
 *   Interactable: inspect.
 *
 * NODE AMPLIFICATION ARRAY — THREE SYNTHETIC NODES — The Year 83 addition.
 *   Active. Operating within parameters. The Covenant's draft objection
 *   document does not dispute this. Interactable: inspect, use.
 *
 * THE BINARY OBSERVATION PLATFORM — Positioned for optimal viewing of the
 *   veil effect at the right orbital position. The Syndicate built this
 *   for visitors. It is genuinely impressive. Interactable: inspect.
 *
 * KALON ISSUANCE REGISTRY — CYCLE RECORDS — The running record of KALON
 *   issuance per productive cycle. Seventeen Assembly enquiry letters are
 *   filed here. Seventeen identical responses are filed beside them.
 *   Interactable: inspect.
 */

import type { WorldSeedConfig, NpcSeed, ObjectSeed, SpawnPointSeed } from '../world-seed-system.js';

// ── World Constants ───────────────────────────────────────────────────────────

export const WORLD_VEIL_OF_KASS_ID = 'veil-of-kass';
export const WORLD_VEIL_OF_KASS_DISPLAY_NAME = 'The Veil of Kass';

/** Distance from Origin in light-years (mid arc). */
export const WORLD_VEIL_OF_KASS_DISTANCE_LY = 78;

/** Lattice node density at Veil of Kass (includes 3 synthetic nodes). */
export const WORLD_VEIL_OF_KASS_NODE_DENSITY = 8;

/** Number of sovereignty transitions in 105 years. */
export const WORLD_VEIL_OF_KASS_SOVEREIGNTY_TRANSITIONS = 7;

/** KALON issuance per cycle in millions — highest of all launch worlds. */
export const WORLD_VEIL_OF_KASS_KALON_ISSUANCE_MILLIONS = 58;

// ── Spawn Points ──────────────────────────────────────────────────────────────

const SPAWN_POINTS: ReadonlyArray<SpawnPointSeed> = [
  // ── Player arrival points ──
  // Primary: Veil Exchange district approach — the economic hub.
  { position: { x: 0,   y: 0, z: 0  }, spawnType: 'player', capacity: 20 },
  // Secondary: Binary Observation Platform viewing approach.
  { position: { x: 100, y: 0, z: 70 }, spawnType: 'player', capacity: 10 },
  // Tertiary: Node Amplification Array perimeter.
  { position: { x: -70, y: 0, z: 30 }, spawnType: 'player', capacity: 10 },

  // ── NPC stations ──
  // Index 3: Syndicate Director Rael Kass-Voss — operations command post.
  { position: { x: 25,  y: 0, z: 20 }, spawnType: 'npc', capacity: 1 },
  // Index 4: Commerce Registrar Djemba-Nwosu — transaction records office.
  { position: { x: 15,  y: 0, z: 10 }, spawnType: 'npc', capacity: 1 },
  // Index 5: Sovereignty Transit Officer Adisa-Voss — sovereignty archive.
  { position: { x: -10, y: 0, z: 50 }, spawnType: 'npc', capacity: 1 },
  // Index 6: Node Amplification Technician Soren Meridian — at the array.
  { position: { x: -65, y: 0, z: 32 }, spawnType: 'npc', capacity: 1 },
  // Index 7: Free Port Transit Broker Amara-Kass — freight allocation desk.
  { position: { x: 30,  y: 0, z: -10}, spawnType: 'npc', capacity: 1 },
];

// ── NPCs ──────────────────────────────────────────────────────────────────────

const NPCS: ReadonlyArray<NpcSeed> = [
  // Syndicate Director Rael Kass-Voss (tier 2, neutral — trade-enabled)
  {
    spawnPointIndex: 3,
    displayName: 'Rael Kass-Voss',
    tier: 2,
    hostility: 'neutral',
    health: 350,
    interactions: ['talk', 'trade'],
  },
  // Commerce Registrar Djemba-Nwosu (tier 1, neutral — data office)
  {
    spawnPointIndex: 4,
    displayName: 'Commerce Registrar Djemba-Nwosu',
    tier: 1,
    hostility: 'neutral',
    health: 250,
    interactions: ['talk', 'inspect'],
  },
  // Sovereignty Transit Officer Adisa-Voss (tier 1, neutral — sealed records)
  {
    spawnPointIndex: 5,
    displayName: 'Sovereignty Transit Officer Adisa-Voss',
    tier: 1,
    hostility: 'neutral',
    health: 200,
    interactions: ['talk', 'inspect'],
  },
  // Node Amplification Technician Soren Meridian (tier 1, friendly — Survey Corps)
  {
    spawnPointIndex: 6,
    displayName: 'Soren Meridian',
    tier: 1,
    hostility: 'friendly',
    health: 220,
    interactions: ['talk', 'inspect'],
  },
  // Free Port Transit Broker Amara-Kass (tier 1, neutral — trade-enabled)
  {
    spawnPointIndex: 7,
    displayName: 'Free Port Transit Broker Amara-Kass',
    tier: 1,
    hostility: 'neutral',
    health: 220,
    interactions: ['talk', 'trade'],
  },
];

// ── Objects ───────────────────────────────────────────────────────────────────

const OBJECTS: ReadonlyArray<ObjectSeed> = [
  // The Veil Exchange — highest-volume KALON trading floor; use opens live rates.
  {
    position: { x: 18,  y: 0, z: 8   },
    entityType: 'object',
    displayName: 'The Veil Exchange',
    interactions: ['inspect', 'use'],
  },
  // The Sovereignty Record Board — seven transitions; three-word Year 97 amendment.
  {
    position: { x: -12, y: 0, z: 48  },
    entityType: 'object',
    displayName: 'The Sovereignty Record Board',
    interactions: ['inspect'],
  },
  // Node Amplification Array — Three Synthetic Nodes — Year 83 installation.
  {
    position: { x: -68, y: 0, z: 30  },
    entityType: 'object',
    displayName: 'Node Amplification Array — Three Synthetic Nodes',
    interactions: ['inspect', 'use'],
    health: 750, // engineered installation — protected by Syndicate
  },
  // The Binary Observation Platform — optimal veil viewing; Syndicate-built.
  {
    position: { x: 98,  y: 0, z: 72  },
    entityType: 'object',
    displayName: 'The Binary Observation Platform',
    interactions: ['inspect'],
  },
  // KALON Issuance Registry — seventeen Assembly enquiries; seventeen identical responses.
  {
    position: { x: 20,  y: 0, z: 12  },
    entityType: 'object',
    displayName: 'KALON Issuance Registry — Cycle Records',
    interactions: ['inspect'],
  },
];

// ── World Seed Export ─────────────────────────────────────────────────────────

/**
 * The canonical WorldSeedConfig for The Veil of Kass — World 6.
 *
 * Pass to seedWorld() during server initialisation when this world loads.
 * The application tier must also:
 *   - Register the Veil of Kass node cluster with lattice-node.ts
 *     (density: WORLD_VEIL_OF_KASS_NODE_DENSITY — 3 synthetic nodes flagged)
 *   - Activate the Veil Exchange live-rate viewer on use interaction
 *   - Flag the sealed sovereignty records on The Sovereignty Record Board
 *   - Set Node Amplification Array as Survey Corps monitored
 */
export const WORLD_VEIL_OF_KASS_SEED: WorldSeedConfig = {
  worldId: WORLD_VEIL_OF_KASS_ID,
  spawnPoints: SPAWN_POINTS,
  npcs: NPCS,
  objects: OBJECTS,
};

/**
 * Lore summary for the galaxy map tooltip and the Chronicle index.
 */
export const WORLD_VEIL_OF_KASS_LORE_SUMMARY = [
  `Distance from Origin: ${WORLD_VEIL_OF_KASS_DISTANCE_LY} LY (mid arc). Binary K2/M4 system.`,
  `Lattice node density: ${WORLD_VEIL_OF_KASS_NODE_DENSITY} (includes 3 synthetic nodes, Year 83).`,
  `Population: 620 million. KALON issuance: ${WORLD_VEIL_OF_KASS_KALON_ISSUANCE_MILLIONS}M/cycle — highest in the Concord.`,
  `Sovereignty transitions: ${WORLD_VEIL_OF_KASS_SOVEREIGNTY_TRANSITIONS} in 105 years. Current: Free Commerce Syndicate (Year 84–).`,
  `Status: Open. The most politically volatile and most economically productive launch world.`,
].join('\n');
