/**
 * world-499-threshold.ts — World Seed for World 499, "The Threshold".
 *
 * ──────────────────────────────────────────────────────────────────────────
 * LORE: THE THRESHOLD
 * ──────────────────────────────────────────────────────────────────────────
 *
 * World 499 was the final survey entry in Dr. Cassia Ferreira-Asante's outer
 * arc expedition before the Concord recalled her team. The preliminary scan
 * notes read: "Anomalous frequency echo. Source unknown. The signal goes both
 * ways." The full account was classified. The world was quarantined. This
 * was eleven years before Ferreira-Asante published the correlation bearing
 * her name, and nobody at the time knew what the correlation would later
 * suggest — that somewhere in the outer arc, a structure predated the Lattice.
 *
 * The Threshold earns its name from its geography. The world sits at precisely
 * the boundary of the outer arc interference band (distance: 284 LY from
 * Origin). Every Lattice transit into World 499 records an anomalous
 * 94-millisecond resonance delay — the "Ferreira-Asante echo" — which matches
 * no known physical process. The delay is perfectly consistent. It never
 * drifts. That is the unsettling part.
 *
 * The built environment is unusual. The world was clearly inhabited before
 * survey — structures built at junctions between natural and artificial
 * surfaces, as if whoever built them was exploring the boundary between
 * categories. Concord archaeologists call it "Threshold Architecture." The
 * Architect, in one of the few statements attributed to them directly, called
 * it "correct."
 *
 * The quarantine was lifted in Year 44 following a dynasty petition that
 * reached Assembly quorum. The formal notation in the Assembly record: "No
 * consensus on threat classification; quarantine cannot be justified without
 * one." Twelve dynasties now maintain permanent presence. Dr. Ferreira-Asante
 * has never publicly commented on the resonance delay.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * GAMEPLAY NOTE
 * ──────────────────────────────────────────────────────────────────────────
 *
 * World 499 is the location that unlocks Chamber Four ("The Ferreira-Asante
 * Finding") in sealed-chambers.ts. The anomalous resonance delay is surfaced
 * in sealed-chambers.ts via ChamberConditionEvaluator.isFerreiraAsanteResolved.
 * It also generates SurveyMarks automatically upon arrival (distance ≥ 280 LY).
 *
 * The world's Lattice node has an unusually stable precision rating (0.97)
 * despite being at the outer arc fringe — the anomalous installation appears
 * to *reinforce* the frequency rather than interfere with it, which is
 * consistent with Ferreira-Asante's original survey note.
 *
 * The KALON economy here is unusual: the world's Chronicle depth rewards are
 * boosted because the anomaly generates Chronicle-worthy observations passively.
 * This is handled by the application tier, not this seed.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * ORIGINAL CHARACTERS (World 499 residents)
 * ──────────────────────────────────────────────────────────────────────────
 *
 * DR. CASSIA FERREIRA-ASANTE (Tier 1, Friendly)
 *   Lead surveyor, Outer Arc Expedition Year 33. She has been here before.
 *   She does not discuss the resonance delay publicly.
 *   Trait: Measured. Will discuss anything except the 94-millisecond echo.
 *   Trades: Frequency analysis equipment, outer-arc survey charts.
 *   Chronicle depth: 38 entries (highest of any NPC not in the sealed chambers).
 *
 * ORIN VAEL (Tier 2, Neutral)
 *   Assembly liaison. Her designation matches the Vael character in Chamber Two
 *   — this is intentional. She came to The Threshold to determine if the anomaly
 *   is related to the Ordinance 7 records. She will not say if she found anything.
 *   Trait: Careful. Will only trade information for information.
 *
 * THRESHOLD WARDEN MBEKI-CROSS (Tier 2, Friendly)
 *   Permanent Concord presence. Maintains the quarantine documentation even
 *   after the quarantine was lifted — "in case it needs to be reinstated quickly."
 *   Trait: Procedural. Has the full quarantine file. Will share it if asked
 *   three times by characters with sufficient Chronicle depth.
 *
 * ARCHIVIST-NODE (Tier 0, Friendly) — non-humanoid
 *   A non-humanoid resident of The Threshold. Pre-dates the survey.
 *   Communicates in frequency pulses that the survey equipment translates
 *   to text. Says very little. What it says is always accurate.
 *   Trait: Precise. Speaks only to confirm or deny things, never to elaborate.
 *
 * THE ECHO PROSPECTORS (Tier 3, Neutral) — group entity
 *   Small consortium of dynasties who came to study (or profit from) the
 *   resonance delay. They believe the 94ms echo contains encoded information.
 *   They may be right. They trade raw frequency recording data.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WORLD OBJECTS (Threshold Architecture landmarks)
 * ──────────────────────────────────────────────────────────────────────────
 *
 * THE ANTEROOM — A structure built at the junction of the main plateau and
 *   the ancient installation's outer wall. Half organic stone, half material
 *   of unknown composition that has never been dated. Interactable: inspect,
 *   triggers a Chronicle entry noting the intersection of materials.
 *
 * THE RESONANCE COLUMN — The source of the 94ms echo. Or one of the sources.
 *   Physical structure: a column of the unknown material, roughly cylindrical,
 *   emitting a subsonic frequency that Lattice equipment picks up as the echo.
 *   Interactable: use (requires frequency-analysis equipment), inspect.
 *
 * THE FERREIRA-ASANTE SURVEY MARKER — Year 33 survey stake, still in place.
 *   Has her field notes etched on it (in the original survey notation, not
 *   Concord standard). Interactable: inspect (reveals partial lore entry).
 *
 * THE ASSEMBLY QUARANTINE BOARD — Official notice, now amended four times.
 *   The fourth amendment reads: "Quarantine rescinded. Status: OPEN." The
 *   first notice, underneath, still reads: "Status: UNKNOWN ORIGIN."
 *   Interactable: inspect.
 */

import type { WorldSeedConfig, NpcSeed, ObjectSeed, SpawnPointSeed } from '../world-seed-system.js';

// ── World Constants ───────────────────────────────────────────────────────────

export const WORLD_499_ID = 'world-499';
export const WORLD_499_DISPLAY_NAME = 'The Threshold';

/** Distance from Origin in light-years (outer arc, ≥ 280 LY). */
export const WORLD_499_DISTANCE_LY = 284;

/** The anomalous resonance delay — every transit records this. */
export const FERREIRA_ASANTE_ECHO_MS = 94;

/** Lattice node precision at World 499 (anomalously high for outer arc). */
export const WORLD_499_LATTICE_PRECISION = 0.97;

// ── Spawn Points ─────────────────────────────────────────────────────────────

const SPAWN_POINTS: ReadonlyArray<SpawnPointSeed> = [
  // ── Player arrival points ──
  // Transit from inner arc: the plateau landing zone.
  { position: { x: 0,    y: 0,   z: 0 },   spawnType: 'player', capacity: 20 },
  // Secondary arrival: the Anteroom courtyard.
  { position: { x: 120,  y: 0,   z: 80 },  spawnType: 'player', capacity: 10 },

  // ── NPC stations ──
  // Index 2: Ferreira-Asante survey post (near the Survey Marker).
  { position: { x: 45,   y: 0,   z: 30 },  spawnType: 'npc',    capacity: 1  },
  // Index 3: Orin Vael observation platform.
  { position: { x: -60,  y: 0,   z: 15 },  spawnType: 'npc',    capacity: 1  },
  // Index 4: Warden post (near the Quarantine Board).
  { position: { x: 200,  y: 0,   z: 5 },   spawnType: 'npc',    capacity: 1  },
  // Index 5: Archivist-Node resting position (inside the Anteroom).
  { position: { x: 130,  y: 0,   z: 88 },  spawnType: 'npc',    capacity: 1  },
  // Index 6: Echo Prospectors camp.
  { position: { x: -150, y: 0,   z: -60 }, spawnType: 'npc',    capacity: 5  },
];

// ── NPCs ──────────────────────────────────────────────────────────────────────

const NPCS: ReadonlyArray<NpcSeed> = [
  // Dr. Cassia Ferreira-Asante
  {
    spawnPointIndex: 2,
    displayName: 'Dr. Cassia Ferreira-Asante',
    tier: 1,
    hostility: 'friendly',
    health: 100,
    interactions: ['talk', 'trade', 'inspect'],
  },
  // Orin Vael
  {
    spawnPointIndex: 3,
    displayName: 'Orin Vael',
    tier: 2,
    hostility: 'neutral',
    health: 100,
    interactions: ['talk', 'inspect'],
  },
  // Threshold Warden Mbeki-Cross
  {
    spawnPointIndex: 4,
    displayName: 'Threshold Warden Mbeki-Cross',
    tier: 2,
    hostility: 'friendly',
    health: 120,
    interactions: ['talk', 'inspect'],
  },
  // Archivist-Node (non-humanoid; low health — it does not fight)
  {
    spawnPointIndex: 5,
    displayName: 'Archivist-Node',
    tier: 0,
    hostility: 'friendly',
    health: 1,
    interactions: ['talk', 'inspect'],
  },
  // The Echo Prospectors (group entity — highest health, trade-focused)
  {
    spawnPointIndex: 6,
    displayName: 'Echo Prospectors Consortium',
    tier: 3,
    hostility: 'neutral',
    health: 200,
    interactions: ['talk', 'trade'],
  },
];

// ── Objects ───────────────────────────────────────────────────────────────────

const OBJECTS: ReadonlyArray<ObjectSeed> = [
  // The Anteroom — central architectural landmark.
  {
    position: { x: 125, y: 0, z: 84 },
    entityType: 'object',
    displayName: 'The Anteroom',
    interactions: ['inspect'],
  },
  // The Resonance Column — source of the Ferreira-Asante echo.
  {
    position: { x: 132, y: 0, z: 91 },
    entityType: 'object',
    displayName: 'The Resonance Column',
    interactions: ['inspect', 'use'],
  },
  // The Ferreira-Asante Survey Marker (Year 33).
  {
    position: { x: 48, y: 0, z: 28 },
    entityType: 'object',
    displayName: 'Survey Marker — FA-Year33-499',
    interactions: ['inspect'],
  },
  // The Assembly Quarantine Board.
  {
    position: { x: 195, y: 0, z: 3 },
    entityType: 'object',
    displayName: 'Assembly Quarantine Board',
    interactions: ['inspect'],
  },
  // Frequency recording array left by the Prospectors.
  {
    position: { x: -145, y: 0, z: -58 },
    entityType: 'object',
    displayName: 'Echo Recording Array',
    interactions: ['inspect', 'use'],
  },
  // A sealed container marked "SURVEY-499-A" — Ferreira-Asante's original
  // equipment cache. Contents classified. Cannot be opened without the right
  // clearance. Application tier handles unlock condition.
  {
    position: { x: 50, y: 0, z: 35 },
    entityType: 'object',
    displayName: 'Survey Container — SURVEY-499-A',
    interactions: ['inspect'],
    health: 500, // structurally reinforced — requires specific interaction
  },
];

// ── World Seed Export ─────────────────────────────────────────────────────────

/**
 * The canonical WorldSeedConfig for World 499: The Threshold.
 *
 * Pass to seedWorld() during server initialisation when this world loads.
 * The application tier must also:
 *   - Register the World 499 Lattice node with lattice-node.ts
 *     (precision: WORLD_499_LATTICE_PRECISION, distance: WORLD_499_DISTANCE_LY)
 *   - Record the FERREIRA_ASANTE_ECHO_MS anomaly in ascendancy-engine.ts
 *   - Award a SurveyMark via survey-vessel.ts on first arrival (handled there)
 *   - Mark the world as eligible for Chamber Four in sealed-chambers.ts
 */
export const WORLD_499_SEED: WorldSeedConfig = {
  worldId: WORLD_499_ID,
  spawnPoints: SPAWN_POINTS,
  npcs: NPCS,
  objects: OBJECTS,
};

/**
 * Lore summary for the galaxy map tooltip and the Chronicle index.
 * This is not part of WorldSeedConfig — it belongs to the world registry.
 */
export const WORLD_499_LORE_SUMMARY = [
  `Distance from Origin: ${WORLD_499_DISTANCE_LY} LY (outer arc fringe).`,
  `Lattice node precision: ${WORLD_499_LATTICE_PRECISION} (anomalously high).`,
  `Ferreira-Asante echo: ${FERREIRA_ASANTE_ECHO_MS}ms resonance delay on all transits.`,
  `Architecture: Threshold style — structures at material junctions.`,
  `Status: Quarantine rescinded Year 44. Twelve resident dynasties.`,
  `Classification: Open. Origin of resonance: unclassified.`,
].join('\n');
