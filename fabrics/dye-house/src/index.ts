/**
 * @loom/dye-house — Security, authentication, encryption.
 *
 * Token Vault: Session token lifecycle management.
 * Rate Limiter: Sliding window rate control per identity per action.
 * Permission Gate: Action authorization based on tier, status, and custom rules.
 * Future: Encryption services.
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
