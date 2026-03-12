/**
 * Entity & Component Contracts
 *
 * Defines the canonical entity model for The Loom.
 * These are the data shapes that exist independent of any rendering engine.
 * Components are pure data — no methods, no side effects.
 */

// ── Core Entity ─────────────────────────────────────────────────

export type { Entity, EntityId, EntityType } from './entity.js';

// ── Shared Geometric Types ──────────────────────────────────────

export type { Vec3, Quat, NumericRange } from './shared-types.js';

// ── Core Components ─────────────────────────────────────────────

export type {
  TransformComponent,
  IdentityComponent,
  HealthComponent,
  InventoryComponent,
  InventorySlot,
  AIBrainComponent,
  PhysicsBodyComponent,
  WorldMembershipComponent,
} from './components.js';

// ── Gameplay Components ─────────────────────────────────────────

export type {
  MovementMode,
  PlayerInputComponent,
  MovementComponent,
  CameraMode,
  CameraTargetComponent,
  VisualMeshComponent,
  AnimationComponent,
  ReplicationPriority,
  NetworkReplicationComponent,
  SpawnType,
  SpawnPointComponent,
  NpcTier,
  NpcAiBackend,
  NpcTierComponent,
  InteractionType,
  InteractionComponent,
  AppearanceComponent,
  WalletComponent,
  GovernanceVoteCategory,
  GovernanceProposalStatus,
  GovernanceProposalSummary,
  GovernanceComponent,
} from './gameplay-components.js';

// ── Component Registry ──────────────────────────────────────────

export type {
  ComponentType,
  ComponentTypeMap,
  PlayerRequiredComponents,
  AmbientNpcRequiredComponents,
  InhabitantNpcRequiredComponents,
  NotableNpcRequiredComponents,
  SpawnPointRequiredComponents,
} from './component-registry.js';

export { ALL_COMPONENT_TYPES } from './component-registry.js';

// ── Character Appearance & T2I ──────────────────────────────────

export type {
  CharacterAppearance,
  ApparentSex,
  AgeRange,
  BodyBuild,
  HairDescription,
  FacialFeatures,
  AttireDescription,
  ImageFormat,
  T2IModel,
  ImageSize,
  CharacterImageRequest,
  CharacterImageResult,
} from './character-appearance.js';

// ── Character Bible Types ───────────────────────────────────────

export type {
  ConcordFaction,
  BibleTier,
  MetaHumanConfig,
  ExpressionSet,
  BibleAppearance,
  BibleCostume,
  GenerationPrompts,
  CharacterEntry,
  StellarClass,
  SovereigntyType,
  WorldEntry,
} from './character-bible-types.js';
