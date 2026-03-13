/**
 * world-alkahest.ts — World Seed: Alkahest
 *
 * Alkahest is the Origin — World 1, the first surveyed world in the Concord
 * and the seat of the Assembly Common Trust. Its name derives from the
 * alchemical solvent that dissolves all things: here, every sovereignty
 * claim, every historical grievance, and every dynasty ambition has been
 * tested against the Assembly's common ground.
 *
 * WORLD CHARACTER
 * ───────────────
 * 2.1 billion people. The Concord's oldest continuously inhabited world.
 * Not the wealthiest (Veil of Kass), not the largest (Amber Reach), not
 * the most peaceful (Selene's Cradle) — but the one that matters most
 * because it is where the Concord decides who it is.
 *
 * The Assembly Chamber sits at the geographic centre of the First Survey
 * Grid, built over the original coordinate stake planted in Year 0.
 * Forty-seven seats. Rarely all occupied. Always watched.
 *
 * NODE DENSITY: 8
 * ───────────────
 * High for an inner system. The Lattice formed deep roots here early —
 * the same pre-Lattice structure beneath the Assembly Chamber that nobody
 * officially acknowledges. Node density 8 means resonance signatures
 * persist for weeks after visits. Everything done here is remembered.
 *
 * KEY CHARACTERS
 * ──────────────
 * ITORO ADEYEMI-OKAFOR — 128-year-old archivist and Chronicle authority.
 *   Occupies the Archive Vault study on the south side of the Forum. Has
 *   corrected the public record forty-seven times in her career. The
 *   forty-eighth is apparently ongoing. Interactions: talk, inspect.
 *
 * SEREN VAEL (Commodore, Ret.) — Former Survey Corps flag officer, now
 *   resident historical consultant to the Assembly. Known for bluntness
 *   and a refusal to soften survey reports for political comfort.
 *   Interactions: talk, inspect.
 *
 * NNAMDI ACHEBE — Senior Returnist Assembly Deliberant, long-serving.
 *   Closest thing Alkahest has to a permanent neutral arbitrator. His
 *   faction believes in the original Concord charter above all revisions.
 *   Interactions: talk.
 *
 * SELAMAT OSEI — Continuationist caucus senior officer. The Assembly
 *   member who always knows the count before the vote opens. Immaculately
 *   composed. Interactions: talk.
 *
 * ADETOKUNBO FALAYE (Prof.) — Academic faction. Public Chronicle Officer
 *   and senior teaching fellow. Maintains the Pillar inscriptions and
 *   manages the Chronicle submission process. Interactions: talk, inspect.
 *
 * MIRIAM VOSS-CARVALHO — Independent Assembly member. Has never sat in a
 *   faction seat. Survived World 412 as a child; rarely speaks of it.
 *   Interactions: talk.
 *
 * AMARA OKAFOR-NWOSU (Dr.) — Founding faction. KALON distribution
 *   registrar with access to the Year 0 issuance records. Interactions: talk.
 *
 * IKENNA ODUYA-VOSS (Marshal) — Defence Forces. The most physically
 *   formidable figure on Alkahest. Commands the Assembly security detail
 *   and holds the garrison protocols for Chamber lockdown. Interactions:
 *   talk, inspect.
 *
 * INTERACTABLE OBJECTS
 * ────────────────────
 * THE ASSEMBLY CHAMBER — The physical hall where forty-seven delegates
 *   sit. Visitors may enter and observe. Locked during active sessions,
 *   open during recesses. Interactable: inspect, use (session viewer).
 *
 * THE CHRONICLE PILLAR — Standing at the Forum centre. All Concord events
 *   judged historically significant are inscribed here. The oldest
 *   inscription dates to Year 1. Interactable: inspect.
 *
 * THE FOUNDING COMPACT STONE — The original ratification tablet, behind
 *   security glass. Every signatory dynasty's mark is still visible.
 *   Interactable: inspect.
 *
 * LATTICE MONUMENT — NODE ONE — The first recorded Lattice node location
 *   in the Concord. Technically still active. The anomalous resonance
 *   beneath the Chamber is not officially attributed here. Interactable:
 *   inspect, use.
 *
 * THE ALKAHEST FORUM — The civic public space. Used for Assembly recesses,
 *   trade disputes, and the Annual Chronicle Reading. Interactable: inspect.
 *
 * ARCHIVE VAULT — SURVEY YEAR ZERO — Itoro's workspace. Contains the
 *   original Year 0 equipment manifests and first-contact records.
 *   Structurally reinforced: restricted access. Interactable: inspect.
 */

import type { WorldSeedConfig, NpcSeed, ObjectSeed, SpawnPointSeed } from '../world-seed-system.js';

// ── World Constants ───────────────────────────────────────────────────────────

export const WORLD_ALKAHEST_ID = 'alkahest';
export const WORLD_ALKAHEST_DISPLAY_NAME = 'Alkahest';

/** Distance from Origin in light-years. Alkahest IS the Origin. */
export const WORLD_ALKAHEST_DISTANCE_LY = 0;

/** Lattice node density at Alkahest (from World Bible Registry). */
export const WORLD_ALKAHEST_NODE_DENSITY = 8;

/** Number of Assembly seats — forty-seven by the founding charter. */
export const WORLD_ALKAHEST_ASSEMBLY_SEAT_COUNT = 47;

// ── Spawn Points ──────────────────────────────────────────────────────────────

const SPAWN_POINTS: ReadonlyArray<SpawnPointSeed> = [
  // ── Player arrival points ──
  // Primary: Forum landing concourse, the civic heart of the district.
  { position: { x: 0,    y: 0, z: 0   }, spawnType: 'player', capacity: 20 },
  // Secondary: Assembly District plaza, adjacent to the Chamber entrance.
  { position: { x: 180,  y: 0, z: 60  }, spawnType: 'player', capacity: 15 },
  // Tertiary: Archive Quarter entrance, south side of the Forum.
  { position: { x: -100, y: 0, z: 120 }, spawnType: 'player', capacity: 10 },

  // ── NPC stations ──
  // Index 3: Itoro Adeyemi-Okafor — Archive Vault study.
  { position: { x: -95,  y: 0, z: 130 }, spawnType: 'npc', capacity: 1 },
  // Index 4: Seren Vael — Forum colonnade consultant's office.
  { position: { x: 25,   y: 0, z: 40  }, spawnType: 'npc', capacity: 1 },
  // Index 5: Nnamdi Achebe — Assembly Chamber antechamber.
  { position: { x: 175,  y: 0, z: 70  }, spawnType: 'npc', capacity: 1 },
  // Index 6: Selamat Osei — Caucus records desk, east colonnade.
  { position: { x: 60,   y: 0, z: -30 }, spawnType: 'npc', capacity: 1 },
  // Index 7: Adetokunbo Falaye — Chronicle Pillar base, teaching stand.
  { position: { x: 10,   y: 0, z: 15  }, spawnType: 'npc', capacity: 1 },
  // Index 8: Miriam Voss-Carvalho — Assembly independent gallery.
  { position: { x: 200,  y: 0, z: 90  }, spawnType: 'npc', capacity: 1 },
  // Index 9: Amara Okafor-Nwosu — KALON distribution registry counter.
  { position: { x: -40,  y: 0, z: -20 }, spawnType: 'npc', capacity: 1 },
  // Index 10: Ikenna Oduya-Voss — Assembly Chamber security post.
  { position: { x: 165,  y: 0, z: 55  }, spawnType: 'npc', capacity: 1 },
];

// ── NPCs ──────────────────────────────────────────────────────────────────────

const NPCS: ReadonlyArray<NpcSeed> = [
  // Itoro Adeyemi-Okafor (TIER_4 → tier 3)
  {
    spawnPointIndex: 3,
    displayName: 'Itoro Adeyemi-Okafor',
    tier: 3,
    hostility: 'friendly',
    health: 500,
    interactions: ['talk', 'inspect'],
  },
  // Seren Vael, Commodore (Ret.) (TIER_4 → tier 3)
  {
    spawnPointIndex: 4,
    displayName: 'Seren Vael',
    tier: 3,
    hostility: 'friendly',
    health: 500,
    interactions: ['talk', 'inspect'],
  },
  // Nnamdi Achebe (TIER_4 → tier 3)
  {
    spawnPointIndex: 5,
    displayName: 'Nnamdi Achebe',
    tier: 3,
    hostility: 'friendly',
    health: 400,
    interactions: ['talk'],
  },
  // Selamat Osei (TIER_3 → tier 2)
  {
    spawnPointIndex: 6,
    displayName: 'Selamat Osei',
    tier: 2,
    hostility: 'neutral',
    health: 300,
    interactions: ['talk'],
  },
  // Prof. Adetokunbo Falaye (TIER_3 → tier 2)
  {
    spawnPointIndex: 7,
    displayName: 'Adetokunbo Falaye',
    tier: 2,
    hostility: 'friendly',
    health: 250,
    interactions: ['talk', 'inspect'],
  },
  // Miriam Voss-Carvalho (TIER_3 → tier 2)
  {
    spawnPointIndex: 8,
    displayName: 'Miriam Voss-Carvalho',
    tier: 2,
    hostility: 'friendly',
    health: 300,
    interactions: ['talk'],
  },
  // Dr. Amara Okafor-Nwosu (TIER_3 → tier 2)
  {
    spawnPointIndex: 9,
    displayName: 'Amara Okafor-Nwosu',
    tier: 2,
    hostility: 'friendly',
    health: 250,
    interactions: ['talk'],
  },
  // Marshal Ikenna Oduya-Voss (TIER_3 → tier 2, Defence Forces — highest health)
  {
    spawnPointIndex: 10,
    displayName: 'Ikenna Oduya-Voss',
    tier: 2,
    hostility: 'neutral',
    health: 800,
    interactions: ['talk', 'inspect'],
  },
];

// ── Objects ───────────────────────────────────────────────────────────────────

const OBJECTS: ReadonlyArray<ObjectSeed> = [
  // The Assembly Chamber — forty-seven seats; use opens session viewer.
  {
    position: { x: 190, y: 0, z: 80 },
    entityType: 'object',
    displayName: 'The Assembly Chamber',
    interactions: ['inspect', 'use'],
  },
  // The Chronicle Pillar — Forum centre; inscriptions from Year 1.
  {
    position: { x: 8,   y: 0, z: 12 },
    entityType: 'object',
    displayName: 'The Chronicle Pillar',
    interactions: ['inspect'],
  },
  // The Founding Compact Stone — original ratification tablet.
  {
    position: { x: 170, y: 0, z: 95 },
    entityType: 'object',
    displayName: 'The Founding Compact Stone',
    interactions: ['inspect'],
  },
  // Lattice Monument — Node One; first registered Lattice node.
  {
    position: { x: -38, y: 0, z: -18 },
    entityType: 'object',
    displayName: 'Lattice Monument — Node One',
    interactions: ['inspect', 'use'],
  },
  // The Alkahest Forum — central civic public space.
  {
    position: { x: 0,   y: 0, z: 20 },
    entityType: 'object',
    displayName: 'The Alkahest Forum',
    interactions: ['inspect'],
  },
  // Archive Vault — Survey Year Zero — Itoro's workspace; restricted access.
  {
    position: { x: -90, y: 0, z: 135 },
    entityType: 'object',
    displayName: 'Archive Vault — Survey Year Zero',
    interactions: ['inspect'],
    health: 800, // structurally reinforced — restricted access
  },
];

// ── World Seed Export ─────────────────────────────────────────────────────────

/**
 * The canonical WorldSeedConfig for Alkahest — World 1: the Origin.
 *
 * Pass to seedWorld() during server initialisation when this world loads.
 * The application tier must also:
 *   - Register the Alkahest Lattice node with lattice-node.ts
 *     (density: WORLD_ALKAHEST_NODE_DENSITY, distance: WORLD_ALKAHEST_DISTANCE_LY)
 *   - Assign all eight resident characters to their default spawn points
 *   - Activate the Assembly Chamber session-viewer on use interaction
 *   - Mark Lattice Monument — Node One as the Concord's first-registered node
 */
export const WORLD_ALKAHEST_SEED: WorldSeedConfig = {
  worldId: WORLD_ALKAHEST_ID,
  spawnPoints: SPAWN_POINTS,
  npcs: NPCS,
  objects: OBJECTS,
};

/**
 * Lore summary for the galaxy map tooltip and the Chronicle index.
 */
export const WORLD_ALKAHEST_LORE_SUMMARY = [
  `Distance from Origin: ${WORLD_ALKAHEST_DISTANCE_LY} LY — Alkahest IS the Origin.`,
  `Lattice node density: ${WORLD_ALKAHEST_NODE_DENSITY}. Assembly seats: ${WORLD_ALKAHEST_ASSEMBLY_SEAT_COUNT}.`,
  `Population: 2.1 billion. Sovereignty: Assembly Common Trust. Survey Year 0.`,
  `Eight named residents: Itoro Adeyemi-Okafor, Seren Vael (Commodore Ret.), Nnamdi Achebe, and five others.`,
  `Status: Open. The most historically significant and politically complicated world in the Concord.`,
].join('\n');
