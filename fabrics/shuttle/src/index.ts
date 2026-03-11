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
 * NPC Trait System: Personality traits, compatibility, and inheritance.
 * Behavior Tree V2: Enhanced trees with parallel, decorator, builder.
 * NPC Personality: Big Five personality model and mood system.
 * NPC Schedule V2: Enhanced schedules with weekly variation and archetypes.
 * NPC Memory V2: Decay, emotional tags, gossip system.
 * NPC Social Network: Social graph, influence propagation, cliques.
 * Workflow Engine: Temporal-style workflow orchestration for NPC tasks.
 * Future: LLM orchestration, cross-world agent coordination.
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
export { createTraitSystem } from './npc-traits.js';
export type {
  TraitSystem,
  TraitSystemDeps,
  TraitCategory,
  Trait,
  AssignTraitParams,
  TraitProfile,
  TraitCompatibility,
  InheritTraitsParams,
  TraitSystemStats,
} from './npc-traits.js';
export { createNpcRoutineEngine } from './npc-routine.js';
export type {
  NpcRoutineEngine,
  NpcRoutineDeps,
  RoutineActivity,
  RoutineStep,
  Routine,
  CreateRoutineParams,
  AssignmentStatus,
  RoutineAssignment,
  NpcRoutineStats,
} from './npc-routine.js';
export { createNpcInventoryService, DEFAULT_INVENTORY_CONFIG } from './npc-inventory.js';
export type {
  NpcInventoryService,
  NpcInventoryDeps,
  NpcInventoryConfig,
  ItemCategory,
  InventoryItem,
  AddItemParams as InventoryAddItemParams,
  TransferResult,
  NpcInventoryStats,
} from './npc-inventory.js';
export { createNpcSkillSystem, XP_PER_LEVEL } from './npc-skill.js';
export type {
  NpcSkillSystem,
  NpcSkillDeps,
  NpcSkill,
  AcquireSkillParams,
  TrainResult,
  NpcSkillStats,
} from './npc-skill.js';
export { createNpcReputationService, REPUTATION_MIN, REPUTATION_MAX } from './npc-reputation.js';
export type {
  NpcReputationService,
  NpcReputationDeps,
  ReputationEntry,
  AdjustReputationParams,
  ReputationLevel,
  NpcReputationStats,
} from './npc-reputation.js';
export { createShuttleOrchestrator, DEFAULT_SHUTTLE_CONFIG } from './shuttle-orchestrator.js';
export type {
  ShuttleOrchestrator,
  ShuttleOrchestratorDeps,
  ShuttleOrchestratorConfig,
  ShuttleOrchestratorStats,
  ShuttleTickResult,
  ShuttlePopulationPort,
  ShuttleDecisionPort,
  ShuttleBehaviorTreePort,
  ShuttleMemoryPort,
  ShuttleSchedulePort,
  ShuttleNpcRecord,
  ShuttleDecision,
} from './shuttle-orchestrator.js';
export {
  createBtV2Blackboard,
  createBtV2ActionNode,
  createBtV2ConditionNode,
  createBtV2SequenceNode,
  createBtV2SelectorNode,
  createBtV2ParallelNode,
  createBtV2DecoratorNode,
  createBtV2Tree,
  createBtV2TreeBuilder,
} from './behavior-tree-v2.js';
export type {
  BtV2NodeStatus,
  BtV2NodeType,
  BtV2DecoratorKind,
  BtV2ParallelPolicy,
  BtV2Blackboard,
  BtV2TickContext,
  BtV2ActionFn,
  BtV2ConditionFn,
  BtV2GuardFn,
  BtV2Node,
  BtV2Tree,
  BtV2TreeBuilder,
  BtV2TreeDeps,
  DecoratorConfig,
} from './behavior-tree-v2.js';
export { createPersonalitySystem, PERSONALITY_TEMPLATES } from './npc-personality.js';
export type {
  PersonalitySystem,
  PersonalityDeps,
  PersonalityTraits,
  Mood,
  NpcPersonality,
  CreatePersonalityParams,
  MoodInfluence,
  MoodUpdateResult,
  PersonalityTemplateName,
  PersonalityCompatibility,
  BehaviorModifiers,
  PersonalityStats,
} from './npc-personality.js';
export { createNpcScheduleV2System, SCHEDULE_TEMPLATES } from './npc-schedule-v2.js';
export type {
  NpcScheduleV2System,
  ScheduleV2Deps,
  ScheduleV2Activity,
  DayOfWeek,
  ScheduleV2Block,
  ScheduleV2Interrupt,
  NpcScheduleV2,
  AddBlockV2Params,
  AddInterruptParams,
  ResolvedActivity,
  ScheduleV2TemplateName,
  ScheduleV2Stats,
} from './npc-schedule-v2.js';
export { createNpcMemoryV2System, DEFAULT_MEMORY_V2_CONFIG } from './npc-memory-v2.js';
export type {
  NpcMemoryV2System,
  MemoryV2Deps,
  MemoryV2Type,
  EmotionalTag,
  MemoryV2Tier,
  MemoryV2Entry,
  RecordMemoryV2Params,
  MemoryV2QueryFilter,
  ShareMemoryParams,
  ShareMemoryResult,
  MemoryV2Config,
  MemoryV2Stats,
} from './npc-memory-v2.js';
export { createNpcSocialNetwork, EVENT_STRENGTH_DELTAS } from './npc-social.js';
export type {
  NpcSocialNetwork,
  SocialDeps,
  SocialRelationshipType,
  SocialRelationship,
  FormSocialRelParams,
  SocialEventKind,
  SocialEvent,
  RecordSocialEventParams,
  SocialInfluence,
  PropagateInfluenceParams,
  PropagateInfluenceResult,
  SocialClique,
  SocialStats,
} from './npc-social.js';
export { createWorkflowEngine } from './workflow-engine.js';
export type {
  WorkflowEngine,
  WorkflowDeps,
  WorkflowStatus,
  StepType,
  StepStatus,
  WorkflowStep,
  StepConfig,
  WorkflowDefinition,
  DefineWorkflowParams,
  DefineStepParams,
  WorkflowInstance,
  StartWorkflowParams,
  StepExecutor,
  WorkflowTickResult,
  WorkflowStats,
} from './workflow-engine.js';
export {
  createDialogueEngine,
  MOOD_PRIORITY_BONUS,
  MAX_HISTORY_PER_NPC,
  TOPIC_RELEVANCE_THRESHOLD,
} from './npc-dialogue-engine.js';
export type {
  DialogueEngine,
  DialogueEngineDeps,
  DialogueLine,
  DialogueBranch,
  DialogueCondition,
  ConversationRecord,
  TopicKnowledge,
  GeneratedTopic,
  WorldEvent,
  MoodType,
  LineSelectionResult,
  DialogueEngineStats,
} from './npc-dialogue-engine.js';
export {
  createNpcEconomyEngine,
  BASE_PRICE,
  SUPPLY_LOW_THRESHOLD,
  SUPPLY_HIGH_THRESHOLD,
  MAX_PRICE_MULTIPLIER,
  MIN_PRICE_MULTIPLIER,
} from './npc-economy.js';
export type {
  NpcEconomyEngine,
  NpcEconomyDeps,
  EconomicRole,
  MerchantProfile,
  MarketListing,
  TradeRoute,
  ResourceStock,
  GatheringTask,
  GatheringStatus,
  TradeResult,
  PriceFactors,
  NpcEconomyStats,
} from './npc-economy.js';
export {
  createNpcFactionAI,
  LOYALTY_MIN,
  LOYALTY_MAX,
  LOYALTY_COMPLY_THRESHOLD,
  RECRUITMENT_BASE_CHANCE,
} from './npc-faction-ai.js';
export type {
  NpcFactionAI,
  NpcFactionAIDeps,
  FactionRole,
  FactionMember,
  PatrolRoute,
  PatrolAssignment,
  PatrolStatus,
  DiplomacyStance,
  DiplomacyRelation,
  FactionEvent,
  EventResponse,
  EventResponseType,
  RecruitmentAttempt,
  LoyaltyDecision,
  NpcFactionAIStats,
} from './npc-faction-ai.js';
export {
  createQuestGiverEngine,
  DEFAULT_POOL_CONFIG,
  DIFFICULTY_MULTIPLIERS,
} from './npc-quest-giver.js';
export type {
  QuestGiverEngine,
  QuestGiverDeps,
  QuestPoolConfig,
  Quest,
  QuestDifficulty,
  QuestStatus as QuestGiverStatus,
  QuestCategory,
  QuestReward as QuestGiverReward,
  QuestObjective,
  QuestChain,
  WorldStateHint,
  QuestAcceptResult,
  QuestProgressResult,
  GeneratedQuestBatch,
  CreateQuestParams as QuestGiverCreateParams,
  QuestGiverStats,
} from './npc-quest-giver.js';
export { createNpcMigrationSystem } from './npc-migration.js';
export type {
  NpcMigrationSystem,
  NpcMigrationDeps,
  MigrationReason,
  MigrationStatus,
  MigrationRecord,
  MigrationWave,
  PopulationDelta as NpcMigrationPopulationDelta,
  PushPullFactors,
  MigrationDecision,
  MigrationStats,
  RecordMigrationError,
  CompleteMigrationError,
  EvaluateMigrationError,
} from './npc-migration.js';
export { createNpcCraftingSystem } from './npc-crafting-ai.js';
export type {
  NpcCraftingSystem,
  NpcCraftingDeps,
  CraftingStatus,
  ResourceRequirement,
  Recipe,
  RecipeEvaluation,
  ResourceGathering,
  CraftingDecision,
  CraftingHistory,
  ProfitabilityScore,
  CraftingStats,
  EvaluateRecipeError,
  DecideToCraftError,
  GatherResourceError,
  ExecuteCraftError,
} from './npc-crafting-ai.js';
export { createNpcKnowledgeSystem } from './npc-knowledge.js';
export type {
  NpcKnowledgeSystem,
  NpcKnowledgeDeps,
  KnowledgeCategory,
  TrustLevel,
  KnowledgeSource,
  KnowledgeItem,
  Rumor,
  KnowledgeSpread,
  TrustworthinessScore,
  KnowledgeStats,
  AddKnowledgeError,
  SpreadRumorError,
  EvaluateTrustError,
} from './npc-knowledge.js';

export { createNpcGovernmentModule } from './npc-government.js';
export type {
  GovDeps,
  GovernmentType,
  OfficeType,
  PoliticalOffice,
  Incumbent,
  Policy,
  Election,
  CorruptionEvent,
  Government,
  GovernmentReport,
  NpcGovernmentModule,
} from './npc-government.js';
export { createNpcReligionModule } from './npc-religion.js';
export type {
  RelDeps,
  Belief,
  Ritual,
  HolyDay,
  Religion,
  ReligiousFaction,
  ConversionEvent,
  ReligiousTension,
  ReligionReport,
  NpcReligionModule,
} from './npc-religion.js';

// -- Wave 10: NPC Diplomacy AI -----------------------------------------------
export {
  createDiplomacyState,
  evaluateRelationship,
  getRelationship as getDiplomacyRelationship,
  updateRelationshipScore,
  selectStrategy,
  executeDiplomacy,
  recordBetrayal,
  computeTrustLevel,
  getDiplomacyHistory,
  getDiplomacyReport,
  getAllRelationships as getAllDiplomacyRelationships,
  getBetrayalsBetween,
} from './npc-diplomacy-ai.js';
export type {
  DiplomaticStrategy,
  RelationshipStatus,
  RelationshipAssessment,
  DiplomacyAction,
  BetrayalRecord,
  DiplomacyHistory,
  DiplomacyReport,
  StrategyWeights,
  DiplomacyState,
  DiplomacyError,
} from './npc-diplomacy-ai.js';

// -- Wave 10: NPC War AI -----------------------------------------------------
export {
  createMilitaryState,
  registerForce,
  getForce,
  updateMorale,
  updateFatigue,
  adjustTroops,
  assessMilitary,
  selectTactic,
  getTacticModifiers,
  orderBattle,
  recordOutcome,
  initializeExhaustion,
  computeExhaustion,
  shouldSurrender,
  surrender,
  getMilitaryReport,
} from './npc-war-ai.js';
export type {
  Tactic,
  TroopType,
  MilitaryForce,
  BattleOrder,
  TerrainType,
  BattleOutcome,
  WarExhaustion,
  MilitaryReport,
  TacticModifiers,
  MilitaryState,
  WarError,
} from './npc-war-ai.js';

// -- Wave 10: NPC Art & Culture ----------------------------------------------
export { createCultureSystem } from './npc-art-culture.js';
export type { CultureSystem } from './npc-art-culture.js';

// -- Wave 10: NPC Family -----------------------------------------------------
export { createFamilySystem } from './npc-family.js';
export type { FamilySystem } from './npc-family.js';

// -- Wave 10: NPC Philosophy -------------------------------------------------
export { createPhilosophySystem } from './npc-philosophy.js';
export type { PhilosophySystem } from './npc-philosophy.js';

// -- Wave 10: NPC Trade AI ---------------------------------------------------
export { createTradeAI } from './npc-trade-ai.js';
export type { TradeAI } from './npc-trade-ai.js';

// -- Wave 11: NPC Memory System ----------------------------------------------
export {
  createNpcMemoryState,
  registerNpc,
  recordMemory,
  recallMemories,
  forgetMemory,
  applyDecay,
  getMemory,
  getMemoryProfile,
  listMemories,
} from './npc-memory-system.js';
export type {
  NpcMemoryState,
  NpcMemorySystemDeps,
  NpcMemorySystemClock,
  NpcMemorySystemIdGen,
  NpcMemorySystemLogger,
  MemoryType as NpcMemoryType,
  MemoryImportance as NpcMemoryImportance,
  MemoryError as NpcMemoryError,
  Memory as NpcMemory,
  MemoryRecall as NpcMemoryRecall,
  NpcMemoryProfile,
} from './npc-memory-system.js';

// -- Wave 11: NPC Emotion System ---------------------------------------------
export {
  createNpcEmotionState,
  registerNpcEmotion,
  applyEmotionTrigger,
  setEmotionIntensity,
  decayEmotionIntensity,
  getEmotionState,
  getEmotionReport,
  listEmotionNpcs,
} from './npc-emotion-system.js';
export type {
  NpcEmotionSystemState,
  NpcEmotionSystemDeps,
  NpcEmotionSystemClock,
  NpcEmotionSystemIdGen,
  NpcEmotionSystemLogger,
  EmotionType as NpcEmotionType,
  EmotionTrigger as NpcEmotionTrigger,
  EmotionError as NpcEmotionError,
  EmotionState as NpcEmotionState,
  EmotionEvent as NpcEmotionEvent,
  EmotionReport as NpcEmotionReport,
} from './npc-emotion-system.js';

// -- Wave 11: NPC Relationship System ----------------------------------------
export {
  createNpcRelationshipState,
  createRelationship,
  adjustRelationshipScore,
  setRelationshipType,
  getRelationship as getNpcRelationship,
  getRelationshipEvents,
  getRelationshipSummary,
  listRelationships,
} from './npc-relationship-system.js';
export type {
  NpcRelationshipSystemState,
  NpcRelationshipSystemDeps,
  NpcRelationshipSystemClock,
  NpcRelationshipSystemIdGen,
  NpcRelationshipSystemLogger,
  EntityId as NpcEntityId,
  RelationshipType as NpcRelationshipType,
  RelationshipError as NpcRelationshipError,
  Relationship as NpcRelationship,
  RelationshipEvent as NpcRelationshipEvent,
  RelationshipSummary as NpcRelationshipSummary,
} from './npc-relationship-system.js';

// -- Wave 12: NPC Scheduler --------------------------------------------------
export { createNpcSchedulerSystem } from './npc-scheduler.js';
export type {
  NpcSchedulerSystem,
  NpcSchedulerDeps,
  NpcSchedulerClock,
  NpcSchedulerIdGen,
  NpcSchedulerLogger,
  ActivityType as NpcActivityType,
  ScheduleError as NpcScheduleError,
  ScheduledActivity,
  DaySchedule,
  SchedulerStats,
} from './npc-scheduler.js';

// -- Wave 12: NPC Goal Planner -----------------------------------------------
export { createNpcGoalPlannerSystem } from './npc-goal-planner.js';
export type {
  NpcGoalPlannerSystem,
  NpcGoalPlannerDeps,
  NpcGoalPlannerClock,
  NpcGoalPlannerIdGen,
  NpcGoalPlannerLogger,
  PlannerError,
  GoalStatus as NpcGoalStatus,
  TaskStatus as NpcTaskStatus,
  Goal as NpcGoal,
  GoalTask as NpcGoalTask,
  PlannerStats,
} from './npc-goal-planner.js';

// -- Wave 12: NPC Social Network ---------------------------------------------
export { createNpcSocialNetworkSystem } from './npc-social-network.js';
export type {
  NpcSocialNetworkSystem,
  NpcSocialNetworkDeps,
  NpcSocialNetworkClock,
  NpcSocialNetworkIdGen,
  NpcSocialNetworkLogger,
  NetworkError,
  ConnectionStrength,
  Connection as NpcConnection,
  InfluenceResult,
  CommunityCluster,
  NetworkStats,
} from './npc-social-network.js';

// -- Wave 13: NPC Knowledge System -------------------------------------------
export {
  createNpcKnowledgeSystemState,
  registerNpcKnowledge,
  learnKnowledge,
  teachKnowledge,
  improveKnowledge,
  getKnowledgeEntry,
  listKnowledge,
  getKnowledgeProfile,
  findExperts,
} from './npc-knowledge-system.js';
export type {
  NpcKnowledgeSystemState,
  NpcKnowledgeSystemDeps,
  NpcKnowledgeSystemClock,
  NpcKnowledgeSystemIdGen,
  NpcKnowledgeSystemLogger,
  KnowledgeDomain,
  KnowledgeError,
  ExpertiseLevel,
  KnowledgeEntry,
  KnowledgeTransfer,
  KnowledgeProfile,
} from './npc-knowledge-system.js';

// -- Wave 13: NPC Combat AI --------------------------------------------------
export {
  createNpcCombatAIState,
  registerNpcCombat,
  startCombat,
  makeDecision,
  endCombat,
  updateCombatStats,
  getCombatEncounter,
  getDecisionHistory,
  getNpcCombatStats,
} from './npc-combat-ai.js';
export type {
  NpcCombatAIState,
  NpcCombatAIDeps,
  NpcCombatAIClock,
  NpcCombatAIIdGen,
  NpcCombatAILogger,
  CombatError,
  CombatStance,
  CombatAction as NpcCombatAction,
  CombatStats as NpcCombatStats,
  CombatEncounter,
  CombatDecision as NpcCombatDecision,
} from './npc-combat-ai.js';

// -- Wave 13: NPC Career Path ------------------------------------------------
export {
  createNpcCareerPathState,
  registerNpcCareer,
  hire,
  terminate,
  promote,
  adjustSalary,
  getCareerPath,
  getCurrentJob,
  getJobHistory,
} from './npc-career-path.js';
export type {
  NpcCareerPathState,
  NpcCareerPathDeps,
  NpcCareerPathClock,
  NpcCareerPathIdGen,
  NpcCareerPathLogger,
  CareerError,
  Profession,
  JobRecord,
  CareerPath,
  CareerAdvancement,
} from './npc-career-path.js';

// -- Wave 14: NPC Language System --------------------------------------------
export {
  createNpcLanguageState,
  createNpcLanguageSystem,
  defineLanguage,
  registerNpc as registerNpcLanguage,
  learnLanguage,
  improveFluency,
  canCommunicate,
  getLanguageStats,
  listKnownLanguages,
  listSpeakers,
} from './npc-language.js';
export type {
  NpcLanguageState,
  NpcLanguageDeps,
  NpcLanguageClock,
  NpcLanguageIdGen,
  NpcLanguageLogger,
  NpcLanguageSystem,
  LanguageError,
  LanguageFamily,
  Language,
  NpcLanguageProficiency,
  LanguageStats,
} from './npc-language.js';

// -- Wave 14: NPC Mythology System -------------------------------------------
export {
  createNpcMythologyState,
  createNpcMythologySystem,
  registerNpc as registerNpcMythology,
  createMyth,
  believeMyth,
  createTradition,
  practiceTradition,
  observeTradition,
  getBeliefProfile,
  getMyth,
  listMythsByCategory,
} from './npc-mythology.js';
export type {
  NpcMythologyState,
  NpcMythologyDeps,
  NpcMythologyClock,
  NpcMythologyIdGen,
  NpcMythologyLogger,
  NpcMythologySystem,
  MythologyError,
  MythCategory,
  TraditionFrequency,
  Myth,
  SacredTradition,
  BeliefProfile,
} from './npc-mythology.js';

// -- Wave 14: NPC Politics System --------------------------------------------
export {
  createNpcPoliticsState,
  createNpcPoliticsSystem,
  registerNpc as registerNpcPolitics,
  createFaction,
  joinFaction,
  leaveFaction,
  contributeInfluence,
  castVote,
  getNpcProfile,
  getFaction,
  listFactions,
  getVoteHistory,
} from './npc-politics.js';
export type {
  NpcPoliticsState,
  NpcPoliticsDeps,
  NpcPoliticsClock,
  NpcPoliticsIdGen,
  NpcPoliticsLogger,
  NpcPoliticsSystem,
  PoliticsError,
  PoliticalStance,
  PoliticalFaction,
  NpcPoliticalProfile,
  PolicyVote,
} from './npc-politics.js';

// ── Phase 3 Infrastructure Adapters ─────────────────────────────

export { createTemporalClient, createTemporalWorker } from './temporal-worker.js';
export type {
  TemporalConfig,
  TemporalAdapter,
  TemporalWorkflowHandle,
  TemporalWorkerHandle,
} from './temporal-worker.js';

// -- Character T2I Portrait Generation (Fal.ai) -----------------------------
export {
  createCharacterPortraitService,
  CharacterPortraitError,
} from './character-portrait.js';
export type {
  CharacterPortraitPort,
  CharacterPortraitRequest,
  CharacterPortraitResponse,
  CharacterPortraitDeps,
} from './character-portrait.js';
export { buildNpcAppearance } from './npc-appearance-builder.js';
export type {
  NpcAppearanceInput,
  PersonalityScores as AppearancePersonalityScores,
} from './npc-appearance-builder.js';

// ── Phase 11.1 NPC Emergent Intelligence ────────────────────────

export { createEmergentIntelligence } from './npc-emergent-intelligence.js';
export type {
  EmergentIntelligenceEngine,
  EmergentIntelligenceDeps,
  EmergentIntelligenceConfig,
  EmergentIntelligenceStats,
  EmergentClockPort,
  EmergentIdPort,
  EmergentLogPort,
  EmergentEventPort,
  LlmInferencePort,
  WorldStatePort,
  NpcMemoryPort,
  NpcReputationPort,
  EmotionType as EmergentEmotionType,
  PlanPhase,
  NegotiationStance,
  MemorySignificance,
  EmotionalState,
  StrategicPlan,
  PlanStep,
  TheoryOfMind,
  MindBelief,
  NegotiationSession,
  NegotiationRound,
  NegotiationOutcome,
  ConsolidatedMemory,
  PersonalityShift,
  PersonalityProfile,
  ReputationScore,
  WorldFact,
  Relationship as EmergentRelationship,
  LlmResponse,
  InferenceBudget,
} from './npc-emergent-intelligence.js';

// ── Phase 11.2 Procedural Quest Generator ───────────────────────

export { createQuestGenerator } from './procedural-quest-generator.js';
export type {
  QuestGenerator,
  QuestGeneratorDeps,
  QuestGeneratorConfig,
  QuestGeneratorStats,
  QuestClockPort,
  QuestIdPort,
  QuestLogPort,
  QuestEventPort,
  QuestWorldStatePort,
  QuestNpcPort,
  QuestEconomyPort,
  QuestRatingPort,
  QuestTemplateType,
  QuestDifficulty as ProceduralQuestDifficulty,
  QuestStatus as ProceduralQuestStatus,
  QuestSeedSource,
  QuestTemplate,
  ObjectiveTemplate,
  WorldPrerequisite,
  GeneratedQuest,
  QuestObjective as ProceduralQuestObjective,
  BonusReward,
  QualityScore,
  QuestChain as ProceduralQuestChain,
  EconomicContext,
  PoliticalContext,
  WeatherContext,
  ConflictContext,
  WorldConnection,
  NpcGoalSeed,
  NpcPersonalitySeed,
  TemplateRating,
} from './procedural-quest-generator.js';

// ── Phase 16.2 ML Pipeline ──────────────────────────────────────

export { createMlPipelineEngine } from './ml-pipeline.js';
export type {
  MlClockPort,
  MlIdPort,
  MlLogPort,
  MlEventPort,
  MlStorePort,
  TrainingBackendPort,
  InferenceHostPort,
  RegressionRunnerPort,
  ModelTier,
  ModelStatus,
  FeedbackSignal,
  TrainingJobStatus,
  ModelRecord,
  FeedbackEntry,
  FeedbackContext,
  ModelDeployment,
  ModelMetricsSample,
  FineTuneConfig,
  DistillConfig,
  TrainingJob,
  BenchmarkResult,
  RegressionResult,
  EndpointHealth,
  CanaryResult,
  LocalHostConfig,
  MlPipelineDeps,
  MlPipelineConfig,
  MlPipelineEngine,
  ModelComparison,
  MlPipelineStats,
} from './ml-pipeline.js';
