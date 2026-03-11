/**
 * Carbon Credit System — Environmental credits earned and spent by worlds/dynasties.
 *
 * Holders (worlds or dynasties) register to earn credits via projects.
 * Credits can be issued (minted to holder), transferred, or retired (permanently removed).
 * Retired credits count as spent and cannot be recovered.
 *
 * All amounts in bigint micro-KALON equivalent (integer precision).
 */

export type CreditId = string;
export type HolderId = string;
export type ProjectId = string;

export type CreditError =
  | 'holder-not-found'
  | 'project-not-found'
  | 'credit-not-found'
  | 'insufficient-credits'
  | 'invalid-amount'
  | 'already-registered';

export interface CarbonProject {
  readonly projectId: ProjectId;
  readonly name: string;
  readonly holderId: HolderId;
  readonly creditCapacity: bigint;
  readonly creditsIssued: bigint;
  readonly createdAt: bigint;
  readonly active: boolean;
}

export interface CreditBalance {
  readonly holderId: HolderId;
  readonly totalEarned: bigint;
  readonly totalSpent: bigint;
  readonly available: bigint;
}

export interface CreditTransaction {
  readonly transactionId: CreditId;
  readonly fromHolder: HolderId | null;
  readonly toHolder: HolderId | null;
  readonly amount: bigint;
  readonly type: 'ISSUE' | 'TRANSFER' | 'RETIRE';
  readonly projectId: ProjectId | null;
  readonly occurredAt: bigint;
}

export interface CarbonCreditSystem {
  registerHolder(holderId: HolderId): { success: true } | { success: false; error: CreditError };
  createProject(
    holderId: HolderId,
    name: string,
    creditCapacity: bigint,
  ): CarbonProject | CreditError;
  issueCredits(
    projectId: ProjectId,
    amount: bigint,
  ): { success: true; transaction: CreditTransaction } | { success: false; error: CreditError };
  transferCredits(
    fromHolderId: HolderId,
    toHolderId: HolderId,
    amount: bigint,
  ): { success: true; transaction: CreditTransaction } | { success: false; error: CreditError };
  retireCredits(
    holderId: HolderId,
    amount: bigint,
  ): { success: true; transaction: CreditTransaction } | { success: false; error: CreditError };
  getBalance(holderId: HolderId): CreditBalance | undefined;
  getProject(projectId: ProjectId): CarbonProject | undefined;
  getTransactionHistory(holderId: HolderId, limit: number): ReadonlyArray<CreditTransaction>;
}

interface MutableBalance {
  holderId: HolderId;
  totalEarned: bigint;
  totalSpent: bigint;
}

interface MutableProject {
  projectId: ProjectId;
  name: string;
  holderId: HolderId;
  creditCapacity: bigint;
  creditsIssued: bigint;
  createdAt: bigint;
  active: boolean;
}

interface CarbonCreditState {
  readonly holders: Set<HolderId>;
  readonly balances: Map<HolderId, MutableBalance>;
  readonly projects: Map<ProjectId, MutableProject>;
  readonly transactions: CreditTransaction[];
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: { info(message: string, meta?: Record<string, unknown>): void };
}

export function createCarbonCreditSystem(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: { info(message: string, meta?: Record<string, unknown>): void };
}): CarbonCreditSystem {
  const state: CarbonCreditState = {
    holders: new Set(),
    balances: new Map(),
    projects: new Map(),
    transactions: [],
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    registerHolder: (holderId) => registerHolderImpl(state, holderId),
    createProject: (holderId, name, capacity) => createProjectImpl(state, holderId, name, capacity),
    issueCredits: (projectId, amount) => issueCreditsImpl(state, projectId, amount),
    transferCredits: (from, to, amount) => transferCreditsImpl(state, from, to, amount),
    retireCredits: (holderId, amount) => retireCreditsImpl(state, holderId, amount),
    getBalance: (holderId) => getBalanceImpl(state, holderId),
    getProject: (projectId) => state.projects.get(projectId),
    getTransactionHistory: (holderId, limit) => getTransactionHistoryImpl(state, holderId, limit),
  };
}

function registerHolderImpl(
  state: CarbonCreditState,
  holderId: HolderId,
): { success: true } | { success: false; error: CreditError } {
  if (state.holders.has(holderId)) {
    return { success: false, error: 'already-registered' };
  }
  state.holders.add(holderId);
  state.balances.set(holderId, { holderId, totalEarned: 0n, totalSpent: 0n });
  state.logger.info('Carbon credit holder registered', { holderId });
  return { success: true };
}

function createProjectImpl(
  state: CarbonCreditState,
  holderId: HolderId,
  name: string,
  creditCapacity: bigint,
): CarbonProject | CreditError {
  if (!state.holders.has(holderId)) return 'holder-not-found';
  if (creditCapacity < 1n) return 'invalid-amount';

  const projectId = state.idGen.generateId();
  const now = state.clock.nowMicroseconds();
  const project: MutableProject = {
    projectId,
    name,
    holderId,
    creditCapacity,
    creditsIssued: 0n,
    createdAt: now,
    active: true,
  };
  state.projects.set(projectId, project);
  state.logger.info('Carbon project created', { projectId, holderId, name });
  return project;
}

function issueCreditsImpl(
  state: CarbonCreditState,
  projectId: ProjectId,
  amount: bigint,
): { success: true; transaction: CreditTransaction } | { success: false; error: CreditError } {
  if (amount < 1n) return { success: false, error: 'invalid-amount' };
  const project = state.projects.get(projectId);
  if (!project) return { success: false, error: 'project-not-found' };
  if (!project.active) return { success: false, error: 'project-not-found' };
  if (project.creditsIssued + amount > project.creditCapacity) {
    return { success: false, error: 'insufficient-credits' };
  }

  project.creditsIssued += amount;
  const balance = state.balances.get(project.holderId);
  if (balance) balance.totalEarned += amount;

  const tx = buildTransaction(state, null, project.holderId, amount, 'ISSUE', projectId);
  state.logger.info('Credits issued', { projectId, amount: String(amount) });
  return { success: true, transaction: tx };
}

function transferCreditsImpl(
  state: CarbonCreditState,
  fromHolderId: HolderId,
  toHolderId: HolderId,
  amount: bigint,
): { success: true; transaction: CreditTransaction } | { success: false; error: CreditError } {
  if (amount < 1n) return { success: false, error: 'invalid-amount' };
  const fromBalance = state.balances.get(fromHolderId);
  if (!fromBalance) return { success: false, error: 'holder-not-found' };
  if (!state.holders.has(toHolderId)) return { success: false, error: 'holder-not-found' };

  const available = fromBalance.totalEarned - fromBalance.totalSpent;
  if (available < amount) return { success: false, error: 'insufficient-credits' };

  fromBalance.totalSpent += amount;
  const toBalance = state.balances.get(toHolderId);
  if (toBalance) toBalance.totalEarned += amount;

  const tx = buildTransaction(state, fromHolderId, toHolderId, amount, 'TRANSFER', null);
  state.logger.info('Credits transferred', {
    fromHolderId,
    toHolderId,
    amount: String(amount),
  });
  return { success: true, transaction: tx };
}

function retireCreditsImpl(
  state: CarbonCreditState,
  holderId: HolderId,
  amount: bigint,
): { success: true; transaction: CreditTransaction } | { success: false; error: CreditError } {
  if (amount < 1n) return { success: false, error: 'invalid-amount' };
  const balance = state.balances.get(holderId);
  if (!balance) return { success: false, error: 'holder-not-found' };

  const available = balance.totalEarned - balance.totalSpent;
  if (available < amount) return { success: false, error: 'insufficient-credits' };

  balance.totalSpent += amount;
  const tx = buildTransaction(state, holderId, null, amount, 'RETIRE', null);
  state.logger.info('Credits retired', { holderId, amount: String(amount) });
  return { success: true, transaction: tx };
}

function getBalanceImpl(state: CarbonCreditState, holderId: HolderId): CreditBalance | undefined {
  const balance = state.balances.get(holderId);
  if (!balance) return undefined;
  return {
    holderId: balance.holderId,
    totalEarned: balance.totalEarned,
    totalSpent: balance.totalSpent,
    available: balance.totalEarned - balance.totalSpent,
  };
}

function getTransactionHistoryImpl(
  state: CarbonCreditState,
  holderId: HolderId,
  limit: number,
): ReadonlyArray<CreditTransaction> {
  const filtered = state.transactions.filter(
    (tx) => tx.fromHolder === holderId || tx.toHolder === holderId,
  );
  return filtered.slice(-limit);
}

function buildTransaction(
  state: CarbonCreditState,
  fromHolder: HolderId | null,
  toHolder: HolderId | null,
  amount: bigint,
  type: 'ISSUE' | 'TRANSFER' | 'RETIRE',
  projectId: ProjectId | null,
): CreditTransaction {
  const tx: CreditTransaction = {
    transactionId: state.idGen.generateId(),
    fromHolder,
    toHolder,
    amount,
    type,
    projectId,
    occurredAt: state.clock.nowMicroseconds(),
  };
  state.transactions.push(tx);
  return tx;
}
