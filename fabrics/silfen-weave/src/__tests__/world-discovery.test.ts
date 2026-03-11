import { describe, it, expect, beforeEach } from 'vitest';
import { createWorldDiscoveryModule, type WorldDiscoveryRecord } from '../world-discovery.js';

interface TestClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface TestLoggerPort {
  readonly info: (message: string, context: Record<string, unknown>) => void;
  readonly warn: (message: string, context: Record<string, unknown>) => void;
  readonly error: (message: string, context: Record<string, unknown>) => void;
}

function createTestClock(initialMicros: bigint): {
  clock: TestClockPort;
  setTime: (micros: bigint) => void;
} {
  let currentMicros = initialMicros;
  return {
    clock: { nowMicroseconds: () => currentMicros },
    setTime: (micros: bigint) => {
      currentMicros = micros;
    },
  };
}

function createTestLogger(): TestLoggerPort {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

describe('WorldDiscoveryModule', () => {
  let clock: ReturnType<typeof createTestClock>;
  let logger: TestLoggerPort;

  beforeEach(() => {
    clock = createTestClock(1000000n);
    logger = createTestLogger();
  });

  describe('recordSurvey', () => {
    it('creates new world record on first survey', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      const result = module.recordSurvey('world-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.surveysCompleted).toBe(1);
      }
    });

    it('increments survey count on subsequent surveys', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      const result = module.recordSurvey('world-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.surveysCompleted).toBe(2);
      }
    });

    it('tracks multiple worlds independently', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.recordSurvey('world-1');
      module.recordSurvey('world-2');
      const worlds = module.getDiscoveredWorlds();
      expect(worlds.length).toBe(2);
      const world1 = worlds.find((w: WorldDiscoveryRecord) => w.worldId === 'world-1');
      const world2 = worlds.find((w: WorldDiscoveryRecord) => w.worldId === 'world-2');
      expect(world1?.surveysCompleted).toBe(2);
      expect(world2?.surveysCompleted).toBe(1);
    });

    it('sets initial stage to SURVEYED', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      const worlds = module.getDiscoveredWorlds();
      const world = worlds[0];
      expect(world?.stage).toBe('SURVEYED');
    });

    it('captures discoveredAtMicros timestamp', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      const worlds = module.getDiscoveredWorlds();
      const world = worlds[0];
      expect(world?.discoveredAtMicros).toBe(1000000n);
    });
  });

  describe('getDiscoveredWorlds', () => {
    it('returns empty array when no worlds discovered', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      const worlds = module.getDiscoveredWorlds();
      expect(worlds.length).toBe(0);
    });

    it('returns all discovered worlds', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.recordSurvey('world-2');
      module.recordSurvey('world-3');
      const worlds = module.getDiscoveredWorlds();
      expect(worlds.length).toBe(3);
    });
  });

  describe('checkUnlockConditions', () => {
    it('returns error when world not discovered', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      const result = module.checkUnlockConditions('unknown');
      expect(result.canAdvance).toBe(false);
      if (!result.canAdvance) {
        expect(result.reason).toBe('World not discovered');
      }
    });

    it('allows advance when no conditions set', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      const result = module.checkUnlockConditions('world-1');
      expect(result.canAdvance).toBe(true);
    });

    it('checks TIME_ELAPSED condition', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.setUnlockConditions('world-1', [{ type: 'TIME_ELAPSED', param: 5000000n }]);
      const result1 = module.checkUnlockConditions('world-1');
      expect(result1.canAdvance).toBe(false);
      clock.setTime(6000000n);
      const result2 = module.checkUnlockConditions('world-1');
      expect(result2.canAdvance).toBe(true);
    });

    it('checks SURVEY_COUNT condition', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.setSurveyRequirement('world-1', 3);
      module.setUnlockConditions('world-1', [{ type: 'SURVEY_COUNT', param: 'unused' }]);
      const result1 = module.checkUnlockConditions('world-1');
      expect(result1.canAdvance).toBe(false);
      module.recordSurvey('world-1');
      module.recordSurvey('world-1');
      const result2 = module.checkUnlockConditions('world-1');
      expect(result2.canAdvance).toBe(true);
    });

    it('checks PREREQUISITE_WORLD condition', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.recordSurvey('world-2');
      module.setUnlockConditions('world-2', [{ type: 'PREREQUISITE_WORLD', param: 'world-1' }]);
      const result1 = module.checkUnlockConditions('world-2');
      expect(result1.canAdvance).toBe(false);
      module.advanceStage('world-1');
      module.advanceStage('world-1');
      const result2 = module.checkUnlockConditions('world-2');
      expect(result2.canAdvance).toBe(true);
    });

    it('checks MANUAL condition always returns false', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.setUnlockConditions('world-1', [{ type: 'MANUAL', param: 'admin-approval' }]);
      const result = module.checkUnlockConditions('world-1');
      expect(result.canAdvance).toBe(false);
      if (!result.canAdvance) {
        expect(result.reason).toBe('Manual unlock required');
      }
    });

    it('returns false when already OPEN', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.advanceStage('world-1');
      module.advanceStage('world-1');
      const result = module.checkUnlockConditions('world-1');
      expect(result.canAdvance).toBe(false);
      if (!result.canAdvance) {
        expect(result.reason).toBe('Already OPEN');
      }
    });

    it('checks all conditions must pass', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.setSurveyRequirement('world-1', 2);
      module.setUnlockConditions('world-1', [
        { type: 'TIME_ELAPSED', param: 5000000n },
        { type: 'SURVEY_COUNT', param: 'unused' },
      ]);
      clock.setTime(6000000n);
      const result1 = module.checkUnlockConditions('world-1');
      expect(result1.canAdvance).toBe(false);
      module.recordSurvey('world-1');
      const result2 = module.checkUnlockConditions('world-1');
      expect(result2.canAdvance).toBe(true);
    });
  });

  describe('advanceStage', () => {
    it('returns error when world not discovered', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      const result = module.advanceStage('unknown');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('World not discovered');
      }
    });

    it('advances SURVEYED to CHARTED', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      const result = module.advanceStage('world-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newStage).toBe('CHARTED');
      }
      const worlds = module.getDiscoveredWorlds();
      const world = worlds[0];
      expect(world?.stage).toBe('CHARTED');
    });

    it('advances CHARTED to OPEN', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.advanceStage('world-1');
      clock.setTime(2000000n);
      const result = module.advanceStage('world-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.newStage).toBe('OPEN');
      }
      const worlds = module.getDiscoveredWorlds();
      const world = worlds[0];
      expect(world?.stage).toBe('OPEN');
    });

    it('sets chartedAtMicros when advancing to CHARTED', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      clock.setTime(3000000n);
      module.advanceStage('world-1');
      const worlds = module.getDiscoveredWorlds();
      const world = worlds[0];
      expect(world?.chartedAtMicros).toBe(3000000n);
    });

    it('sets openedAtMicros when advancing to OPEN', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.advanceStage('world-1');
      clock.setTime(5000000n);
      module.advanceStage('world-1');
      const worlds = module.getDiscoveredWorlds();
      const world = worlds[0];
      expect(world?.openedAtMicros).toBe(5000000n);
    });

    it('returns error when already OPEN', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.advanceStage('world-1');
      module.advanceStage('world-1');
      const result = module.advanceStage('world-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Already OPEN');
      }
    });

    it('returns error when conditions not met', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.setUnlockConditions('world-1', [{ type: 'TIME_ELAPSED', param: 9000000n }]);
      const result = module.advanceStage('world-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Time not elapsed');
      }
    });
  });

  describe('getUnlockProgress', () => {
    it('returns error when world not discovered', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      const result = module.getUnlockProgress('unknown');
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.error).toBe('World not discovered');
      }
    });

    it('returns error when survey requirement not set', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      const result = module.getUnlockProgress('world-1');
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.error).toBe('Survey requirement not set');
      }
    });

    it('calculates progress percentage', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.recordSurvey('world-1');
      module.setSurveyRequirement('world-1', 10);
      const result = module.getUnlockProgress('world-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.progress.percentComplete).toBe(20);
        expect(result.progress.surveysCompleted).toBe(2);
        expect(result.progress.surveysRequired).toBe(10);
      }
    });

    it('caps progress at 100 percent', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.recordSurvey('world-1');
      module.recordSurvey('world-1');
      module.setSurveyRequirement('world-1', 2);
      const result = module.getUnlockProgress('world-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.progress.percentComplete).toBe(100);
      }
    });
  });

  describe('setUnlockConditions', () => {
    it('returns error when world not discovered', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      const result = module.setUnlockConditions('unknown', []);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('World not discovered');
      }
    });

    it('sets unlock conditions successfully', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      const result = module.setUnlockConditions('world-1', [
        { type: 'TIME_ELAPSED', param: 1000n },
      ]);
      expect(result.success).toBe(true);
    });

    it('overwrites previous conditions', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.setUnlockConditions('world-1', [{ type: 'MANUAL', param: 'admin' }]);
      module.setUnlockConditions('world-1', [{ type: 'TIME_ELAPSED', param: 1n }]);
      clock.setTime(2000000n);
      const result = module.checkUnlockConditions('world-1');
      expect(result.canAdvance).toBe(true);
    });
  });

  describe('setSurveyRequirement', () => {
    it('sets survey requirement for world', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.recordSurvey('world-1');
      module.setSurveyRequirement('world-1', 5);
      const result = module.getUnlockProgress('world-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.progress.surveysRequired).toBe(5);
      }
    });

    it('can be called before world is discovered', () => {
      const module = createWorldDiscoveryModule({ clock: clock.clock, logger });
      module.setSurveyRequirement('world-1', 10);
      module.recordSurvey('world-1');
      const result = module.getUnlockProgress('world-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.progress.surveysRequired).toBe(10);
      }
    });
  });
});
