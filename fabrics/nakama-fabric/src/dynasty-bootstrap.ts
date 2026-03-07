/**
 * Dynasty Bootstrap — New dynasty onboarding orchestration.
 *
 * Bible v1.1 Part 10: Mandatory Initiation before subscription.
 * Coordinates all systems required to bring a new dynasty into existence:
 *
 *   1. Dynasty Registry — create the dynasty record
 *   2. KALON Ledger — create the account
 *   3. Genesis Vault — withdraw founding grant (500 KALON)
 *   4. Continuity Engine — initialize lifecycle tracking
 *   5. Chronicle — append DYNASTY_BIRTH entry
 *   6. MARKS Registry — award FOUNDING mark if within founding window
 *
 * This is a pure orchestration layer — no business logic of its own.
 * Every port is injected. Every step is sequenced.
 */

import type { SubscriptionTier, DynastyInfo, DynastyRegistry } from './dynasty.js';
import type { ContinuityEngine, ContinuityRecord } from './dynasty-continuity.js';
import type { MarksRegistry, Mark } from './marks-registry.js';

// ─── Types ─────────────────────────────────────────────────────────

export interface BootstrapParams {
  readonly dynastyId: string;
  readonly name: string;
  readonly homeWorldId: string;
  readonly subscriptionTier?: SubscriptionTier;
}

export interface BootstrapResult {
  readonly dynasty: DynastyInfo;
  readonly continuityRecord: ContinuityRecord;
  readonly kalonAccountId: string;
  readonly genesisGrantKalon: bigint;
  readonly chronicleEntryId: string;
  readonly foundingMark: Mark | null;
}

// ─── Ports ─────────────────────────────────────────────────────────

export interface KalonLedgerPort {
  createAccount(accountId: string): void;
  mint(accountId: string, amount: bigint): void;
}

export interface GenesisVaultPort {
  allocateNewDynasty(): bigint;
}

export interface ChroniclePort {
  append(entry: ChronicleBootstrapEntry): string;
}

export interface ChronicleBootstrapEntry {
  readonly category: string;
  readonly worldId: string;
  readonly subject: string;
  readonly content: string;
}

export interface FoundingEligibility {
  isEligible(worldId: string): boolean;
}

// ─── Deps ──────────────────────────────────────────────────────────

export interface DynastyBootstrapDeps {
  readonly dynastyRegistry: DynastyRegistry;
  readonly continuityEngine: ContinuityEngine;
  readonly kalonLedger: KalonLedgerPort;
  readonly genesisVault: GenesisVaultPort;
  readonly chronicle: ChroniclePort;
  readonly marksRegistry: MarksRegistry;
  readonly foundingEligibility: FoundingEligibility;
  readonly kalonToMicro: (kalon: bigint) => bigint;
}

// ─── Service Interface ─────────────────────────────────────────────

export interface DynastyBootstrapService {
  foundDynasty(params: BootstrapParams): BootstrapResult;
}

// ─── Factory ───────────────────────────────────────────────────────

export function createDynastyBootstrapService(
  deps: DynastyBootstrapDeps,
): DynastyBootstrapService {
  return {
    foundDynasty: (params) => bootstrapDynasty(deps, params),
  };
}

// ─── Orchestration ─────────────────────────────────────────────────

function bootstrapDynasty(
  deps: DynastyBootstrapDeps,
  params: BootstrapParams,
): BootstrapResult {
  const dynasty = createDynastyRecord(deps, params);
  const grantKalon = fundDynastyAccount(deps, dynasty.kalonAccountId);
  const tier = params.subscriptionTier ?? 'free';
  const continuityRecord = deps.continuityEngine.initializeRecord(dynasty.dynastyId, tier);
  const chronicleEntryId = recordBirthInChronicle(deps, dynasty);
  const foundingMark = attemptFoundingMark(deps, dynasty, chronicleEntryId);

  return {
    dynasty,
    continuityRecord,
    kalonAccountId: dynasty.kalonAccountId,
    genesisGrantKalon: grantKalon,
    chronicleEntryId,
    foundingMark,
  };
}

function createDynastyRecord(
  deps: DynastyBootstrapDeps,
  params: BootstrapParams,
): DynastyInfo {
  const dynasty = deps.dynastyRegistry.found({
    dynastyId: params.dynastyId,
    name: params.name,
    homeWorldId: params.homeWorldId,
    subscriptionTier: params.subscriptionTier,
  });
  deps.kalonLedger.createAccount(dynasty.kalonAccountId);
  return dynasty;
}

function fundDynastyAccount(
  deps: DynastyBootstrapDeps,
  kalonAccountId: string,
): bigint {
  const grantKalon = deps.genesisVault.allocateNewDynasty();
  const grantMicro = deps.kalonToMicro(grantKalon);
  deps.kalonLedger.mint(kalonAccountId, grantMicro);
  return grantKalon;
}

function recordBirthInChronicle(
  deps: DynastyBootstrapDeps,
  dynasty: DynastyInfo,
): string {
  return deps.chronicle.append({
    category: 'entity.lifecycle',
    worldId: dynasty.homeWorldId,
    subject: dynasty.dynastyId,
    content: 'Dynasty ' + dynasty.name + ' founded on ' + dynasty.homeWorldId,
  });
}

function attemptFoundingMark(
  deps: DynastyBootstrapDeps,
  dynasty: DynastyInfo,
  chronicleEntryId: string,
): Mark | null {
  if (!deps.foundingEligibility.isEligible(dynasty.homeWorldId)) {
    return null;
  }
  return deps.marksRegistry.award({
    markType: 'FOUNDING',
    dynastyId: dynasty.dynastyId,
    chronicleEntryRef: chronicleEntryId,
    worldId: dynasty.homeWorldId,
  });
}
