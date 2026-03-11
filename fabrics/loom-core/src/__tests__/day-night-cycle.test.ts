import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDayNightCycle,
  type DayNightCycleDeps,
  type PhaseTransition,
} from '../day-night-cycle.js';

function createMockDeps(): DayNightCycleDeps & { setTime: (t: bigint) => void } {
  let currentTime = BigInt(0);
  const logs: Array<{ level: string; msg: string; ctx: Record<string, unknown> }> = [];

  return {
    clock: {
      nowMicroseconds: () => currentTime,
    },
    logger: {
      info: (msg, ctx) => {
        logs.push({ level: 'info', msg, ctx });
      },
    },
    setTime: (t: bigint) => {
      currentTime = t;
    },
  };
}

const HOUR = BigInt(60 * 60 * 1000000);
const MINUTE = BigInt(60 * 1000000);
const DAY = BigInt(24 * 60 * 60 * 1000000);

describe('DayNightCycle', () => {
  let deps: DayNightCycleDeps & { setTime: (t: bigint) => void };

  beforeEach(() => {
    deps = createMockDeps();
  });

  describe('registerWorld', () => {
    it('registers a new world clock', () => {
      const cycle = createDayNightCycle(deps);
      const result = cycle.registerWorld('world-1', BigInt(0));
      expect(result).toBe('OK');
    });

    it('returns error if world already registered', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const result = cycle.registerWorld('world-1', BigInt(0));
      expect(result).toBe('WORLD_ALREADY_REGISTERED');
    });

    it('initializes world with correct phase at midnight', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const phase = cycle.getCurrentPhase('world-1');
      expect(phase).toBe('DEEP_NIGHT');
    });

    it('initializes world with correct phase at noon', () => {
      deps.setTime(BigInt(10) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const phase = cycle.getCurrentPhase('world-1');
      expect(phase).toBe('MIDDAY');
    });

    it('applies timezone offset correctly', () => {
      deps.setTime(BigInt(0));
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(6) * HOUR);
      const phase = cycle.getCurrentPhase('world-1');
      expect(phase).toBe('MORNING');
    });

    it('registers multiple worlds with different timezones', () => {
      const cycle = createDayNightCycle(deps);
      expect(cycle.registerWorld('world-1', BigInt(0))).toBe('OK');
      expect(cycle.registerWorld('world-2', BigInt(6) * HOUR)).toBe('OK');
      expect(cycle.registerWorld('world-3', BigInt(-3) * HOUR)).toBe('OK');
    });
  });

  describe('advanceClock', () => {
    it('advances world clock to current time', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));

      deps.setTime(BigInt(6) * HOUR);
      const result = cycle.advanceClock('world-1');
      expect(result).toBe('OK');

      const phase = cycle.getCurrentPhase('world-1');
      expect(phase).toBe('MORNING');
    });

    it('returns error if world not found', () => {
      const cycle = createDayNightCycle(deps);
      const result = cycle.advanceClock('nonexistent');
      expect(result).toBe('WORLD_NOT_FOUND');
    });

    it('detects phase transition', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));

      deps.setTime(BigInt(6) * HOUR);
      cycle.advanceClock('world-1');

      const history = cycle.getTransitionHistory('world-1');
      expect(history.length).toBeGreaterThan(0);
    });

    it('does not record transition if phase unchanged', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));

      deps.setTime(BigInt(1) * HOUR);
      cycle.advanceClock('world-1');

      const history = cycle.getTransitionHistory('world-1');
      expect(history).toHaveLength(0);
    });

    it('updates current phase after transition', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));

      deps.setTime(BigInt(10) * HOUR);
      cycle.advanceClock('world-1');

      const phase = cycle.getCurrentPhase('world-1');
      expect(phase).toBe('MIDDAY');
    });
  });

  describe('advanceAllClocks', () => {
    it('advances all registered world clocks', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      cycle.registerWorld('world-2', BigInt(0));
      cycle.registerWorld('world-3', BigInt(0));

      deps.setTime(BigInt(6) * HOUR);
      const count = cycle.advanceAllClocks();
      expect(count).toBe(3);
    });

    it('returns zero when no worlds registered', () => {
      const cycle = createDayNightCycle(deps);
      const count = cycle.advanceAllClocks();
      expect(count).toBe(0);
    });

    it('updates all worlds to current phase', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      cycle.registerWorld('world-2', BigInt(0));

      deps.setTime(BigInt(18) * HOUR);
      cycle.advanceAllClocks();

      expect(cycle.getCurrentPhase('world-1')).toBe('EVENING');
      expect(cycle.getCurrentPhase('world-2')).toBe('EVENING');
    });
  });

  describe('getCurrentPhase', () => {
    it('returns current phase for registered world', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const phase = cycle.getCurrentPhase('world-1');
      expect(phase).toBe('DEEP_NIGHT');
    });

    it('returns error for unregistered world', () => {
      const cycle = createDayNightCycle(deps);
      const result = cycle.getCurrentPhase('nonexistent');
      expect(result).toBe('WORLD_NOT_FOUND');
    });
  });

  describe('day phases', () => {
    it('recognizes DEEP_NIGHT phase (0-3h)', () => {
      deps.setTime(BigInt(2) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      expect(cycle.getCurrentPhase('world-1')).toBe('DEEP_NIGHT');
    });

    it('recognizes DAWN phase (3-6h)', () => {
      deps.setTime(BigInt(4) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      expect(cycle.getCurrentPhase('world-1')).toBe('DAWN');
    });

    it('recognizes MORNING phase (6-9h)', () => {
      deps.setTime(BigInt(7) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      expect(cycle.getCurrentPhase('world-1')).toBe('MORNING');
    });

    it('recognizes MIDDAY phase (9-12h)', () => {
      deps.setTime(BigInt(10) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      expect(cycle.getCurrentPhase('world-1')).toBe('MIDDAY');
    });

    it('recognizes AFTERNOON phase (12-15h)', () => {
      deps.setTime(BigInt(13) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      expect(cycle.getCurrentPhase('world-1')).toBe('AFTERNOON');
    });

    it('recognizes DUSK phase (15-18h)', () => {
      deps.setTime(BigInt(16) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      expect(cycle.getCurrentPhase('world-1')).toBe('DUSK');
    });

    it('recognizes EVENING phase (18-21h)', () => {
      deps.setTime(BigInt(19) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      expect(cycle.getCurrentPhase('world-1')).toBe('EVENING');
    });

    it('recognizes MIDNIGHT phase (21-24h)', () => {
      deps.setTime(BigInt(22) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      expect(cycle.getCurrentPhase('world-1')).toBe('MIDNIGHT');
    });
  });

  describe('getLightingState', () => {
    it('returns lighting state for registered world', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const lighting = cycle.getLightingState('world-1');
      if (typeof lighting === 'string') {
        throw new Error('Expected lighting state');
      }
      expect(lighting.intensity).toBeGreaterThanOrEqual(0);
    });

    it('returns error for unregistered world', () => {
      const cycle = createDayNightCycle(deps);
      const result = cycle.getLightingState('nonexistent');
      expect(result).toBe('WORLD_NOT_FOUND');
    });

    it('provides maximum intensity at MIDDAY', () => {
      deps.setTime(BigInt(10) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const lighting = cycle.getLightingState('world-1');
      if (typeof lighting === 'string') {
        throw new Error('Expected lighting state');
      }
      expect(lighting.intensity).toBe(1.0);
    });

    it('provides minimum intensity at DEEP_NIGHT', () => {
      deps.setTime(BigInt(1) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const lighting = cycle.getLightingState('world-1');
      if (typeof lighting === 'string') {
        throw new Error('Expected lighting state');
      }
      expect(lighting.intensity).toBeLessThan(0.1);
    });

    it('provides warmer temperature at DUSK', () => {
      deps.setTime(BigInt(16) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const lighting = cycle.getLightingState('world-1');
      if (typeof lighting === 'string') {
        throw new Error('Expected lighting state');
      }
      expect(lighting.temperature).toBeLessThan(5000);
    });

    it('provides longer shadows at DAWN', () => {
      deps.setTime(BigInt(4) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const lighting = cycle.getLightingState('world-1');
      if (typeof lighting === 'string') {
        throw new Error('Expected lighting state');
      }
      expect(lighting.shadowLength).toBeGreaterThan(3.0);
    });

    it('provides shorter shadows at MIDDAY', () => {
      deps.setTime(BigInt(11) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const lighting = cycle.getLightingState('world-1');
      if (typeof lighting === 'string') {
        throw new Error('Expected lighting state');
      }
      expect(lighting.shadowLength).toBeLessThan(2.0);
    });
  });

  describe('getWorldTime', () => {
    it('returns time of day for registered world', () => {
      deps.setTime(BigInt(12) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const time = cycle.getWorldTime('world-1');
      if (typeof time === 'string') {
        throw new Error('Expected time');
      }
      expect(time.hours).toBe(12);
      expect(time.minutes).toBe(0);
    });

    it('returns error for unregistered world', () => {
      const cycle = createDayNightCycle(deps);
      const result = cycle.getWorldTime('nonexistent');
      expect(result).toBe('WORLD_NOT_FOUND');
    });

    it('calculates hours correctly', () => {
      deps.setTime(BigInt(15) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const time = cycle.getWorldTime('world-1');
      if (typeof time === 'string') {
        throw new Error('Expected time');
      }
      expect(time.hours).toBe(15);
    });

    it('calculates minutes correctly', () => {
      deps.setTime(BigInt(10) * HOUR + BigInt(30) * MINUTE);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const time = cycle.getWorldTime('world-1');
      if (typeof time === 'string') {
        throw new Error('Expected time');
      }
      expect(time.hours).toBe(10);
      expect(time.minutes).toBe(30);
    });

    it('wraps around at 24 hours', () => {
      deps.setTime(BigInt(25) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const time = cycle.getWorldTime('world-1');
      if (typeof time === 'string') {
        throw new Error('Expected time');
      }
      expect(time.hours).toBe(1);
    });

    it('applies timezone offset to time calculation', () => {
      deps.setTime(BigInt(10) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(3) * HOUR);
      const time = cycle.getWorldTime('world-1');
      if (typeof time === 'string') {
        throw new Error('Expected time');
      }
      expect(time.hours).toBe(13);
    });
  });

  describe('registerPhaseListener', () => {
    it('notifies listener on phase transition', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));

      let notified = false;
      cycle.registerPhaseListener(() => {
        notified = true;
      });

      deps.setTime(BigInt(6) * HOUR);
      cycle.advanceClock('world-1');

      expect(notified).toBe(true);
    });

    it('provides transition details to listener', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));

      let receivedTransition: PhaseTransition | null = null;
      cycle.registerPhaseListener((transition) => {
        receivedTransition = transition;
      });

      deps.setTime(BigInt(6) * HOUR);
      cycle.advanceClock('world-1');

      expect(receivedTransition).not.toBe(null);
      const transition = receivedTransition as unknown as PhaseTransition;
      expect(transition.worldId).toBe('world-1');
      expect(transition.fromPhase).toBe('DEEP_NIGHT');
      expect(transition.toPhase).toBe('MORNING');
    });

    it('notifies all registered listeners', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));

      let count = 0;
      cycle.registerPhaseListener(() => {
        count = count + 1;
      });
      cycle.registerPhaseListener(() => {
        count = count + 1;
      });
      cycle.registerPhaseListener(() => {
        count = count + 1;
      });

      deps.setTime(BigInt(6) * HOUR);
      cycle.advanceClock('world-1');

      expect(count).toBe(3);
    });

    it('does not notify listeners when phase unchanged', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));

      let notified = false;
      cycle.registerPhaseListener(() => {
        notified = true;
      });

      deps.setTime(BigInt(1) * HOUR);
      cycle.advanceClock('world-1');

      expect(notified).toBe(false);
    });
  });

  describe('getTransitionHistory', () => {
    it('returns empty array for world with no transitions', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      const history = cycle.getTransitionHistory('world-1');
      expect(history).toHaveLength(0);
    });

    it('returns empty array for unregistered world', () => {
      const cycle = createDayNightCycle(deps);
      const history = cycle.getTransitionHistory('nonexistent');
      expect(history).toHaveLength(0);
    });

    it('records phase transitions', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));

      deps.setTime(BigInt(6) * HOUR);
      cycle.advanceClock('world-1');

      const history = cycle.getTransitionHistory('world-1');
      expect(history.length).toBeGreaterThan(0);
    });

    it('records multiple transitions', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));

      deps.setTime(BigInt(6) * HOUR);
      cycle.advanceClock('world-1');

      deps.setTime(BigInt(12) * HOUR);
      cycle.advanceClock('world-1');

      const history = cycle.getTransitionHistory('world-1');
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('limits history to 50 records', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));

      for (let i = 0; i < 100; i = i + 1) {
        deps.setTime(BigInt(i) * BigInt(3) * HOUR);
        cycle.advanceClock('world-1');
      }

      const history = cycle.getTransitionHistory('world-1');
      expect(history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('getAllWorlds', () => {
    it('returns empty array when no worlds registered', () => {
      const cycle = createDayNightCycle(deps);
      const worlds = cycle.getAllWorlds();
      expect(worlds).toHaveLength(0);
    });

    it('returns all registered worlds', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      cycle.registerWorld('world-2', BigInt(0));
      cycle.registerWorld('world-3', BigInt(0));

      const worlds = cycle.getAllWorlds();
      expect(worlds).toHaveLength(3);
    });

    it('returns worlds with current state', () => {
      deps.setTime(BigInt(10) * HOUR);
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));

      const worlds = cycle.getAllWorlds();
      const world1 = worlds[0];
      if (world1 === undefined) {
        throw new Error('Expected world');
      }

      expect(world1.currentPhase).toBe('MIDDAY');
    });
  });

  describe('full day cycle', () => {
    it('cycles through all 8 phases in 24 hours', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));

      const phases = new Set<string>();

      for (let hour = 0; hour < 24; hour = hour + 1) {
        deps.setTime(BigInt(hour) * HOUR);
        cycle.advanceClock('world-1');
        const phase = cycle.getCurrentPhase('world-1');
        if (typeof phase === 'string' && phase !== 'WORLD_NOT_FOUND') {
          phases.add(phase);
        }
      }

      expect(phases.size).toBe(8);
    });

    it('maintains independent time for multiple worlds', () => {
      const cycle = createDayNightCycle(deps);
      cycle.registerWorld('world-1', BigInt(0));
      cycle.registerWorld('world-2', BigInt(6) * HOUR);

      deps.setTime(BigInt(0));
      cycle.advanceAllClocks();

      const phase1 = cycle.getCurrentPhase('world-1');
      const phase2 = cycle.getCurrentPhase('world-2');

      expect(phase1).toBe('DEEP_NIGHT');
      expect(phase2).toBe('MORNING');
    });
  });
});
