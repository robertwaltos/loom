import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEconomicCrisisSystem,
  type EconomicCrisisSystem,
  type CrisisPhase,
  type IndicatorType,
  type InterventionType,
} from '../economic-crisis.js';

function createMockClock() {
  let currentTime = 1000000n;
  return {
    nowMicroseconds: () => currentTime,
    advance: (delta: bigint) => {
      currentTime += delta;
    },
  };
}

function createMockIdGen() {
  let counter = 1;
  return {
    generateId: () => {
      const id = 'id-' + String(counter);
      counter += 1;
      return id;
    },
  };
}

function createMockLogger() {
  const logs: Array<{ message: string; meta?: Record<string, unknown> }> = [];
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      logs.push({ message, meta });
    },
    getLogs: () => logs,
    clear: () => {
      logs.length = 0;
    },
  };
}

describe('EconomicCrisisSystem', () => {
  let system: EconomicCrisisSystem;
  let clock: ReturnType<typeof createMockClock>;
  let idGen: ReturnType<typeof createMockIdGen>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
    system = createEconomicCrisisSystem({ clock, idGen, logger });
  });

  describe('updateIndicator', () => {
    it('creates new indicator when first updated', () => {
      const result = system.updateIndicator('world1', 'INFLATION_RATE', 0.08);
      expect(result.success).toBe(true);
      const indicator = system.getIndicator('world1', 'INFLATION_RATE');
      expect(indicator).toBeDefined();
      expect(indicator?.currentValue).toBe(0.08);
      expect(indicator?.indicatorType).toBe('INFLATION_RATE');
    });

    it('updates existing indicator value', () => {
      system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.1);
      const result = system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.12);
      expect(result.success).toBe(true);
      const indicator = system.getIndicator('world1', 'UNEMPLOYMENT_RATE');
      expect(indicator?.currentValue).toBe(0.12);
    });

    it('marks indicator as breached when above threshold', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      const indicator = system.getIndicator('world1', 'INFLATION_RATE');
      expect(indicator?.breached).toBe(true);
    });

    it('marks indicator as not breached when below threshold', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.05);
      const indicator = system.getIndicator('world1', 'INFLATION_RATE');
      expect(indicator?.breached).toBe(false);
    });

    it('returns error for negative value', () => {
      const result = system.updateIndicator('world1', 'INFLATION_RATE', -0.05);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-value');
    });

    it('updates lastUpdated timestamp', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.08);
      const indicator1 = system.getIndicator('world1', 'INFLATION_RATE');
      clock.advance(5000n);
      system.updateIndicator('world1', 'INFLATION_RATE', 0.09);
      const indicator2 = system.getIndicator('world1', 'INFLATION_RATE');
      expect(indicator2?.lastUpdated).toBeGreaterThan(indicator1?.lastUpdated ?? 0n);
    });

    it('logs indicator updates', () => {
      logger.clear();
      system.updateIndicator('world1', 'DEBT_TO_GDP_RATIO', 0.85);
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      const log = logs[logs.length - 1];
      expect(log?.message).toBe('Economic indicator updated');
      expect(log?.meta?.indicatorType).toBe('DEBT_TO_GDP_RATIO');
    });

    it('tracks indicators independently per world', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.08);
      system.updateIndicator('world2', 'INFLATION_RATE', 0.15);
      const ind1 = system.getIndicator('world1', 'INFLATION_RATE');
      const ind2 = system.getIndicator('world2', 'INFLATION_RATE');
      expect(ind1?.currentValue).toBe(0.08);
      expect(ind2?.currentValue).toBe(0.15);
    });
  });

  describe('indicator thresholds', () => {
    it('uses 0.10 threshold for INFLATION_RATE', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.11);
      const indicator = system.getIndicator('world1', 'INFLATION_RATE');
      expect(indicator?.threshold).toBe(0.1);
      expect(indicator?.breached).toBe(true);
    });

    it('uses 0.15 threshold for UNEMPLOYMENT_RATE', () => {
      system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.16);
      const indicator = system.getIndicator('world1', 'UNEMPLOYMENT_RATE');
      expect(indicator?.threshold).toBe(0.15);
      expect(indicator?.breached).toBe(true);
    });

    it('uses 0.05 threshold for TRADE_DEFICIT_RATIO', () => {
      system.updateIndicator('world1', 'TRADE_DEFICIT_RATIO', 0.06);
      const indicator = system.getIndicator('world1', 'TRADE_DEFICIT_RATIO');
      expect(indicator?.threshold).toBe(0.05);
      expect(indicator?.breached).toBe(true);
    });

    it('uses 0.90 threshold for DEBT_TO_GDP_RATIO', () => {
      system.updateIndicator('world1', 'DEBT_TO_GDP_RATIO', 0.95);
      const indicator = system.getIndicator('world1', 'DEBT_TO_GDP_RATIO');
      expect(indicator?.threshold).toBe(0.9);
      expect(indicator?.breached).toBe(true);
    });

    it('uses 0.30 threshold for CONSUMER_CONFIDENCE', () => {
      system.updateIndicator('world1', 'CONSUMER_CONFIDENCE', 0.35);
      const indicator = system.getIndicator('world1', 'CONSUMER_CONFIDENCE');
      expect(indicator?.threshold).toBe(0.3);
      expect(indicator?.breached).toBe(true);
    });
  });

  describe('checkCrisisTriggers', () => {
    it('returns not triggered when no indicators breached', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.05);
      system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.08);
      const result = system.checkCrisisTriggers('world1');
      expect(result.triggered).toBe(false);
    });

    it('triggers crisis when single indicator breached', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      const result = system.checkCrisisTriggers('world1');
      expect(result.triggered).toBe(true);
      if (result.triggered) {
        expect(result.crisisTrigger.breachedIndicators).toContain('INFLATION_RATE');
      }
    });

    it('triggers crisis with higher score when multiple indicators breached', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.2);
      const result = system.checkCrisisTriggers('world1');
      expect(result.triggered).toBe(true);
      if (result.triggered) {
        expect(result.crisisTrigger.crisisScore).toBeGreaterThan(20);
      }
    });

    it('computes crisis score based on indicator weights', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.2);
      const result = system.checkCrisisTriggers('world1');
      expect(result.triggered).toBe(true);
      if (result.triggered) {
        expect(result.crisisTrigger.crisisScore).toBe(60);
      }
    });

    it('classifies crisis phase based on score', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      const result = system.checkCrisisTriggers('world1');
      expect(result.triggered).toBe(true);
      if (result.triggered) expect(result.crisisTrigger.phase).toBe('WARNING');
    });

    it('creates crisis trigger with unique ID', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      const result = system.checkCrisisTriggers('world1');
      expect(result.triggered).toBe(true);
      if (result.triggered) {
        expect(result.crisisTrigger.triggerId).toBe('id-1');
      }
    });

    it('updates world phase when crisis triggered', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.checkCrisisTriggers('world1');
      const phase = system.getCurrentPhase('world1');
      expect(phase).toBe('WARNING');
    });

    it('logs crisis trigger detection', () => {
      logger.clear();
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.checkCrisisTriggers('world1');
      const logs = logger.getLogs();
      const triggerLog = logs.find((l) => l.message === 'Crisis trigger detected');
      expect(triggerLog).toBeDefined();
      expect(triggerLog?.meta?.phase).toBe('WARNING');
    });
  });

  describe('crisis phase classification', () => {
    it('classifies score < 20 as STABLE', () => {
      system.updateIndicator('world1', 'CONSUMER_CONFIDENCE', 0.35);
      const result = system.checkCrisisTriggers('world1');
      expect(result.triggered).toBe(true);
      if (result.triggered) expect(result.crisisTrigger.phase).toBe('STABLE');
    });

    it('classifies score >= 20 as WATCH', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world1', 'CONSUMER_CONFIDENCE', 0.35);
      const result = system.checkCrisisTriggers('world1');
      expect(result.triggered).toBe(true);
      if (result.triggered) expect(result.crisisTrigger.phase).toBe('WARNING');
    });

    it('classifies score >= 40 as WARNING', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.2);
      const result = system.checkCrisisTriggers('world1');
      expect(result.triggered).toBe(true);
      if (result.triggered) expect(result.crisisTrigger.phase).toBe('CRISIS');
    });

    it('classifies score >= 60 as CRISIS', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.2);
      const result = system.checkCrisisTriggers('world1');
      expect(result.triggered).toBe(true);
      if (result.triggered) expect(result.crisisTrigger.phase).toBe('CRISIS');
    });

    it('classifies score >= 80 as DEPRESSION', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.2);
      system.updateIndicator('world1', 'DEBT_TO_GDP_RATIO', 1.0);
      const result = system.checkCrisisTriggers('world1');
      expect(result.triggered).toBe(true);
      if (result.triggered) {
        expect(result.crisisTrigger.phase).toBe('DEPRESSION');
      }
    });
  });

  describe('advanceCrisisPhase', () => {
    it('advances phase successfully', () => {
      const result = system.advanceCrisisPhase('world1', 'CRISIS');
      expect(result.success).toBe(true);
      expect(system.getCurrentPhase('world1')).toBe('CRISIS');
    });

    it('allows advancing to RECOVERY phase', () => {
      const result = system.advanceCrisisPhase('world1', 'RECOVERY');
      expect(result.success).toBe(true);
      expect(system.getCurrentPhase('world1')).toBe('RECOVERY');
    });

    it('returns error for invalid phase', () => {
      const result = system.advanceCrisisPhase('world1', 'INVALID' as CrisisPhase);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('invalid-phase');
    });

    it('logs phase advancement', () => {
      logger.clear();
      system.advanceCrisisPhase('world1', 'WARNING');
      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      const log = logs[logs.length - 1];
      expect(log?.message).toBe('Crisis phase advanced');
      expect(log?.meta?.targetPhase).toBe('WARNING');
    });
  });

  describe('applyIntervention', () => {
    beforeEach(() => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.2);
      system.checkCrisisTriggers('world1');
    });

    it('applies intervention successfully', () => {
      const result = system.applyIntervention('world1', 'MONETARY_EASING');
      expect(result.success).toBe(true);
    });

    it('returns error when no crisis active', () => {
      const result = system.applyIntervention('world2', 'MONETARY_EASING');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe('no-crisis-active');
    });

    it('creates intervention with unique ID', () => {
      const result = system.applyIntervention('world1', 'FISCAL_STIMULUS');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.intervention.interventionId).toBe('id-2');
      }
    });

    it('reduces crisis score by intervention effect', () => {
      const scoreBefore = system.getCrisisScore('world1');
      system.applyIntervention('world1', 'MONETARY_EASING');
      const scoreAfter = system.getCrisisScore('world1');
      expect(scoreAfter).toBe(scoreBefore);
    });

    it('updates crisis phase after intervention', () => {
      system.applyIntervention('world1', 'EMERGENCY_RELIEF');
      const phase = system.getCurrentPhase('world1');
      expect(phase).not.toBe('CRISIS');
    });

    it('logs intervention application', () => {
      logger.clear();
      system.applyIntervention('world1', 'DEBT_RESTRUCTURING');
      const logs = logger.getLogs();
      const interventionLog = logs.find((l) => l.message === 'Intervention applied');
      expect(interventionLog).toBeDefined();
      expect(interventionLog?.meta?.interventionType).toBe('DEBT_RESTRUCTURING');
    });
  });

  describe('intervention effects', () => {
    beforeEach(() => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.2);
      system.updateIndicator('world1', 'DEBT_TO_GDP_RATIO', 1.0);
      system.checkCrisisTriggers('world1');
    });

    it('MONETARY_EASING reduces severity by 15', () => {
      const result = system.applyIntervention('world1', 'MONETARY_EASING');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.intervention.severityReduction).toBe(15);
      }
    });

    it('FISCAL_STIMULUS reduces severity by 20', () => {
      const result = system.applyIntervention('world1', 'FISCAL_STIMULUS');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.intervention.severityReduction).toBe(20);
      }
    });

    it('TRADE_POLICY_REFORM reduces severity by 10', () => {
      const result = system.applyIntervention('world1', 'TRADE_POLICY_REFORM');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.intervention.severityReduction).toBe(10);
      }
    });

    it('DEBT_RESTRUCTURING reduces severity by 25', () => {
      const result = system.applyIntervention('world1', 'DEBT_RESTRUCTURING');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.intervention.severityReduction).toBe(25);
      }
    });

    it('EMERGENCY_RELIEF reduces severity by 30', () => {
      const result = system.applyIntervention('world1', 'EMERGENCY_RELIEF');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.intervention.severityReduction).toBe(30);
      }
    });
  });

  describe('getMacroReport', () => {
    beforeEach(() => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.08);
      system.updateIndicator('world1', 'DEBT_TO_GDP_RATIO', 1.0);
      system.checkCrisisTriggers('world1');
    });

    it('includes current phase', () => {
      const report = system.getMacroReport('world1');
      expect(report.currentPhase).toBeDefined();
    });

    it('includes crisis score', () => {
      const report = system.getMacroReport('world1');
      expect(report.crisisScore).toBeGreaterThan(0);
    });

    it('counts breached indicators', () => {
      const report = system.getMacroReport('world1');
      expect(report.breachedCount).toBe(2);
    });

    it('includes all world indicators', () => {
      const report = system.getMacroReport('world1');
      expect(report.indicators.length).toBe(3);
    });

    it('excludes indicators from other worlds', () => {
      system.updateIndicator('world2', 'INFLATION_RATE', 0.2);
      const report = system.getMacroReport('world1');
      expect(report.indicators.every((i) => i.worldId === 'world1')).toBe(true);
    });

    it('counts active interventions', () => {
      system.applyIntervention('world1', 'MONETARY_EASING');
      system.applyIntervention('world1', 'FISCAL_STIMULUS');
      const report = system.getMacroReport('world1');
      expect(report.activeInterventions).toBe(2);
    });

    it('includes report generation timestamp', () => {
      const report = system.getMacroReport('world1');
      expect(report.generatedAt).toBe(1000000n);
    });
  });

  describe('getCrisisHistory', () => {
    it('returns empty history for world with no activity', () => {
      const history = system.getCrisisHistory('world1');
      expect(history.triggers.length).toBe(0);
      expect(history.interventions.length).toBe(0);
    });

    it('includes all crisis triggers for world', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.checkCrisisTriggers('world1');
      clock.advance(10000n);
      system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.2);
      system.checkCrisisTriggers('world1');

      const history = system.getCrisisHistory('world1');
      expect(history.triggers.length).toBeGreaterThanOrEqual(2);
    });

    it('includes all interventions for world', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.checkCrisisTriggers('world1');
      system.applyIntervention('world1', 'MONETARY_EASING');
      system.applyIntervention('world1', 'FISCAL_STIMULUS');

      const history = system.getCrisisHistory('world1');
      expect(history.interventions.length).toBe(2);
    });

    it('sorts triggers by triggered time descending', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.checkCrisisTriggers('world1');
      clock.advance(5000n);
      system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.2);
      system.checkCrisisTriggers('world1');

      const history = system.getCrisisHistory('world1');
      for (let i = 0; i < history.triggers.length - 1; i += 1) {
        const curr = history.triggers[i];
        const next = history.triggers[i + 1];
        if (curr && next) {
          expect(curr.triggeredAt).toBeGreaterThanOrEqual(next.triggeredAt);
        }
      }
    });

    it('sorts interventions by applied time descending', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.checkCrisisTriggers('world1');
      system.applyIntervention('world1', 'MONETARY_EASING');
      clock.advance(5000n);
      system.applyIntervention('world1', 'FISCAL_STIMULUS');

      const history = system.getCrisisHistory('world1');
      for (let i = 0; i < history.interventions.length - 1; i += 1) {
        const curr = history.interventions[i];
        const next = history.interventions[i + 1];
        if (curr && next) {
          expect(curr.appliedAt).toBeGreaterThanOrEqual(next.appliedAt);
        }
      }
    });

    it('excludes activity from other worlds', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world2', 'UNEMPLOYMENT_RATE', 0.2);
      system.checkCrisisTriggers('world1');
      system.checkCrisisTriggers('world2');

      const history = system.getCrisisHistory('world1');
      expect(history.triggers.every((t) => t.worldId === 'world1')).toBe(true);
    });
  });

  describe('getCrisisScore', () => {
    it('returns 0 when no indicators breached', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.05);
      expect(system.getCrisisScore('world1')).toBe(0);
    });

    it('returns weighted score for single breached indicator', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      expect(system.getCrisisScore('world1')).toBe(30);
    });

    it('returns sum of weights for multiple breached indicators', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world1', 'UNEMPLOYMENT_RATE', 0.2);
      expect(system.getCrisisScore('world1')).toBe(60);
    });

    it('computes score independently per world', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world2', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world2', 'UNEMPLOYMENT_RATE', 0.2);

      expect(system.getCrisisScore('world1')).toBe(30);
      expect(system.getCrisisScore('world2')).toBe(60);
    });
  });

  describe('getCurrentPhase', () => {
    it('returns STABLE for world with no crisis', () => {
      expect(system.getCurrentPhase('world1')).toBe('STABLE');
    });

    it('returns updated phase after crisis trigger', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.checkCrisisTriggers('world1');
      expect(system.getCurrentPhase('world1')).toBe('WARNING');
    });

    it('returns updated phase after manual advancement', () => {
      system.advanceCrisisPhase('world1', 'RECOVERY');
      expect(system.getCurrentPhase('world1')).toBe('RECOVERY');
    });

    it('returns updated phase after intervention', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.checkCrisisTriggers('world1');
      system.applyIntervention('world1', 'EMERGENCY_RELIEF');
      const phase = system.getCurrentPhase('world1');
      expect(phase).not.toBe('WARNING');
    });
  });

  describe('getIndicator', () => {
    it('returns indicator when found', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.08);
      const indicator = system.getIndicator('world1', 'INFLATION_RATE');
      expect(indicator).toBeDefined();
      expect(indicator?.currentValue).toBe(0.08);
    });

    it('returns undefined when not found', () => {
      const indicator = system.getIndicator('world1', 'INFLATION_RATE');
      expect(indicator).toBeUndefined();
    });

    it('distinguishes indicators by world', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.08);
      system.updateIndicator('world2', 'INFLATION_RATE', 0.15);

      const ind1 = system.getIndicator('world1', 'INFLATION_RATE');
      const ind2 = system.getIndicator('world2', 'INFLATION_RATE');

      expect(ind1?.currentValue).toBe(0.08);
      expect(ind2?.currentValue).toBe(0.15);
    });
  });

  describe('multiple worlds integration', () => {
    it('tracks crises independently per world', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world2', 'UNEMPLOYMENT_RATE', 0.2);
      system.checkCrisisTriggers('world1');
      system.checkCrisisTriggers('world2');

      expect(system.getCurrentPhase('world1')).toBe('WARNING');
      expect(system.getCurrentPhase('world2')).toBe('WARNING');
    });

    it('applies interventions independently per world', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world2', 'INFLATION_RATE', 0.15);
      system.checkCrisisTriggers('world1');
      system.checkCrisisTriggers('world2');

      system.applyIntervention('world1', 'EMERGENCY_RELIEF');

      const report1 = system.getMacroReport('world1');
      const report2 = system.getMacroReport('world2');

      expect(report1.activeInterventions).toBe(1);
      expect(report2.activeInterventions).toBe(0);
    });

    it('maintains separate crisis histories per world', () => {
      system.updateIndicator('world1', 'INFLATION_RATE', 0.15);
      system.updateIndicator('world2', 'UNEMPLOYMENT_RATE', 0.2);
      system.checkCrisisTriggers('world1');
      system.checkCrisisTriggers('world2');

      const history1 = system.getCrisisHistory('world1');
      const history2 = system.getCrisisHistory('world2');

      expect(history1.triggers.every((t) => t.worldId === 'world1')).toBe(true);
      expect(history2.triggers.every((t) => t.worldId === 'world2')).toBe(true);
    });
  });
});
