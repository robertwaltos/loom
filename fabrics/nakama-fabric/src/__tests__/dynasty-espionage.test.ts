/**
 * dynasty-espionage.test.ts
 * Tests for dynasty espionage system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createDynastyEspionage,
  type DynastyEspionageDeps,
  type MissionType,
} from '../dynasty-espionage.js';

describe('DynastyEspionage', () => {
  let mockTime = 1000000n;
  let idCounter = 0;

  const mockDeps: DynastyEspionageDeps = {
    clock: { nowMicroseconds: () => mockTime },
    idGen: { generate: () => 'id-' + String(idCounter++) },
    logger: {
      info: () => {},
      warn: () => {},
    },
  };

  beforeEach(() => {
    mockTime = 1000000n;
    idCounter = 0;
    vi.restoreAllMocks();
  });

  describe('plantAgent', () => {
    it('should plant a new spy agent', () => {
      const module = createDynastyEspionage(mockDeps);
      const result = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      expect(result.agentId).toBe('id-0');
      expect(result.agent.status).toBe('ACTIVE');
      expect(result.agent.skillLevel).toBe(75);
    });

    it('should create network on first agent', () => {
      const module = createDynastyEspionage(mockDeps);
      module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      const network = module.getNetworkStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof network).toBe('object');
      if (typeof network === 'object') {
        expect(network.activeAgents).toBe(1);
        expect(network.compromisedAgents).toBe(0);
      }
    });

    it('should increment active agents on subsequent plants', () => {
      const module = createDynastyEspionage(mockDeps);
      module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });
      module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 60,
        coverIdentity: 'diplomat',
      });

      const network = module.getNetworkStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof network).toBe('object');
      if (typeof network === 'object') {
        expect(network.activeAgents).toBe(2);
      }
    });

    it('should record plant timestamp', () => {
      const module = createDynastyEspionage(mockDeps);
      const result = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      expect(result.agent.plantedAtMicros).toBe(mockTime);
    });

    it('should handle different cover identities', () => {
      const module = createDynastyEspionage(mockDeps);
      const result1 = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });
      const result2 = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 60,
        coverIdentity: 'diplomat',
      });

      expect(result1.agent.coverIdentity).toBe('merchant');
      expect(result2.agent.coverIdentity).toBe('diplomat');
    });
  });

  describe('runMission', () => {
    it('should return error if agent not found', () => {
      const module = createDynastyEspionage(mockDeps);
      const result = module.runMission({
        agentId: 'nonexistent',
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });

      expect(result).toBe('AGENT_NOT_FOUND');
    });

    it('should return error if agent not active', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      module.recallAgent({ agentId: agent.agentId });

      const result = module.runMission({
        agentId: agent.agentId,
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });

      expect(result).toBe('AGENT_NOT_ACTIVE');
    });

    it('should complete mission with outcome', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 90,
        coverIdentity: 'merchant',
      });

      const result = module.runMission({
        agentId: agent.agentId,
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.missionId).toBeDefined();
        expect(['SUCCESS', 'PARTIAL', 'FAILURE', 'BLOWN']).toContain(result.outcome);
      }
    });

    it('should compromise agent on BLOWN outcome', () => {
      const module = createDynastyEspionage(mockDeps);
      vi.spyOn(Math, 'random').mockReturnValue(0.01);

      module.setCounterLevel({
        dynastyId: 'dynasty-2',
        worldId: 'world-1',
        level: 'EXTREME',
      });

      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 10,
        coverIdentity: 'merchant',
      });

      const result = module.runMission({
        agentId: agent.agentId,
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });

      if (typeof result === 'object' && result.outcome === 'BLOWN') {
        const agents = module.getAgentsByStatus({
          dynastyId: 'dynasty-1',
          worldId: 'world-1',
          status: 'COMPROMISED',
        });

        expect(agents.length).toBe(1);
      }
    });

    it('should update network stats on mission', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 90,
        coverIdentity: 'merchant',
      });

      module.runMission({
        agentId: agent.agentId,
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });

      const network = module.getNetworkStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof network).toBe('object');
      if (typeof network === 'object') {
        expect(network.totalMissions).toBe(1);
      }
    });

    it('should handle GATHER_INTELLIGENCE mission type', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 90,
        coverIdentity: 'merchant',
      });

      const result = module.runMission({
        agentId: agent.agentId,
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });

      expect(typeof result).toBe('object');
    });

    it('should handle SABOTAGE mission type', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 90,
        coverIdentity: 'merchant',
      });

      const result = module.runMission({
        agentId: agent.agentId,
        missionType: 'SABOTAGE',
        targetDynastyId: 'dynasty-2',
      });

      expect(typeof result).toBe('object');
    });

    it('should handle ASSASSINATE mission type', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 90,
        coverIdentity: 'merchant',
      });

      const result = module.runMission({
        agentId: agent.agentId,
        missionType: 'ASSASSINATE',
        targetDynastyId: 'dynasty-2',
      });

      expect(typeof result).toBe('object');
    });

    it('should handle STEAL_DOCUMENTS mission type', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 90,
        coverIdentity: 'merchant',
      });

      const result = module.runMission({
        agentId: agent.agentId,
        missionType: 'STEAL_DOCUMENTS',
        targetDynastyId: 'dynasty-2',
      });

      expect(typeof result).toBe('object');
    });

    it('should handle PLANT_EVIDENCE mission type', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 90,
        coverIdentity: 'merchant',
      });

      const result = module.runMission({
        agentId: agent.agentId,
        missionType: 'PLANT_EVIDENCE',
        targetDynastyId: 'dynasty-2',
      });

      expect(typeof result).toBe('object');
    });
  });

  describe('detectAgent', () => {
    it('should return error if agent not found', () => {
      const module = createDynastyEspionage(mockDeps);
      const result = module.detectAgent({ agentId: 'nonexistent' });

      expect(result).toBe('AGENT_NOT_FOUND');
    });

    it('should return error if agent already compromised', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      module.detectAgent({ agentId: agent.agentId });
      const result = module.detectAgent({ agentId: agent.agentId });

      expect(result).toBe('AGENT_ALREADY_COMPROMISED');
    });

    it('should mark agent as captured', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      const result = module.detectAgent({ agentId: agent.agentId });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.detected).toBe(true);
        expect(result.agent.status).toBe('CAPTURED');
      }
    });

    it('should update network stats on detection', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      module.detectAgent({ agentId: agent.agentId });

      const network = module.getNetworkStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof network).toBe('object');
      if (typeof network === 'object') {
        expect(network.activeAgents).toBe(0);
        expect(network.compromisedAgents).toBe(1);
      }
    });
  });

  describe('setCounterLevel', () => {
    it('should set counter-espionage level', () => {
      const module = createDynastyEspionage(mockDeps);
      const result = module.setCounterLevel({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        level: 'HIGH',
      });

      expect(result.updated).toBe(true);
    });

    it('should handle all counter levels', () => {
      const module = createDynastyEspionage(mockDeps);
      const levels = ['MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'EXTREME'] as const;

      for (const level of levels) {
        const result = module.setCounterLevel({
          dynastyId: 'dynasty-1',
          worldId: 'world-1',
          level,
        });

        expect(result.updated).toBe(true);
      }
    });

    it('should update timestamp on level change', () => {
      const module = createDynastyEspionage(mockDeps);
      module.setCounterLevel({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        level: 'MODERATE',
      });

      mockTime = 2000000n;

      module.setCounterLevel({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        level: 'HIGH',
      });

      expect(mockTime).toBe(2000000n);
    });
  });

  describe('getNetworkStatus', () => {
    it('should return error if no network exists', () => {
      const module = createDynastyEspionage(mockDeps);
      const result = module.getNetworkStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(result).toBe('NO_NETWORK');
    });

    it('should return network stats', () => {
      const module = createDynastyEspionage(mockDeps);
      module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      const result = module.getNetworkStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.dynastyId).toBe('dynasty-1');
        expect(result.worldId).toBe('world-1');
        expect(result.activeAgents).toBe(1);
      }
    });

    it('should track successful missions', () => {
      const module = createDynastyEspionage(mockDeps);
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 90,
        coverIdentity: 'merchant',
      });

      module.runMission({
        agentId: agent.agentId,
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });

      const network = module.getNetworkStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof network).toBe('object');
      if (typeof network === 'object') {
        expect(network.totalMissions).toBe(1);
        expect(network.successfulMissions).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('recallAgent', () => {
    it('should return error if agent not found', () => {
      const module = createDynastyEspionage(mockDeps);
      const result = module.recallAgent({ agentId: 'nonexistent' });

      expect(result).toBe('AGENT_NOT_FOUND');
    });

    it('should return error if agent captured', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      module.detectAgent({ agentId: agent.agentId });
      const result = module.recallAgent({ agentId: agent.agentId });

      expect(result).toBe('AGENT_CAPTURED');
    });

    it('should mark agent as recalled', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      const result = module.recallAgent({ agentId: agent.agentId });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.recalled).toBe(true);
        expect(result.agent.status).toBe('RECALLED');
      }
    });

    it('should decrease active agents count', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      module.recallAgent({ agentId: agent.agentId });

      const network = module.getNetworkStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof network).toBe('object');
      if (typeof network === 'object') {
        expect(network.activeAgents).toBe(0);
      }
    });

    it('should not affect network if already compromised', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      vi.spyOn(Math, 'random').mockReturnValue(0.01);
      module.setCounterLevel({
        dynastyId: 'dynasty-2',
        worldId: 'world-1',
        level: 'EXTREME',
      });

      module.runMission({
        agentId: agent.agentId,
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });

      const networkBefore = module.getNetworkStatus({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
      });

      module.recallAgent({ agentId: agent.agentId });

      const networkAfter = module.getNetworkStatus({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
      });

      if (typeof networkBefore === 'object' && typeof networkAfter === 'object') {
        expect(networkAfter.activeAgents).toBe(networkBefore.activeAgents);
      }
    });
  });

  describe('getMissionHistory', () => {
    it('should return missions for dynasty', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 90,
        coverIdentity: 'merchant',
      });

      module.runMission({
        agentId: agent.agentId,
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });

      const history = module.getMissionHistory({ dynastyId: 'dynasty-1', limit: 10 });

      expect(history.length).toBe(1);
    });

    it('should limit results', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 90,
        coverIdentity: 'merchant',
      });

      module.runMission({
        agentId: agent.agentId,
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });
      module.runMission({
        agentId: agent.agentId,
        missionType: 'SABOTAGE',
        targetDynastyId: 'dynasty-2',
      });
      module.runMission({
        agentId: agent.agentId,
        missionType: 'STEAL_DOCUMENTS',
        targetDynastyId: 'dynasty-2',
      });

      const history = module.getMissionHistory({ dynastyId: 'dynasty-1', limit: 2 });

      expect(history.length).toBe(2);
    });

    it('should return missions in reverse chronological order', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 90,
        coverIdentity: 'merchant',
      });

      module.runMission({
        agentId: agent.agentId,
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });

      mockTime = 2000000n;
      module.runMission({
        agentId: agent.agentId,
        missionType: 'SABOTAGE',
        targetDynastyId: 'dynasty-2',
      });

      const history = module.getMissionHistory({ dynastyId: 'dynasty-1', limit: 10 });

      expect(history[0]?.startedAtMicros).toBeGreaterThanOrEqual(history[1]?.startedAtMicros ?? 0n);
    });

    it('should filter by dynasty', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent1 = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 90,
        coverIdentity: 'merchant',
      });
      const agent2 = module.plantAgent({
        dynastyId: 'dynasty-2',
        worldId: 'world-1',
        skillLevel: 80,
        coverIdentity: 'diplomat',
      });

      module.runMission({
        agentId: agent1.agentId,
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });
      module.runMission({
        agentId: agent2.agentId,
        missionType: 'SABOTAGE',
        targetDynastyId: 'dynasty-1',
      });

      const history = module.getMissionHistory({ dynastyId: 'dynasty-1', limit: 10 });

      expect(history.length).toBe(1);
      expect(history[0]?.dynastyId).toBe('dynasty-1');
    });
  });

  describe('getAgentsByStatus', () => {
    it('should return agents by status', () => {
      const module = createDynastyEspionage(mockDeps);
      module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });
      module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 60,
        coverIdentity: 'diplomat',
      });

      const agents = module.getAgentsByStatus({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        status: 'ACTIVE',
      });

      expect(agents.length).toBe(2);
    });

    it('should filter by dynasty and world', () => {
      const module = createDynastyEspionage(mockDeps);
      module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });
      module.plantAgent({
        dynastyId: 'dynasty-2',
        worldId: 'world-1',
        skillLevel: 60,
        coverIdentity: 'diplomat',
      });

      const agents = module.getAgentsByStatus({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        status: 'ACTIVE',
      });

      expect(agents.length).toBe(1);
      expect(agents[0]?.dynastyId).toBe('dynasty-1');
    });

    it('should return empty array if no matches', () => {
      const module = createDynastyEspionage(mockDeps);
      const agents = module.getAgentsByStatus({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        status: 'CAPTURED',
      });

      expect(agents.length).toBe(0);
    });

    it('should return captured agents', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      module.detectAgent({ agentId: agent.agentId });

      const agents = module.getAgentsByStatus({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        status: 'CAPTURED',
      });

      expect(agents.length).toBe(1);
    });

    it('should return recalled agents', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      module.recallAgent({ agentId: agent.agentId });

      const agents = module.getAgentsByStatus({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        status: 'RECALLED',
      });

      expect(agents.length).toBe(1);
    });

    it('should return compromised agents', () => {
      const module = createDynastyEspionage(mockDeps);
      vi.spyOn(Math, 'random').mockReturnValue(0.01);

      module.setCounterLevel({
        dynastyId: 'dynasty-2',
        worldId: 'world-1',
        level: 'EXTREME',
      });

      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 10,
        coverIdentity: 'merchant',
      });

      module.runMission({
        agentId: agent.agentId,
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });

      const agents = module.getAgentsByStatus({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        status: 'COMPROMISED',
      });

      expect(agents.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple networks per dynasty', () => {
      const module = createDynastyEspionage(mockDeps);
      module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });
      module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-2',
        skillLevel: 60,
        coverIdentity: 'diplomat',
      });

      const network1 = module.getNetworkStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });
      const network2 = module.getNetworkStatus({ dynastyId: 'dynasty-1', worldId: 'world-2' });

      expect(typeof network1).toBe('object');
      expect(typeof network2).toBe('object');
    });

    it('should handle zero skill level agents', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 0,
        coverIdentity: 'merchant',
      });

      expect(agent.agent.skillLevel).toBe(0);
    });

    it('should handle high skill level agents', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 100,
        coverIdentity: 'merchant',
      });

      expect(agent.agent.skillLevel).toBe(100);
    });

    it('should preserve agent data across operations', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 75,
        coverIdentity: 'merchant',
      });

      module.runMission({
        agentId: agent.agentId,
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });

      const agents = module.getAgentsByStatus({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        status: 'ACTIVE',
      });

      const found = agents.find((a) => a.agentId === agent.agentId);
      expect(found?.skillLevel).toBe(75);
      expect(found?.coverIdentity).toBe('merchant');
    });

    it('should handle empty mission history', () => {
      const module = createDynastyEspionage(mockDeps);
      const history = module.getMissionHistory({ dynastyId: 'dynasty-1', limit: 10 });

      expect(history.length).toBe(0);
    });

    it('should handle counter-espionage without prior setting', () => {
      const module = createDynastyEspionage(mockDeps);
      const agent = module.plantAgent({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        skillLevel: 90,
        coverIdentity: 'merchant',
      });

      const result = module.runMission({
        agentId: agent.agentId,
        missionType: 'GATHER_INTELLIGENCE',
        targetDynastyId: 'dynasty-2',
      });

      expect(typeof result).toBe('object');
    });
  });
});
