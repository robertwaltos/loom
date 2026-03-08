/**
 * @loom/shuttle — AI agent orchestration (Temporal workflows).
 *
 * NPC Tier System: Classification and capability rules for AI agents.
 * World Shadow Economy: Per-world NPC commodity layer and prosperity.
 * NPC Memory Service: Tier-aware persistent memory for AI agents.
 * NPC Decision Engine: Think/act loop for AI agents.
 * Behavior Tree: Tick-driven decision trees for Tier 2 Inhabitants.
 * NPC Relationship Tracker: Inter-entity disposition and social graph.
 * NPC Schedule Manager: Daily activity routines for AI agents.
 * NPC Emotion Model: Emotional state tracking with intensity and decay.
 * NPC Dialogue Manager: Dialogue tree state machine for conversations.
 * NPC Goal Planner: Hierarchical goal tracking for NPC agents.
 * NPC Faction Tracker: Faction affinity tracking for NPC agents.
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
export { createNpcScheduleManager, MICROSECONDS_PER_DAY } from './npc-schedule.js';
export type {
  NpcScheduleManager,
  NpcScheduleDeps,
  NpcSchedule,
  TimeBlock,
  ActivityType,
  ScheduleOverride,
  ActiveBlock,
  AddBlockParams,
  AddOverrideParams,
  ScheduleStats,
} from './npc-schedule.js';
export { createNpcEmotionModel } from './npc-emotion.js';
export type {
  NpcEmotionModel,
  EmotionModelDeps,
  EmotionType,
  EmotionEntry,
  EmotionSnapshot,
  StimulusParams,
  StimulusResult,
  EmotionStats,
} from './npc-emotion.js';
export { createNpcDialogueManager } from './npc-dialogue.js';
export type {
  NpcDialogueManager,
  NpcDialogueDeps,
  DialogueTree,
  DialogueNode,
  DialogueResponse,
  Conversation,
  ConversationStatus,
  StartConversationParams,
  SelectResponseResult,
  DialogueStats,
} from './npc-dialogue.js';
export { createNpcGoalPlanner } from './npc-goal.js';
export type {
  NpcGoalPlanner,
  NpcGoalDeps,
  Goal,
  GoalStatus,
  AddGoalParams,
  GoalStats,
} from './npc-goal.js';
export { createNpcFactionTracker, AFFINITY_MIN, AFFINITY_MAX } from './npc-faction.js';
export type {
  NpcFactionTracker,
  FactionAffinity,
  AffinityLevel,
  AdjustAffinityParams,
  FactionStats,
} from './npc-faction.js';
