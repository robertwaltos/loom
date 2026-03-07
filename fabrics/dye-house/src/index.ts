/**
 * @loom/dye-house — Security, authentication, encryption.
 *
 * Token Vault: Session token lifecycle management.
 * Future: Rate limiting, encryption services, permission gates.
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
