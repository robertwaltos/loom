/**
 * @loom/dye-house — Security, authentication, encryption.
 *
 * Token Vault: Session token lifecycle management.
 * Rate Limiter: Sliding window rate control per identity per action.
 * Permission Gate: Action authorization based on tier, status, and custom rules.
 * Audit Log: Security event recording and forensic analysis.
 * Hash Service: Cryptographic hashing, HMAC signing, key derivation.
 * Encryption Service: Symmetric encryption with key rotation.
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
