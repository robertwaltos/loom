/**
 * Content Engine Bootstrap — Koydo Worlds
 *
 * Creates a ContentEngine pre-loaded with all published entry data
 * across all 50 worlds, 9 quiz sets, and curriculum mappings.
 *
 * This is the single bootstrap point for production and tests.
 */

import { createContentEngine } from './engine.js';
import type { ContentEngine } from './engine.js';
import { ALL_CURRICULUM_MAPS } from './curriculum/mappings.js';

// ─── Entries (all 50 worlds) ───────────────────────────────────────

import { BARTER_DOCKS_ENTRIES } from './entries/barter-docks.js';
import { BODY_ATLAS_ENTRIES } from './entries/body-atlas.js';
import { BUDGET_KITCHEN_ENTRIES } from './entries/budget-kitchen.js';
import { CALCULATION_CAVES_ENTRIES } from './entries/calculation-caves.js';
import { CHARITY_HARBOR_ENTRIES } from './entries/charity-harbor.js';
import { CIRCUIT_MARSH_ENTRIES } from './entries/circuit-marsh.js';
import { CLOUD_KINGDOM_ENTRIES } from './entries/cloud-kingdom.js';
import { CODE_CANYON_ENTRIES } from './entries/code-canyon.js';
import { DATA_STREAM_ENTRIES } from './entries/data-stream.js';
import { DEBATE_ARENA_ENTRIES } from './entries/debate-arena.js';
import { DEBT_GLACIER_ENTRIES } from './entries/debt-glacier.js';
import { DIARY_LIGHTHOUSE_ENTRIES } from './entries/diary-lighthouse.js';
import { DISCOVERY_TRAIL_ENTRIES } from './entries/discovery-trail.js';
import { EDITING_TOWER_ENTRIES } from './entries/editing-tower.js';
import { ENTREPRENEUR_WORKSHOP_ENTRIES } from './entries/entrepreneur-workshop.js';
import { EVERYWHERE_ENTRIES } from './entries/everywhere.js';
import { FOLKLORE_BAZAAR_ENTRIES } from './entries/folklore-bazaar.js';
import { FROST_PEAKS_ENTRIES } from './entries/frost-peaks.js';
import { GRAMMAR_BRIDGE_ENTRIES } from './entries/grammar-bridge.js';
import { GREAT_ARCHIVE_ENTRIES } from './entries/great-archive.js';
import { GREENHOUSE_SPIRAL_ENTRIES } from './entries/greenhouse-spiral.js';
import { ILLUSTRATION_COVE_ENTRIES } from './entries/illustration-cove.js';
import { INVESTMENT_GREENHOUSE_ENTRIES } from './entries/investment-greenhouse.js';
import { JOB_FAIR_ENTRIES } from './entries/job-fair.js';
import { LETTER_FORGE_ENTRIES } from './entries/letter-forge.js';
import { MAGNET_HILLS_ENTRIES } from './entries/magnet-hills.js';
import { MAP_ROOM_ENTRIES } from './entries/map-room.js';
import { MARKET_SQUARE_ENTRIES } from './entries/market-square.js';
import { MEADOW_LAB_ENTRIES } from './entries/meadow-lab.js';
import { MUSIC_MEADOW_ENTRIES } from './entries/music-meadow.js';
import { NEEDS_WANTS_BRIDGE_ENTRIES } from './entries/needs-wants-bridge.js';
import { NONFICTION_FLEET_ENTRIES } from './entries/nonfiction-fleet.js';
import { NUMBER_GARDEN_ENTRIES } from './entries/number-garden.js';
import { PUNCTUATION_STATION_ENTRIES } from './entries/punctuation-station.js';
import { READING_REEF_ENTRIES } from './entries/reading-reef.js';
import { RHYME_DOCKS_ENTRIES } from './entries/rhyme-docks.js';
import { SAVANNA_WORKSHOP_ENTRIES } from './entries/savanna-workshop.js';
import { SAVINGS_VAULT_ENTRIES } from './entries/savings-vault.js';
import { SHARING_MEADOW_ENTRIES } from './entries/sharing-meadow.js';
import { SPELLING_MINES_ENTRIES } from './entries/spelling-mines.js';
import { STARFALL_OBSERVATORY_ENTRIES } from './entries/starfall-observatory.js';
import { STORY_TREE_ENTRIES } from './entries/story-tree.js';
import { TAX_OFFICE_ENTRIES } from './entries/tax-office.js';
import { THINKING_GROVE_ENTRIES } from './entries/thinking-grove.js';
import { TIDELINE_BAY_ENTRIES } from './entries/tideline-bay.js';
import { TIME_GALLERY_ENTRIES } from './entries/time-gallery.js';
import { TRANSLATION_GARDEN_ENTRIES } from './entries/translation-garden.js';
import { VOCABULARY_JUNGLE_ENTRIES } from './entries/vocabulary-jungle.js';
import { WELLNESS_GARDEN_ENTRIES } from './entries/wellness-garden.js';
import { WORKSHOP_CROSSROADS_ENTRIES } from './entries/workshop-crossroads.js';

// ─── Quizzes (9 worlds with quiz content so far) ───────────────────

import { CLOUD_KINGDOM_QUIZZES } from './quizzes/cloud-kingdom.js';
import { GREAT_ARCHIVE_QUIZZES } from './quizzes/great-archive.js';
import { LETTER_FORGE_QUIZZES } from './quizzes/letter-forge.js';
import { MARKET_SQUARE_QUIZZES } from './quizzes/market-square.js';
import { NUMBER_GARDEN_QUIZZES } from './quizzes/number-garden.js';
import { RHYME_DOCKS_QUIZZES } from './quizzes/rhyme-docks.js';
import { SAVANNA_WORKSHOP_QUIZZES } from './quizzes/savanna-workshop.js';
import { STARFALL_OBSERVATORY_QUIZZES } from './quizzes/starfall-observatory.js';
import { STORY_TREE_QUIZZES } from './quizzes/story-tree.js';

// ─── Aggregated collections ────────────────────────────────────────

const ALL_ENTRIES = [
  ...BARTER_DOCKS_ENTRIES,
  ...BODY_ATLAS_ENTRIES,
  ...BUDGET_KITCHEN_ENTRIES,
  ...CALCULATION_CAVES_ENTRIES,
  ...CHARITY_HARBOR_ENTRIES,
  ...CIRCUIT_MARSH_ENTRIES,
  ...CLOUD_KINGDOM_ENTRIES,
  ...CODE_CANYON_ENTRIES,
  ...DATA_STREAM_ENTRIES,
  ...DEBATE_ARENA_ENTRIES,
  ...DEBT_GLACIER_ENTRIES,
  ...DIARY_LIGHTHOUSE_ENTRIES,
  ...DISCOVERY_TRAIL_ENTRIES,
  ...EDITING_TOWER_ENTRIES,
  ...ENTREPRENEUR_WORKSHOP_ENTRIES,
  ...EVERYWHERE_ENTRIES,
  ...FOLKLORE_BAZAAR_ENTRIES,
  ...FROST_PEAKS_ENTRIES,
  ...GRAMMAR_BRIDGE_ENTRIES,
  ...GREAT_ARCHIVE_ENTRIES,
  ...GREENHOUSE_SPIRAL_ENTRIES,
  ...ILLUSTRATION_COVE_ENTRIES,
  ...INVESTMENT_GREENHOUSE_ENTRIES,
  ...JOB_FAIR_ENTRIES,
  ...LETTER_FORGE_ENTRIES,
  ...MAGNET_HILLS_ENTRIES,
  ...MAP_ROOM_ENTRIES,
  ...MARKET_SQUARE_ENTRIES,
  ...MEADOW_LAB_ENTRIES,
  ...MUSIC_MEADOW_ENTRIES,
  ...NEEDS_WANTS_BRIDGE_ENTRIES,
  ...NONFICTION_FLEET_ENTRIES,
  ...NUMBER_GARDEN_ENTRIES,
  ...PUNCTUATION_STATION_ENTRIES,
  ...READING_REEF_ENTRIES,
  ...RHYME_DOCKS_ENTRIES,
  ...SAVANNA_WORKSHOP_ENTRIES,
  ...SAVINGS_VAULT_ENTRIES,
  ...SHARING_MEADOW_ENTRIES,
  ...SPELLING_MINES_ENTRIES,
  ...STARFALL_OBSERVATORY_ENTRIES,
  ...STORY_TREE_ENTRIES,
  ...TAX_OFFICE_ENTRIES,
  ...THINKING_GROVE_ENTRIES,
  ...TIDELINE_BAY_ENTRIES,
  ...TIME_GALLERY_ENTRIES,
  ...TRANSLATION_GARDEN_ENTRIES,
  ...VOCABULARY_JUNGLE_ENTRIES,
  ...WELLNESS_GARDEN_ENTRIES,
  ...WORKSHOP_CROSSROADS_ENTRIES,
] as const;

const ALL_QUIZZES = [
  ...CLOUD_KINGDOM_QUIZZES,
  ...GREAT_ARCHIVE_QUIZZES,
  ...LETTER_FORGE_QUIZZES,
  ...MARKET_SQUARE_QUIZZES,
  ...NUMBER_GARDEN_QUIZZES,
  ...RHYME_DOCKS_QUIZZES,
  ...SAVANNA_WORKSHOP_QUIZZES,
  ...STARFALL_OBSERVATORY_QUIZZES,
  ...STORY_TREE_QUIZZES,
] as const;

// ─── Factory ───────────────────────────────────────────────────────

export function createBootstrappedContentEngine(): ContentEngine {
  return createContentEngine({
    entries: ALL_ENTRIES,
    quizzes: ALL_QUIZZES,
    curriculumMaps: ALL_CURRICULUM_MAPS,
  });
}

export { ALL_ENTRIES as ALL_CONTENT_ENTRIES, ALL_QUIZZES as ALL_CONTENT_QUIZZES };
