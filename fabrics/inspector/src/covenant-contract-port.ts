/**
 * Permanence Covenant — TypeScript contract port.
 *
 * Hexagonal adapter for the PermanenceCovenant.sol on-chain state machine.
 * The BlockchainPort abstraction keeps business logic testable without a live
 * RPC node.  Wire up with createEthersCovenantAdapter() at startup.
 */

import type { CovenantState, CovenantStatus } from './permanence-covenant.js';

// ─── Port interfaces ──────────────────────────────────────────────────────────

export interface BlockchainTx {
  readonly hash: string;
  readonly blockNumber: bigint;
  readonly gasUsed: bigint;
  readonly status: 1 | 0;
}

/** Minimal abstraction over the on-chain PermanenceCovenant contract. */
export interface CovenantContractPort {
  /**
   * Read the on-chain state without sending a transaction.
   * Throws if the RPC call fails.
   */
  readState(): Promise<CovenantContractState>;

  /**
   * Advance the state machine.  Each method maps to a Solidity state
   * transition; the underlying implementation signs and broadcasts the tx.
   */
  beginMonitoring(evidence: string): Promise<BlockchainTx>;
  activate(evidence: string): Promise<BlockchainTx>;
  startCountdown(evidence: string): Promise<BlockchainTx>;
  releaseSourceCode(escrowUrl: string, evidence: string): Promise<BlockchainTx>;
  handToCommunity(daoAddress: string, evidence: string): Promise<BlockchainTx>;
  archiveAndPreserve(archiveUrl: string, evidence: string): Promise<BlockchainTx>;
}

/** On-chain state as returned by the contract's getState() view. */
export interface CovenantContractState {
  readonly statusCode: number;       // 0–6 matching Solidity enum
  readonly status: CovenantStatus;   // mapped string label
  readonly activatedAt?: bigint;
  readonly countdownEndsAt?: bigint;
  readonly lastTransitionAt: bigint;
  readonly communityGovernance: string;
  readonly sourceEscrowUrl: string;
  readonly archiveUrl: string;
  readonly evidence: string;
}

// ─── Status mapping ───────────────────────────────────────────────────────────

const STATUS_BY_CODE: Record<number, CovenantStatus> = {
  0: 'DORMANT',
  1: 'MONITORING',
  2: 'ACTIVATED',
  3: 'COUNTDOWN',
  4: 'SOURCE_RELEASED',
  5: 'COMMUNITY_HANDED',
  6: 'PRESERVED',
};

export function covenantStatusFromCode(code: number): CovenantStatus {
  const s = STATUS_BY_CODE[code];
  if (s === undefined) throw new Error(`Unknown covenant status code: ${code}`);
  return s;
}

export function covenantCodeFromStatus(status: CovenantStatus): number {
  const entry = Object.entries(STATUS_BY_CODE).find(([, v]) => v === status);
  if (entry === undefined) throw new Error(`Unknown covenant status: ${status}`);
  return Number(entry[0]);
}

// ─── TypeScript ↔ On-chain sync ───────────────────────────────────────────────

/**
 * Merge an on-chain state snapshot into the TypeScript CovenantState model.
 * The TypeScript state machine in permanence-covenant.ts remains the source of
 * truth for business logic; this keeps it current with the chain.
 */
export function applyChainState(
  chainState: CovenantContractState,
): Partial<CovenantState> {
  const base: Partial<CovenantState> = {
    status: chainState.status,
    lastUpdatedAt: new Date(Number(chainState.lastTransitionAt) * 1000).toISOString(),
  };

  if (chainState.activatedAt !== undefined && chainState.activatedAt > 0n) {
    (base as Record<string, unknown>)['activatedAt'] = new Date(
      Number(chainState.activatedAt) * 1000,
    ).toISOString();
  }

  if (chainState.countdownEndsAt !== undefined && chainState.countdownEndsAt > 0n) {
    (base as Record<string, unknown>)['countdownEndsAt'] = new Date(
      Number(chainState.countdownEndsAt) * 1000,
    ).toISOString();
  }

  if (chainState.sourceEscrowUrl) {
    (base as Record<string, unknown>)['sourceCodeEscrowUrl'] = chainState.sourceEscrowUrl;
  }

  if (chainState.archiveUrl) {
    (base as Record<string, unknown>)['archiveUrl'] = chainState.archiveUrl;
  }

  if (chainState.communityGovernance !== '0x0000000000000000000000000000000000000000') {
    (base as Record<string, unknown>)['communityGovernanceAddress'] = chainState.communityGovernance;
  }

  return base;
}

// ─── In-memory mock (test / local dev) ───────────────────────────────────────

export interface MockTxOptions {
  readonly failWith?: Error;
  readonly blockNumber?: bigint;
  readonly gasUsed?: bigint;
}

export function createMockCovenantContractPort(
  opts: MockTxOptions = {},
): CovenantContractPort & { getStoredState(): CovenantContractState } {
  let stored: CovenantContractState = {
    statusCode: 0,
    status: 'DORMANT',
    lastTransitionAt: BigInt(Math.floor(Date.now() / 1000)),
    communityGovernance: '0x0000000000000000000000000000000000000000',
    sourceEscrowUrl: '',
    archiveUrl: '',
    evidence: '',
  };

  function makeTx(): BlockchainTx {
    return {
      hash: `0x${'a'.repeat(64)}`,
      blockNumber: opts.blockNumber ?? 1n,
      gasUsed: opts.gasUsed ?? 21_000n,
      status: 1,
    };
  }

  function tryAdvance(
    code: number,
    evidence: string,
    extra: Partial<CovenantContractState> = {},
  ): Promise<BlockchainTx> {
    if (opts.failWith !== undefined) return Promise.reject(opts.failWith);
    stored = {
      ...stored,
      statusCode: code,
      status: covenantStatusFromCode(code),
      lastTransitionAt: BigInt(Math.floor(Date.now() / 1000)),
      evidence,
      ...extra,
    };
    return Promise.resolve(makeTx());
  }

  return {
    getStoredState: () => stored,

    readState: () => Promise.resolve({ ...stored }),

    beginMonitoring: (evidence) => tryAdvance(1, evidence),
    activate: (evidence) => tryAdvance(2, evidence, {
      activatedAt: BigInt(Math.floor(Date.now() / 1000)),
    }),
    startCountdown: (evidence) => tryAdvance(3, evidence, {
      countdownEndsAt: BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
    }),
    releaseSourceCode: (escrowUrl, evidence) =>
      tryAdvance(4, evidence, { sourceEscrowUrl: escrowUrl }),
    handToCommunity: (daoAddress, evidence) =>
      tryAdvance(5, evidence, { communityGovernance: daoAddress }),
    archiveAndPreserve: (archiveUrl, evidence) =>
      tryAdvance(6, evidence, { archiveUrl }),
  };
}
