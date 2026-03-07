/**
 * @loom/dye-house — Security, authentication, encryption.
 *
 * Token Vault: Session token lifecycle management.
 * Rate Limiter: Sliding window rate control per identity per action.
 * Future: Encryption services, permission gates.
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
