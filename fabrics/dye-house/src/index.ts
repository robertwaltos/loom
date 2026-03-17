/**
 * @loom/dye-house — Security, authentication, encryption.
 *
 * Token Vault: Session token lifecycle management.
 * Rate Limiter: Sliding window rate control per identity per action.
 * Permission Gate: Action authorization based on tier, status, and custom rules.
 * Audit Log: Security event recording and forensic analysis.
 * Hash Service: Cryptographic hashing, HMAC signing, key derivation.
 * Encryption Service: Symmetric encryption with key rotation.
 * Access Control List: Role-based resource-level permission enforcement.
 * Permission Policy Engine: Attribute-based access control (ABAC).
 * Session Store: Session data storage with expiration.
 * Token Refresh Service: Refresh token chains with reuse detection.
 * IP Allowlist: Address-based access control with temporary blocks.
 * Session Manager: Authenticated session lifecycle with TTL and idle expiry.
 * Threat Scorer: Connection-level threat assessment with signal decay.
 * Credential Vault: Secure credential storage with rotation and expiration.
 * Session Mgr: Multi-device session lifecycle with limits and fingerprinting.
 * RBAC Engine: Role-based access control with hierarchy and audit trail.
 * Encrypt Service: Full crypto suite (AES, HMAC, PBKDF2, envelope encryption).
 * Token Bucket Limiter: Token bucket rate limiting with burst and global limits.
 *
 * "Every thread entering The Loom must pass through the Dye House."
 */

export { createTokenVault, DEFAULT_TOKEN_CONFIG } from './token-vault.js';
export type {
  TokenVault,
  TokenVaultDeps,
  TokenVaultConfig,
  SessionToken,
  TokenValidation,
  TokenInvalidReason,
  TokenIdGenerator,
} from './token-vault.js';
export { createRateLimiter } from './rate-limiter.js';
export type {
  RateLimiter,
  RateLimiterDeps,
  RateLimitRule,
  RateLimitCheck,
} from './rate-limiter.js';
export { createPermissionGate } from './permission-gate.js';
export type {
  PermissionGate,
  PermissionGateDeps,
  PermissionRule,
  PermissionSubject,
  PermissionVerdict,
  SubscriptionTierGate,
  DynastyStatusGate,
  CustomPredicate,
  PredicateResult,
} from './permission-gate.js';
export { createAuditLog } from './audit-log.js';
export type {
  AuditLog,
  AuditLogDeps,
  AuditEntry,
  AuditSeverity,
  AuditCategory,
  RecordAuditParams,
  AuditFilter,
  AuditStats,
  AuditIdGenerator,
} from './audit-log.js';
export { createHashService, createSimpleHashBackend } from './hash-service.js';
export type {
  HashService,
  HashServiceDeps,
  HashBackend,
  HashResult,
  HmacResult,
  KeyDerivation,
} from './hash-service.js';
export { createEncryptionService } from './encryption-service.js';
export type {
  EncryptionService,
  EncryptionServiceDeps,
  EncryptionBackend,
  EncryptedPayload,
  DecryptedPayload,
  EncryptionKey,
  RegisterKeyParams,
  EncryptionStats,
} from './encryption-service.js';
export { createAccessControlList } from './access-control.js';
export type {
  AccessControlList,
  AccessControlDeps,
  AclRole,
  AclGrant,
  AclAssignment,
  AclVerdict,
  CreateRoleParams,
  AclStats,
} from './access-control.js';
export { createPermissionPolicyEngine } from './permission-policy.js';
export type {
  PermissionPolicyEngine,
  PermissionPolicyDeps,
  PolicyIdGenerator,
  Policy,
  PolicyEffect,
  PolicyDecision,
  PolicyAttributes,
  PolicyCondition,
  CreatePolicyParams,
  EvaluationRequest,
  EvaluationResult,
  PolicyStats,
} from './permission-policy.js';
export { createSessionStore } from './session-store.js';
export type {
  SessionStore,
  SessionStoreDeps,
  SessionRecord,
  CreateSessionParams,
  SessionStoreStats,
} from './session-store.js';
export { createTokenRefreshService, DEFAULT_REFRESH_CONFIG } from './token-refresh.js';
export type {
  TokenRefreshService,
  TokenRefreshDeps,
  TokenRefreshConfig,
  RefreshToken,
  RefreshStatus,
  IssueRefreshParams,
  RefreshResult,
  RefreshStats,
} from './token-refresh.js';
export { createIpAllowlist } from './ip-allowlist.js';
export type {
  IpAllowlist,
  AllowlistDeps,
  AllowlistEntry,
  AllowlistEntryStatus,
  AddEntryParams as AllowlistAddParams,
  BlockEntryParams,
  CheckResult as AllowlistCheckResult,
  AllowlistStats,
} from './ip-allowlist.js';
export {
  createSessionManager as createAuthSessionManager,
  DEFAULT_SESSION_CONFIG as DEFAULT_AUTH_SESSION_CONFIG,
} from './session-manager.js';
export type {
  SessionManager as AuthSessionManager,
  SessionManagerDeps as AuthSessionManagerDeps,
  Session as AuthSession,
  CreateSessionParams as AuthCreateSessionParams,
  SessionConfig as AuthSessionConfig,
  SessionStats as AuthSessionStats,
} from './session-manager.js';
export { createThreatScorer, DEFAULT_THREAT_CONFIG } from './threat-scorer.js';
export type {
  ThreatScorer,
  ThreatScorerDeps,
  ThreatScorerConfig,
  ThreatCategory,
  ThreatSignal,
  RecordSignalParams,
  ThreatAssessment,
  ThreatLevel,
  ThreatScorerStats,
} from './threat-scorer.js';
export { createCredentialVault } from './credential-vault.js';
export type {
  CredentialVault,
  CredentialVaultDeps,
  StoredCredential,
  StoreCredentialParams,
  CredentialAccess,
  CredentialVaultStats,
} from './credential-vault.js';
export { createCsrfGuard, DEFAULT_CSRF_CONFIG } from './csrf-guard.js';
export type {
  CsrfGuard,
  CsrfGuardDeps,
  CsrfConfig,
  CsrfToken,
  CsrfValidationResult,
  CsrfGuardStats,
} from './csrf-guard.js';
export { createKeyRotationService } from './key-rotation.js';
export type {
  KeyRotationService,
  KeyRotationDeps,
  KeyStatus,
  ManagedKey,
  KeyRegisterParams,
  KeyRotationConfig,
  KeyRotationStats,
} from './key-rotation.js';
export { createAuthProvider } from './auth-provider.js';
export type {
  AuthProvider,
  AuthProviderDeps,
  AuthTokenVaultPort,
  AuthIssuedToken,
  AuthTokenValidation,
  AuthValidatedToken,
  AuthCredentialStore,
  AuthCredentialResult,
  AuthAuditPort,
  AuthAuditEntry,
  AuthClockPort,
  AuthMethod,
  AuthenticateParams,
  AuthenticateResult,
  AuthSuccess,
  AuthFailure,
  AuthErrorCode,
  ConnectTokenResult as AuthConnectTokenResult,
  AuthProviderStats,
} from './auth-provider.js';
export { createSessionMgr, DEFAULT_SESSION_MGR_CONFIG } from './session-mgr.js';
export type {
  SessionMgr,
  SessionMgrDeps,
  SessionMgrConfig,
  SessionMgrState,
  ManagedSession,
  CreateManagedSessionParams,
  SessionValidation,
  SessionMgrStats,
} from './session-mgr.js';
export { createRbacEngine } from './rbac-engine.js';
export type {
  RbacEngine,
  RbacEngineDeps,
  RbacBuiltinRole,
  RbacPermission,
  RbacScope,
  RbacRoleDefinition,
  RbacPermissionGrant,
  RbacAssignment,
  RbacCheckResult,
  RbacAuditEntry,
  RbacStats,
} from './rbac-engine.js';
export { createEncryptService } from './encrypt-service.js';
export type {
  EncryptService,
  EncryptServiceDeps,
  EncryptBackend,
  EncryptResult,
  DecryptResult,
  HashResult as EncryptHashResult,
  HmacResult as EncryptHmacResult,
  DerivedKeyResult,
  EnvelopeEncryptResult,
  ManagedKey as EncryptManagedKey,
  EncryptServiceStats,
} from './encrypt-service.js';
export { createTokenBucketLimiter } from './token-bucket-limiter.js';
export type {
  TokenBucketLimiter,
  BucketLimiterDeps,
  BucketRule,
  GlobalBucketRule,
  BucketStatus,
  BucketLimiterStats,
} from './token-bucket-limiter.js';
export { createAccessLog } from './access-log.js';
export type {
  AccessOutcome,
  AccessEvent,
  AccessPattern,
  AccessQuery,
  AccessReport,
  AccessLogDeps,
  AccessLog,
} from './access-log.js';
export { createIpFilter } from './ip-filter.js';
export type {
  FilterAction,
  CidrRange,
  FilterRule,
  GeoBlock,
  IpCheckResult,
  IpFilterDeps,
  IpFilter,
} from './ip-filter.js';

export { createZeroTrustEngine } from './zero-trust-engine.js';
export type {
  TrustFactor,
  AccessDecision,
  TrustContext,
  TrustScore,
  AccessDecisionResult,
  ZeroTrustPolicy,
  DevicePosture,
  BehaviorAnomaly,
  AccessHistoryEntry,
  ZeroTrustEngine,
  ZeroTrustEngineDeps,
} from './zero-trust-engine.js';
export { createSecretsRotationEngine } from './secrets-rotation.js';
export type {
  SecretType,
  SecretStatus,
  Secret,
  SecretVersion,
  RotationSchedule,
  RotationResult,
  AccessAudit,
  GracePeriod,
  SecretsRotationEngine,
  SecretsRotationEngineDeps,
} from './secrets-rotation.js';

// -- Wave 10: OAuth Provider -------------------------------------------------
export {
  createOAuthProvider,
  registerClient,
  deactivateClient,
  getClient,
  registerScope,
  validateScope,
  listScopes,
  createAuthorizationGrant,
  exchangeCodeForToken,
  issueToken,
  refreshToken,
  introspectToken,
  revokeToken,
  revokeAllClientTokens,
  getClientStats,
} from './oauth-provider.js';
export type {
  GrantType,
  TokenType,
  OAuthClient,
  OAuthScope,
  OAuthToken,
  TokenGrant,
  IntrospectionResult,
  RevocationRecord,
  ClientStats,
  OAuthState,
} from './oauth-provider.js';

// -- Wave 11: Rate Limiter System --------------------------------------------
export { createRateLimiterSystem } from './rate-limiter-system.js';
export type {
  RateLimiterSystem,
  RateLimiterSystemDeps,
  BucketId,
  RateLimitError,
  TokenBucket,
  RateLimitDecision,
  RateLimiterStats,
} from './rate-limiter-system.js';

// -- Wave 12: Access Control System ------------------------------------------
export { createAccessControlSystem } from './access-control-system.js';
export type {
  AccessControlSystem,
  AccessControlSystemDeps,
  SubjectId,
  ResourceId,
  RoleId,
  Permission,
  AccessError,
  Role,
  AccessSubject,
  AccessCheck,
} from './access-control-system.js';

// -- Wave 13: Zero Trust Gateway ---------------------------------------------
export { createZeroTrustGatewaySystem } from './zero-trust-gateway.js';
export type {
  ZeroTrustGatewaySystem,
  ZeroTrustGatewayDeps,
  PrincipalId,
  PolicyId,
  VerificationId,
  ZeroTrustError,
  TrustLevel,
  TrustPolicy,
  PrincipalContext,
  VerificationResult,
} from './zero-trust-gateway.js';

// -- Wave 14: Policy Enforcer -------------------------------------------------
export { createPolicyEnforcerSystem } from './policy-enforcer.js';
export type {
  PolicyEnforcerSystem,
  PolicyEnforcerSystemDeps,
  PolicyRuleId,
  RequestContextId,
  EnforcerError,
  PolicyEffect as EnforcerPolicyEffect,
  ConditionOperator,
  PolicyCondition as EnforcerPolicyCondition,
  PolicyRule,
  RequestContext,
  EnforcementResult,
} from './policy-enforcer.js';

// -- Wave 14: Data Masker -----------------------------------------------------
export { createDataMaskerSystem } from './data-masker.js';
export type {
  DataMaskerSystem,
  DataMaskerSystemDeps,
  MaskRuleId,
  DataMaskerError,
  MaskStrategy,
  MaskRule,
  MaskedRecord,
  MaskerStats,
} from './data-masker.js';

// -- Wave 13: Secret Sharing --------------------------------------------------
export { createSecretSharingSystem } from './secret-sharing.js';
export type {
  SecretSharingSystem,
  SecretSharingDeps,
  SecretId,
  ShareId,
  HolderId,
  SecretError,
  SecretMetadata,
  SecretShare,
  ReconstructionAttempt,
} from './secret-sharing.js';

// -- Wave 12: Key Rotation System --------------------------------------------
export { createKeyRotationSystem } from './key-rotation-system.js';
export type {
  KeyRotationSystem,
  KeyRotationSystemDeps,
  KeyId,
  KeyPurpose,
  KeyStatus as CryptoKeyStatus,
  KeyError,
  ValidAlgorithm,
  CryptoKey,
  RotationEvent,
  KeyStats,
} from './key-rotation-system.js';

// -- Wave 11: Audit Log System -----------------------------------------------
export { createAuditLogSystem } from './audit-log-system.js';
export type {
  AuditLogSystem,
  AuditLogSystemDeps,
  AuditEntryId,
  ActorId,
  AuditCategory as AuditCategorySystem,
  AuditSeverity as AuditSeveritySystem,
  AuditError,
  AuditEntry as AuditEntrySystem,
  AuditQuery,
  AuditReport,
} from './audit-log-system.js';

// -- Wave 10: Certificate Manager --------------------------------------------
export {
  createCertificateManager,
  registerCertificate,
  revokeCertificate,
  getCertificate,
  getCertificateByDomain,
  checkExpiry,
  checkAllExpiries,
  getExpiryAlerts as getCertExpiryAlerts,
  scheduleRenewal,
  recordRenewal,
  getRenewalHistory,
  getPendingRenewals,
  getDomainCoverage,
  getAllDomainCoverages,
  getCertReport,
} from './certificate-manager.js';
export type {
  CertificateStatus,
  AlertLevel,
  Certificate,
  ExpiryAlert as CertExpiryAlert,
  RenewalRecord,
  DomainCoverage,
  CertReport,
  CertManagerState,
} from './certificate-manager.js';

// ── Phase 1 Infrastructure Adapters ─────────────────────────────

export { createSodiumEncryptionBackend } from './sodium-encryption-backend.js';
export { createNodeHashBackend } from './node-hash-backend.js';

// ── Phase 4 Anti-Cheat ──────────────────────────────────────────

export { createInputValidator, DEFAULT_VALIDATION_CONFIG } from './input-validation.js';
export type {
  InputValidator,
  InputValidationConfig,
  ValidationResult,
  ViolationType,
  Violation,
  ValidatedPosition,
  ValidationClockPort,
  ViolationSinkPort,
} from './input-validation.js';

// ── Phase 10.3 Security Hardening ──────────────────────────────

export { createSecurityHardeningEngine } from './security-hardening.js';
export type {
  SecurityHardeningEngine,
  SecurityHardeningDeps,
  SecurityHardeningConfig,
  SecurityHardeningStats,
  HardeningClockPort,
  HardeningIdPort,
  HardeningLogPort,
  HardeningEventPort,
  TokenStorePort,
  ApiKeyStorePort,
  VulnScanPort,
  ScanType,
  VulnSeverity,
  VulnFinding,
  VulnScanResult,
  ApiKeyScope,
  ApiKeyRecord,
  JwtConfig,
  CspDirectives,
  SchemaValidationResult,
  SchemaError,
  BackpressureState,
  DdosMetrics,
  TokenPair,
  RotateResult,
  SchemaRegistry,
  SchemaDefinition,
} from './security-hardening.js';

// ── Phase 10.4 Compliance ───────────────────────────────────────

export { createComplianceEngine } from './compliance-engine.js';
export type {
  ComplianceEngine,
  ComplianceEngineDeps,
  ComplianceEngineConfig,
  ComplianceClockPort,
  ComplianceIdPort,
  ComplianceLogPort,
  ComplianceEventPort,
  PlayerDataPort,
  ConsentStorePort,
  AgeVerificationPort,
  LootBoxRegistryPort,
  Jurisdiction,
  DataCategory,
  ConsentPurpose,
  ConsentRecord,
  ConsentGrant,
  PlayerDataExport,
  PseudonymisationResult,
  DeletionResult,
  ErasureRequest,
  ErasureStatus,
  AgeVerificationResult,
  AgeGroup,
  RestrictedFeature,
  ParentalConsentRecord,
  LootBoxTable,
  LootBoxItem,
  SpendingLimitConfig,
  SpendCheckResult,
  PrivacyPolicyRef,
} from './compliance-engine.js';

// ── Phase 11.4 Content Moderation ───────────────────────────────

export { createContentModerationEngine } from './content-moderation.js';
export type {
  ContentModerationEngine,
  ContentModerationDeps,
  ContentModerationConfig,
  ContentModerationStats,
  ModerationClockPort,
  ModerationIdPort,
  ModerationLogPort,
  ModerationEventPort,
  ToxicityClassifierPort,
  ImageModerationPort,
  BehaviorAnalysisPort,
  ModerationStorePort,
  ToxicityCategory,
  ActionSeverity,
  QueueStatus,
  ContentType,
  ReportCategory,
  BehaviorPattern,
  CulturalRegion,
  ToxicityResult,
  ImageScanResult,
  ImageCategory,
  PlayerAction,
  BehaviorAnalysis,
  DetectedPattern,
  PlayerReport,
  ModerationAction,
  ModerationHistory,
  QueueItem,
  Appeal,
  ModeratorStats,
  CulturalRuleSet,
  FalsePositiveMetrics,
} from './content-moderation.js';

// ── Phase 22: Anti-Cheat System ─────────────────────────────────

export { createAntiCheatSystem, DEFAULT_ANTI_CHEAT_CONFIG } from './anti-cheat.js';
export type {
  ActionResult as AntiCheatActionResult,
  PenaltyTier,
  ViolationRecord,
  PlayerViolationSummary,
  AntiCheatConfig,
  AntiCheatSystem,
} from './anti-cheat.js';
