/**
 * Genesis Vault — One-time allocation for new dynasties.
 *
 * Bible v1.2: Seeded at launch from Year 1 issuance of all 20
 * launch worlds. Replenished annually by 1% of total annual issuance.
 * Balance is always public. Assembly notification at 10M KALON.
 * Depletion is a civilisational crisis event — not a bug.
 *
 * All values in whole KALON. Convert with kalonToMicro() for the ledger.
 */

import { vaultDepleted } from './kalon-errors.js';

export const GENESIS_VAULT_RULES = {
  newDynastyAllocation: 500n,
  depletionAlertThreshold: 10_000_000n,
  replenishmentRate: 1n,
  replenishmentScale: 100n,
  prometheusBonus: 500n,
  shepherdBonus: 2_500n,
  firstLightBonus: 15_000n,
} as const;

export interface GenesisVault {
  balance(): bigint;
  allocateNewDynasty(): bigint;
  replenish(totalAnnualIssuance: bigint): bigint;
  isDepleted(): boolean;
  isBelowAlert(): boolean;
}

interface VaultState {
  balance: bigint;
}

export function createGenesisVault(initialBalance: bigint): GenesisVault {
  const state: VaultState = { balance: initialBalance };

  return {
    balance: () => state.balance,
    allocateNewDynasty: () => allocateImpl(state),
    replenish: (annual) => replenishImpl(state, annual),
    isDepleted: () => state.balance <= 0n,
    isBelowAlert: () => state.balance < GENESIS_VAULT_RULES.depletionAlertThreshold,
  };
}

function allocateImpl(state: VaultState): bigint {
  const amount = GENESIS_VAULT_RULES.newDynastyAllocation;
  if (state.balance < amount) {
    throw vaultDepleted('Genesis Vault', amount, state.balance);
  }
  state.balance -= amount;
  return amount;
}

function replenishImpl(state: VaultState, totalAnnualIssuance: bigint): bigint {
  const { replenishmentRate, replenishmentScale } = GENESIS_VAULT_RULES;
  const amount = (totalAnnualIssuance * replenishmentRate) / replenishmentScale;
  state.balance += amount;
  return amount;
}
