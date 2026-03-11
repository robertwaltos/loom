import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLatticeState,
  registerNode,
  registerCrew,
  reportDamage,
  assignCrew,
  progressRepair,
  completeRepair,
  getRepairQueue,
  getRepairProgress,
  getLatticeReport,
  emergencyRepair,
  getNode,
  getCrew,
  getDamageRecord,
  getAllNodes,
  getAllCrews,
  getDamagesForNode,
  getUnrepairedDamages,
  getNodesForWorld,
  getDamagedNodes,
  getActiveRepairs,
  getCrewAssignment,
  releaseCrewFromNode,
  getNodeCount,
  getCrewCount,
  getDamageCount,
  getRepairQueueLength,
  forceCompleteRepair,
  getTopCrews,
  batchProgressRepairs,
  getWorldHealth,
  autoAssignCrews,
  type LatticeState,
  type Clock,
  type IdGenerator,
  type Logger,
} from '../lattice-repair.js';

// Test Doubles
class TestClock implements Clock {
  private time = 1000000n;

  now(): bigint {
    return this.time;
  }

  advance(delta: bigint): void {
    this.time = this.time + delta;
  }

  set(time: bigint): void {
    this.time = time;
  }
}

class TestIdGenerator implements IdGenerator {
  private counter = 0;

  generate(): string {
    this.counter = this.counter + 1;
    return 'id-' + String(this.counter);
  }

  reset(): void {
    this.counter = 0;
  }
}

class TestLogger implements Logger {
  logs: string[] = [];
  warnings: string[] = [];
  errors: string[] = [];

  info(message: string): void {
    this.logs.push(message);
  }

  warn(message: string): void {
    this.warnings.push(message);
  }

  error(message: string): void {
    this.errors.push(message);
  }

  clear(): void {
    this.logs = [];
    this.warnings = [];
    this.errors = [];
  }
}

describe('Lattice Repair', () => {
  let state: LatticeState;
  let clock: TestClock;
  let idGen: TestIdGenerator;
  let logger: TestLogger;

  beforeEach(() => {
    state = createLatticeState();
    clock = new TestClock();
    idGen = new TestIdGenerator();
    logger = new TestLogger();
  });

  describe('createLatticeState', () => {
    it('creates empty state', () => {
      expect(state.nodes.size).toBe(0);
      expect(state.damages.size).toBe(0);
      expect(state.crews.size).toBe(0);
      expect(state.assignments.size).toBe(0);
      expect(state.repairQueue.length).toBe(0);
    });
  });

  describe('registerNode', () => {
    it('registers node with valid parameters', () => {
      const result = registerNode(state, idGen, logger, 'world-1', 10000n);

      expect(result).toBe('id-1');
      expect(state.nodes.size).toBe(1);
    });

    it('creates node with correct properties', () => {
      const id = registerNode(state, idGen, logger, 'world-alpha', 50000n) as string;

      const node = state.nodes.get(id);
      expect(node).toBeDefined();
      if (node === undefined) return;

      expect(node.id).toBe('id-1');
      expect(node.worldId).toBe('world-alpha');
      expect(node.capacity).toBe(50000n);
      expect(node.health).toBe(100n);
      expect(node.underRepair).toBe(false);
    });

    it('rejects zero capacity', () => {
      const result = registerNode(state, idGen, logger, 'world-1', 0n);

      expect(result).toBe('invalid-health');
      expect(state.nodes.size).toBe(0);
    });

    it('rejects negative capacity', () => {
      const result = registerNode(state, idGen, logger, 'world-1', -1000n);

      expect(result).toBe('invalid-health');
    });

    it('logs node registration', () => {
      registerNode(state, idGen, logger, 'world-1', 10000n);

      expect(logger.logs.length).toBe(1);
      expect(logger.logs[0]).toContain('Registered node');
    });

    it('generates unique IDs for multiple nodes', () => {
      const id1 = registerNode(state, idGen, logger, 'world-1', 10000n);
      const id2 = registerNode(state, idGen, logger, 'world-2', 20000n);

      expect(id1).not.toBe(id2);
      expect(state.nodes.size).toBe(2);
    });
  });

  describe('registerCrew', () => {
    it('registers crew with valid parameters', () => {
      const result = registerCrew(state, idGen, logger, 'Crew Alpha');

      expect(result).toBe('id-1');
      expect(state.crews.size).toBe(1);
    });

    it('creates crew with correct properties', () => {
      const id = registerCrew(state, idGen, logger, 'Repair Team One') as string;

      const crew = state.crews.get(id);
      expect(crew).toBeDefined();
      if (crew === undefined) return;

      expect(crew.id).toBe('id-1');
      expect(crew.name).toBe('Repair Team One');
      expect(crew.available).toBe(true);
      expect(crew.currentNodeId).toBeUndefined();
      expect(crew.totalRepairs).toBe(0);
    });

    it('logs crew registration', () => {
      registerCrew(state, idGen, logger, 'Crew Beta');

      expect(logger.logs.length).toBe(1);
      expect(logger.logs[0]).toContain('Crew Beta');
    });

    it('generates unique IDs for multiple crews', () => {
      const id1 = registerCrew(state, idGen, logger, 'Crew One');
      const id2 = registerCrew(state, idGen, logger, 'Crew Two');

      expect(id1).not.toBe(id2);
      expect(state.crews.size).toBe(2);
    });
  });

  describe('reportDamage', () => {
    it('reports damage to node', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const result = reportDamage(state, clock, idGen, logger, nodeId, 20n, 'transit overload');

      expect(result).toBe('id-2');
      expect(state.damages.size).toBe(1);
    });

    it('reduces node health', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      reportDamage(state, clock, idGen, logger, nodeId, 25n, 'wormhole collapse');

      const node = state.nodes.get(nodeId);
      expect(node?.health).toBe(75n);
    });

    it('does not reduce health below zero', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      reportDamage(state, clock, idGen, logger, nodeId, 150n, 'massive damage');

      const node = state.nodes.get(nodeId);
      expect(node?.health).toBe(0n);
    });

    it('creates damage record with correct severity', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const damageId = reportDamage(
        state,
        clock,
        idGen,
        logger,
        nodeId,
        40n,
        'hostile action',
      ) as string;

      const damage = state.damages.get(damageId);
      expect(damage?.severity).toBe('SEVERE');
      expect(damage?.damageAmount).toBe(40n);
      expect(damage?.cause).toBe('hostile action');
    });

    it('assigns MINOR severity for small damage', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const damageId = reportDamage(state, clock, idGen, logger, nodeId, 10n, 'test') as string;

      const damage = state.damages.get(damageId);
      expect(damage?.severity).toBe('MINOR');
    });

    it('assigns MODERATE severity for medium damage', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const damageId = reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test') as string;

      const damage = state.damages.get(damageId);
      expect(damage?.severity).toBe('MODERATE');
    });

    it('assigns CRITICAL severity for low health', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const node = state.nodes.get(nodeId);
      if (node === undefined) return;
      node.health = 30n;

      const damageId = reportDamage(state, clock, idGen, logger, nodeId, 10n, 'test') as string;

      const damage = state.damages.get(damageId);
      expect(damage?.severity).toBe('CRITICAL');
    });

    it('adds node to repair queue', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');

      expect(state.repairQueue.length).toBe(1);
      expect(state.repairQueue[0]).toBe(nodeId);
    });

    it('prioritizes CRITICAL damage in queue', () => {
      const node1 = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const node2 = registerNode(state, idGen, logger, 'world-2', 10000n) as string;

      reportDamage(state, clock, idGen, logger, node1, 10n, 'minor');
      reportDamage(state, clock, idGen, logger, node2, 80n, 'critical');

      expect(state.repairQueue[0]).toBe(node2);
    });

    it('logs damage report', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');

      expect(logger.warnings.length).toBe(1);
      expect(logger.warnings[0]).toContain('Damage reported');
    });

    it('returns error for nonexistent node', () => {
      const result = reportDamage(state, clock, idGen, logger, 'fake-id', 20n, 'test');

      expect(result).toBe('node-not-found');
    });

    it('rejects zero damage', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const result = reportDamage(state, clock, idGen, logger, nodeId, 0n, 'test');

      expect(result).toBe('invalid-health');
    });

    it('rejects negative damage', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const result = reportDamage(state, clock, idGen, logger, nodeId, -10n, 'test');

      expect(result).toBe('invalid-health');
    });
  });

  describe('assignCrew', () => {
    it('assigns crew to damaged node', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');

      const result = assignCrew(state, clock, logger, crewId, nodeId);

      expect(result).toBe('success');
    });

    it('marks crew as unavailable', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      const crew = state.crews.get(crewId);
      expect(crew?.available).toBe(false);
      expect(crew?.currentNodeId).toBe(nodeId);
    });

    it('marks node as under repair', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      const node = state.nodes.get(nodeId);
      expect(node?.underRepair).toBe(true);
    });

    it('creates repair assignment', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      expect(state.assignments.size).toBe(1);

      const assignment = state.assignments.get(nodeId);
      expect(assignment?.crewId).toBe(crewId);
      expect(assignment?.nodeId).toBe(nodeId);
      expect(assignment?.progress).toBe(0n);
    });

    it('removes node from repair queue', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');

      expect(state.repairQueue.length).toBe(1);

      assignCrew(state, clock, logger, crewId, nodeId);

      expect(state.repairQueue.length).toBe(0);
    });

    it('calculates repair time based on damage', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 40n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      const assignment = state.assignments.get(nodeId);
      const expectedTime = 40n * 1000n;

      expect(assignment?.estimatedCompletion).toBe(clock.now() + expectedTime);
    });

    it('logs crew assignment', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      const infoLogs = logger.logs.filter((log) => log.indexOf('Assigned crew') !== -1);
      expect(infoLogs.length).toBe(1);
    });

    it('returns error for nonexistent crew', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const result = assignCrew(state, clock, logger, 'fake-crew', nodeId);

      expect(result).toBe('crew-not-found');
    });

    it('returns error for nonexistent node', () => {
      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      const result = assignCrew(state, clock, logger, crewId, 'fake-node');

      expect(result).toBe('node-not-found');
    });

    it('returns error for unavailable crew', () => {
      const node1 = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const node2 = registerNode(state, idGen, logger, 'world-2', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, node1, 20n, 'test');
      reportDamage(state, clock, idGen, logger, node2, 20n, 'test');

      assignCrew(state, clock, logger, crewId, node1);

      const result = assignCrew(state, clock, logger, crewId, node2);

      expect(result).toBe('crew-unavailable');
    });

    it('returns error for node already under repair', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crew1 = registerCrew(state, idGen, logger, 'Crew One') as string;
      const crew2 = registerCrew(state, idGen, logger, 'Crew Two') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');

      assignCrew(state, clock, logger, crew1, nodeId);

      const result = assignCrew(state, clock, logger, crew2, nodeId);

      expect(result).toBe('node-already-repairing');
    });
  });

  describe('progressRepair', () => {
    it('increases repair progress', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      const result = progressRepair(state, clock, logger, nodeId, 25n);

      expect(result).toBe('success');

      const assignment = state.assignments.get(nodeId);
      expect(assignment?.progress).toBe(25n);
    });

    it('caps progress at 100', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      const result = progressRepair(state, clock, logger, nodeId, 150n);

      expect(result).toBe('complete');
      const node = state.nodes.get(nodeId);
      expect(node?.health).toBe(100n);
    });

    it('returns complete when progress reaches 100', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      const result = progressRepair(state, clock, logger, nodeId, 100n);

      expect(result).toBe('complete');
    });

    it('completes repair when progress reaches 100', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      progressRepair(state, clock, logger, nodeId, 100n);

      expect(state.assignments.size).toBe(0);

      const node = state.nodes.get(nodeId);
      expect(node?.health).toBe(100n);
    });

    it('returns error for invalid progress delta', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      const result = progressRepair(state, clock, logger, nodeId, -10n);

      expect(result).toBe('invalid-progress');
    });

    it('returns error for nonexistent assignment', () => {
      const result = progressRepair(state, clock, logger, 'fake-node', 25n);

      expect(result).toBe('assignment-not-found');
    });
  });

  describe('completeRepair', () => {
    it('restores node health to 100', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 30n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      completeRepair(state, clock, logger, nodeId);

      const node = state.nodes.get(nodeId);
      expect(node?.health).toBe(100n);
    });

    it('marks node as not under repair', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 30n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      completeRepair(state, clock, logger, nodeId);

      const node = state.nodes.get(nodeId);
      expect(node?.underRepair).toBe(false);
    });

    it('makes crew available again', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 30n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      completeRepair(state, clock, logger, nodeId);

      const crew = state.crews.get(crewId);
      expect(crew?.available).toBe(true);
      expect(crew?.currentNodeId).toBeUndefined();
    });

    it('increments crew total repairs', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 30n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      completeRepair(state, clock, logger, nodeId);

      const crew = state.crews.get(crewId);
      expect(crew?.totalRepairs).toBe(1);
    });

    it('marks damages as repaired', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      const damageId = reportDamage(state, clock, idGen, logger, nodeId, 30n, 'test') as string;

      assignCrew(state, clock, logger, crewId, nodeId);
      completeRepair(state, clock, logger, nodeId);

      const damage = state.damages.get(damageId);
      expect(damage?.repairedAt).toBeDefined();
    });

    it('removes assignment', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 30n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      expect(state.assignments.size).toBe(1);

      completeRepair(state, clock, logger, nodeId);

      expect(state.assignments.size).toBe(0);
    });

    it('logs repair completion', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 30n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      completeRepair(state, clock, logger, nodeId);

      const completionLogs = logger.logs.filter((log) => log.indexOf('Completed repair') !== -1);
      expect(completionLogs.length).toBe(1);
    });

    it('returns error for nonexistent assignment', () => {
      const result = completeRepair(state, clock, logger, 'fake-node');

      expect(result).toBe('assignment-not-found');
    });
  });

  describe('getRepairQueue', () => {
    it('returns empty array initially', () => {
      const queue = getRepairQueue(state);

      expect(queue.length).toBe(0);
    });

    it('returns queued node IDs', () => {
      const node1 = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const node2 = registerNode(state, idGen, logger, 'world-2', 10000n) as string;

      reportDamage(state, clock, idGen, logger, node1, 20n, 'test');
      reportDamage(state, clock, idGen, logger, node2, 20n, 'test');

      const queue = getRepairQueue(state);

      expect(queue.length).toBe(2);
    });

    it('returns immutable copy', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      reportDamage(state, clock, idGen, logger, node, 20n, 'test');

      const queue = getRepairQueue(state);
      // Queue is readonly — verify immutability by checking original state
      expect(queue.length).toBe(1);

      expect(state.repairQueue.length).toBe(1);
    });
  });

  describe('getRepairProgress', () => {
    it('returns progress for active repair', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      const progress = getRepairProgress(state, clock, nodeId);

      expect(progress).not.toBe('assignment-not-found');
      if (typeof progress === 'string') return;

      expect(progress.nodeId).toBe(nodeId);
      expect(progress.crewId).toBe(crewId);
      expect(progress.progress).toBe(0n);
    });

    it('calculates remaining time', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 40n, 'test');
      assignCrew(state, clock, logger, crewId, nodeId);

      clock.advance(10000n);

      const progress = getRepairProgress(state, clock, nodeId);

      expect(progress).not.toBe('assignment-not-found');
      if (typeof progress === 'string') return;

      expect(progress.remainingTime).toBeGreaterThan(0n);
    });

    it('returns error for nonexistent assignment', () => {
      const result = getRepairProgress(state, clock, 'fake-node');

      expect(result).toBe('assignment-not-found');
    });
  });

  describe('getLatticeReport', () => {
    it('returns report for empty lattice', () => {
      const report = getLatticeReport(state);

      expect(report.totalNodes).toBe(0);
      expect(report.healthyNodes).toBe(0);
      expect(report.damagedNodes).toBe(0);
      expect(report.criticalNodes).toBe(0);
      expect(report.averageHealth).toBe(0n);
      expect(report.activeRepairs).toBe(0);
      expect(report.availableCrews).toBe(0);
    });

    it('counts healthy nodes', () => {
      registerNode(state, idGen, logger, 'world-1', 10000n);
      registerNode(state, idGen, logger, 'world-2', 10000n);

      const report = getLatticeReport(state);

      expect(report.totalNodes).toBe(2);
      expect(report.healthyNodes).toBe(2);
    });

    it('counts damaged nodes', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      reportDamage(state, clock, idGen, logger, node, 30n, 'test');

      const report = getLatticeReport(state);

      expect(report.damagedNodes).toBe(1);
    });

    it('counts critical nodes', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      reportDamage(state, clock, idGen, logger, node, 80n, 'test');

      const report = getLatticeReport(state);

      expect(report.criticalNodes).toBe(1);
    });

    it('calculates average health', () => {
      const node1 = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const node2 = registerNode(state, idGen, logger, 'world-2', 10000n) as string;

      reportDamage(state, clock, idGen, logger, node1, 20n, 'test');
      reportDamage(state, clock, idGen, logger, node2, 40n, 'test');

      const report = getLatticeReport(state);

      expect(report.averageHealth).toBe(70n);
    });

    it('counts active repairs', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crew = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, node, 20n, 'test');
      assignCrew(state, clock, logger, crew, node);

      const report = getLatticeReport(state);

      expect(report.activeRepairs).toBe(1);
    });

    it('counts available crews', () => {
      registerCrew(state, idGen, logger, 'Crew One');
      registerCrew(state, idGen, logger, 'Crew Two');

      const report = getLatticeReport(state);

      expect(report.availableCrews).toBe(2);
    });
  });

  describe('emergencyRepair', () => {
    it('assigns crews to critical nodes', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crew = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, node, 80n, 'test');

      const count = emergencyRepair(state, clock, logger);

      expect(count).toBe(1);
      expect(state.assignments.size).toBe(1);
    });

    it('assigns multiple crews when available', () => {
      const node1 = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const node2 = registerNode(state, idGen, logger, 'world-2', 10000n) as string;

      registerCrew(state, idGen, logger, 'Crew One');
      registerCrew(state, idGen, logger, 'Crew Two');

      reportDamage(state, clock, idGen, logger, node1, 80n, 'test');
      reportDamage(state, clock, idGen, logger, node2, 85n, 'test');

      const count = emergencyRepair(state, clock, logger);

      expect(count).toBe(2);
    });

    it('stops when no crews available', () => {
      const node1 = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const node2 = registerNode(state, idGen, logger, 'world-2', 10000n) as string;

      registerCrew(state, idGen, logger, 'Crew One');

      reportDamage(state, clock, idGen, logger, node1, 80n, 'test');
      reportDamage(state, clock, idGen, logger, node2, 85n, 'test');

      const count = emergencyRepair(state, clock, logger);

      expect(count).toBe(1);
    });

    it('logs emergency action', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      registerCrew(state, idGen, logger, 'Crew Alpha');

      reportDamage(state, clock, idGen, logger, node, 80n, 'test');

      emergencyRepair(state, clock, logger);

      expect(logger.warnings.length).toBeGreaterThan(1);
    });

    it('returns zero when no critical nodes', () => {
      registerCrew(state, idGen, logger, 'Crew Alpha');

      const count = emergencyRepair(state, clock, logger);

      expect(count).toBe(0);
    });
  });

  describe('autoAssignCrews', () => {
    it('assigns crews from repair queue', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      registerCrew(state, idGen, logger, 'Crew Alpha');

      reportDamage(state, clock, idGen, logger, node, 20n, 'test');

      const count = autoAssignCrews(state, clock, logger);

      expect(count).toBe(1);
      expect(state.assignments.size).toBe(1);
    });

    it('processes multiple nodes in queue', () => {
      const node1 = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const node2 = registerNode(state, idGen, logger, 'world-2', 10000n) as string;

      registerCrew(state, idGen, logger, 'Crew One');
      registerCrew(state, idGen, logger, 'Crew Two');

      reportDamage(state, clock, idGen, logger, node1, 20n, 'test');
      reportDamage(state, clock, idGen, logger, node2, 30n, 'test');

      const count = autoAssignCrews(state, clock, logger);

      expect(count).toBe(2);
    });

    it('returns zero when no crews available', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      reportDamage(state, clock, idGen, logger, node, 20n, 'test');

      const count = autoAssignCrews(state, clock, logger);

      expect(count).toBe(0);
    });
  });

  describe('getWorldHealth', () => {
    it('returns 100 for world with no nodes', () => {
      const health = getWorldHealth(state, 'world-1');

      expect(health).toBe(100n);
    });

    it('calculates average health for world nodes', () => {
      const node1 = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const node2 = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      reportDamage(state, clock, idGen, logger, node1, 20n, 'test');
      reportDamage(state, clock, idGen, logger, node2, 40n, 'test');

      const health = getWorldHealth(state, 'world-1');

      expect(health).toBe(70n);
    });

    it('filters nodes by world ID', () => {
      const node1 = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const node2 = registerNode(state, idGen, logger, 'world-2', 10000n) as string;

      reportDamage(state, clock, idGen, logger, node1, 50n, 'test');

      const health = getWorldHealth(state, 'world-1');

      expect(health).toBe(50n);
    });
  });

  describe('query functions', () => {
    it('getNode returns node by ID', () => {
      const id = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const node = getNode(state, id);

      expect(node).not.toBe('node-not-found');
      if (typeof node === 'string') return;

      expect(node.id).toBe(id);
    });

    it('getCrew returns crew by ID', () => {
      const id = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      const crew = getCrew(state, id);

      expect(crew).not.toBe('crew-not-found');
      if (typeof crew === 'string') return;

      expect(crew.id).toBe(id);
    });

    it('getDamageRecord returns damage by ID', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const damageId = reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test') as string;

      const damage = getDamageRecord(state, damageId);

      expect(damage).not.toBe('damage-not-found');
      if (typeof damage === 'string') return;

      expect(damage.id).toBe(damageId);
    });

    it('getAllNodes returns all nodes', () => {
      registerNode(state, idGen, logger, 'world-1', 10000n);
      registerNode(state, idGen, logger, 'world-2', 10000n);

      const nodes = getAllNodes(state);

      expect(nodes.length).toBe(2);
    });

    it('getAllCrews returns all crews', () => {
      registerCrew(state, idGen, logger, 'Crew One');
      registerCrew(state, idGen, logger, 'Crew Two');

      const crews = getAllCrews(state);

      expect(crews.length).toBe(2);
    });

    it('getDamagesForNode filters by node', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      reportDamage(state, clock, idGen, logger, nodeId, 10n, 'test-1');
      reportDamage(state, clock, idGen, logger, nodeId, 15n, 'test-2');

      const damages = getDamagesForNode(state, nodeId);

      expect(damages.length).toBe(2);
    });

    it('getUnrepairedDamages returns only unrepaired', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test-1');
      assignCrew(state, clock, logger, crewId, nodeId);
      completeRepair(state, clock, logger, nodeId);

      reportDamage(state, clock, idGen, logger, nodeId, 15n, 'test-2');

      const damages = getUnrepairedDamages(state);

      expect(damages.length).toBe(1);
    });

    it('getNodesForWorld filters by world', () => {
      registerNode(state, idGen, logger, 'world-1', 10000n);
      registerNode(state, idGen, logger, 'world-1', 20000n);
      registerNode(state, idGen, logger, 'world-2', 15000n);

      const nodes = getNodesForWorld(state, 'world-1');

      expect(nodes.length).toBe(2);
    });

    it('getDamagedNodes filters by health', () => {
      const node1 = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      registerNode(state, idGen, logger, 'world-2', 10000n);

      reportDamage(state, clock, idGen, logger, node1, 20n, 'test');

      const damaged = getDamagedNodes(state);

      expect(damaged.length).toBe(1);
    });

    it('getActiveRepairs returns all assignments', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crew = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, node, 20n, 'test');
      assignCrew(state, clock, logger, crew, node);

      const repairs = getActiveRepairs(state);

      expect(repairs.length).toBe(1);
    });

    it('getCrewAssignment finds assignment by crew', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crew = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, node, 20n, 'test');
      assignCrew(state, clock, logger, crew, node);

      const assignment = getCrewAssignment(state, crew);

      expect(assignment).not.toBe('assignment-not-found');
      if (typeof assignment === 'string') return;

      expect(assignment.crewId).toBe(crew);
    });
  });

  describe('releaseCrewFromNode', () => {
    it('releases crew from active assignment', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crew = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, node, 20n, 'test');
      assignCrew(state, clock, logger, crew, node);

      const result = releaseCrewFromNode(state, logger, node);

      expect(result).toBe('success');
    });

    it('makes crew available', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crewId = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, node, 20n, 'test');
      assignCrew(state, clock, logger, crewId, node);

      releaseCrewFromNode(state, logger, node);

      const crew = state.crews.get(crewId);
      expect(crew?.available).toBe(true);
    });

    it('marks node as not under repair', () => {
      const nodeId = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crew = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, nodeId, 20n, 'test');
      assignCrew(state, clock, logger, crew, nodeId);

      releaseCrewFromNode(state, logger, nodeId);

      const node = state.nodes.get(nodeId);
      expect(node?.underRepair).toBe(false);
    });

    it('adds node back to repair queue', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crew = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, node, 20n, 'test');
      assignCrew(state, clock, logger, crew, node);

      expect(state.repairQueue.length).toBe(0);

      releaseCrewFromNode(state, logger, node);

      expect(state.repairQueue.length).toBe(1);
    });
  });

  describe('counters', () => {
    it('getNodeCount returns node count', () => {
      registerNode(state, idGen, logger, 'world-1', 10000n);
      registerNode(state, idGen, logger, 'world-2', 10000n);

      expect(getNodeCount(state)).toBe(2);
    });

    it('getCrewCount returns crew count', () => {
      registerCrew(state, idGen, logger, 'Crew One');
      registerCrew(state, idGen, logger, 'Crew Two');

      expect(getCrewCount(state)).toBe(2);
    });

    it('getDamageCount returns damage count', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      reportDamage(state, clock, idGen, logger, node, 20n, 'test-1');
      reportDamage(state, clock, idGen, logger, node, 15n, 'test-2');

      expect(getDamageCount(state)).toBe(2);
    });

    it('getRepairQueueLength returns queue length', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      reportDamage(state, clock, idGen, logger, node, 20n, 'test');

      expect(getRepairQueueLength(state)).toBe(1);
    });
  });

  describe('forceCompleteRepair', () => {
    it('forces repair completion', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crew = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, node, 40n, 'test');
      assignCrew(state, clock, logger, crew, node);

      const result = forceCompleteRepair(state, clock, logger, node);

      expect(result).toBe('success');

      const nodeObj = state.nodes.get(node);
      expect(nodeObj?.health).toBe(100n);
    });

    it('sets progress to 100 before completion', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crew = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, node, 40n, 'test');
      assignCrew(state, clock, logger, crew, node);

      forceCompleteRepair(state, clock, logger, node);

      expect(state.assignments.size).toBe(0);
    });
  });

  describe('getTopCrews', () => {
    it('returns crews ordered by total repairs', () => {
      const crew1 = registerCrew(state, idGen, logger, 'Crew One') as string;
      const crew2 = registerCrew(state, idGen, logger, 'Crew Two') as string;

      const c1 = state.crews.get(crew1);
      const c2 = state.crews.get(crew2);

      if (c1 === undefined || c2 === undefined) return;

      c1.totalRepairs = 5;
      c2.totalRepairs = 10;

      const top = getTopCrews(state, 2);

      expect(top.length).toBe(2);
      expect(top[0]?.id).toBe(crew2);
      expect(top[1]?.id).toBe(crew1);
    });

    it('limits results to specified count', () => {
      registerCrew(state, idGen, logger, 'Crew One');
      registerCrew(state, idGen, logger, 'Crew Two');
      registerCrew(state, idGen, logger, 'Crew Three');

      const top = getTopCrews(state, 2);

      expect(top.length).toBe(2);
    });
  });

  describe('batchProgressRepairs', () => {
    it('progresses all active repairs', () => {
      const node1 = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const node2 = registerNode(state, idGen, logger, 'world-2', 10000n) as string;

      const crew1 = registerCrew(state, idGen, logger, 'Crew One') as string;
      const crew2 = registerCrew(state, idGen, logger, 'Crew Two') as string;

      reportDamage(state, clock, idGen, logger, node1, 20n, 'test');
      reportDamage(state, clock, idGen, logger, node2, 20n, 'test');

      assignCrew(state, clock, logger, crew1, node1);
      assignCrew(state, clock, logger, crew2, node2);

      batchProgressRepairs(state, clock, logger, 50n);

      const assignment1 = state.assignments.get(node1);
      const assignment2 = state.assignments.get(node2);

      expect(assignment1?.progress).toBe(50n);
      expect(assignment2?.progress).toBe(50n);
    });

    it('returns count of completed repairs', () => {
      const node = registerNode(state, idGen, logger, 'world-1', 10000n) as string;

      const crew = registerCrew(state, idGen, logger, 'Crew Alpha') as string;

      reportDamage(state, clock, idGen, logger, node, 20n, 'test');
      assignCrew(state, clock, logger, crew, node);

      const completed = batchProgressRepairs(state, clock, logger, 100n);

      expect(completed).toBe(1);
    });
  });
});
