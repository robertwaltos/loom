/**
 * @loom/shuttle — AI agent orchestration (Temporal workflows).
 *
 * NPC Tier System: Classification and capability rules for AI agents.
 * World Shadow Economy: Per-world NPC commodity layer and prosperity.
 * NPC Memory Service: Tier-aware persistent memory for AI agents.
 * NPC Decision Engine: Think/act loop for AI agents.
 * Behavior Tree: Tick-driven decision trees for Tier 2 Inhabitants.
 * NPC Relationship Tracker: Inter-entity disposition and social graph.
 * Future: Temporal workflow integration, LLM orchestration.
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
export { createNpcMemoryService } from './npc-memory.js';
export type {
  NpcMemoryService,
  NpcMemoryDeps,
  MemoryEntry,
  MemoryCategory,
  RecordMemoryParams,
  RecallFilter,
  MemoryStats,
} from './npc-memory.js';
export { createNpcDecisionEngine } from './npc-decision.js';
export type {
  NpcDecisionEngine,
  NpcDecisionDeps,
  NpcDecision,
  NpcPerception,
  ContextSignal,
  DecisionOutcome,
  DecisionRequest,
  DecisionBackend,
  BackendResult,
  DecisionStats,
  TierBackendResolver,
} from './npc-decision.js';
export {
  createBlackboard,
  createActionNode,
  createConditionNode,
  createSequenceNode,
  createSelectorNode,
  createBehaviorTree,
  createBehaviorTreeRegistry,
} from './behavior-tree.js';
export type {
  BtNode,
  BtNodeStatus,
  BtNodeType,
  BtBlackboard,
  BtTickContext,
  BtActionFn,
  BtConditionFn,
  BehaviorTree,
  BehaviorTreeRegistry,
  BtTreeStats,
} from './behavior-tree.js';
export { createRelationshipTracker } from './npc-relationship.js';
export type {
  RelationshipTracker,
  RelationshipTrackerDeps,
  Relationship,
  RelationshipType,
  FormRelationshipParams,
  DispositionChange,
  RelationshipStats,
} from './npc-relationship.js';
