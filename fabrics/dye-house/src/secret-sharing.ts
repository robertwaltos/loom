/**
 * Secret Sharing — Shamir-style threshold secret splitting with reconstruction.
 *
 * Secrets are split across N holders; any T holders can reconstruct.
 * This implementation is conceptual (no cryptographic polynomial math) —
 * it models the lifecycle: split, access, reconstruct, reveal.
 *
 * "Some truths require a quorum to unlock."
 *
 * Fabric: dye-house
 * Thread tier: 1
 */

// ─── Port Interfaces ─────────────────────────────────────────────────────────

interface SecretSharingClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface SecretSharingIdGenPort {
  readonly next: () => string;
}

interface SecretSharingLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type SecretId = string;
export type ShareId = string;
export type HolderId = string;

export type SecretError =
  | 'secret-not-found'
  | 'share-not-found'
  | 'holder-not-found'
  | 'insufficient-shares'
  | 'invalid-threshold'
  | 'already-registered'
  | 'secret-already-revealed';

export interface SecretMetadata {
  readonly secretId: SecretId;
  readonly description: string;
  readonly threshold: number;
  readonly totalShares: number;
  readonly createdAt: bigint;
  revealed: boolean;
}

export interface SecretShare {
  readonly shareId: ShareId;
  readonly secretId: SecretId;
  readonly holderId: HolderId;
  readonly shareIndex: number;
  readonly createdAt: bigint;
  accessed: boolean;
}

export interface ReconstructionAttempt {
  readonly attemptId: string;
  readonly secretId: SecretId;
  readonly holderIds: ReadonlyArray<HolderId>;
  readonly sharesPresented: number;
  readonly successful: boolean;
  readonly attemptedAt: bigint;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface SecretSharingSystem {
  splitSecret(
    description: string,
    threshold: number,
    holderIds: ReadonlyArray<HolderId>,
  ): { metadata: SecretMetadata; shares: ReadonlyArray<SecretShare> } | SecretError;
  accessShare(
    shareId: ShareId,
    holderId: HolderId,
  ): { success: true; share: SecretShare } | { success: false; error: SecretError };
  attemptReconstruction(
    secretId: SecretId,
    holderIds: ReadonlyArray<HolderId>,
  ): { success: true; attempt: ReconstructionAttempt } | { success: false; error: SecretError };
  getMetadata(secretId: SecretId): SecretMetadata | undefined;
  getShare(shareId: ShareId): SecretShare | undefined;
  listShares(secretId: SecretId): ReadonlyArray<SecretShare>;
  getReconstructionHistory(secretId: SecretId): ReadonlyArray<ReconstructionAttempt>;
}

// ─── Deps ────────────────────────────────────────────────────────────────────

export interface SecretSharingDeps {
  readonly clock: SecretSharingClockPort;
  readonly idGen: SecretSharingIdGenPort;
  readonly logger: SecretSharingLoggerPort;
}

// ─── State ───────────────────────────────────────────────────────────────────

interface SharingState {
  readonly secrets: Map<SecretId, SecretMetadata>;
  readonly shares: Map<ShareId, SecretShare>;
  readonly sharesBySecret: Map<SecretId, ShareId[]>;
  readonly reconstructionHistory: Map<SecretId, ReconstructionAttempt[]>;
  readonly deps: SecretSharingDeps;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createSecretSharingSystem(deps: SecretSharingDeps): SecretSharingSystem {
  const state: SharingState = {
    secrets: new Map(),
    shares: new Map(),
    sharesBySecret: new Map(),
    reconstructionHistory: new Map(),
    deps,
  };

  return {
    splitSecret: (description, threshold, holderIds) =>
      splitSecretImpl(state, description, threshold, holderIds),
    accessShare: (shareId, holderId) => accessShareImpl(state, shareId, holderId),
    attemptReconstruction: (secretId, holderIds) =>
      attemptReconstructionImpl(state, secretId, holderIds),
    getMetadata: (secretId) => state.secrets.get(secretId),
    getShare: (shareId) => state.shares.get(shareId),
    listShares: (secretId) => listSharesImpl(state, secretId),
    getReconstructionHistory: (secretId) => state.reconstructionHistory.get(secretId) ?? [],
  };
}

// ─── Split Secret ─────────────────────────────────────────────────────────────

function splitSecretImpl(
  state: SharingState,
  description: string,
  threshold: number,
  holderIds: ReadonlyArray<HolderId>,
): { metadata: SecretMetadata; shares: ReadonlyArray<SecretShare> } | SecretError {
  if (threshold < 2 || threshold > holderIds.length) return 'invalid-threshold';

  const now = state.deps.clock.nowMicroseconds();
  const secretId = state.deps.idGen.next();
  const metadata = buildSecretMetadata(secretId, description, threshold, holderIds.length, now);
  const shares = buildShares(state, secretId, holderIds, now);

  persistSecret(state, metadata, shares);
  state.deps.logger.info('secret-split', { secretId, threshold, totalShares: holderIds.length });
  return { metadata, shares };
}

function buildSecretMetadata(
  secretId: SecretId,
  description: string,
  threshold: number,
  totalShares: number,
  now: bigint,
): SecretMetadata {
  return { secretId, description, threshold, totalShares, createdAt: now, revealed: false };
}

function buildShares(
  state: SharingState,
  secretId: SecretId,
  holderIds: ReadonlyArray<HolderId>,
  now: bigint,
): SecretShare[] {
  return holderIds.map((holderId, index) => ({
    shareId: state.deps.idGen.next(),
    secretId,
    holderId,
    shareIndex: index + 1,
    createdAt: now,
    accessed: false,
  }));
}

function persistSecret(state: SharingState, metadata: SecretMetadata, shares: SecretShare[]): void {
  state.secrets.set(metadata.secretId, metadata);
  state.sharesBySecret.set(
    metadata.secretId,
    shares.map((s) => s.shareId),
  );
  for (const share of shares) {
    state.shares.set(share.shareId, share);
  }
}

// ─── Access Share ─────────────────────────────────────────────────────────────

function accessShareImpl(
  state: SharingState,
  shareId: ShareId,
  holderId: HolderId,
): { success: true; share: SecretShare } | { success: false; error: SecretError } {
  const share = state.shares.get(shareId);
  if (share === undefined) return { success: false, error: 'share-not-found' };
  if (share.holderId !== holderId) return { success: false, error: 'holder-not-found' };

  share.accessed = true;
  state.deps.logger.info('share-accessed', { shareId, holderId });
  return { success: true, share };
}

// ─── Attempt Reconstruction ───────────────────────────────────────────────────

function attemptReconstructionImpl(
  state: SharingState,
  secretId: SecretId,
  holderIds: ReadonlyArray<HolderId>,
): { success: true; attempt: ReconstructionAttempt } | { success: false; error: SecretError } {
  const metadata = state.secrets.get(secretId);
  if (metadata === undefined) return { success: false, error: 'secret-not-found' };
  if (metadata.revealed) return { success: false, error: 'secret-already-revealed' };

  const secretShareIds = state.sharesBySecret.get(secretId) ?? [];
  const accessedCount = countAccessedSharesForHolders(state, secretShareIds, holderIds);
  const attempt = buildAttempt(
    state,
    secretId,
    holderIds,
    accessedCount,
    accessedCount >= metadata.threshold,
  );

  finalizeReconstruction(state, metadata, attempt);
  recordReconstructionAttempt(state, secretId, attempt);
  return { success: true, attempt };
}

function buildAttempt(
  state: SharingState,
  secretId: SecretId,
  holderIds: ReadonlyArray<HolderId>,
  accessedCount: number,
  successful: boolean,
): ReconstructionAttempt {
  return {
    attemptId: state.deps.idGen.next(),
    secretId,
    holderIds,
    sharesPresented: accessedCount,
    successful,
    attemptedAt: state.deps.clock.nowMicroseconds(),
  };
}

function finalizeReconstruction(
  state: SharingState,
  metadata: SecretMetadata,
  attempt: ReconstructionAttempt,
): void {
  if (attempt.successful) {
    metadata.revealed = true;
    state.deps.logger.info('secret-reconstructed', {
      secretId: metadata.secretId,
      sharesPresented: attempt.sharesPresented,
    });
  } else {
    state.deps.logger.warn('reconstruction-failed', {
      secretId: metadata.secretId,
      sharesPresented: attempt.sharesPresented,
      threshold: metadata.threshold,
    });
  }
}

function countAccessedSharesForHolders(
  state: SharingState,
  shareIds: string[],
  holderIds: ReadonlyArray<HolderId>,
): number {
  let count = 0;
  for (const shareId of shareIds) {
    const share = state.shares.get(shareId);
    if (share !== undefined && share.accessed && holderIds.includes(share.holderId)) {
      count += 1;
    }
  }
  return count;
}

function recordReconstructionAttempt(
  state: SharingState,
  secretId: SecretId,
  attempt: ReconstructionAttempt,
): void {
  let history = state.reconstructionHistory.get(secretId);
  if (history === undefined) {
    history = [];
    state.reconstructionHistory.set(secretId, history);
  }
  history.push(attempt);
}

// ─── List Shares ──────────────────────────────────────────────────────────────

function listSharesImpl(state: SharingState, secretId: SecretId): ReadonlyArray<SecretShare> {
  const shareIds = state.sharesBySecret.get(secretId) ?? [];
  const result: SecretShare[] = [];
  for (const shareId of shareIds) {
    const share = state.shares.get(shareId);
    if (share !== undefined) result.push(share);
  }
  return result;
}
