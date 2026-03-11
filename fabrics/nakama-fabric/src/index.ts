/**
 * @loom/nakama-fabric — Identity, economy, governance, matchmaking.
 *
 * Economy: KALON Ledger, Stellar Standard, Wealth Zones, UBK, Genesis Vault,
 *   World Issuance Service, Lattice Integrity Service.
 * Identity: Dynasty Registry, Civic Score.
 * Governance: The Assembly (voting system).
 * Trade: Trade Engine (P2P KALON trades with escrow),
 *   Trade Commerce Engine (marketplace with categories, fees, escrow),
 *   Market Registry (order book, search, price aggregation),
 *   Trade Dispute Engine (dispute resolution with arbitration).
 *
 * World Reputation: Per-world dynasty reputation tracking.
 * Diplomacy: Alliance Engine, Diplomacy Engine, Treaty Engine.
 * Survey Corps: Mission engine, orchestrator, reputation tracking.
 * Future: Nakama integration for identity, matchmaking, and presence.
 */

export { createKalonLedger } from './kalon-ledger.js';
export type { KalonLedger, AccountInfo, TransferResult } from './kalon-ledger.js';
export { calculateLevy } from './kalon-levy.js';
export {
  KALON_DECIMALS,
  MICRO_KALON_PER_KALON,
  kalonToMicro,
  microToKalonString,
} from './kalon-constants.js';
export { KalonError } from './kalon-errors.js';
export type { KalonErrorCode } from './kalon-errors.js';
export {
  insufficientBalance,
  accountNotFound,
  accountAlreadyExists,
  invalidAmount,
  selfTransfer,
  wealthCapExceeded,
  vaultDepleted,
  worldNotRegistered,
  worldAlreadyRegistered,
  integrityOutOfRange,
  dynastyNotFound,
  dynastyAlreadyExists,
  continuityRecordNotFound,
  continuityRecordAlreadyExists,
  continuityInvalidTransition,
  heirNotRegistered,
  continuityTerminalState,
} from './kalon-errors.js';
export { calculateAnnualIssuance, adjustForProductivity } from './stellar-standard.js';
export type { WorldPhysicalProperties, StellarClass, OrbitalZone } from './stellar-standard.js';
export { BASE_ISSUANCE, INTEGRITY_FLOOR } from './stellar-standard.js';
export { classifyWealth, structuralCapAmount } from './wealth-zones.js';
export type { WealthZone } from './wealth-zones.js';
export { WEALTH_ZONE_PPM } from './wealth-zones.js';
export {
  calculateUbkAllocation,
  classifyWorldProsperity,
  UBK_BASE_ALLOCATION,
  UBK_INACTIVE_ESCROW_MONTHS,
  UBK_INACTIVE_THRESHOLD_DAYS,
} from './ubk.js';
export type { UbkTier } from './ubk.js';
export { createGenesisVault, GENESIS_VAULT_RULES } from './genesis-vault.js';
export type { GenesisVault } from './genesis-vault.js';
export { createLatticeIntegrityService } from './lattice-integrity.js';
export type { LatticeIntegrityService, IntegrityChangeResult } from './lattice-integrity.js';
export { createWorldIssuanceService } from './world-issuance.js';
export type {
  WorldIssuanceService,
  WorldIssuanceDeps,
  IssuanceResult,
  IssuanceSummary,
} from './world-issuance.js';
export { createDynastyRegistry } from './dynasty.js';
export type {
  DynastyRegistry,
  DynastyInfo,
  DynastyStatus,
  SubscriptionTier,
  FoundDynastyParams,
} from './dynasty.js';
export { createContinuityEngine } from './dynasty-continuity.js';
export type {
  ContinuityEngine,
  ContinuityRecord,
  ContinuityState,
  ContinuityTransition,
} from './dynasty-continuity.js';
export { createEstateAuctionEngine } from './estate-dispersal.js';
export type {
  EstateAuctionEngine,
  EstateAuction,
  AuctionLot,
  AuctionPhase,
  LotCategory,
  LotStatus,
  Bid,
  PhaseTransition,
  AddLotParams,
  PlaceBidParams,
} from './estate-dispersal.js';
export { calculateCivicScore } from './civic-score.js';
export type { CivicScoreInputs, CivicScoreResult } from './civic-score.js';
export { createAssembly } from './assembly.js';
export type {
  Assembly,
  AssemblyConfig,
  Motion,
  MotionStatus,
  VoteCategory,
  VoteChoice,
  VoteRecord,
  CastVoteParams,
  TallyResult,
  ProposeMotionParams,
} from './assembly.js';
export {
  createContinuityBondEngine,
  BASE_BONDS,
  MAX_BONDS,
  CHRONICLE_ENTRIES_PER_BOND,
  MAX_GOVERNANCE_BOND_VOTES,
} from './continuity-bonds.js';
export type {
  ContinuityBondEngine,
  ContinuityBondRecord,
  BondSpend,
  EarnBondsParams,
} from './continuity-bonds.js';
export {
  TIER_CONFIGS,
  getTierConfig,
  canFoundDynasty,
  canInitiateSurvey,
  surveyPriorityForTier,
  monthlyStipendMicro,
  graceDaysForTier,
  isTrialTier,
  hasEarlyArchitectAccess,
} from './subscription-tiers.js';
export type { TierConfig, SurveyPriority, ArchitectAccess } from './subscription-tiers.js';
export { createMarksRegistry, MARK_SUPPLY_CAPS, MarkError } from './marks-registry.js';
export type {
  MarksRegistry,
  Mark,
  MarkType,
  AwardMarkParams,
  MarkErrorCode,
  MarksRegistryDeps,
} from './marks-registry.js';
export { createDynastyBootstrapService } from './dynasty-bootstrap.js';
export type {
  DynastyBootstrapService,
  DynastyBootstrapDeps,
  BootstrapParams,
  BootstrapResult,
  KalonLedgerPort,
  GenesisVaultPort,
  ChroniclePort,
  FoundingEligibility,
} from './dynasty-bootstrap.js';
export { createConsequenceEngine } from './consequence-engine.js';
export type {
  ConsequenceEngine,
  ConsequenceEngineDeps,
  ConsequenceChroniclePort,
  ConsequenceChronicleEntry,
  WorldSurveyedCallback,
  SurveyCompleteEvent,
  SurveyConsequenceResult,
  UnrestNotifyEvent,
  UnrestConsequenceResult,
  VoteCompleteEvent,
  VoteConsequenceResult,
} from './consequence-engine.js';
export { createCommonsFund, COMMONS_ACCOUNT_ID } from './commons-fund.js';
export type {
  CommonsFund,
  CommonsFundDeps,
  CommonsLedgerPort,
  CommonsDynastyPort,
  CommonsWorldPort,
  UbkDistributionResult,
  CommonsFundSummary,
} from './commons-fund.js';
export { createHeirRegistry, MAX_HEIRS_BY_TIER } from './heir-registry.js';
export type {
  HeirRegistry,
  HeirRegistryDeps,
  HeirDeclaration,
  HeirClaimResult,
  HeirContinuityPort,
  HeirContinuityRecord,
  HeirDynastyPort,
  HeirDynastyInfo,
  HeirChroniclePort,
  HeirChronicleEntry,
} from './heir-registry.js';
export { createContinuityOrchestrator } from './continuity-orchestrator.js';
export type {
  DynastyContinuityOrchestrator,
  ContinuityOrchestratorDeps,
  OrchestratorContinuityPort,
  OrchestratorDynastyPort,
  OrchestratorAuctionPort,
  OrchestratorPhaseResult,
  OrchestratorChroniclePort,
  OrchestratorChronicleEntry,
  OrchestratorIdGenerator,
  ContinuityTickResult,
} from './continuity-orchestrator.js';
export { createTradeEngine, DEFAULT_TRADE_CONFIG } from './trade-engine.js';
export type {
  TradeEngine,
  TradeEngineDeps,
  TradeEscrowPort,
  Trade,
  TradePhase,
  ProposalParams,
  TradeEngineConfig,
  TradeStats,
} from './trade-engine.js';
export { createMatchmakingEngine } from './matchmaking.js';
export type {
  MatchmakingEngine,
  MatchmakingDeps,
  MatchmakingConfig,
  MatchStatus,
  MatchTicket,
  SubmitTicketParams,
  MatchGroup,
  MatchmakingStats,
} from './matchmaking.js';
export { createInventoryService } from './inventory.js';
export type {
  InventoryService,
  InventoryDeps,
  InventoryItem,
  AddItemParams,
  RemoveItemResult,
  ItemTransferResult,
  InventoryStats,
} from './inventory.js';
export { createWorldCensusService } from './world-census.js';
export type {
  WorldCensusService,
  WorldCensusDeps,
  WorldPopulation,
  RegisterResidencyParams,
  MigrationRecord,
  CensusStats,
} from './world-census.js';
export { createPresenceTracker, DEFAULT_PRESENCE_CONFIG } from './presence-tracker.js';
export type {
  PresenceTracker,
  PresenceTrackerDeps,
  PresenceConfig,
  PresenceRecord,
  PresenceStatus,
  ConnectParams as PresenceConnectParams,
  PresenceStats,
} from './presence-tracker.js';
export { createWorldLeaderboard } from './world-leaderboard.js';
export type {
  WorldLeaderboard,
  LeaderboardDeps,
  LeaderboardEntry,
  SubmitScoreParams,
  RankResult,
  LeaderboardInfo,
  LeaderboardStats,
} from './world-leaderboard.js';
export { createGuildRegistry, DEFAULT_GUILD_CONFIG } from './guild-registry.js';
export type {
  GuildRegistry,
  GuildRegistryDeps,
  Guild,
  CreateGuildParams as GuildCreateParams,
  GuildConfig,
  GuildStats,
} from './guild-registry.js';
export { createWorldReputationService, DEFAULT_REPUTATION_CONFIG } from './world-reputation.js';
export type {
  WorldReputationService,
  WorldReputationDeps,
  WorldReputationConfig,
  ReputationTier,
  ReputationRecord,
  ChangeReputationParams,
  ReputationChange,
  WorldReputationStats,
} from './world-reputation.js';
export { createDynastyAllianceService } from './dynasty-alliance.js';
export type {
  DynastyAllianceService,
  DynastyAllianceDeps,
  AllianceStatus,
  Alliance,
  ProposeAllianceParams,
  DynastyAllianceStats,
} from './dynasty-alliance.js';
export { createDynastyTreasuryService } from './dynasty-treasury.js';
export type {
  DynastyTreasuryService,
  DynastyTreasuryDeps,
  TransactionType,
  TreasuryTransaction,
  TreasuryDepositParams,
  TreasuryWithdrawParams,
  TreasuryTransferParams,
  TreasuryResult,
  TreasuryTransferResult,
  DynastyTreasuryStats,
} from './dynasty-treasury.js';
export { createDynastyNotificationService } from './dynasty-notification.js';
export type {
  DynastyNotificationService,
  DynastyNotificationDeps,
  NotificationType,
  NotificationSnapshot,
  SendNotificationParams,
  NotificationFilter,
  DynastyNotificationStats,
} from './dynasty-notification.js';
export {
  createNakamaOrchestrator,
  DEFAULT_NAKAMA_ORCHESTRATOR_CONFIG,
} from './nakama-orchestrator.js';
export type {
  NakamaFabricOrchestrator,
  NakamaOrchestratorDeps,
  NakamaOrchestratorConfig,
  NakamaTickResult,
  WorldActivitySummary,
  FabricPresencePort,
  FabricContinuityPort,
  FabricLatticePort,
  FabricChroniclePort,
  FabricMortalityPort,
  FabricPresenceRecord,
  FabricPresenceStats,
  FabricContinuityTickResult,
  FabricContinuityTransition,
  FabricIntegrityChange,
  FabricChronicleEntry,
  FabricClockPort,
} from './nakama-orchestrator.js';
export {
  createDynastyMortalityEngine,
  GRACE_PERIOD_DEFAULT_US,
  MAX_DORMANCY_DURATION_US,
} from './dynasty-mortality.js';
export type {
  DynastyMortalityEngine,
  MortalityDeps,
  MortalityState,
  GracePeriodStatus,
  MortalityRecord,
  MortalityTransition,
  MortalityEvent,
  MortalityStats,
  MortalityClockPort,
  MortalityIdGeneratorPort,
  MortalityNotificationPort,
} from './dynasty-mortality.js';
export { createTransitRequestService, DEFAULT_TRANSIT_CONFIG } from './transit-request.js';
export type {
  TransitRequestService,
  TransitRequestDeps,
  TransitPresencePort,
  TransitWorldPort,
  TransitEntityPort,
  TransitQueuePort,
  QueuedTransitRequest,
  TransitIdPort,
  TransitClockPort,
  TransitRequestParams,
  TransitRequestResult,
  TransitRequestSuccess,
  TransitRequestError,
  TransitErrorCode,
  TransitRequestConfig,
  TransitRequestStats,
} from './transit-request.js';
export { createAllianceEngine, MEMBER_LIMITS, MIN_MEMBERS_TO_RATIFY } from './alliance-engine.js';
export type {
  AllianceEngine,
  AllianceEngineDeps,
  AllianceClock,
  AllianceIdGenerator,
  AllianceNotificationPort,
  AlliancePhase,
  AllianceType,
  MemberRole,
  InviteStatus,
  AllianceEventKind,
  AllianceEvent,
  AllianceMember,
  AllianceInvite,
  ResourceAgreement,
  AllianceRecord,
  CreateAllianceParams,
  ContributeParams,
  AllianceEngineStats,
} from './alliance-engine.js';
export { createDiplomacyEngine, DEFAULT_DIPLOMACY_CONFIG } from './diplomacy-engine.js';
export type {
  DiplomacyEngine,
  DiplomacyEngineDeps,
  DiplomacyClock,
  DiplomacyIdGenerator,
  RelationState,
  DiplomaticAction,
  DiplomaticIncident,
  DiplomaticRelation,
  DiplomacyActionParams,
  RecordIncidentParams,
  DiplomacyEngineConfig,
  DiplomacyEngineStats,
} from './diplomacy-engine.js';
export { createTreatyEngine, MAX_VIOLATIONS_BEFORE_BREAK } from './treaty-engine.js';
export type {
  TreatyEngine,
  TreatyEngineDeps,
  TreatyClock,
  TreatyIdGenerator,
  TreatyType,
  TreatyPhase,
  TreatyTerms,
  TreatyViolation,
  TreatyRecord,
  ProposeTreatyParams,
  CounterProposalParams,
  ReportViolationParams,
  TreatyEngineStats,
  TreatyHistoryEntry,
} from './treaty-engine.js';
export { createTradeCommerceEngine, DEFAULT_COMMERCE_CONFIG } from './trade-commerce.js';
export type {
  TradeCommerceEngine,
  TradeCommerceDeps,
  TradeCommerceEscrowPort,
  TradeFeePort,
  TradeClock,
  TradeIdGenerator,
  TradeOffer,
  TradeOfferPhase,
  TradeCategory,
  CreateOfferParams,
  TradeCommerceConfig,
  PriceHistoryEntry,
  TradeCommerceStats,
} from './trade-commerce.js';
export { createMarketRegistry } from './market-registry.js';
export type {
  MarketRegistry,
  MarketRegistryDeps,
  MarketClock,
  MarketCategory,
  MarketListing,
  AddListingParams,
  MarketSearchParams,
  PriceAggregate,
  VolumeRecord,
  MarketHealthIndicators,
  MarketRegistryStats,
} from './market-registry.js';
export { createTradeDisputeEngine, DEFAULT_DISPUTE_CONFIG } from './trade-dispute-engine.js';
export type {
  TradeDisputeEngine,
  DisputeEngineDeps,
  DisputeClock,
  DisputeIdGenerator,
  CivicScorePort,
  DisputeReputationPort,
  DisputePhase,
  ResolutionType,
  EvidenceEntry,
  DisputeResolution,
  TradeDispute,
  FileDisputeParams,
  ResolveDisputeParams,
  DisputeEngineConfig,
  DisputeStats,
} from './trade-dispute-engine.js';
export { createSurveyCorpsEngine } from './survey-corps.js';
export type {
  SurveyCorpsEngine,
  SurveyCorpsDeps,
  SurveyCorpsClock,
  SurveyCorpsIdGenerator,
  MissionRewardPort,
  WorldUnlockPort,
  MissionType,
  MissionPhase,
  SurveyData,
  CrewMember,
  CrewRole,
  MissionLogEntry,
  MissionTarget,
  MissionReward,
  Mission,
  ProposeMissionParams,
  AssignCrewParams,
  MissionPhaseTransition,
  SurveyCorpsStats,
} from './survey-corps.js';
export {
  createSurveyMissionOrchestrator,
  DEFAULT_ORCHESTRATOR_CONFIG as DEFAULT_SURVEY_ORCHESTRATOR_CONFIG,
} from './survey-mission-orchestrator.js';
export type {
  SurveyMissionOrchestrator,
  SurveyMissionOrchestratorDeps,
  OrchestratorClock as SurveyOrchestratorClock,
  OrchestratorRng,
  OrchestratorLogger as SurveyOrchestratorLogger,
  OrchestratorConfig as SurveyOrchestratorConfig,
  OrchestratorTickResult as SurveyOrchestratorTickResult,
  MissionTickResult,
  RiskOutcome,
  RiskEvent,
  AbortRequest,
} from './survey-mission-orchestrator.js';
export { createCorpsReputationService, RANK_THRESHOLDS } from './survey-corps-reputation.js';
export type {
  CorpsReputationService,
  CorpsReputationDeps,
  CorpsRank,
  ReputationRecord as CorpsReputationRecord,
  ReputationChangeEvent,
  LeaderboardEntry as CorpsLeaderboardEntry,
  MissionReputationParams,
  CorpsReputationStats,
} from './survey-corps-reputation.js';
export { createCraftingEngine } from './crafting-engine.js';
export type {
  CraftingEngine,
  CraftingEngineDeps,
  CraftingClock,
  CraftingIdGenerator,
  CraftingMaterialPort,
  CraftingOutputPort,
  CraftingCategory,
  CraftingQuality,
  CraftingJobStatus,
  MaterialRequirement,
  CraftingRecipe,
  CraftingJob,
  MaterialConsumed,
  CrafterProfile,
  CraftingResult,
  StartCraftingParams,
  CraftingStats,
} from './crafting-engine.js';
export { createRecipeRegistry } from './crafting-recipe-registry.js';
export type {
  RecipeRegistry,
  RecipeRegistryDeps,
  RecipeRegistryClock,
  RecipeRegistryIdGenerator,
  RecipeKalonPort,
  RecipeDiscoveryMethod,
  ResearchStatus,
  RecipeResearchProject,
  RecipeDiscoveryRecord,
  RecipeUnlockRequirement,
  StartResearchParams,
  RecipeRegistryStats,
} from './crafting-recipe-registry.js';
export {
  createSpecializationEngine,
  MAX_PRIMARY,
  MAX_SECONDARY,
} from './crafting-specialization.js';
export type {
  SpecializationEngine,
  SpecializationDeps,
  SpecializationNode,
  SpecializationTier,
  SpecializationSlot,
  DynastySpecialization,
  ActivateSpecParams,
  UnlockNodeParams,
  SpecializationBonus,
  SpecializationStats,
} from './crafting-specialization.js';
export { createAchievementEngine, ALL_CATEGORIES, ALL_TIERS } from './achievement-engine.js';
export type {
  AchievementEngine,
  AchievementEngineDeps,
  AchievementClock,
  AchievementIdGenerator,
  AchievementNotificationPort,
  AchievementCategory,
  AchievementTier as AchievementEngineTier,
  AchievementEventKind,
  AchievementEvent,
  AchievementDefinition,
  AchievementProgress,
  DynastyAchievementSummary,
  AchievementEngineStats,
} from './achievement-engine.js';
export { createQuestEngine } from './quest-engine.js';
export type {
  QuestEngine,
  QuestEngineDeps,
  QuestClock,
  QuestIdGenerator,
  QuestNotificationPort,
  QuestStatus,
  QuestDefinition,
  QuestObjective,
  QuestReward,
  QuestInstance,
  QuestJournal,
  QuestEngineStats,
} from './quest-engine.js';
export { createFactionEngine } from './faction-engine.js';
export type {
  FactionEngine,
  FactionEngineDeps,
  FactionClock,
  FactionIdGenerator,
  FactionNotificationPort,
  FactionId,
  FactionRank,
  FactionMembership,
  FactionBenefit,
  FactionConflict,
  FactionInfo,
  FactionEngineStats,
} from './faction-engine.js';
export { createMentorshipEngine } from './mentorship-engine.js';
export type {
  MentorshipEngine,
  MentorshipEngineDeps,
  MentorshipClock,
  MentorshipIdGenerator,
  MentorshipNotificationPort,
  MentorshipStatus,
  MentorProfile,
  MentorshipPairing,
  GraduationCriteria,
  ProtegeProgress,
  CreatePairingParams,
  MentorshipEngineStats,
} from './mentorship-engine.js';
export {
  createAuctionEngine,
  PHASE_DURATIONS,
  MIN_BID_INCREMENT_PERCENT,
  DEFAULT_AUCTION_CONFIG,
} from './auction-engine.js';
export type {
  AuctionEngine,
  AuctionDeps,
  AuctionPhase as EstateAuctionPhase,
  AuctionItem,
  AuctionBid,
  BidderRelation,
  AuctionRecord,
  AuctionResult as EstateAuctionResult,
  SettledItem,
  CreateAuctionParams as CreateEstateAuctionParams,
  AddItemParams as AuctionAddItemParams,
  PlaceBidParams as AuctionPlaceBidParams,
  AuctionStats as EstateAuctionStats,
} from './auction-engine.js';
export { createDynastyHeritageEngine } from './dynasty-heritage.js';
export type {
  HeritageClockPort,
  HeritageIdGeneratorPort,
  HeritageDeps,
  BonusCategory,
  InheritanceRuleType,
  HeritageRecord,
  LineageChain,
  HeritageBonus,
  InheritanceRule,
  InheritanceApplication,
  HeritageStats,
  DynastyHeritageEngine,
  RecordHeritageParams,
  SetRuleParams,
} from './dynasty-heritage.js';
export {
  createTaxCollectionEngine,
  MICRO_KALON,
  BRACKET_THRESHOLDS,
  BRACKET_RATES_BPS,
} from './tax-collection.js';
export type {
  TaxClockPort,
  TaxIdGeneratorPort,
  TaxDeps,
  TaxBracket,
  TaxAssessment,
  BracketContribution,
  TaxCollectionResult,
  TaxRollEntry,
  TaxRoll,
  TaxCollectionEngine,
} from './tax-collection.js';
export {
  createDynastyReputationGlobalEngine,
  SCORE_MIN,
  SCORE_MAX,
  RECENCY_HALF_LIFE_US,
  WORLD_TIER_WEIGHTS,
} from './dynasty-reputation-global.js';
export type {
  GlobalRepClockPort,
  GlobalRepIdGeneratorPort,
  GlobalRepDeps,
  GlobalReputationTier,
  WorldReputationEntry,
  GlobalReputationScore,
  ReputationAggregate,
  TopDynastyEntry,
  ReputationStats,
  DynastyReputationGlobalEngine,
  RecordWorldRepParams,
} from './dynasty-reputation-global.js';

export { createPoliticalInfluence } from './political-influence.js';
export type {
  PoliticalCapital,
  InfluenceAction,
  InfluenceTarget,
  InfluenceActionRecord,
  PoliticalReport,
  PoliticalEvent,
  PoliticalInfluenceDeps,
  PoliticalInfluenceModule,
} from './political-influence.js';
export { createDynastyEspionage } from './dynasty-espionage.js';
export type {
  SpyAgent,
  AgentStatus,
  EspionageMission,
  MissionOutcome,
  MissionType as EspionageMissionType,
  CounterLevel,
  SpyNetwork,
  CounterEspionage,
  DynastyEspionageDeps,
  DynastyEspionageModule,
} from './dynasty-espionage.js';
export { createBlackMarket } from './black-market.js';
export type {
  BlackMarketListing,
  UndergroundTransaction,
  EnforcementLevel,
  MarketHeat,
  MarketStats,
  BlackMarketDeps,
  BlackMarketModule,
} from './black-market.js';
export { createContrabandRegistry } from './contraband-registry.js';
export type {
  ContrabandItem,
  ProhibitionRule,
  SmugglingRoute,
  SeizureRecord,
  RouteRisk,
  ContrabandRegistryDeps,
  ContrabandRegistryModule,
} from './contraband-registry.js';

// -- Wave 10: Dynasty Succession ---------------------------------------------
export { createDynastySuccession } from './dynasty-succession.js';
export type {
  SuccessionStatus,
  ContestVoteType,
  SuccessionLine,
  HeirDesignation,
  RegencyRecord,
  SuccessionContest,
  ContestVote,
  LegitimacyScore,
  ContestOutcome,
  DynastySuccession,
} from './dynasty-succession.js';

// -- Wave 10: Economic Crisis ------------------------------------------------
export { createEconomicCrisisSystem } from './economic-crisis.js';
export type {
  CrisisPhase,
  IndicatorType,
  InterventionType,
  WorldId as CrisisWorldId,
  EconomicIndicator,
  CrisisTrigger,
  Intervention,
  MacroReport,
  CrisisHistory,
  EconomicCrisisSystem,
} from './economic-crisis.js';

// -- Wave 10: Faction Politics -----------------------------------------------
export { createFactionPolitics } from './faction-politics.js';
export type {
  FactionActionType,
  RelationshipTier,
  FactionRelation,
  FactionAction,
  FactionPowerRank,
  PoliticalEvent as FactionPoliticalEvent,
  EmbargoPair,
  FactionMetrics,
  FactionPolitics,
} from './faction-politics.js';

// -- Wave 10: Insurance Market -----------------------------------------------
export { createInsuranceMarketSystem } from './insurance-market.js';
export type {
  PolicyType,
  PolicyId,
  DynastyId as InsuranceDynastyId,
  ClaimId,
  InsurancePolicy,
  ClaimRecord,
  PremiumCalculation,
  FraudFlag,
  InsuranceReport,
  InsuranceMarketSystem,
} from './insurance-market.js';

// -- Wave 10: Investment Fund ------------------------------------------------
export { createInvestmentFundSystem } from './investment-fund.js';
export type {
  AssetClass,
  FundId,
  DynastyId,
  InvestmentFund,
  FundShare,
  PortfolioAllocation,
  FundReturn,
  DividendRecord,
  FundReport,
  InvestmentFundSystem,
} from './investment-fund.js';

// -- Wave 10: Player Economy Report ------------------------------------------
export { createPlayerEconomyReport } from './player-economy-report.js';
export type {
  IncomeSource,
  SpendingCategory,
  EconomicEvent,
  WealthSnapshot,
  EconomicReport,
  MarketShare,
  IncomeBreakdown,
  SpendingBreakdown,
  PlayerEconomyReport,
} from './player-economy-report.js';

// -- Wave 11: Crafting Economy -----------------------------------------------
export { createCraftingEconomySystem } from './crafting-economy.js';
export type {
  CraftingEconomySystem,
  CraftingEconomyDeps,
  Recipe,
  RecipeId,
  MaterialId,
  CrafterId,
  WorldId as CraftingWorldId,
  RecipeError,
  CrafterInventory,
  CraftingRecord,
  ProductionStats,
} from './crafting-economy.js';

// -- Wave 11: Auction House --------------------------------------------------
export { createAuctionHouseSystem } from './auction-house.js';
export type {
  AuctionHouseSystem,
  AuctionHouseDeps,
  AuctionId,
  BidderId,
  SellerId,
  ItemId,
  AuctionStatus,
  AuctionError,
  Bid as AuctionHouseBid,
  Auction as AuctionHouseAuction,
  AuctionSettlement,
  AuctionSummary,
} from './auction-house.js';

// -- Wave 11: Guild System ---------------------------------------------------
export { createGuildSystem } from './guild-system.js';
export type {
  GuildSystem,
  GuildSystemDeps,
  GuildId,
  MemberId,
  GuildRank,
  GuildError,
  GuildMember,
  Guild as GuildSystemGuild,
  GuildActivity,
  GuildStats as GuildSystemStats,
} from './guild-system.js';

// -- Wave 10: Resource Scarcity ----------------------------------------------
export { createResourceScarcitySystem } from './resource-scarcity.js';
export type {
  ScarcityLevel,
  ResourceId,
  WorldId,
  Resource,
  ShortageAlert,
  RationingProtocol,
  PriceMultiplier,
  ScarcityReport,
  ResourceScarcitySystem,
} from './resource-scarcity.js';

// -- Wave 10: World Market ---------------------------------------------------
export { createWorldMarket } from './world-market.js';
export type {
  MarketEventType,
  Commodity,
  MarketState,
  PricePoint,
  MarketEvent,
  ManipulationAlert,
  MarketReport,
  SupplyEntry,
  WorldMarket,
} from './world-market.js';

// -- Wave 12: Rental Market --------------------------------------------------
export { createRentalMarketSystem } from './rental-market.js';
export type {
  RentalMarketSystem,
  RentalId,
  LandlordId,
  TenantId,
  ListingId,
  RentalStatus,
  RentalError,
  RentalListing,
  Rental,
  RentalPayment,
  RentalMarketStats,
} from './rental-market.js';

// -- Wave 12: Loan System ----------------------------------------------------
export { createLoanSystem } from './loan-system.js';
export type {
  LoanSystem,
  LoanId,
  LenderId,
  BorrowerId,
  LoanStatus,
  LoanError,
  Loan,
  LoanRepayment,
  LoanOffer,
} from './loan-system.js';

// -- Wave 12: Tax Collector --------------------------------------------------
export { createTaxCollectorSystem } from './tax-collector.js';
export type {
  TaxCollectorSystem,
  TaxId,
  TaxpayerId,
  WorldId as TaxWorldId,
  TaxType,
  TaxError,
  TaxRate,
  TaxAssessment as TaxCollectorAssessment,
  TaxpayerRecord,
  WorldTaxReport,
} from './tax-collector.js';

// -- Wave 13: Carbon Credit --------------------------------------------------
export { createCarbonCreditSystem } from './carbon-credit.js';
export type {
  CarbonCreditSystem,
  CreditId,
  HolderId,
  ProjectId,
  CreditError,
  CarbonProject,
  CreditBalance,
  CreditTransaction,
} from './carbon-credit.js';

// -- Wave 13: Reputation Bond ------------------------------------------------
export { createReputationBondSystem } from './reputation-bond.js';
export type {
  ReputationBondSystem,
  BondId,
  BonderId,
  BeneficiaryId,
  BondStatus,
  BondError,
  ReputationBond,
  SlashEvent,
  BonderProfile,
} from './reputation-bond.js';

// -- Wave 13: Population Economy ---------------------------------------------
export { createPopulationEconomySystem } from './population-economy.js';
export type {
  PopulationEconomySystem,
  WorldId as PopWorldId,
  PopulationId,
  PopError,
  PopulationTier,
  PopulationRecord,
  PopulationSnapshot,
  EconomicOutput,
} from './population-economy.js';

// -- Wave 14: Monetary Policy ------------------------------------------------
export { createMonetaryPolicySystem } from './monetary-policy.js';
export type {
  MonetaryPolicySystem,
  PolicyId as MonetaryPolicyId,
  WorldId as MonetaryWorldId,
  MonetaryError,
  PolicyTool,
  MonetaryPolicy,
  PolicyEffect,
  MonetaryReport,
} from './monetary-policy.js';

// -- Wave 14: Trading Post ---------------------------------------------------
export { createTradingPostSystem } from './trading-post.js';
export type {
  TradingPostSystem,
  PostId,
  ItemId as TradingItemId,
  TraderDynastyId,
  WorldId as TradingWorldId,
  TradingError,
  TradingPost,
  PostInventory,
  TradeTransaction,
  PostSummary,
} from './trading-post.js';

// -- Wave 14: Wealth Redistribution ------------------------------------------
export { createWealthRedistributionSystem } from './wealth-redistribution.js';
export type {
  WealthRedistributionSystem,
  ProgramId,
  BeneficiaryId as RedistributionBeneficiaryId,
  FundId as RedistributionFundId,
  RedistributionError,
  ProgramType,
  DistributionProgram,
  CommonsPool,
  BeneficiaryRecord,
  DistributionEvent,
} from './wealth-redistribution.js';

// -- Nakama Client Adapter ---------------------------------------------------
export { createNakamaClient } from './nakama-client.js';
export type {
  NakamaClientAdapter,
  NakamaClientConfig,
  NakamaSession,
  NakamaPresence,
  NakamaMatch,
  NakamaLeaderboardRecord,
  NakamaStorageObject,
} from './nakama-client.js';

// -- Character Creation -------------------------------------------------------
export { createCharacterCreationService } from './character-creation.js';
export type {
  CharacterCreationService,
  CharacterCreationDeps,
  CreateCharacterParams,
  CharacterCreationResult,
  CharacterArchetype,
  CharacterAppearance,
  CharacterDynastyPort,
  CharacterLedgerPort,
  CharacterCensusPort,
  CharacterInventoryPort,
} from './character-creation.js';

// ── Phase 8 War & Peace ─────────────────────────────────────────

export { createWarEngine } from './war-engine.js';
export type {
  WarEngine,
  WarEngineDeps,
  WarEngineConfig,
  WarEngineStats,
  WarClockPort,
  WarIdGeneratorPort,
  WarNotificationPort,
  WarKalonPort,
  WarRemembrancePort,
  WarPhase,
  WarParticipantSide,
  WarEventKind,
  WarEvent,
  WarParticipant,
  WarRecord,
  PeaceTerms,
  TerritoryConcession,
  TradeRestriction,
  BetrayalPenalty,
  DeclareWarParams,
  ProposePeaceParams,
} from './war-engine.js';

// ── Phase 8 Alliance Leaderboard ────────────────────────────────

export { createAllianceLeaderboard } from './alliance-leaderboard.js';
export type {
  AllianceLeaderboard,
  LeaderboardClockPort,
  LeaderboardAlliancePort,
  LeaderboardWarPort,
  LeaderboardEconomyPort,
  LeaderboardReputationPort,
  AllianceRanking,
  InfluenceBreakdown,
  SeasonalSnapshot,
  LeaderboardConfig,
  InfluenceWeights,
  LeaderboardStats as AllianceLeaderboardStats,
} from './alliance-leaderboard.js';

// ── Phase 8 Governance Engine ───────────────────────────────────

export { createGovernanceEngine } from './governance-engine.js';
export type {
  GovernanceEngine,
  GovernanceEngineDeps,
  GovernanceEngineConfig,
  GovernanceEngineStats,
  GovernanceClockPort,
  GovernanceIdPort,
  GovernanceLogPort,
  GovernanceWorldPort,
  GovernanceNotificationPort,
  GovernanceNotification,
  ElectionPhase,
  GovernanceRole,
  DisputeStatus,
  LegislationType,
  SessionType,
  DebatePhaseStatus,
  ElectionCandidate,
  ElectionRecord,
  RegisterCandidateParams,
  CastElectionVoteParams,
  Legislation,
  Dispute,
  FileDisputeParams as GovernanceFileDisputeParams,
  DebateEntry,
  GovernanceSession,
} from './governance-engine.js';

// ── Phase 12.4 Economy Maturation ───────────────────────────────

export { createEconomyMaturationEngine } from './economy-maturation.js';
export type {
  EconClockPort,
  EconIdPort,
  EconLogPort,
  EconEventPort,
  MonetaryStorePort,
  FuturesStorePort,
  TreatyStorePort,
  MonetaryPolicyAction,
  EconomicCyclePhase,
  InsuranceType as EconInsuranceType,
  TreatyType as EconTreatyType,
  TaxCategory,
  WorldEconomicState,
  FuturesContract,
  InsurancePolicy as EconInsurancePolicy,
  InsuranceClaim,
  TaxBracket as EconTaxBracket,
  TaxPolicy,
  TradeTreaty,
  EconomicIndicators,
  PolicyDecision,
  RedistributionEvent,
  EconomyMaturationConfig,
  EconomyMaturationStats,
  EconomyMaturationEngine,
  EconomyMaturationDeps,
} from './economy-maturation.js';

// ── Phase 13.1 Competitive PvP ──────────────────────────────────

export { createCompetitivePvpEngine } from './competitive-pvp.js';
export type {
  PvpClockPort,
  PvpIdPort,
  PvpLogPort,
  PvpEventPort,
  MatchmakingPort,
  TerritoryStorePort,
  ReplayStorePort,
  ArenaMode,
  DivisionTier,
  TerritoryStatus,
  SiegeDeclarationPhase,
  CeasefireViolationType,
  RankedProfile,
  ArenaMatch,
  TerritoryZone,
  SiegeDeclaration,
  WarBond,
  MercenaryContract,
  CeasefireRecord,
  CombatReplay,
  SmurfDetectionResult,
  SeasonConfig,
  CompetitivePvpConfig,
  CompetitivePvpStats,
  CompetitivePvpEngine,
  CompetitivePvpDeps,
} from './competitive-pvp.js';

// ── Phase 13.3 Guild Expansion ──────────────────────────────────

export { createGuildExpansionEngine } from './guild-expansion.js';
export type {
  GuildExpClockPort,
  GuildExpIdPort,
  GuildExpLogPort,
  GuildExpEventPort,
  GuildBankStorePort,
  GuildProgressionStorePort,
  GuildQuestStorePort,
  GvGEventType,
  CoopQuestStatus,
  RecruitmentStatus,
  GuildApplicationStatus,
  GuildBankTransaction,
  CoopGuildQuest,
  GuildHall,
  GvGMatch,
  GuildProgression,
  GuildUnlock,
  CrossDynastyLink,
  RecruitmentListing,
  GuildExpApplication,
  GuildExpansionConfig,
  GuildExpansionStats,
  GuildExpansionEngine,
  GuildExpansionDeps,
} from './guild-expansion.js';

// Witness Protocol
export {
  WITNESS_RECORD_TYPES,
  createWitnessProtocol,
} from './witness-protocol.js';
export type {
  WitnessClockPort,
  WitnessIdPort,
  WitnessLogPort,
  WitnessEventPort,
  ChainAdapterPort,
  WitnessStorePort,
  HashPort,
  WitnessRecordType,
  RegistryEntry,
  RegistryMetadata,
  TransactionReceipt,
  GasEstimate,
  WitnessRecord,
  DynastyRegistration,
  WorldMilestone,
  PlayerMilestoneDigest,
  CeremonyRecord,
  CeremonyType,
  WitnessBatchResult,
  WitnessProtocolStats,
  WitnessProtocolDeps,
  WitnessProtocolConfig,
  WitnessProtocolEngine,
} from './witness-protocol.js';

// Dynasty Legacy
export {
  LEGACY_TRAIT_CATEGORIES,
  SUCCESSION_RULES,
  QUEST_TRIGGERS,
  createDynastyLegacyEngine,
} from './dynasty-legacy.js';
export type {
  LegacyClockPort,
  LegacyIdPort,
  LegacyLogPort,
  LegacyEventPort,
  LegacyStorePort,
  LegacyTraitCategory,
  SuccessionRule,
  QuestTrigger,
  LegacyTrait,
  LegacyCharacter,
  AncestralKnowledge,
  Heirloom,
  HeirloomEvent,
  LegacyQuest,
  LegacyQuestReward,
  DynastyChronicle,
  ChronicleChapter,
  HeritageBuilding,
  InheritanceResult,
  LegacyStats,
  DynastyLegacyDeps,
  DynastyLegacyConfig,
  DynastyLegacyEngine,
} from './dynasty-legacy.js';
