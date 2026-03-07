/**
 * @loom/shuttle — AI agent orchestration (Temporal workflows).
 *
 * NPC Tier System: Classification and capability rules for AI agents.
 * World Shadow Economy: Per-world NPC commodity layer and prosperity.
 * Future: Temporal workflow integration, LLM orchestration, memory services.
 */

export { createNpcTierRegistry, TIER_CONFIGS as NPC_TIER_CONFIGS } from './npc-tiers.js';
export {
  tierRequiresChronicle,
  tierIsEconomicParticipant,
  tierCanMigrate,
  aiBackendForTier,
} from './npc-tiers.js';
export type {
  NpcTierRegistry,
  NpcTierConfig,
  NpcClassification,
  ClassifyNpcParams,
  NpcTier,
  AiBackend,
  MemoryModel,
} from './npc-tiers.js';
export { createWorldShadowEconomy, DEFAULT_SHADOW_CONFIG } from './world-shadow-economy.js';
export type {
  WorldShadowEconomy,
  CommodityType,
  CommodityState,
  UnrestEvent,
  ShadowEconomyConfig,
  ShadowEconomyDeps,
} from './world-shadow-economy.js';
export { createWorldPopulationEngine, TIER_QUOTAS } from './world-population.js';
export type {
  WorldPopulationEngine,
  WorldPopulationState,
  PopulationDelta,
} from './world-population.js';
