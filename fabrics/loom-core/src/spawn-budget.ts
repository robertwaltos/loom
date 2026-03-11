/**
 * Spawn Budget — Entity spawn rate and world capacity management
 *
 * Manages per-world entity budgets by category, spawn queues, priorities,
 * and automatic budget refills. Prevents world overcrowding.
 */

// --- Ports (defined locally) ---

export interface Clock {
  nowMicros(): bigint;
}

export interface IdGenerator {
  nextId(): string;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// --- Types ---

export type EntityCategory = 'NPC' | 'MONSTER' | 'CREATURE' | 'ITEM' | 'STRUCTURE';

export type SpawnPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' | 'BACKGROUND';

export interface SpawnBudget {
  readonly worldId: string;
  readonly maxNpc: number;
  readonly maxMonster: number;
  readonly maxCreature: number;
  readonly maxItem: number;
  readonly maxStructure: number;
  readonly activeNpc: number;
  readonly activeMonster: number;
  readonly activeCreature: number;
  readonly activeItem: number;
  readonly activeStructure: number;
  readonly refillRateMicros: bigint;
  readonly lastRefillAt: bigint;
}

export interface SpawnRequest {
  readonly requestId: string;
  readonly worldId: string;
  readonly category: EntityCategory;
  readonly priority: SpawnPriority;
  readonly entityType: string;
  readonly count: number;
  readonly createdAt: bigint;
}

export interface SpawnQueue {
  readonly worldId: string;
  readonly requests: SpawnRequest[];
  readonly totalPending: number;
}

export interface BudgetReport {
  readonly worldId: string;
  readonly category: EntityCategory;
  readonly active: number;
  readonly max: number;
  readonly available: number;
  readonly utilizationPercent: number;
  readonly queueDepth: number;
}

export interface SpawnBudgetState {
  readonly budgets: Map<string, SpawnBudget>;
  readonly queues: Map<string, SpawnRequest[]>;
  readonly clock: Clock;
  readonly idGen: IdGenerator;
  readonly logger: Logger;
}

export type SpawnBudgetError =
  | 'budget-not-found'
  | 'world-not-found'
  | 'budget-exceeded'
  | 'invalid-count'
  | 'invalid-priority'
  | 'invalid-category'
  | 'request-not-found'
  | 'queue-empty'
  | 'invalid-refill-rate';

// --- Factory ---

export function createSpawnBudgetState(
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
): SpawnBudgetState {
  return {
    budgets: new Map(),
    queues: new Map(),
    clock,
    idGen,
    logger,
  };
}

// --- Core Functions ---

export function setBudget(
  state: SpawnBudgetState,
  worldId: string,
  maxNpc: number,
  maxMonster: number,
  maxCreature: number,
  maxItem: number,
  maxStructure: number,
  refillRateMicros: bigint,
): SpawnBudget | SpawnBudgetError {
  if (refillRateMicros <= 0n) {
    return 'invalid-refill-rate';
  }

  const now = state.clock.nowMicros();

  const existing = state.budgets.get(worldId);

  const budget: SpawnBudget = {
    worldId,
    maxNpc,
    maxMonster,
    maxCreature,
    maxItem,
    maxStructure,
    activeNpc: existing?.activeNpc || 0,
    activeMonster: existing?.activeMonster || 0,
    activeCreature: existing?.activeCreature || 0,
    activeItem: existing?.activeItem || 0,
    activeStructure: existing?.activeStructure || 0,
    refillRateMicros,
    lastRefillAt: now,
  };

  state.budgets.set(worldId, budget);
  state.logger.info('Set budget for world: ' + worldId);

  return budget;
}

export function requestSpawn(
  state: SpawnBudgetState,
  worldId: string,
  category: EntityCategory,
  priority: SpawnPriority,
  entityType: string,
  count: number,
): SpawnRequest | SpawnBudgetError {
  if (count <= 0) {
    return 'invalid-count';
  }

  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }

  const validation = validatePriority(priority);
  if (validation !== 'ok') {
    return validation;
  }

  const catValidation = validateCategory(category);
  if (catValidation !== 'ok') {
    return catValidation;
  }

  const requestId = state.idGen.nextId();
  const now = state.clock.nowMicros();

  const request: SpawnRequest = {
    requestId,
    worldId,
    category,
    priority,
    entityType,
    count,
    createdAt: now,
  };

  const queue = state.queues.get(worldId) || [];
  const inserted = insertByPriority(queue, request);

  state.queues.set(worldId, inserted);
  state.logger.info('Spawn request queued: ' + requestId);

  return request;
}

function validatePriority(priority: SpawnPriority): 'ok' | SpawnBudgetError {
  const valid: SpawnPriority[] = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'BACKGROUND'];
  if (!valid.includes(priority)) {
    return 'invalid-priority';
  }
  return 'ok';
}

function validateCategory(category: EntityCategory): 'ok' | SpawnBudgetError {
  const valid: EntityCategory[] = ['NPC', 'MONSTER', 'CREATURE', 'ITEM', 'STRUCTURE'];
  if (!valid.includes(category)) {
    return 'invalid-category';
  }
  return 'ok';
}

function insertByPriority(queue: SpawnRequest[], request: SpawnRequest): SpawnRequest[] {
  const priorityOrder: Record<SpawnPriority, number> = {
    CRITICAL: 0,
    HIGH: 1,
    NORMAL: 2,
    LOW: 3,
    BACKGROUND: 4,
  };

  const requestPriority = priorityOrder[request.priority];
  if (requestPriority === undefined) {
    return [...queue, request];
  }

  const newQueue = [...queue];
  let inserted = false;

  for (let i = 0; i < newQueue.length; i++) {
    const current = newQueue[i];
    if (current === undefined) continue;

    const currentPriority = priorityOrder[current.priority];
    if (currentPriority === undefined) continue;

    if (requestPriority < currentPriority) {
      newQueue.splice(i, 0, request);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    newQueue.push(request);
  }

  return newQueue;
}

export function recordDespawn(
  state: SpawnBudgetState,
  worldId: string,
  category: EntityCategory,
  count: number,
): 'ok' | SpawnBudgetError {
  if (count <= 0) {
    return 'invalid-count';
  }

  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }

  const catValidation = validateCategory(category);
  if (catValidation !== 'ok') {
    return catValidation;
  }

  const updated = decrementCategory(budget, category, count);
  state.budgets.set(worldId, updated);

  state.logger.info('Despawn recorded: ' + String(count) + ' ' + category + ' in ' + worldId);

  return 'ok';
}

function decrementCategory(
  budget: SpawnBudget,
  category: EntityCategory,
  count: number,
): SpawnBudget {
  const updated = { ...budget };

  if (category === 'NPC') {
    updated.activeNpc = Math.max(0, updated.activeNpc - count);
  } else if (category === 'MONSTER') {
    updated.activeMonster = Math.max(0, updated.activeMonster - count);
  } else if (category === 'CREATURE') {
    updated.activeCreature = Math.max(0, updated.activeCreature - count);
  } else if (category === 'ITEM') {
    updated.activeItem = Math.max(0, updated.activeItem - count);
  } else if (category === 'STRUCTURE') {
    updated.activeStructure = Math.max(0, updated.activeStructure - count);
  }

  return updated;
}

export function getBudgetReport(
  state: SpawnBudgetState,
  worldId: string,
  category: EntityCategory,
): BudgetReport | SpawnBudgetError {
  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }

  const catValidation = validateCategory(category);
  if (catValidation !== 'ok') {
    return catValidation;
  }

  const active = getActiveCount(budget, category);
  const max = getMaxCount(budget, category);
  const available = Math.max(0, max - active);
  const utilization = max > 0 ? (active / max) * 100 : 0;

  const queue = state.queues.get(worldId) || [];
  const queueDepth = queue.filter((r) => r.category === category).length;

  return {
    worldId,
    category,
    active,
    max,
    available,
    utilizationPercent: Math.round(utilization * 100) / 100,
    queueDepth,
  };
}

function getActiveCount(budget: SpawnBudget, category: EntityCategory): number {
  if (category === 'NPC') return budget.activeNpc;
  if (category === 'MONSTER') return budget.activeMonster;
  if (category === 'CREATURE') return budget.activeCreature;
  if (category === 'ITEM') return budget.activeItem;
  if (category === 'STRUCTURE') return budget.activeStructure;
  return 0;
}

function getMaxCount(budget: SpawnBudget, category: EntityCategory): number {
  if (category === 'NPC') return budget.maxNpc;
  if (category === 'MONSTER') return budget.maxMonster;
  if (category === 'CREATURE') return budget.maxCreature;
  if (category === 'ITEM') return budget.maxItem;
  if (category === 'STRUCTURE') return budget.maxStructure;
  return 0;
}

export function getQueueDepth(state: SpawnBudgetState, worldId: string): number | SpawnBudgetError {
  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }

  const queue = state.queues.get(worldId) || [];
  return queue.length;
}

export function processQueue(
  state: SpawnBudgetState,
  worldId: string,
  maxToProcess: number,
): SpawnRequest[] | SpawnBudgetError {
  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }

  const queue = state.queues.get(worldId) || [];
  if (queue.length === 0) {
    return [];
  }

  const processed: SpawnRequest[] = [];
  const remaining: SpawnRequest[] = [];

  let updatedBudget = budget;

  for (const request of queue) {
    if (processed.length >= maxToProcess) {
      remaining.push(request);
      continue;
    }

    const canSpawn = checkAvailability(updatedBudget, request.category, request.count);

    if (canSpawn) {
      updatedBudget = incrementCategory(updatedBudget, request.category, request.count);
      processed.push(request);
      state.logger.info('Processed spawn request: ' + request.requestId);
    } else {
      remaining.push(request);
    }
  }

  state.budgets.set(worldId, updatedBudget);
  state.queues.set(worldId, remaining);

  return processed;
}

function checkAvailability(budget: SpawnBudget, category: EntityCategory, count: number): boolean {
  const active = getActiveCount(budget, category);
  const max = getMaxCount(budget, category);
  return active + count <= max;
}

function incrementCategory(
  budget: SpawnBudget,
  category: EntityCategory,
  count: number,
): SpawnBudget {
  const updated = { ...budget };

  if (category === 'NPC') {
    updated.activeNpc = Math.min(updated.maxNpc, updated.activeNpc + count);
  } else if (category === 'MONSTER') {
    updated.activeMonster = Math.min(updated.maxMonster, updated.activeMonster + count);
  } else if (category === 'CREATURE') {
    updated.activeCreature = Math.min(updated.maxCreature, updated.activeCreature + count);
  } else if (category === 'ITEM') {
    updated.activeItem = Math.min(updated.maxItem, updated.activeItem + count);
  } else if (category === 'STRUCTURE') {
    updated.activeStructure = Math.min(updated.maxStructure, updated.activeStructure + count);
  }

  return updated;
}

export function emergencyPurge(
  state: SpawnBudgetState,
  worldId: string,
  category: EntityCategory,
  targetCount: number,
): number | SpawnBudgetError {
  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }

  const catValidation = validateCategory(category);
  if (catValidation !== 'ok') {
    return catValidation;
  }

  const active = getActiveCount(budget, category);
  const toPurge = Math.max(0, active - targetCount);

  if (toPurge === 0) {
    return 0;
  }

  const updated = decrementCategory(budget, category, toPurge);
  state.budgets.set(worldId, updated);

  state.logger.warn('Emergency purge: ' + String(toPurge) + ' ' + category + ' in ' + worldId);

  return toPurge;
}

export function refillBudgets(state: SpawnBudgetState, worldId: string): 'ok' | SpawnBudgetError {
  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }

  const now = state.clock.nowMicros();
  const elapsed = now - budget.lastRefillAt;

  if (elapsed < budget.refillRateMicros) {
    return 'ok';
  }

  const cycles = elapsed / budget.refillRateMicros;
  const refillAmount = Number(cycles);

  let updated = budget;

  updated = decrementCategory(updated, 'NPC', refillAmount);
  updated = decrementCategory(updated, 'MONSTER', refillAmount);
  updated = decrementCategory(updated, 'CREATURE', refillAmount);
  updated = decrementCategory(updated, 'ITEM', refillAmount);
  updated = decrementCategory(updated, 'STRUCTURE', refillAmount);

  updated = { ...updated, lastRefillAt: now };

  state.budgets.set(worldId, updated);
  state.logger.info('Refilled budgets for world: ' + worldId);

  return 'ok';
}

export function getAllReports(
  state: SpawnBudgetState,
  worldId: string,
): BudgetReport[] | SpawnBudgetError {
  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }

  const categories: EntityCategory[] = ['NPC', 'MONSTER', 'CREATURE', 'ITEM', 'STRUCTURE'];

  const reports: BudgetReport[] = [];

  for (const category of categories) {
    const report = getBudgetReport(state, worldId, category);
    if (typeof report !== 'string') {
      reports.push(report);
    }
  }

  return reports;
}

export function clearQueue(state: SpawnBudgetState, worldId: string): 'ok' | SpawnBudgetError {
  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }

  state.queues.set(worldId, []);
  state.logger.info('Cleared spawn queue for world: ' + worldId);

  return 'ok';
}

export function getQueueSnapshot(
  state: SpawnBudgetState,
  worldId: string,
): SpawnQueue | SpawnBudgetError {
  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }

  const requests = state.queues.get(worldId) || [];

  return {
    worldId,
    requests,
    totalPending: requests.length,
  };
}

export function cancelRequest(
  state: SpawnBudgetState,
  worldId: string,
  requestId: string,
): 'ok' | SpawnBudgetError {
  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }

  const queue = state.queues.get(worldId) || [];
  const index = queue.findIndex((r) => r.requestId === requestId);

  if (index === -1) {
    return 'request-not-found';
  }

  const updated = [...queue.slice(0, index), ...queue.slice(index + 1)];
  state.queues.set(worldId, updated);

  state.logger.info('Cancelled spawn request: ' + requestId);

  return 'ok';
}

export function getBudget(
  state: SpawnBudgetState,
  worldId: string,
): SpawnBudget | SpawnBudgetError {
  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }
  return budget;
}

export function incrementActiveCount(
  state: SpawnBudgetState,
  worldId: string,
  category: EntityCategory,
  count: number,
): 'ok' | SpawnBudgetError {
  if (count <= 0) {
    return 'invalid-count';
  }

  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }

  const catValidation = validateCategory(category);
  if (catValidation !== 'ok') {
    return catValidation;
  }

  const updated = incrementCategory(budget, category, count);
  state.budgets.set(worldId, updated);

  state.logger.info('Incremented active: ' + String(count) + ' ' + category + ' in ' + worldId);

  return 'ok';
}

export function getTotalActiveEntities(
  state: SpawnBudgetState,
  worldId: string,
): number | SpawnBudgetError {
  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }

  const total =
    budget.activeNpc +
    budget.activeMonster +
    budget.activeCreature +
    budget.activeItem +
    budget.activeStructure;

  return total;
}

export function getTotalMaxEntities(
  state: SpawnBudgetState,
  worldId: string,
): number | SpawnBudgetError {
  const budget = state.budgets.get(worldId);
  if (budget === undefined) {
    return 'budget-not-found';
  }

  const total =
    budget.maxNpc + budget.maxMonster + budget.maxCreature + budget.maxItem + budget.maxStructure;

  return total;
}
