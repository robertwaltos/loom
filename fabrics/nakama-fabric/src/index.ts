/**
 * @loom/nakama-fabric — Identity, economy, governance, matchmaking.
 *
 * Economy: KALON Ledger, Stellar Standard, Wealth Zones, UBK, Genesis Vault,
 *   World Issuance Service, Lattice Integrity Service.
 * Identity: Dynasty Registry, Civic Score.
 * Governance: The Assembly (voting system).
 * Trade: Trade Engine (P2P KALON trades with escrow).
 *
 * World Reputation: Per-world dynasty reputation tracking.
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
export type {
  TierConfig,
  SurveyPriority,
  ArchitectAccess,
} from './subscription-tiers.js';
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
