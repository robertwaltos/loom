import { describe, expect, it } from 'vitest';
import {
  createLatticeState,
  registerNode,
  registerCrew,
  reportDamage,
  assignCrew,
  progressRepair,
  getNode,
} from '../lattice-repair.js';

function makePorts() {
  let i = 0;
  return {
    clock: { now: () => 1_000_000n },
    id: { generate: () => `id-${++i}` },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  };
}

describe('lattice-repair simulation', () => {
  it('routes a damaged node through queue, assignment, and completion', () => {
    const state = createLatticeState();
    const { clock, id, logger } = makePorts();

    const nodeId = registerNode(state, id, logger, 'world-1', 50_000n);
    const crewId = registerCrew(state, id, logger, 'Crew A');
    expect(typeof nodeId).toBe('string');
    expect(typeof crewId).toBe('string');
    if (typeof nodeId !== 'string' || typeof crewId !== 'string') return;

    reportDamage(state, clock, id, logger, nodeId, 35n, 'transit overload');
    expect(assignCrew(state, clock, logger, crewId, nodeId)).toBe('success');
    expect(progressRepair(state, clock, logger, nodeId, 100n)).toBe('complete');
    expect(getNode(state, nodeId)?.health).toBe(100n);
  });
});
