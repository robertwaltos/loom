/**
 * @loom/shuttle — AI agent orchestration (Temporal workflows).
 *
 * Currently provides: NPC Tier System (classification and capability rules).
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
