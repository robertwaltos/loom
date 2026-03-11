/**
 * political-influence.test.ts
 * Tests for political influence system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPoliticalInfluence,
  type PoliticalInfluenceDeps,
  type InfluenceTarget,
} from '../political-influence.js';

describe('PoliticalInfluence', () => {
  let mockTime = 1000000n;
  let idCounter = 0;

  const mockDeps: PoliticalInfluenceDeps = {
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
  });

  describe('addCapital', () => {
    it('should initialize political capital for new dynasty-world pair', () => {
      const module = createPoliticalInfluence(mockDeps);
      const result = module.addCapital({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        amount: 5_000_000n,
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.capital.currentCapital).toBe(5_000_000n);
        expect(result.capital.maxCapital).toBe(10_000_000n);
        expect(result.eventId).toBe('id-0');
      }
    });

    it('should add capital to existing record', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 1_000_000n });
      const result = module.addCapital({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        amount: 2_000_000n,
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.capital.currentCapital).toBe(3_000_000n);
      }
    });

    it('should cap capital at max limit', () => {
      const module = createPoliticalInfluence(mockDeps);
      const result = module.addCapital({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        amount: 15_000_000n,
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.capital.currentCapital).toBe(10_000_000n);
      }
    });

    it('should update lastTickMicros when adding capital', () => {
      const module = createPoliticalInfluence(mockDeps);
      const result = module.addCapital({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        amount: 1_000_000n,
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.capital.lastTickMicros).toBe(mockTime);
      }
    });

    it('should generate event on capital add', () => {
      const module = createPoliticalInfluence(mockDeps);
      const result = module.addCapital({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        amount: 500_000n,
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.eventId).toBeDefined();
      }
    });
  });

  describe('spendInfluence', () => {
    it('should spend capital on SWAY_VOTE action', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const target: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };

      const result = module.spendInfluence({
        dynastyId: 'dynasty-1',
        action: 'SWAY_VOTE',
        target,
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.success).toBe(true);
        expect(result.actionId).toBeDefined();
      }
    });

    it('should return error if no capital record exists', () => {
      const module = createPoliticalInfluence(mockDeps);
      const target: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };

      const result = module.spendInfluence({
        dynastyId: 'dynasty-1',
        action: 'SWAY_VOTE',
        target,
      });

      expect(result).toBe('NO_CAPITAL_RECORD');
    });

    it('should return error if insufficient capital', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 100_000n });

      const target: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };

      const result = module.spendInfluence({
        dynastyId: 'dynasty-1',
        action: 'SWAY_VOTE',
        target,
      });

      expect(result).toBe('INSUFFICIENT_CAPITAL');
    });

    it('should deduct correct amount for SWAY_VOTE', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const target: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };

      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'SWAY_VOTE', target });

      const status = module.getCapitalStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });
      expect(typeof status).toBe('object');
      if (typeof status === 'object') {
        expect(status.currentCapital).toBe(4_500_000n);
      }
    });

    it('should deduct correct amount for BLOCK_LEGISLATION', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const target: InfluenceTarget = {
        targetType: 'LEGISLATION',
        targetId: 'law-1',
        worldId: 'world-1',
      };

      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'BLOCK_LEGISLATION', target });

      const status = module.getCapitalStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });
      expect(typeof status).toBe('object');
      if (typeof status === 'object') {
        expect(status.currentCapital).toBe(4_000_000n);
      }
    });

    it('should deduct correct amount for SECURE_ALLIANCE', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const target: InfluenceTarget = {
        targetType: 'DYNASTY',
        targetId: 'dynasty-2',
        worldId: 'world-1',
      };

      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'SECURE_ALLIANCE', target });

      const status = module.getCapitalStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });
      expect(typeof status).toBe('object');
      if (typeof status === 'object') {
        expect(status.currentCapital).toBe(4_250_000n);
      }
    });

    it('should deduct correct amount for DISCREDIT_RIVAL', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const target: InfluenceTarget = {
        targetType: 'DYNASTY',
        targetId: 'dynasty-2',
        worldId: 'world-1',
      };

      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'DISCREDIT_RIVAL', target });

      const status = module.getCapitalStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });
      expect(typeof status).toBe('object');
      if (typeof status === 'object') {
        expect(status.currentCapital).toBe(4_400_000n);
      }
    });

    it('should handle multiple actions in sequence', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const target1: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };
      const target2: InfluenceTarget = {
        targetType: 'DYNASTY',
        targetId: 'dynasty-2',
        worldId: 'world-1',
      };

      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'SWAY_VOTE', target: target1 });
      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'DISCREDIT_RIVAL', target: target2 });

      const status = module.getCapitalStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });
      expect(typeof status).toBe('object');
      if (typeof status === 'object') {
        expect(status.currentCapital).toBe(3_900_000n);
      }
    });
  });

  describe('regenerateCapital', () => {
    it('should regenerate capital by regen rate', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 1_000_000n });

      const result = module.regenerateCapital({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.newCapital).toBe(1_000_100n);
        expect(result.regenAmount).toBe(100n);
      }
    });

    it('should not exceed max capital on regen', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 9_999_950n });

      const result = module.regenerateCapital({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.newCapital).toBe(10_000_000n);
      }
    });

    it('should return error if no capital record', () => {
      const module = createPoliticalInfluence(mockDeps);
      const result = module.regenerateCapital({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(result).toBe('NO_CAPITAL_RECORD');
    });

    it('should update lastTickMicros on regen', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 1_000_000n });

      mockTime = 2000000n;
      module.regenerateCapital({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      const status = module.getCapitalStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });
      expect(typeof status).toBe('object');
      if (typeof status === 'object') {
        expect(status.lastTickMicros).toBe(2000000n);
      }
    });

    it('should handle multiple regen ticks', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 1_000_000n });

      module.regenerateCapital({ dynastyId: 'dynasty-1', worldId: 'world-1' });
      module.regenerateCapital({ dynastyId: 'dynasty-1', worldId: 'world-1' });
      module.regenerateCapital({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      const status = module.getCapitalStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });
      expect(typeof status).toBe('object');
      if (typeof status === 'object') {
        expect(status.currentCapital).toBe(1_000_300n);
      }
    });
  });

  describe('blockAction', () => {
    it('should block an action and mark it as failed', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const target: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };

      const spendResult = module.spendInfluence({
        dynastyId: 'dynasty-1',
        action: 'SWAY_VOTE',
        target,
      });

      if (typeof spendResult === 'object') {
        const blockResult = module.blockAction({
          actionId: spendResult.actionId,
          blockedByDynastyId: 'dynasty-2',
        });

        expect(typeof blockResult).toBe('object');
        if (typeof blockResult === 'object') {
          expect(blockResult.blocked).toBe(true);
        }
      }
    });

    it('should return error if action not found', () => {
      const module = createPoliticalInfluence(mockDeps);
      const result = module.blockAction({
        actionId: 'nonexistent',
        blockedByDynastyId: 'dynasty-2',
      });

      expect(result).toBe('ACTION_NOT_FOUND');
    });

    it('should record blocker dynasty ID', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const target: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };

      const spendResult = module.spendInfluence({
        dynastyId: 'dynasty-1',
        action: 'SWAY_VOTE',
        target,
      });

      if (typeof spendResult === 'object') {
        module.blockAction({
          actionId: spendResult.actionId,
          blockedByDynastyId: 'dynasty-2',
        });

        const actions = module.getAllActionsForDynasty({ dynastyId: 'dynasty-1' });
        const blockedAction = actions[0];
        expect(blockedAction).toBeDefined();
        if (blockedAction !== undefined) {
          expect(blockedAction.blockedById).toBe('dynasty-2');
          expect(blockedAction.success).toBe(false);
        }
      }
    });
  });

  describe('getInfluenceReport', () => {
    it('should return error if no capital record', () => {
      const module = createPoliticalInfluence(mockDeps);
      const result = module.getInfluenceReport({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(result).toBe('NO_CAPITAL_RECORD');
    });

    it('should return report with current capital', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 3_000_000n });

      const result = module.getInfluenceReport({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.currentCapital).toBe(3_000_000n);
        expect(result.maxCapital).toBe(10_000_000n);
      }
    });

    it('should count actions in last 24 hours', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const target: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };

      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'SWAY_VOTE', target });
      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'DISCREDIT_RIVAL', target });

      const result = module.getInfluenceReport({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.actionsThisPeriod).toBe(2);
      }
    });

    it('should calculate total capital spent', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const target: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };

      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'SWAY_VOTE', target });
      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'DISCREDIT_RIVAL', target });

      const result = module.getInfluenceReport({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.totalCapitalSpent).toBe(1_100_000n);
      }
    });

    it('should calculate success rate', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const target: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };

      const result1 = module.spendInfluence({
        dynastyId: 'dynasty-1',
        action: 'SWAY_VOTE',
        target,
      });
      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'DISCREDIT_RIVAL', target });

      if (typeof result1 === 'object') {
        module.blockAction({ actionId: result1.actionId, blockedByDynastyId: 'dynasty-2' });
      }

      const result = module.getInfluenceReport({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.successRate).toBe(0.5);
      }
    });

    it('should return zero success rate when no actions', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 3_000_000n });

      const result = module.getInfluenceReport({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.successRate).toBe(0);
        expect(result.actionsThisPeriod).toBe(0);
      }
    });
  });

  describe('getPoliticalHistory', () => {
    it('should return events for dynasty-world pair', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 1_000_000n });
      module.regenerateCapital({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      const history = module.getPoliticalHistory({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        limit: 10,
      });

      expect(history.length).toBeGreaterThan(0);
    });

    it('should limit results to specified count', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 1_000_000n });
      module.regenerateCapital({ dynastyId: 'dynasty-1', worldId: 'world-1' });
      module.regenerateCapital({ dynastyId: 'dynasty-1', worldId: 'world-1' });
      module.regenerateCapital({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      const history = module.getPoliticalHistory({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        limit: 2,
      });

      expect(history.length).toBe(2);
    });

    it('should return events in reverse chronological order', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 1_000_000n });

      mockTime = 2000000n;
      module.regenerateCapital({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      mockTime = 3000000n;
      module.regenerateCapital({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      const history = module.getPoliticalHistory({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        limit: 10,
      });

      expect(history[0]?.timestampMicros).toBeGreaterThanOrEqual(history[1]?.timestampMicros ?? 0n);
    });

    it('should filter by dynasty and world', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 1_000_000n });
      module.addCapital({ dynastyId: 'dynasty-2', worldId: 'world-1', amount: 1_000_000n });

      const history = module.getPoliticalHistory({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        limit: 10,
      });

      const allMatch = history.every(
        (evt) => evt.dynastyId === 'dynasty-1' && evt.worldId === 'world-1',
      );
      expect(allMatch).toBe(true);
    });
  });

  describe('getCapitalStatus', () => {
    it('should return error if no capital record', () => {
      const module = createPoliticalInfluence(mockDeps);
      const result = module.getCapitalStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(result).toBe('NO_CAPITAL_RECORD');
    });

    it('should return current capital status', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 2_500_000n });

      const result = module.getCapitalStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.currentCapital).toBe(2_500_000n);
        expect(result.dynastyId).toBe('dynasty-1');
        expect(result.worldId).toBe('world-1');
      }
    });

    it('should reflect updated capital after spending', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const target: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };

      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'SWAY_VOTE', target });

      const result = module.getCapitalStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.currentCapital).toBe(4_500_000n);
      }
    });
  });

  describe('getAllActionsForDynasty', () => {
    it('should return all actions for a dynasty', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const target: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };

      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'SWAY_VOTE', target });
      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'DISCREDIT_RIVAL', target });

      const actions = module.getAllActionsForDynasty({ dynastyId: 'dynasty-1' });

      expect(actions.length).toBe(2);
    });

    it('should return empty array if no actions', () => {
      const module = createPoliticalInfluence(mockDeps);
      const actions = module.getAllActionsForDynasty({ dynastyId: 'dynasty-1' });

      expect(actions.length).toBe(0);
    });

    it('should filter actions by dynasty ID', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });
      module.addCapital({ dynastyId: 'dynasty-2', worldId: 'world-1', amount: 5_000_000n });

      const target: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };

      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'SWAY_VOTE', target });
      module.spendInfluence({ dynastyId: 'dynasty-2', action: 'SWAY_VOTE', target });

      const actions = module.getAllActionsForDynasty({ dynastyId: 'dynasty-1' });

      expect(actions.length).toBe(1);
      expect(actions[0]?.dynastyId).toBe('dynasty-1');
    });

    it('should include action details', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const target: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };

      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'SWAY_VOTE', target });

      const actions = module.getAllActionsForDynasty({ dynastyId: 'dynasty-1' });

      expect(actions[0]?.action).toBe('SWAY_VOTE');
      expect(actions[0]?.success).toBe(true);
      expect(actions[0]?.capitalSpent).toBe(500_000n);
    });
  });

  describe('edge cases', () => {
    it('should handle zero capital addition', () => {
      const module = createPoliticalInfluence(mockDeps);
      const result = module.addCapital({
        dynastyId: 'dynasty-1',
        worldId: 'world-1',
        amount: 0n,
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.capital.currentCapital).toBe(0n);
      }
    });

    it('should handle multiple dynasties on same world', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 1_000_000n });
      module.addCapital({ dynastyId: 'dynasty-2', worldId: 'world-1', amount: 2_000_000n });

      const status1 = module.getCapitalStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });
      const status2 = module.getCapitalStatus({ dynastyId: 'dynasty-2', worldId: 'world-1' });

      expect(typeof status1).toBe('object');
      expect(typeof status2).toBe('object');
      if (typeof status1 === 'object' && typeof status2 === 'object') {
        expect(status1.currentCapital).toBe(1_000_000n);
        expect(status2.currentCapital).toBe(2_000_000n);
      }
    });

    it('should handle same dynasty on multiple worlds', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 1_000_000n });
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-2', amount: 2_000_000n });

      const status1 = module.getCapitalStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });
      const status2 = module.getCapitalStatus({ dynastyId: 'dynasty-1', worldId: 'world-2' });

      expect(typeof status1).toBe('object');
      expect(typeof status2).toBe('object');
      if (typeof status1 === 'object' && typeof status2 === 'object') {
        expect(status1.currentCapital).toBe(1_000_000n);
        expect(status2.currentCapital).toBe(2_000_000n);
      }
    });

    it('should handle different target types', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 5_000_000n });

      const targets = [
        { targetType: 'DYNASTY' as const, targetId: 'dyn-1', worldId: 'world-1' },
        { targetType: 'FACTION' as const, targetId: 'fac-1', worldId: 'world-1' },
        { targetType: 'ASSEMBLY' as const, targetId: 'asm-1', worldId: 'world-1' },
        { targetType: 'LEGISLATION' as const, targetId: 'law-1', worldId: 'world-1' },
      ];

      for (const target of targets) {
        const result = module.spendInfluence({
          dynastyId: 'dynasty-1',
          action: 'SWAY_VOTE',
          target,
        });
        expect(typeof result).toBe('object');
      }
    });

    it('should preserve regen rate across operations', () => {
      const module = createPoliticalInfluence(mockDeps);
      module.addCapital({ dynastyId: 'dynasty-1', worldId: 'world-1', amount: 1_000_000n });

      const target: InfluenceTarget = {
        targetType: 'ASSEMBLY',
        targetId: 'assembly-1',
        worldId: 'world-1',
      };

      module.spendInfluence({ dynastyId: 'dynasty-1', action: 'SWAY_VOTE', target });
      module.regenerateCapital({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      const status = module.getCapitalStatus({ dynastyId: 'dynasty-1', worldId: 'world-1' });

      expect(typeof status).toBe('object');
      if (typeof status === 'object') {
        expect(status.regenRate).toBe(100n);
      }
    });
  });
});
