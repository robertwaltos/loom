/**
 * @koydo/universe — Barrel Entry Point
 *
 * Exports all public types and implementations for the Koydo Worlds product layer.
 * Import sub-paths for tree-shaking in the game client build.
 */

// ─── Worlds ───────────────────────────────────────────────────────
export type {
  Realm,
  WorldId,
  WorldDefinition,
  WorldColorPalette,
  FadingStage,
  WorldLuminance,
  WorldLuminanceLogEntry,
} from './worlds/types.js';

export {
  WORLD_REGISTRY,
  ALL_WORLDS,
  getWorld,
  getWorldsByRealm,
} from './worlds/registry.js';

export type {
  WorldsEngineDeps,
  WorldsEngineStats,
  WorldsEngine,
} from './worlds/engine.js';
export { createWorldsEngine, computeFadingStage } from './worlds/engine.js';

// ─── Fading Engine ────────────────────────────────────────────────
export {
  LESSON_RESTORE_DELTAS,
  NATURAL_DECAY_PER_HOUR,
  MIN_LUMINANCE,
  resolveFadingStage,
  applyRestoration,
  applyNaturalDecay,
  detectStageTransition,
  luminanceToMaterialParams,
  stageTransitionSparkBonus,
} from './fading/engine.js';

export {
  luminanceToDb,
  luminanceFromDb,
  worldLuminanceFromRow,
  worldLuminanceToUpdatePayload,
} from './fading/persistence.js';

export type {
  WorldLuminanceDbRow,
  WorldLuminanceUpdatePayload,
  WorldLuminanceCounters,
} from './fading/persistence.js';

// ─── Characters ───────────────────────────────────────────────────
export type {
  CharacterProfile,
  CharacterPersonality,
  CharacterSystemPrompt,
  AdaptivePromptLayer,
  ConversationTurn,
  EmotionTag,
  AceFacialState,
  CharacterId,
} from './characters/types.js';

export { CHARACTER_ROSTER } from './characters/types.js';

// ─── Character Prompts ────────────────────────────────────────────
export {
  buildDottieSysPrompt,
  DOTTIE_BASE_PERSONALITY,
  DOTTIE_SUBJECT_KNOWLEDGE,
} from './characters/prompts/dottie-chakravarti.js';

export {
  buildAnayaSysPrompt,
  ANAYA_BASE_PERSONALITY,
  ANAYA_SUBJECT_KNOWLEDGE,
} from './characters/prompts/grandmother-anaya.js';

export {
  buildCarmenSysPrompt,
  CARMEN_BASE_PERSONALITY,
  CARMEN_SUBJECT_KNOWLEDGE,
} from './characters/prompts/tia-carmen-herrera.js';

export {
  buildLibrarianSysPrompt,
  LIBRARIAN_BASE_PERSONALITY,
  LIBRARIAN_SUBJECT_KNOWLEDGE,
} from './characters/prompts/the-librarian.js';

export {
  buildCompassSysPrompt,
  COMPASS_BASE_PERSONALITY,
  COMPASS_SUBJECT_KNOWLEDGE,
} from './characters/prompts/compass.js';

export {
  buildNimbusSysPrompt,
  NIMBUS_BASE_PERSONALITY,
  NIMBUS_SUBJECT_KNOWLEDGE,
} from './characters/prompts/professor-nimbus.js';

export {
  buildZaraSysPrompt,
  ZARA_BASE_PERSONALITY,
  ZARA_SUBJECT_KNOWLEDGE,
} from './characters/prompts/zara-ngozi.js';

export {
  buildRikuSysPrompt,
  RIKU_BASE_PERSONALITY,
  RIKU_SUBJECT_KNOWLEDGE,
} from './characters/prompts/riku-osei.js';

export {
  buildFelixSysPrompt,
  FELIX_BASE_PERSONALITY,
  FELIX_SUBJECT_KNOWLEDGE,
} from './characters/prompts/felix-barbosa.js';

export {
  buildAmaraSysPrompt,
  AMARA_BASE_PERSONALITY,
  AMARA_SUBJECT_KNOWLEDGE,
} from './characters/prompts/amara-diallo.js';

// ─── Content ──────────────────────────────────────────────────────
export type {
  RealWorldEntry,
  EntryConnection,
  EntryCurriculumMap,
  EntryMediaAsset,
  EntryQuizQuestion,
  EntryType,
  Era,
  AdventureType,
  DifficultyTier,
  EntryStatus,
  GeoLocation,
} from './content/types.js';

export { NUMBER_GARDEN_ENTRIES } from './content/entries/number-garden.js';
export { STORY_TREE_ENTRIES } from './content/entries/story-tree.js';
export { MARKET_SQUARE_ENTRIES } from './content/entries/market-square.js';
export { GREAT_ARCHIVE_ENTRIES } from './content/entries/great-archive.js';
export { CLOUD_KINGDOM_ENTRIES } from './content/entries/cloud-kingdom.js';
export { LETTER_FORGE_ENTRIES } from './content/entries/letter-forge.js';
export { RHYME_DOCKS_ENTRIES } from './content/entries/rhyme-docks.js';
export { SAVANNA_WORKSHOP_ENTRIES } from './content/entries/savanna-workshop.js';
export { STARFALL_OBSERVATORY_ENTRIES } from './content/entries/starfall-observatory.js';
export { TIDELINE_BAY_ENTRIES } from './content/entries/tideline-bay.js';
export { SAVINGS_VAULT_ENTRIES } from './content/entries/savings-vault.js';
export { MEADOW_LAB_ENTRIES } from './content/entries/meadow-lab.js';
export { READING_REEF_ENTRIES } from './content/entries/reading-reef.js';
export { BUDGET_KITCHEN_ENTRIES } from './content/entries/budget-kitchen.js';
export { WORKSHOP_CROSSROADS_ENTRIES } from './content/entries/workshop-crossroads.js';
export { CALCULATION_CAVES_ENTRIES } from './content/entries/calculation-caves.js';
export { MAGNET_HILLS_ENTRIES } from './content/entries/magnet-hills.js';
export { CIRCUIT_MARSH_ENTRIES } from './content/entries/circuit-marsh.js';
export { CODE_CANYON_ENTRIES } from './content/entries/code-canyon.js';
export { BODY_ATLAS_ENTRIES } from './content/entries/body-atlas.js';
export { FROST_PEAKS_ENTRIES } from './content/entries/frost-peaks.js';
export { GREENHOUSE_SPIRAL_ENTRIES } from './content/entries/greenhouse-spiral.js';
export { DATA_STREAM_ENTRIES } from './content/entries/data-stream.js';
export { MAP_ROOM_ENTRIES } from './content/entries/map-room.js';
export { GRAMMAR_BRIDGE_ENTRIES } from './content/entries/grammar-bridge.js';
export { VOCABULARY_JUNGLE_ENTRIES } from './content/entries/vocabulary-jungle.js';
export { PUNCTUATION_STATION_ENTRIES } from './content/entries/punctuation-station.js';
export { DEBATE_ARENA_ENTRIES } from './content/entries/debate-arena.js';
export { DIARY_LIGHTHOUSE_ENTRIES } from './content/entries/diary-lighthouse.js';
export { SPELLING_MINES_ENTRIES } from './content/entries/spelling-mines.js';
export { TRANSLATION_GARDEN_ENTRIES } from './content/entries/translation-garden.js';
export { NONFICTION_FLEET_ENTRIES } from './content/entries/nonfiction-fleet.js';
export { ILLUSTRATION_COVE_ENTRIES } from './content/entries/illustration-cove.js';
export { FOLKLORE_BAZAAR_ENTRIES } from './content/entries/folklore-bazaar.js';
export { EDITING_TOWER_ENTRIES } from './content/entries/editing-tower.js';

// ─── Exchange Realm ──────────────────────────────────────────────────
export { ENTREPRENEUR_WORKSHOP_ENTRIES } from './content/entries/entrepreneur-workshop.js';
export { SHARING_MEADOW_ENTRIES } from './content/entries/sharing-meadow.js';
export { INVESTMENT_GREENHOUSE_ENTRIES } from './content/entries/investment-greenhouse.js';
export { NEEDS_WANTS_BRIDGE_ENTRIES } from './content/entries/needs-wants-bridge.js';
export { BARTER_DOCKS_ENTRIES } from './content/entries/barter-docks.js';
export { DEBT_GLACIER_ENTRIES } from './content/entries/debt-glacier.js';
export { JOB_FAIR_ENTRIES } from './content/entries/job-fair.js';
export { CHARITY_HARBOR_ENTRIES } from './content/entries/charity-harbor.js';
export { TAX_OFFICE_ENTRIES } from './content/entries/tax-office.js';

// ─── Crossroads Realm ─────────────────────────────────────────────
export { DISCOVERY_TRAIL_ENTRIES } from './content/entries/discovery-trail.js';
export { THINKING_GROVE_ENTRIES } from './content/entries/thinking-grove.js';
export { WELLNESS_GARDEN_ENTRIES } from './content/entries/wellness-garden.js';
export { TIME_GALLERY_ENTRIES } from './content/entries/time-gallery.js';
export { MUSIC_MEADOW_ENTRIES } from './content/entries/music-meadow.js';
export { EVERYWHERE_ENTRIES } from './content/entries/everywhere.js';

export {
  ALL_CURRICULUM_MAPS,
  getMapsForEntry,
  getEntriesForStandardCode,
} from './content/curriculum/mappings.js';

export type {
  ContentEngineDeps,
  ContentEngineStats,
  ContentEngine,
} from './content/engine.js';
export { createContentEngine } from './content/engine.js';

// ─── Kindler (Player Progression) ────────────────────────────────
export type {
  KindlerProfile,
  KindlerProgress,
  KindlerSession,
  SessionReport,
  SparkState,
  SparkLogEntry,
  SparkCause,
  Chapter,
  AgeTier,
} from './kindler/types.js';

export type {
  KindlerEngine,
  KindlerEngineDeps,
  KindlerEngineConfig,
  KindlerEngineStats,
  SparkChangeEvent,
  ChapterAdvancedEvent,
} from './kindler/engine.js';

export {
  createKindlerEngine,
  SPARK_DELTAS,
  MIN_SPARK_LEVEL,
  RETURN_BONUS_THRESHOLD_DAYS,
  CHAPTER_THRESHOLDS,
} from './kindler/engine.js';

// ─── Adventures ───────────────────────────────────────────────────
export type {
  AdventureConfig,
  AdventureState,
} from './adventures/types.js';

export type {
  AdventuresEngineDeps,
  AdventuresEngineStats,
  AdventuresEngine,
} from './adventures/engine.js';
export { createAdventuresEngine } from './adventures/engine.js';

// ─── Safety / COPPA ───────────────────────────────────────────────
export type {
  ParentAccount,
  AiConversationSession,
  TimeControls,
  ContentModerationResult,
  ContentRating,
  ModerationFlag,
  SubscriptionStatus,
  ConsentMethod,
} from './safety/types.js';

export type {
  SafetyEngine,
  SafetyEngineDeps,
  SafetyEngineConfig,
  SafetyEngineStats,
} from './safety/engine.js';

export {
  createSafetyEngine,
  AI_SESSION_AUTO_DELETE_MS,
} from './safety/engine.js';

// ─── Parent Dashboard ─────────────────────────────────────────────
export type {
  ApiResponse,
  ApiSuccess,
  ApiError,
  ApiErrorCode,
  DashboardOverviewResponse,
  ChildSummary,
  ChildDetailResponse,
  WorldProgressSummary,
  SessionSummaryPublic,
  SubjectProgress,
  WorldsMapResponse,
  WorldMapEntry,
  TimeControlsUpdateRequest,
  TimeControlsUpdateResponse,
  ProgressReportRequest,
  ProgressReportResponse,
  AddChildRequest,
  AddChildResponse,
  RemoveChildResponse,
} from './parent-dashboard/api.js';

export {
  validateTimeControlsUpdate,
  validateAddChildRequest,
  DASHBOARD_ROUTES,
} from './parent-dashboard/api.js';

export type {
  DashboardEngine,
  DashboardDeps,
  DashboardQueries,
  ChildDetailData,
  ProgressReportData,
} from './parent-dashboard/engine.js';

export { createDashboardEngine } from './parent-dashboard/engine.js';

// ─── Media Pipeline ───────────────────────────────────────────────
export type {
  CharacterArtRequest,
  CharacterArtResult,
  ArtStyleVariant,
  FalAiJob,
  FalAiJobStatus,
  MetaHumanBrief,
} from './media-pipeline/character-pipeline.js';

export {
  buildCharacterImagePrompt,
  buildMetaHumanBrief,
  buildMediaAssetRecord,
  STANDARD_NEGATIVE_PROMPT,
} from './media-pipeline/character-pipeline.js';

// ─── Revenue ──────────────────────────────────────────────────────
export type {
  RevenueEvent,
  RoyaltyLedgerEntry,
} from './revenue/types.js';
export type {
  RevenueEngine,
  RevenueEngineDeps,
  RevenueEngineConfig,
  RevenueEngineStats,
} from './revenue/engine.js';

export {
  createRevenueEngine,
  LIFETIME_ROYALTY_FREE_THRESHOLD,
  STANDARD_ROYALTY_RATE,
  EPIC_STORE_ROYALTY_RATE,
  QUARTERLY_REPORTING_THRESHOLD,
} from './revenue/engine.js';

// ─── Characters Engine ────────────────────────────────────────────
export type {
  SysPromptBuilder,
  CharactersEngineDeps,
  CharactersEngine,
} from './characters/engine.js';
export { createCharactersEngine } from './characters/engine.js';

// ─── Database Row Types & Mappers ─────────────────────────────────
export type {
  RealWorldEntryRow,
  EntryConnectionRow,
  EntryCurriculumMapRow,
  EntryMediaAssetRow,
  EntryQuizQuestionRow,
  WorldLuminanceRow,
  WorldLuminanceLogRow,
  ParentAccountRow,
  KindlerProfileRow,
  KindlerProgressRow,
  KindlerSparkLogRow,
  KindlerSessionRow,
  SessionReportRow,
  AiConversationSessionRow,
  RevenueEventRow,
  RoyaltyLedgerRow,
} from './db/row-types.js';

export {
  realWorldEntryFromRow,
  realWorldEntryToRow,
  entryConnectionFromRow,
  entryConnectionToRow,
  entryCurriculumMapFromRow,
  entryCurriculumMapToRow,
  entryMediaAssetFromRow,
  entryMediaAssetToRow,
  entryQuizQuestionFromRow,
  entryQuizQuestionToRow,
  worldLuminanceFromRow,
  worldLuminanceToRow,
  worldLuminanceLogFromRow,
  worldLuminanceLogToRow,
  kindlerProfileFromRow,
  kindlerProfileToRow,
  kindlerProgressFromRow,
  kindlerProgressToRow,
  sparkLogFromRow,
  sparkLogToRow,
  kindlerSessionFromRow,
  kindlerSessionToRow,
  sessionReportFromRow,
  sessionReportToRow,
  aiSessionFromRow,
  aiSessionToRow,
  revenueEventFromRow,
  revenueEventToRow,
  royaltyLedgerFromRow,
  royaltyLedgerToRow,
} from './db/mappers.js';