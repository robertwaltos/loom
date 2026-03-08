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
