/**
 * Lattice Repair
 *
 * Manages Lattice node damage tracking, repair crew assignment, and restoration priority.
 * The Lattice sustains damage from transit overload, wormhole collapses, and hostile actions.
 */

// Ports
export interface Clock {
  now(): bigint;
}

export interface IdGenerator {
  generate(): string;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// Types
export type DamageSeverity = 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

export interface LatticeNode {
  readonly id: string;
  readonly worldId: string;
  readonly capacity: bigint;
  health: bigint; // 0-100
  underRepair: boolean;
}

export interface DamageRecord {
  readonly id: string;
  readonly nodeId: string;
  readonly reportedAt: bigint;
  readonly severity: DamageSeverity;
  readonly damageAmount: bigint;
  readonly cause: string;
  repairedAt?: bigint;
}

export interface RepairCrew {
  readonly id: string;
  readonly name: string;
  available: boolean;
  currentNodeId?: string;
  totalRepairs: number;
}

export interface RepairAssignment {
  readonly crewId: string;
  readonly nodeId: string;
  readonly startedAt: bigint;
  readonly estimatedCompletion: bigint;
  progress: bigint; // 0-100
}

export interface RepairProgress {
  readonly nodeId: string;
  readonly crewId: string;
  readonly progress: bigint;
  readonly startedAt: bigint;
  readonly remainingTime: bigint;
}

export interface LatticeReport {
  readonly totalNodes: number;
  readonly healthyNodes: number;
  readonly damagedNodes: number;
  readonly criticalNodes: number;
  readonly averageHealth: bigint;
  readonly activeRepairs: number;
  readonly availableCrews: number;
}

export interface LatticeState {
  readonly nodes: Map<string, LatticeNode>;
  readonly damages: Map<string, DamageRecord>;
  readonly crews: Map<string, RepairCrew>;
  readonly assignments: Map<string, RepairAssignment>;
  readonly repairQueue: string[];
}

// Error types
export type LatticeError =
  | 'node-not-found'
  | 'crew-not-found'
  | 'damage-not-found'
  | 'assignment-not-found'
  | 'crew-unavailable'
  | 'node-already-repairing'
  | 'invalid-health'
  | 'invalid-progress'
  | 'already-exists';

// Factory
export function createLatticeState(): LatticeState {
  return {
    nodes: new Map(),
    damages: new Map(),
    crews: new Map(),
    assignments: new Map(),
    repairQueue: [],
  };
}

// Core Functions

export function registerNode(
  state: LatticeState,
  idGen: IdGenerator,
  logger: Logger,
  worldId: string,
  capacity: bigint,
): string | LatticeError {
  if (capacity <= 0n) {
    logger.error('Invalid capacity for node registration');
    return 'invalid-health';
  }

  const id = idGen.generate();

  const node: LatticeNode = {
    id,
    worldId,
    capacity,
    health: 100n,
    underRepair: false,
  };

  state.nodes.set(id, node);
  logger.info('Registered node: ' + id);

  return id;
}

export function registerCrew(
  state: LatticeState,
  idGen: IdGenerator,
  logger: Logger,
  name: string,
): string | LatticeError {
  const id = idGen.generate();

  const crew: RepairCrew = {
    id,
    name,
    available: true,
    totalRepairs: 0,
  };

  state.crews.set(id, crew);
  logger.info('Registered repair crew: ' + name);

  return id;
}

export function reportDamage(
  state: LatticeState,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
  nodeId: string,
  damageAmount: bigint,
  cause: string,
): string | LatticeError {
  const node = state.nodes.get(nodeId);
  if (node === undefined) {
    logger.error('Node not found for damage report: ' + nodeId);
    return 'node-not-found';
  }

  if (damageAmount <= 0n) {
    logger.error('Invalid damage amount');
    return 'invalid-health';
  }

  const newHealth = node.health - damageAmount;
  node.health = newHealth < 0n ? 0n : newHealth;

  const severity = calculateSeverity(damageAmount, node.health);
  const damageId = idGen.generate();

  const record: DamageRecord = {
    id: damageId,
    nodeId,
    reportedAt: clock.now(),
    severity,
    damageAmount,
    cause,
  };

  state.damages.set(damageId, record);

  addToRepairQueue(state, nodeId, severity);

  logger.warn('Damage reported on node ' + nodeId + ': ' + severity);

  return damageId;
}

function calculateSeverity(damageAmount: bigint, remainingHealth: bigint): DamageSeverity {
  if (remainingHealth < 25n) return 'CRITICAL';
  if (remainingHealth < 50n) return 'SEVERE';
  if (damageAmount >= 30n) return 'SEVERE';
  if (damageAmount >= 15n) return 'MODERATE';
  return 'MINOR';
}

function addToRepairQueue(state: LatticeState, nodeId: string, severity: DamageSeverity): void {
  const exists = state.repairQueue.indexOf(nodeId) !== -1;
  if (exists) return;

  if (severity === 'CRITICAL') {
    state.repairQueue.unshift(nodeId);
  } else if (severity === 'SEVERE') {
    const firstNonCritical = findFirstNonCriticalIndex(state);
    state.repairQueue.splice(firstNonCritical, 0, nodeId);
  } else {
    state.repairQueue.push(nodeId);
  }
}

function findFirstNonCriticalIndex(state: LatticeState): number {
  for (let i = 0; i < state.repairQueue.length; i = i + 1) {
    const nodeId = state.repairQueue[i];
    if (nodeId === undefined) continue;

    const node = state.nodes.get(nodeId);
    if (node === undefined) continue;

    if (node.health >= 25n) return i;
  }

  return state.repairQueue.length;
}

export function assignCrew(
  state: LatticeState,
  clock: Clock,
  logger: Logger,
  crewId: string,
  nodeId: string,
): 'success' | LatticeError {
  const crew = state.crews.get(crewId);
  if (crew === undefined) {
    logger.error('Crew not found: ' + crewId);
    return 'crew-not-found';
  }

  const node = state.nodes.get(nodeId);
  if (node === undefined) {
    logger.error('Node not found: ' + nodeId);
    return 'node-not-found';
  }

  if (crew.available === false) {
    logger.error('Crew not available: ' + crewId);
    return 'crew-unavailable';
  }

  if (node.underRepair === true) {
    logger.error('Node already under repair: ' + nodeId);
    return 'node-already-repairing';
  }

  crew.available = false;
  crew.currentNodeId = nodeId;
  node.underRepair = true;

  const repairTime = calculateRepairTime(node.health);
  const now = clock.now();

  const assignment: RepairAssignment = {
    crewId,
    nodeId,
    startedAt: now,
    estimatedCompletion: now + repairTime,
    progress: 0n,
  };

  state.assignments.set(nodeId, assignment);

  removeFromRepairQueue(state, nodeId);

  logger.info('Assigned crew ' + crewId + ' to node ' + nodeId);

  return 'success';
}

function calculateRepairTime(health: bigint): bigint {
  const damagePct = 100n - health;
  return damagePct * 1000n;
}

function removeFromRepairQueue(state: LatticeState, nodeId: string): void {
  const index = state.repairQueue.indexOf(nodeId);
  if (index !== -1) {
    state.repairQueue.splice(index, 1);
  }
}

export function progressRepair(
  state: LatticeState,
  clock: Clock,
  logger: Logger,
  nodeId: string,
  progressDelta: bigint,
): 'success' | 'complete' | LatticeError {
  const assignment = state.assignments.get(nodeId);
  if (assignment === undefined) {
    return 'assignment-not-found';
  }

  if (progressDelta < 0n) {
    logger.error('Invalid progress delta');
    return 'invalid-progress';
  }

  const newProgress = assignment.progress + progressDelta;
  assignment.progress = newProgress > 100n ? 100n : newProgress;

  if (assignment.progress >= 100n) {
    completeRepair(state, clock, logger, nodeId);
    return 'complete';
  }

  return 'success';
}

export function completeRepair(
  state: LatticeState,
  clock: Clock,
  logger: Logger,
  nodeId: string,
): 'success' | LatticeError {
  const assignment = state.assignments.get(nodeId);
  if (assignment === undefined) {
    return 'assignment-not-found';
  }

  const node = state.nodes.get(nodeId);
  if (node === undefined) {
    return 'node-not-found';
  }

  const crew = state.crews.get(assignment.crewId);
  if (crew === undefined) {
    return 'crew-not-found';
  }

  node.health = 100n;
  node.underRepair = false;

  crew.available = true;
  crew.currentNodeId = undefined;
  crew.totalRepairs = crew.totalRepairs + 1;

  markDamagesRepaired(state, clock, nodeId);

  state.assignments.delete(nodeId);

  logger.info('Completed repair on node: ' + nodeId);

  return 'success';
}

function markDamagesRepaired(state: LatticeState, clock: Clock, nodeId: string): void {
  const now = clock.now();
  const damages = state.damages.values();

  for (const damage of damages) {
    if (damage.nodeId === nodeId && damage.repairedAt === undefined) {
      damage.repairedAt = now;
    }
  }
}

export function getRepairQueue(state: LatticeState): readonly string[] {
  return [...state.repairQueue];
}

export function getRepairProgress(
  state: LatticeState,
  clock: Clock,
  nodeId: string,
): RepairProgress | LatticeError {
  const assignment = state.assignments.get(nodeId);
  if (assignment === undefined) {
    return 'assignment-not-found';
  }

  const elapsed = clock.now() - assignment.startedAt;
  const total = assignment.estimatedCompletion - assignment.startedAt;
  const remaining = total - elapsed;

  return {
    nodeId,
    crewId: assignment.crewId,
    progress: assignment.progress,
    startedAt: assignment.startedAt,
    remainingTime: remaining > 0n ? remaining : 0n,
  };
}

export function getLatticeReport(state: LatticeState): LatticeReport {
  let healthyNodes = 0;
  let damagedNodes = 0;
  let criticalNodes = 0;
  let totalHealth = 0n;

  const nodes = state.nodes.values();

  for (const node of nodes) {
    totalHealth = totalHealth + node.health;

    if (node.health === 100n) {
      healthyNodes = healthyNodes + 1;
    } else if (node.health < 25n) {
      criticalNodes = criticalNodes + 1;
    } else {
      damagedNodes = damagedNodes + 1;
    }
  }

  const totalNodes = state.nodes.size;
  const averageHealth = totalNodes > 0 ? totalHealth / BigInt(totalNodes) : 0n;

  const availableCrews = countAvailableCrews(state);

  return {
    totalNodes,
    healthyNodes,
    damagedNodes,
    criticalNodes,
    averageHealth,
    activeRepairs: state.assignments.size,
    availableCrews,
  };
}

function countAvailableCrews(state: LatticeState): number {
  let count = 0;
  const crews = state.crews.values();

  for (const crew of crews) {
    if (crew.available === true) {
      count = count + 1;
    }
  }

  return count;
}

export function emergencyRepair(state: LatticeState, clock: Clock, logger: Logger): number {
  let repaired = 0;
  const criticalNodes = getCriticalNodes(state);

  for (let i = 0; i < criticalNodes.length; i = i + 1) {
    const node = criticalNodes[i];
    if (node === undefined) continue;

    const crew = findAvailableCrew(state);
    if (crew === undefined) break;

    const result = assignCrew(state, clock, logger, crew.id, node.id);
    if (result === 'success') {
      repaired = repaired + 1;
    }
  }

  logger.warn('Emergency repair: assigned ' + String(repaired) + ' crews');
  return repaired;
}

function getCriticalNodes(state: LatticeState): LatticeNode[] {
  const results: LatticeNode[] = [];
  const nodes = state.nodes.values();

  for (const node of nodes) {
    if (node.health < 25n && node.underRepair === false) {
      results.push(node);
    }
  }

  return results;
}

function findAvailableCrew(state: LatticeState): RepairCrew | undefined {
  const crews = state.crews.values();

  for (const crew of crews) {
    if (crew.available === true) {
      return crew;
    }
  }

  return undefined;
}

export function getNode(state: LatticeState, nodeId: string): LatticeNode | LatticeError {
  const node = state.nodes.get(nodeId);
  if (node === undefined) {
    return 'node-not-found';
  }
  return node;
}

export function getCrew(state: LatticeState, crewId: string): RepairCrew | LatticeError {
  const crew = state.crews.get(crewId);
  if (crew === undefined) {
    return 'crew-not-found';
  }
  return crew;
}

export function getDamageRecord(
  state: LatticeState,
  damageId: string,
): DamageRecord | LatticeError {
  const damage = state.damages.get(damageId);
  if (damage === undefined) {
    return 'damage-not-found';
  }
  return damage;
}

export function getAllNodes(state: LatticeState): readonly LatticeNode[] {
  return Array.from(state.nodes.values());
}

export function getAllCrews(state: LatticeState): readonly RepairCrew[] {
  return Array.from(state.crews.values());
}

export function getDamagesForNode(state: LatticeState, nodeId: string): readonly DamageRecord[] {
  const results: DamageRecord[] = [];
  const damages = state.damages.values();

  for (const damage of damages) {
    if (damage.nodeId === nodeId) {
      results.push(damage);
    }
  }

  return results;
}

export function getUnrepairedDamages(state: LatticeState): readonly DamageRecord[] {
  const results: DamageRecord[] = [];
  const damages = state.damages.values();

  for (const damage of damages) {
    if (damage.repairedAt === undefined) {
      results.push(damage);
    }
  }

  return results;
}

export function getNodesForWorld(state: LatticeState, worldId: string): readonly LatticeNode[] {
  const results: LatticeNode[] = [];
  const nodes = state.nodes.values();

  for (const node of nodes) {
    if (node.worldId === worldId) {
      results.push(node);
    }
  }

  return results;
}

export function getDamagedNodes(state: LatticeState): readonly LatticeNode[] {
  const results: LatticeNode[] = [];
  const nodes = state.nodes.values();

  for (const node of nodes) {
    if (node.health < 100n) {
      results.push(node);
    }
  }

  return results;
}

export function getActiveRepairs(state: LatticeState): readonly RepairAssignment[] {
  return Array.from(state.assignments.values());
}

export function getCrewAssignment(
  state: LatticeState,
  crewId: string,
): RepairAssignment | LatticeError {
  const assignments = state.assignments.values();

  for (const assignment of assignments) {
    if (assignment.crewId === crewId) {
      return assignment;
    }
  }

  return 'assignment-not-found';
}

export function releaseCrewFromNode(
  state: LatticeState,
  logger: Logger,
  nodeId: string,
): 'success' | LatticeError {
  const assignment = state.assignments.get(nodeId);
  if (assignment === undefined) {
    return 'assignment-not-found';
  }

  const crew = state.crews.get(assignment.crewId);
  if (crew === undefined) {
    return 'crew-not-found';
  }

  const node = state.nodes.get(nodeId);
  if (node === undefined) {
    return 'node-not-found';
  }

  crew.available = true;
  crew.currentNodeId = undefined;
  node.underRepair = false;

  state.assignments.delete(nodeId);

  addToRepairQueue(state, nodeId, calculateSeverity(0n, node.health));

  logger.info('Released crew from node: ' + nodeId);

  return 'success';
}

export function getNodeCount(state: LatticeState): number {
  return state.nodes.size;
}

export function getCrewCount(state: LatticeState): number {
  return state.crews.size;
}

export function getDamageCount(state: LatticeState): number {
  return state.damages.size;
}

export function getRepairQueueLength(state: LatticeState): number {
  return state.repairQueue.length;
}

export function forceCompleteRepair(
  state: LatticeState,
  clock: Clock,
  logger: Logger,
  nodeId: string,
): 'success' | LatticeError {
  const assignment = state.assignments.get(nodeId);
  if (assignment === undefined) {
    return 'assignment-not-found';
  }

  assignment.progress = 100n;

  return completeRepair(state, clock, logger, nodeId);
}

export function getTopCrews(state: LatticeState, limit: number): readonly RepairCrew[] {
  const crews = Array.from(state.crews.values());

  crews.sort((a, b) => {
    if (a.totalRepairs > b.totalRepairs) return -1;
    if (a.totalRepairs < b.totalRepairs) return 1;
    return 0;
  });

  return crews.slice(0, limit);
}

export function batchProgressRepairs(
  state: LatticeState,
  clock: Clock,
  logger: Logger,
  progressDelta: bigint,
): number {
  let completed = 0;
  const assignments = Array.from(state.assignments.keys());

  for (let i = 0; i < assignments.length; i = i + 1) {
    const nodeId = assignments[i];
    if (nodeId === undefined) continue;

    const result = progressRepair(state, clock, logger, nodeId, progressDelta);

    if (result === 'complete') {
      completed = completed + 1;
    }
  }

  return completed;
}

export function getWorldHealth(state: LatticeState, worldId: string): bigint {
  const nodes = getNodesForWorld(state, worldId);
  if (nodes.length === 0) return 100n;

  let totalHealth = 0n;

  for (let i = 0; i < nodes.length; i = i + 1) {
    const node = nodes[i];
    if (node === undefined) continue;
    totalHealth = totalHealth + node.health;
  }

  return totalHealth / BigInt(nodes.length);
}

export function autoAssignCrews(state: LatticeState, clock: Clock, logger: Logger): number {
  let assigned = 0;
  const queue = getRepairQueue(state);

  for (let i = 0; i < queue.length; i = i + 1) {
    const nodeId = queue[i];
    if (nodeId === undefined) continue;

    const crew = findAvailableCrew(state);
    if (crew === undefined) break;

    const result = assignCrew(state, clock, logger, crew.id, nodeId);
    if (result === 'success') {
      assigned = assigned + 1;
    }
  }

  return assigned;
}
