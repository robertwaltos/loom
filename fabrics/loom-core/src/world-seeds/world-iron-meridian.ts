/**
 * world-iron-meridian.ts — World Seed: Iron Meridian
 *
 * Iron Meridian is the Concord's primary heavy industrial world. It is not
 * beautiful. The NPC population is proud of this. 450 million people live
 * and work here under an Industrial Consortium administration that has never
 * confused productivity with aesthetics, or either of those things with
 * governance.
 *
 * WORLD CHARACTER
 * ───────────────
 * The F8V sun runs hotter and bluer than most Concord suns. The light on
 * Iron Meridian is bright and hard and accurate. The industrial districts
 * were built for this — everything is visible, every weld can be inspected,
 * every tolerance measured. The Consortium administrators did not choose
 * this world for its beauty. They chose it for the ore deposits, the
 * geothermal stability, and the fact that nobody else had put in a competing
 * claim when the lots were surveyed.
 *
 * The Forge Yards — the central manufacturing complex — cover more surface
 * area than the residential districts. The residential districts are clean
 * and functional. Nobody mistakes them for anything else.
 *
 * NODE DENSITY: 5
 * ───────────────
 * Adequate for transit. The Lattice here is thinner than on inner-arc
 * worlds. The Consortium's position is that node density is of secondary
 * importance to ore throughput and they have not been proven wrong. There
 * is exactly one Lattice Covenant designate on Iron Meridian. They are paid
 * primarily in ores and have few complaints.
 *
 * KEY CHARACTERS
 * ──────────────
 * YIELD DIRECTOR OSEI-RATHMORE — The Consortium's operational lead for the
 *   Forge Yards. Runs the complex on a production principle: maximum yield
 *   per labour unit per cycle. Not hostile. Not there to make friends.
 *   Interactions: talk, inspect.
 *
 * UNION REGISTRAR PRIYA NKEMDIRIM — Administers the labour union compact.
 *   The Consortium and the Union have been renegotiating their terms-of-
 *   employment compact for eleven years. Neither side has walked out. This
 *   is apparently progress. Interactions: talk.
 *
 * FORGE MASTER ADAORA UCHENNA — Technically a Consortium employee, but her
 *   loyalty is to the Yards themselves. Has personally certified three
 *   thousand nine hundred and forty-four quality inspections. Interactions:
 *   talk, inspect, trade.
 *
 * ORE TRANSIT BROKER VOSS-RATHMORE — Manages the outbound ore allocation
 *   to other worlds. Buys from the Yields on behalf of external clients.
 *   The Amber Reach and Iron Meridian have a standing trade arrangement
 *   that dates to Year 12 and has never been renegotiated successfully.
 *   Interactions: talk, trade.
 *
 * SURVEY CORE TECHNICIAN FELIX ACHEBE — Survey Corps liaison to the ore
 *   extraction operations. Maintains the world's survey registration files
 *   and ensures the Corps gets its data. Son of Nnamdi Achebe, though he
 *   does not mention this first. Interactions: talk, inspect.
 *
 * INTERACTABLE OBJECTS
 * ────────────────────
 * THE FORGE YARDS — The central manufacturing complex. Multiple facilities
 *   visible from the landing approach. Use opens the production-manifest
 *   viewer for current yield outputs. Interactable: inspect, use.
 *
 * UNION COMPACT BOARD — The terms-of-employment record. The current version
 *   is the forty-first draft. The first draft is also on file because it
 *   is instructive. Interactable: inspect.
 *
 * ORE TRANSIT DOCK — PLATFORM A — The primary loading dock for ore freight.
 *   Structurally reinforced. Platform A is the oldest active dock in the
 *   Concord still at original specification. Interactable: inspect.
 *
 * QUALITY INSPECTION BOARD — Forge Master Uchenna's work record.
 *   3,944 certifications. Every one is legible. Interactable: inspect.
 *
 * SURVEY CORE LOG — IRON MERIDIAN — The ongoing Survey Corps geological and
 *   resource survey. The most detailed systematic record of any world in the
 *   Concord's survey archive. Interactable: inspect.
 *
 * CONSORTIUM CHARTER STONE — Year 14 ratification of Consortium governance.
 *   Placed at the Forge Yards gate. Plain. The inscription is three sentences
 *   long. Interactable: inspect.
 */

import type { WorldSeedConfig, NpcSeed, ObjectSeed, SpawnPointSeed } from '../world-seed-system.js';

// ── World Constants ───────────────────────────────────────────────────────────

export const WORLD_IRON_MERIDIAN_ID = 'iron-meridian';
export const WORLD_IRON_MERIDIAN_DISPLAY_NAME = 'Iron Meridian';

/** Distance from Origin in light-years (mid inner arc). */
export const WORLD_IRON_MERIDIAN_DISTANCE_LY = 41;

/** Lattice node density at Iron Meridian. */
export const WORLD_IRON_MERIDIAN_NODE_DENSITY = 5;

/** Number of quality inspection certifications by Forge Master Uchenna. */
export const WORLD_IRON_MERIDIAN_UCHENNA_CERTIFICATIONS = 3944;

// ── Spawn Points ──────────────────────────────────────────────────────────────

const SPAWN_POINTS: ReadonlyArray<SpawnPointSeed> = [
  // ── Player arrival points ──
  // Primary: Forge Yards gate landing area.
  { position: { x: 0,   y: 0, z: 0   }, spawnType: 'player', capacity: 15 },
  // Secondary: Ore Transit Dock approach.
  { position: { x: 120, y: 0, z: -30 }, spawnType: 'player', capacity: 10 },
  // Tertiary: Residential district transit post.
  { position: { x: -60, y: 0, z: 80  }, spawnType: 'player', capacity: 10 },

  // ── NPC stations ──
  // Index 3: Yield Director Osei-Rathmore — operations command post.
  { position: { x: 30,  y: 0, z: 20  }, spawnType: 'npc', capacity: 1 },
  // Index 4: Union Registrar Priya Nkemdirim — compact negotiation office.
  { position: { x: -55, y: 0, z: 75  }, spawnType: 'npc', capacity: 1 },
  // Index 5: Forge Master Adaora Uchenna — quality inspection station.
  { position: { x: 18,  y: 0, z: -10 }, spawnType: 'npc', capacity: 1 },
  // Index 6: Ore Transit Broker Voss-Rathmore — freight allocation desk.
  { position: { x: 115, y: 0, z: -25 }, spawnType: 'npc', capacity: 1 },
  // Index 7: Survey Core Technician Felix Achebe — survey core post.
  { position: { x: -30, y: 0, z: 40  }, spawnType: 'npc', capacity: 1 },
];

// ── NPCs ──────────────────────────────────────────────────────────────────────

const NPCS: ReadonlyArray<NpcSeed> = [
  // Yield Director Osei-Rathmore (tier 2, neutral — production-focused)
  {
    spawnPointIndex: 3,
    displayName: 'Yield Director Osei-Rathmore',
    tier: 2,
    hostility: 'neutral',
    health: 350,
    interactions: ['talk', 'inspect'],
  },
  // Union Registrar Priya Nkemdirim (tier 1, neutral — eleven-year negotiation)
  {
    spawnPointIndex: 4,
    displayName: 'Priya Nkemdirim',
    tier: 1,
    hostility: 'neutral',
    health: 220,
    interactions: ['talk'],
  },
  // Forge Master Adaora Uchenna (tier 2, friendly — trade-enabled)
  {
    spawnPointIndex: 5,
    displayName: 'Adaora Uchenna',
    tier: 2,
    hostility: 'friendly',
    health: 400,
    interactions: ['talk', 'inspect', 'trade'],
  },
  // Ore Transit Broker Voss-Rathmore (tier 1, neutral — trade-enabled)
  {
    spawnPointIndex: 6,
    displayName: 'Ore Transit Broker Voss-Rathmore',
    tier: 1,
    hostility: 'neutral',
    health: 250,
    interactions: ['talk', 'trade'],
  },
  // Survey Core Technician Felix Achebe (tier 1, friendly)
  {
    spawnPointIndex: 7,
    displayName: 'Felix Achebe',
    tier: 1,
    hostility: 'friendly',
    health: 200,
    interactions: ['talk', 'inspect'],
  },
];

// ── Objects ───────────────────────────────────────────────────────────────────

const OBJECTS: ReadonlyArray<ObjectSeed> = [
  // The Forge Yards — use opens production-manifest viewer.
  {
    position: { x: 25,  y: 0, z: 15  },
    entityType: 'object',
    displayName: 'The Forge Yards',
    interactions: ['inspect', 'use'],
  },
  // Union Compact Board — forty-first draft; first draft also on file.
  {
    position: { x: -52, y: 0, z: 78  },
    entityType: 'object',
    displayName: 'Union Compact Board',
    interactions: ['inspect'],
  },
  // Ore Transit Dock — Platform A — oldest active dock at original spec.
  {
    position: { x: 118, y: 0, z: -28 },
    entityType: 'object',
    displayName: 'Ore Transit Dock — Platform A',
    interactions: ['inspect'],
    health: 1000, // oldest active dock in the Concord — structural integrity
  },
  // Quality Inspection Board — Uchenna's 3,944 certifications.
  {
    position: { x: 15,  y: 0, z: -8  },
    entityType: 'object',
    displayName: 'Quality Inspection Board',
    interactions: ['inspect'],
  },
  // Survey Core Log — Iron Meridian — most detailed survey record in the Concord.
  {
    position: { x: -28, y: 0, z: 38  },
    entityType: 'object',
    displayName: 'Survey Core Log — Iron Meridian',
    interactions: ['inspect'],
  },
  // Consortium Charter Stone — Year 14 ratification. Three sentences.
  {
    position: { x: 3,   y: 0, z: -2  },
    entityType: 'object',
    displayName: 'Consortium Charter Stone',
    interactions: ['inspect'],
  },
];

// ── World Seed Export ─────────────────────────────────────────────────────────

/**
 * The canonical WorldSeedConfig for Iron Meridian — World 4.
 *
 * Pass to seedWorld() during server initialisation when this world loads.
 * The application tier must also:
 *   - Register the Iron Meridian Lattice node with lattice-node.ts
 *     (density: WORLD_IRON_MERIDIAN_NODE_DENSITY)
 *   - Activate the Forge Yards production-manifest viewer on use interaction
 *   - Mark Felix Achebe as Survey Corps liaison in npc-relationship-registry.ts
 */
export const WORLD_IRON_MERIDIAN_SEED: WorldSeedConfig = {
  worldId: WORLD_IRON_MERIDIAN_ID,
  spawnPoints: SPAWN_POINTS,
  npcs: NPCS,
  objects: OBJECTS,
};

/**
 * Lore summary for the galaxy map tooltip and the Chronicle index.
 */
export const WORLD_IRON_MERIDIAN_LORE_SUMMARY = [
  `Distance from Origin: ${WORLD_IRON_MERIDIAN_DISTANCE_LY} LY (mid inner arc).`,
  `Lattice node density: ${WORLD_IRON_MERIDIAN_NODE_DENSITY}. Forge Master certifications: ${WORLD_IRON_MERIDIAN_UCHENNA_CERTIFICATIONS}.`,
  `Population: 450 million. Sovereignty: Industrial Consortium. Survey Year 0.`,
  `Primary heavy industrial world. The Forge Yards cover more area than residential districts.`,
  `Status: Open. Not beautiful. The NPC population is proud of this.`,
].join('\n');
