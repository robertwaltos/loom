/**
 * Koydo Worlds — Adventure Configurations
 *
 * One AdventureConfig per entry × per world. 36 total entries across 9 worlds.
 * InteractionMode is derived from AdventureType — each type maps to exactly one mode.
 *
 * estimatedMinutes guidelines:
 *   Tier 1 entries: 15-20 min   (younger children, simpler concept)
 *   Tier 2 entries: 20-25 min   (intermediate)
 *   Tier 3 entries: 25-30 min   (oldest tier — more depth, more interaction)
 *   remembrance_wall:  15 min   (passive — shorter by design)
 *   reenactment/field_trip: +5  (more interactive — longer)
 */
import type { AdventureConfig } from './types.js';

export const ADVENTURE_CONFIGS: readonly AdventureConfig[] = [

  // ─── Number Garden (Dottie Chakravarti) ──────────────────────────────────
  {
    type: 'guided_expedition',
    entryId: 'entry-fibonacci-rabbit-problem',
    worldId: 'number-garden',
    guideId: 'dottie-chakravarti',
    difficultyTier: 1,
    estimatedMinutes: 20,
    interactionMode: 'guided_walk',
  },
  {
    type: 'artifact_hunt',
    entryId: 'entry-zero-invention',
    worldId: 'number-garden',
    guideId: 'dottie-chakravarti',
    difficultyTier: 1,
    estimatedMinutes: 20,
    interactionMode: 'search_collect',
  },
  {
    type: 'remembrance_wall',
    entryId: 'entry-hypatia-alexandria',
    worldId: 'number-garden',
    guideId: 'dottie-chakravarti',
    difficultyTier: 2,
    estimatedMinutes: 15,
    interactionMode: 'passive_observation',
  },
  {
    type: 'time_window',
    entryId: 'entry-ada-lovelace-program',
    worldId: 'number-garden',
    guideId: 'dottie-chakravarti',
    difficultyTier: 3,
    estimatedMinutes: 25,
    interactionMode: 'window_view',
  },

  // ─── Story Tree (Grandmother Anaya) ──────────────────────────────────────
  {
    type: 'artifact_hunt',
    entryId: 'entry-gilgamesh',
    worldId: 'story-tree',
    guideId: 'grandmother-anaya',
    difficultyTier: 2,
    estimatedMinutes: 20,
    interactionMode: 'search_collect',
  },
  {
    type: 'guided_expedition',
    entryId: 'entry-scheherazade',
    worldId: 'story-tree',
    guideId: 'grandmother-anaya',
    difficultyTier: 2,
    estimatedMinutes: 25,
    interactionMode: 'guided_walk',
  },
  {
    type: 'reenactment',
    entryId: 'entry-gutenberg-press',
    worldId: 'story-tree',
    guideId: 'grandmother-anaya',
    difficultyTier: 2,
    estimatedMinutes: 25,
    interactionMode: 'interactive_replay',
  },
  {
    type: 'artifact_hunt',
    entryId: 'entry-rosetta-stone',
    worldId: 'story-tree',
    guideId: 'grandmother-anaya',
    difficultyTier: 3,
    estimatedMinutes: 30,
    interactionMode: 'search_collect',
  },

  // ─── Market Square (Tía Carmen Herrera) ──────────────────────────────────
  {
    type: 'artifact_hunt',
    entryId: 'entry-lydian-coin',
    worldId: 'market-square',
    guideId: 'tia-carmen-herrera',
    difficultyTier: 1,
    estimatedMinutes: 20,
    interactionMode: 'search_collect',
  },
  {
    type: 'guided_expedition',
    entryId: 'entry-silk-road',
    worldId: 'market-square',
    guideId: 'tia-carmen-herrera',
    difficultyTier: 2,
    estimatedMinutes: 25,
    interactionMode: 'guided_walk',
  },
  {
    type: 'time_window',
    entryId: 'entry-first-paper-money',
    worldId: 'market-square',
    guideId: 'tia-carmen-herrera',
    difficultyTier: 2,
    estimatedMinutes: 20,
    interactionMode: 'window_view',
  },
  {
    type: 'remembrance_wall',
    entryId: 'entry-double-entry-bookkeeping',
    worldId: 'market-square',
    guideId: 'tia-carmen-herrera',
    difficultyTier: 3,
    estimatedMinutes: 15,
    interactionMode: 'passive_observation',
  },

  // ─── Great Archive (The Librarian) ───────────────────────────────────────
  {
    type: 'guided_expedition',
    entryId: 'entry-great-library-alexandria',
    worldId: 'great-archive',
    guideId: 'the-librarian',
    difficultyTier: 1,
    estimatedMinutes: 25,
    interactionMode: 'guided_walk',
  },
  {
    type: 'remembrance_wall',
    entryId: 'entry-first-encyclopedia',
    worldId: 'great-archive',
    guideId: 'the-librarian',
    difficultyTier: 2,
    estimatedMinutes: 15,
    interactionMode: 'passive_observation',
  },
  {
    type: 'reenactment',
    entryId: 'entry-internet-birth',
    worldId: 'great-archive',
    guideId: 'the-librarian',
    difficultyTier: 2,
    estimatedMinutes: 25,
    interactionMode: 'interactive_replay',
  },
  {
    type: 'guided_expedition',
    entryId: 'entry-wikipedia',
    worldId: 'great-archive',
    guideId: 'the-librarian',
    difficultyTier: 3,
    estimatedMinutes: 20,
    interactionMode: 'guided_walk',
  },

  // ─── Cloud Kingdom (Professor Nimbus) ────────────────────────────────────
  {
    type: 'artifact_hunt',
    entryId: 'entry-barometer-torricelli',
    worldId: 'cloud-kingdom',
    guideId: 'professor-nimbus',
    difficultyTier: 1,
    estimatedMinutes: 20,
    interactionMode: 'search_collect',
  },
  {
    type: 'guided_expedition',
    entryId: 'entry-cloud-naming-howard',
    worldId: 'cloud-kingdom',
    guideId: 'professor-nimbus',
    difficultyTier: 2,
    estimatedMinutes: 25,
    interactionMode: 'guided_walk',
  },
  {
    type: 'reenactment',
    entryId: 'entry-lightning-franklin',
    worldId: 'cloud-kingdom',
    guideId: 'professor-nimbus',
    difficultyTier: 2,
    estimatedMinutes: 25,
    interactionMode: 'interactive_replay',
  },
  {
    type: 'remembrance_wall',
    entryId: 'entry-fitzroy-weather-forecast',
    worldId: 'cloud-kingdom',
    guideId: 'professor-nimbus',
    difficultyTier: 3,
    estimatedMinutes: 15,
    interactionMode: 'passive_observation',
  },

  // ─── Savanna Workshop (Zara Ngozi) ───────────────────────────────────────
  {
    type: 'reenactment',
    entryId: 'entry-archimedes-lever',
    worldId: 'savanna-workshop',
    guideId: 'zara-ngozi',
    difficultyTier: 1,
    estimatedMinutes: 25,
    interactionMode: 'interactive_replay',
  },
  {
    type: 'field_trip',
    entryId: 'entry-nok-iron-smelting',
    worldId: 'savanna-workshop',
    guideId: 'zara-ngozi',
    difficultyTier: 2,
    estimatedMinutes: 30,
    interactionMode: '3d_exploration',
  },
  {
    type: 'field_trip',
    entryId: 'entry-great-zimbabwe-walls',
    worldId: 'savanna-workshop',
    guideId: 'zara-ngozi',
    difficultyTier: 2,
    estimatedMinutes: 30,
    interactionMode: '3d_exploration',
  },
  {
    type: 'reenactment',
    entryId: 'entry-wright-brothers-workshop',
    worldId: 'savanna-workshop',
    guideId: 'zara-ngozi',
    difficultyTier: 3,
    estimatedMinutes: 30,
    interactionMode: 'interactive_replay',
  },

  // ─── Starfall Observatory (Riku Osei) ────────────────────────────────────
  {
    type: 'guided_expedition',
    entryId: 'entry-ibn-al-haytham-optics',
    worldId: 'starfall-observatory',
    guideId: 'riku-osei',
    difficultyTier: 1,
    estimatedMinutes: 25,
    interactionMode: 'guided_walk',
  },
  {
    type: 'time_window',
    entryId: 'entry-galileo-jupiter-moons',
    worldId: 'starfall-observatory',
    guideId: 'riku-osei',
    difficultyTier: 2,
    estimatedMinutes: 20,
    interactionMode: 'window_view',
  },
  {
    type: 'remembrance_wall',
    entryId: 'entry-henrietta-leavitt-cepheids',
    worldId: 'starfall-observatory',
    guideId: 'riku-osei',
    difficultyTier: 2,
    estimatedMinutes: 15,
    interactionMode: 'passive_observation',
  },
  {
    type: 'natural_exploration',
    entryId: 'entry-james-webb-telescope',
    worldId: 'starfall-observatory',
    guideId: 'riku-osei',
    difficultyTier: 3,
    estimatedMinutes: 30,
    interactionMode: 'nature_walk',
  },

  // ─── Rhyme Docks (Felix Barbosa) ─────────────────────────────────────────
  {
    type: 'guided_expedition',
    entryId: 'entry-homer-iliad',
    worldId: 'rhyme-docks',
    guideId: 'felix-barbosa',
    difficultyTier: 1,
    estimatedMinutes: 25,
    interactionMode: 'guided_walk',
  },
  {
    type: 'remembrance_wall',
    entryId: 'entry-phillis-wheatley',
    worldId: 'rhyme-docks',
    guideId: 'felix-barbosa',
    difficultyTier: 2,
    estimatedMinutes: 15,
    interactionMode: 'passive_observation',
  },
  {
    type: 'guided_expedition',
    entryId: 'entry-haiku-basho',
    worldId: 'rhyme-docks',
    guideId: 'felix-barbosa',
    difficultyTier: 2,
    estimatedMinutes: 25,
    interactionMode: 'guided_walk',
  },
  {
    type: 'time_window',
    entryId: 'entry-langston-hughes-blues',
    worldId: 'rhyme-docks',
    guideId: 'felix-barbosa',
    difficultyTier: 3,
    estimatedMinutes: 25,
    interactionMode: 'window_view',
  },

  // ─── Letter Forge (Amara Diallo) ─────────────────────────────────────────
  {
    type: 'artifact_hunt',
    entryId: 'entry-cuneiform-clay',
    worldId: 'letter-forge',
    guideId: 'amara-diallo',
    difficultyTier: 1,
    estimatedMinutes: 20,
    interactionMode: 'search_collect',
  },
  {
    type: 'artifact_hunt',
    entryId: 'entry-phoenician-alphabet',
    worldId: 'letter-forge',
    guideId: 'amara-diallo',
    difficultyTier: 1,
    estimatedMinutes: 20,
    interactionMode: 'search_collect',
  },
  {
    type: 'artifact_hunt',
    entryId: 'entry-braille-invention',
    worldId: 'letter-forge',
    guideId: 'amara-diallo',
    difficultyTier: 2,
    estimatedMinutes: 25,
    interactionMode: 'search_collect',
  },
  {
    type: 'artifact_hunt',
    entryId: 'entry-champollion-hieroglyphs',
    worldId: 'letter-forge',
    guideId: 'amara-diallo',
    difficultyTier: 3,
    estimatedMinutes: 30,
    interactionMode: 'search_collect',
  },
];

/**
 * Look up the config for a specific entry.
 * Returns undefined if the entry has no config (not yet implemented).
 */
export function getAdventureConfig(entryId: string): AdventureConfig | undefined {
  return ADVENTURE_CONFIGS.find((c) => c.entryId === entryId);
}
