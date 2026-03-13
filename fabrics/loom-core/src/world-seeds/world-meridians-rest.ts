/**
 * world-meridians-rest.ts — World Seed: Meridian's Rest
 *
 * Meridian's Rest is the second world in the Concord's founding cluster —
 * 8 light-years from the Origin. It is, by common acknowledgement and by
 * the testimony of everyone who has ever visited it, beautiful. It is
 * also acutely aware of this fact, which makes it interesting.
 *
 * WORLD CHARACTER
 * ───────────────
 * 890 million people under Founding Family administration. The House of
 * Meridian has governed continuously for over a century with a quality most
 * worlds find either admirable or infuriating: they have never, in living
 * memory, made a decision that was wrong in its outcome. Whether this is
 * policy, luck, or something the Lattice is doing, nobody can establish.
 *
 * The world's defining physical feature is the Spire — a natural formation
 * of hypercrystalline silicate that refracts the K1V sun into a permanent
 * aurora at dawn and dusk. The House of Meridian built their archive
 * adjacent to it. Tourists have been coming for eighty years.
 *
 * NODE DENSITY: 9
 * ───────────────
 * The highest node density of the launch worlds. Only Veil of Kass matches
 * it. The Lattice here is dense enough that Resonance Pool events — brief
 * flickers of archived experience — occur spontaneously without a node
 * anchor. The House has catalogued every one. The catalogue runs to several
 * thousand entries. Scholars travel from every other world to review it.
 *
 * KEY CHARACTERS
 * ──────────────
 * CAELINDRA MERIDIAN-VOSS — Founding Steward of the House of Meridian,
 *   seventh in an unbroken line. Manages the world's administrative affairs
 *   with the same unhurried precision her predecessors used. Her primary
 *   function, she will tell you without irony, is to not make anything worse.
 *   Interactions: talk, inspect.
 *
 * HOUSE ARCHIVIST SOMO — The keeper of the Resonance Pool catalogue. Has
 *   reviewed every spontaneous event since Year 41. Age unknown; methods
 *   unknown; conclusions shared only after extensive cross-reference.
 *   Interactions: talk, inspect.
 *
 * LATTICE KEEPER MERIDIAN-IX — A Lattice Covenant designate, not a House
 *   member. The suffix -IX marks the ninth keeper assigned to this high-
 *   density node cluster. The previous eight died of old age in the post.
 *   Interactions: inspect.
 *
 * INTERACTABLE OBJECTS
 * ────────────────────
 * THE MERIDIAN SPIRE — The hypercrystalline natural formation. Refracts at
 *   dawn and dusk. Not an artifact. Not entirely natural. The current theory
 *   is that it formed around a very old Lattice node that is no longer
 *   mappable. Interactable: inspect.
 *
 * HOUSE MERIDIAN ARCHIVE — Adjacent to the Spire. Contains one of the
 *   largest privately held Chronicle collections in the Concord. Access is
 *   restricted to registered scholars, but the index is open. Interactable:
 *   inspect.
 *
 * RESONANCE POOL — NODE NINE — The primary active Lattice node at
 *   Meridian's Rest. Site of spontaneous event occurrences. Visiting
 *   players will see a brief archived visual fragment on approach — passive
 *   only, no interaction required. Interactable: inspect, use.
 *
 * FOUNDING ESTATE SURVEY MARKER — Year 0 survey stake, still in place in
 *   the Estate grounds. The House had it moved three metres to the right
 *   in Year 12 because it was inconveniently placed. Itoro Adeyemi-Okafor
 *   has noted this in the Chronicle, with feeling. Interactable: inspect.
 *
 * HOUSE MERIDIAN RECORDS BOARD — The official public record of governance
 *   decisions, maintained by law on public display. Every decision dating
 *   to Year 7 when the House formalised the administration. A remarkably
 *   short list of reversals. Interactable: inspect.
 */

import type { WorldSeedConfig, NpcSeed, ObjectSeed, SpawnPointSeed } from '../world-seed-system.js';

// ── World Constants ───────────────────────────────────────────────────────────

export const WORLD_MERIDIANS_REST_ID = 'meridians-rest';
export const WORLD_MERIDIANS_REST_DISPLAY_NAME = "Meridian's Rest";

/** Distance from Origin in light-years (near inner arc). */
export const WORLD_MERIDIANS_REST_DISTANCE_LY = 8;

/** Lattice node density — the highest of all launch worlds. */
export const WORLD_MERIDIANS_REST_NODE_DENSITY = 9;

/** Year in which the House of Meridian formally registered administration. */
export const WORLD_MERIDIANS_REST_FOUNDING_REGISTRATION_YEAR = 7;

// ── Spawn Points ──────────────────────────────────────────────────────────────

const SPAWN_POINTS: ReadonlyArray<SpawnPointSeed> = [
  // ── Player arrival points ──
  // Primary: visitor arrival concourse at the base of the Spire district.
  { position: { x: 0,   y: 0, z: 0  }, spawnType: 'player', capacity: 15 },
  // Secondary: Estate grounds entrance, near the Founding Survey Marker.
  { position: { x: 140, y: 0, z: 50 }, spawnType: 'player', capacity: 10 },

  // ── NPC stations ──
  // Index 2: Caelindra Meridian-Voss — House administrative hall.
  { position: { x: 130, y: 0, z: 60 }, spawnType: 'npc', capacity: 1 },
  // Index 3: House Archivist Somo — Archive study adjacent to the Spire.
  { position: { x: 45,  y: 0, z: 25 }, spawnType: 'npc', capacity: 1 },
  // Index 4: Lattice Keeper Meridian-IX — at the Resonance Pool.
  { position: { x: -30, y: 0, z: 15 }, spawnType: 'npc', capacity: 1 },
];

// ── NPCs ──────────────────────────────────────────────────────────────────────

const NPCS: ReadonlyArray<NpcSeed> = [
  // Caelindra Meridian-Voss — Founding Steward (tier 2, founding family)
  {
    spawnPointIndex: 2,
    displayName: 'Caelindra Meridian-Voss',
    tier: 2,
    hostility: 'friendly',
    health: 350,
    interactions: ['talk', 'inspect'],
  },
  // House Archivist Somo — catalogue keeper (tier 1, scholarly)
  {
    spawnPointIndex: 3,
    displayName: 'House Archivist Somo',
    tier: 1,
    hostility: 'friendly',
    health: 200,
    interactions: ['talk', 'inspect'],
  },
  // Lattice Keeper Meridian-IX — Covenant designate (tier 0, non-combatant)
  {
    spawnPointIndex: 4,
    displayName: 'Lattice Keeper Meridian-IX',
    tier: 0,
    hostility: 'friendly',
    health: 1,
    interactions: ['inspect'],
  },
];

// ── Objects ───────────────────────────────────────────────────────────────────

const OBJECTS: ReadonlyArray<ObjectSeed> = [
  // The Meridian Spire — hypercrystalline formation, refracts at dawn/dusk.
  {
    position: { x: 55,  y: 0, z: 28 },
    entityType: 'object',
    displayName: 'The Meridian Spire',
    interactions: ['inspect'],
  },
  // House Meridian Archive — restricted to scholars, index open.
  {
    position: { x: 48,  y: 0, z: 22 },
    entityType: 'object',
    displayName: 'House Meridian Archive',
    interactions: ['inspect'],
    health: 600, // structurally reinforced — access managed by House
  },
  // Resonance Pool — Node Nine — spontaneous event site.
  {
    position: { x: -28, y: 0, z: 12 },
    entityType: 'object',
    displayName: 'Resonance Pool — Node Nine',
    interactions: ['inspect', 'use'],
  },
  // Founding Estate Survey Marker — moved 3m from original position, Year 12.
  {
    position: { x: 138, y: 0, z: 46 },
    entityType: 'object',
    displayName: 'Founding Estate Survey Marker',
    interactions: ['inspect'],
  },
  // House Meridian Records Board — public governance record since Year 7.
  {
    position: { x: 125, y: 0, z: 55 },
    entityType: 'object',
    displayName: 'House Meridian Records Board',
    interactions: ['inspect'],
  },
];

// ── World Seed Export ─────────────────────────────────────────────────────────

/**
 * The canonical WorldSeedConfig for Meridian's Rest — World 2.
 *
 * Pass to seedWorld() during server initialisation when this world loads.
 * The application tier must also:
 *   - Register the Meridian's Rest Lattice node cluster with lattice-node.ts
 *     (density: WORLD_MERIDIANS_REST_NODE_DENSITY)
 *   - Configure the Resonance Pool passive fragment trigger on player approach
 *   - Set Lattice Keeper Meridian-IX as non-combat-flagged in npc-ai-system.ts
 */
export const WORLD_MERIDIANS_REST_SEED: WorldSeedConfig = {
  worldId: WORLD_MERIDIANS_REST_ID,
  spawnPoints: SPAWN_POINTS,
  npcs: NPCS,
  objects: OBJECTS,
};

/**
 * Lore summary for the galaxy map tooltip and the Chronicle index.
 */
export const WORLD_MERIDIANS_REST_LORE_SUMMARY = [
  `Distance from Origin: ${WORLD_MERIDIANS_REST_DISTANCE_LY} LY (near inner arc).`,
  `Lattice node density: ${WORLD_MERIDIANS_REST_NODE_DENSITY} — highest of all launch worlds.`,
  `Population: 890 million. Sovereignty: Founding Family (House of Meridian, Year ${WORLD_MERIDIANS_REST_FOUNDING_REGISTRATION_YEAR}).`,
  `Spontaneous Resonance Pool events catalogued since Year 41. Thousands of entries.`,
  `Status: Open. Beautiful and aware of it. One governance reversal in the public record.`,
].join('\n');
