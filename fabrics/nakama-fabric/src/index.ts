/**
 * @loom/nakama-fabric — Identity, economy, governance, matchmaking.
 *
 * Economy: KALON Ledger, Stellar Standard, Wealth Zones, UBK, Genesis Vault,
 *   World Issuance Service, Lattice Integrity Service.
 * Identity: Dynasty Registry, Civic Score.
 * Governance: The Assembly (voting system).
 *
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
