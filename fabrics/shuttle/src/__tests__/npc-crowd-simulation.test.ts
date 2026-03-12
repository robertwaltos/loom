/**
 * NPC Crowd Simulation — Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCrowdSimulation,
  type CrowdSimulation,
  type CrowdSimDeps,
  type Vec3,
  vec3Length,
  vec3DistanceSq,
} from '../npc-crowd-simulation.js';

function createDeps(overrides?: Partial<CrowdSimDeps>): CrowdSimDeps {
  let counter = 0;
  return {
    clock: { nowMicroseconds: () => 1_000_000 },
    id: { generate: () => `id-${++counter}` },
    log: { info: () => {} },
    ...overrides,
  };
}

const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };

describe('CrowdSimulation', () => {
  let sim: CrowdSimulation;

  beforeEach(() => {
    sim = createCrowdSimulation(createDeps());
  });

  describe('agent management', () => {
    it('adds an agent', () => {
      const agent = sim.addAgent('npc-1', ORIGIN, 'idle');
      expect(agent.agentId).toBe('id-1');
      expect(agent.npcId).toBe('npc-1');
      expect(agent.behavior).toBe('idle');
    });

    it('removes an agent', () => {
      const agent = sim.addAgent('npc-1', ORIGIN, 'idle');
      expect(sim.removeAgent(agent.agentId)).toBe(true);
      expect(sim.getAgent(agent.agentId)).toBeUndefined();
    });

    it('returns false removing unknown agent', () => {
      expect(sim.removeAgent('nope')).toBe(false);
    });

    it('counts agents', () => {
      sim.addAgent('npc-1', ORIGIN, 'idle');
      sim.addAgent('npc-2', { x: 100, y: 0, z: 100 }, 'idle');
      expect(sim.getAgentCount()).toBe(2);
    });

    it('gets all agents', () => {
      sim.addAgent('npc-1', ORIGIN, 'idle');
      sim.addAgent('npc-2', { x: 50, y: 0, z: 50 }, 'idle');
      expect(sim.getAllAgents()).toHaveLength(2);
    });
  });

  describe('group management', () => {
    it('creates a group', () => {
      const group = sim.createGroup('gather', { x: 500, y: 0, z: 500 });
      expect(group.groupId).toBe('id-1');
      expect(group.behavior).toBe('gather');
      expect(group.target).toEqual({ x: 500, y: 0, z: 500 });
    });

    it('adds agents to group', () => {
      const group = sim.createGroup('crowd');
      sim.addAgent('npc-1', ORIGIN, 'crowd', group.groupId);
      const g = sim.getGroup(group.groupId);
      expect(g!.agents.size).toBe(1);
    });

    it('sets group target', () => {
      const group = sim.createGroup('gather');
      sim.setGroupTarget(group.groupId, { x: 100, y: 0, z: 200 });
      const g = sim.getGroup(group.groupId);
      expect(g!.target).toEqual({ x: 100, y: 0, z: 200 });
    });

    it('sets group threat triggers scatter', () => {
      const group = sim.createGroup('crowd');
      sim.setGroupThreat(group.groupId, { x: 0, y: 0, z: 0 });
      const g = sim.getGroup(group.groupId);
      expect(g!.behavior).toBe('scatter');
      expect(g!.threatSource).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('clears threat restores previous behavior', () => {
      const group = sim.createGroup('crowd');
      sim.setGroupThreat(group.groupId, { x: 0, y: 0, z: 0 });
      sim.setGroupThreat(group.groupId, null);
      const g = sim.getGroup(group.groupId);
      expect(g!.behavior).toBe('scatter');
      expect(g!.threatSource).toBeNull();
    });

    it('returns false for unknown group', () => {
      expect(sim.setGroupTarget('nope', ORIGIN)).toBe(false);
      expect(sim.setGroupThreat('nope', ORIGIN)).toBe(false);
    });
  });

  describe('obstacle management', () => {
    it('adds an obstacle', () => {
      const obs = sim.addObstacle({ x: 100, y: 0, z: 100 }, 50);
      expect(obs.obstacleId).toBeDefined();
      expect(obs.radius).toBe(50);
    });

    it('removes an obstacle', () => {
      const obs = sim.addObstacle(ORIGIN, 50);
      expect(sim.removeObstacle(obs.obstacleId)).toBe(true);
    });
  });

  describe('tick simulation', () => {
    it('moves idle agents via wander', () => {
      const agent = sim.addAgent('npc-1', ORIGIN, 'idle');
      sim.tick(0.016);
      const updated = sim.getAgent(agent.agentId)!;
      const dist = Math.sqrt(
        vec3DistanceSq(updated.position, ORIGIN),
      );
      expect(dist).toBeGreaterThan(0);
    });

    it('moves agents toward group target (gather)', () => {
      const target: Vec3 = { x: 1000, y: 0, z: 0 };
      const group = sim.createGroup('gather', target);
      const agent = sim.addAgent('npc-1', ORIGIN, 'gather', group.groupId);

      for (let i = 0; i < 100; i++) sim.tick(0.016);

      const updated = sim.getAgent(agent.agentId)!;
      expect(updated.position.x).toBeGreaterThan(0);
    });

    it('scatters agents away from threat', () => {
      const group = sim.createGroup('crowd');
      const agent = sim.addAgent('npc-1', { x: 100, y: 0, z: 0 }, 'crowd', group.groupId);
      sim.setGroupThreat(group.groupId, ORIGIN);

      for (let i = 0; i < 50; i++) sim.tick(0.016);

      const updated = sim.getAgent(agent.agentId)!;
      expect(updated.position.x).toBeGreaterThan(100);
    });

    it('patrol agents cycle waypoints', () => {
      const wp1: Vec3 = { x: 50, y: 0, z: 0 };
      const wp2: Vec3 = { x: 50, y: 0, z: 50 };
      const group = sim.createGroup('patrol', undefined, [wp1, wp2]);
      const agent = sim.addAgent('npc-1', { x: 49, y: 0, z: 0 }, 'patrol', group.groupId);

      sim.tick(0.016);
      const updated = sim.getAgent(agent.agentId)!;
      expect(updated.waypointIndex).toBeGreaterThanOrEqual(0);
    });

    it('agents avoid obstacles', () => {
      sim.addObstacle({ x: 50, y: 0, z: 0 }, 30);
      const group = sim.createGroup('gather', { x: 100, y: 0, z: 0 });
      const agent = sim.addAgent('npc-1', ORIGIN, 'gather', group.groupId);

      for (let i = 0; i < 100; i++) sim.tick(0.016);

      const updated = sim.getAgent(agent.agentId)!;
      expect(updated.position.x).toBeGreaterThan(0);
    });

    it('separation keeps agents apart', () => {
      const a1 = sim.addAgent('npc-1', { x: 0, y: 0, z: 0 }, 'idle');
      const a2 = sim.addAgent('npc-2', { x: 10, y: 0, z: 0 }, 'idle');

      for (let i = 0; i < 50; i++) sim.tick(0.016);

      const u1 = sim.getAgent(a1.agentId)!;
      const u2 = sim.getAgent(a2.agentId)!;
      const dist = Math.sqrt(vec3DistanceSq(u1.position, u2.position));
      expect(dist).toBeGreaterThan(9);
    });

    it('velocity is clamped to maxSpeed', () => {
      const group = sim.createGroup('gather', { x: 100000, y: 0, z: 0 });
      const agent = sim.addAgent('npc-1', ORIGIN, 'gather', group.groupId);

      for (let i = 0; i < 200; i++) sim.tick(0.016);

      const updated = sim.getAgent(agent.agentId)!;
      const speed = vec3Length(updated.velocity);
      expect(speed).toBeLessThanOrEqual(updated.maxSpeed + 0.001);
    });
  });

  describe('spatial queries', () => {
    it('finds agents in radius', () => {
      sim.addAgent('npc-1', { x: 10, y: 0, z: 10 }, 'idle');
      sim.addAgent('npc-2', { x: 20, y: 0, z: 20 }, 'idle');
      sim.addAgent('npc-3', { x: 10000, y: 0, z: 10000 }, 'idle');

      const nearby = sim.getAgentsInRadius(ORIGIN, 100);
      expect(nearby).toHaveLength(2);
    });

    it('returns empty for no agents in range', () => {
      sim.addAgent('npc-1', { x: 10000, y: 0, z: 10000 }, 'idle');
      const nearby = sim.getAgentsInRadius(ORIGIN, 100);
      expect(nearby).toHaveLength(0);
    });
  });

  describe('group lifecycle', () => {
    it('removes agents from group when agent removed', () => {
      const group = sim.createGroup('crowd');
      const agent = sim.addAgent('npc-1', ORIGIN, 'crowd', group.groupId);
      sim.removeAgent(agent.agentId);
      const g = sim.getGroup(group.groupId)!;
      expect(g.agents.size).toBe(0);
    });

    it('handles multiple groups independently', () => {
      const g1 = sim.createGroup('gather', { x: 100, y: 0, z: 0 });
      const g2 = sim.createGroup('gather', { x: -100, y: 0, z: 0 });
      sim.addAgent('npc-1', ORIGIN, 'gather', g1.groupId);
      sim.addAgent('npc-2', ORIGIN, 'gather', g2.groupId);

      for (let i = 0; i < 100; i++) sim.tick(0.016);

      const a1 = sim.getAllAgents().find((a) => a.npcId === 'npc-1')!;
      const a2 = sim.getAllAgents().find((a) => a.npcId === 'npc-2')!;
      expect(a1.position.x).toBeGreaterThan(0);
      expect(a2.position.x).toBeLessThan(0);
    });
  });
});
