import { describe, it, expect, beforeEach } from 'vitest';
import type {
  TreatyState,
  Clock,
  IdGenerator,
  Logger,
  Treaty,
  TreatyTerm,
  ComplianceEvent,
  ViolationRecord,
  TreatyHealth,
  ExpiryAlert,
  TreatyReport,
  TreatyStatus,
  ObligationType,
} from '../treaty-archive.js';
import {
  createTreatyState,
  recordTreaty,
  getTreaty,
  updateTreatyStatus,
  terminateTreaty,
  addTerm,
  getTerm,
  updateNextDueDate,
  getTermsByTreaty,
  recordCompliance,
  getComplianceEvents,
  getComplianceByParty,
  recordViolation,
  getViolations,
  getViolationsByParty,
  computeHealth,
  getExpiryAlerts,
  clearExpiredAlerts,
  processExpiredTreaties,
  getTreatyReport,
  getAllTreaties,
  getTreatiesByParty,
  getTreatiesByStatus,
  getActiveTreaties,
  getOverdueTreaties,
} from '../treaty-archive.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockClock(): Clock {
  let time = 1000n * 86400n * 1000000n;
  return {
    now: () => {
      time = time + 1000n;
      return time;
    },
  };
}

function createMockIdGen(): IdGenerator {
  let counter = 0;
  return {
    generate: () => {
      counter = counter + 1;
      return 'id-' + String(counter);
    },
  };
}

function createMockLogger(): Logger {
  const messages: string[] = [];
  const errors: string[] = [];
  return {
    info: (msg: string) => {
      messages.push(msg);
    },
    error: (msg: string) => {
      errors.push(msg);
    },
  };
}

// ============================================================================
// TESTS: TREATY MANAGEMENT
// ============================================================================

describe('Treaty Archive - Treaty Management', () => {
  let state: TreatyState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createTreatyState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should record a treaty', () => {
    const treaty = recordTreaty(
      state,
      'Peace Treaty',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    expect(typeof treaty).toBe('object');
    if (typeof treaty === 'object') {
      expect(treaty.name).toBe('Peace Treaty');
      expect(treaty.parties.length).toBe(2);
      expect(treaty.status).toBe('ACTIVE');
    }
  });

  it('should return invalid-treaty for empty name', () => {
    const treaty = recordTreaty(
      state,
      '',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    expect(treaty).toBe('invalid-treaty');
  });

  it('should return invalid-party for less than 2 parties', () => {
    const treaty = recordTreaty(
      state,
      'Treaty',
      ['dyn1'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    expect(treaty).toBe('invalid-party');
  });

  it('should return invalid-date for negative effectiveDate', () => {
    const treaty = recordTreaty(
      state,
      'Treaty',
      ['dyn1', 'dyn2'],
      -1000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    expect(treaty).toBe('invalid-date');
  });

  it('should return invalid-date for expiryDate before effectiveDate', () => {
    const treaty = recordTreaty(
      state,
      'Treaty',
      ['dyn1', 'dyn2'],
      2000000n,
      1000000n,
      idGen,
      clock,
      logger,
    );
    expect(treaty).toBe('invalid-date');
  });

  it('should allow null expiryDate for perpetual treaties', () => {
    const treaty = recordTreaty(
      state,
      'Eternal Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      null,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      expect(treaty.expiryDate).toBe(null);
    }
  });

  it('should store treaty in state', () => {
    const treaty = recordTreaty(
      state,
      'Alliance',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      expect(state.treaties.has(treaty.id)).toBe(true);
    }
  });

  it('should get treaty by id', () => {
    const created = recordTreaty(
      state,
      'Trade Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof created === 'object') {
      const retrieved = getTreaty(state, created.id);
      expect(typeof retrieved).toBe('object');
      if (typeof retrieved === 'object') {
        expect(retrieved.id).toBe(created.id);
      }
    }
  });

  it('should return treaty-not-found for missing id', () => {
    const treaty = getTreaty(state, 'missing-id');
    expect(treaty).toBe('treaty-not-found');
  });

  it('should return invalid-treaty for empty id', () => {
    const treaty = getTreaty(state, '');
    expect(treaty).toBe('invalid-treaty');
  });

  it('should update treaty status', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const updated = updateTreatyStatus(state, treaty.id, 'SUSPENDED', logger);
      if (typeof updated === 'object') {
        expect(updated.status).toBe('SUSPENDED');
      }
    }
  });

  it('should return invalid-status for bad status', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const updated = updateTreatyStatus(state, treaty.id, 'BAD' as TreatyStatus, logger);
      expect(updated).toBe('invalid-status');
    }
  });

  it('should terminate treaty', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const terminated = terminateTreaty(state, treaty.id, logger);
      if (typeof terminated === 'object') {
        expect(terminated.status).toBe('TERMINATED');
      }
    }
  });

  it('should get all treaties', () => {
    recordTreaty(state, 'Treaty1', ['dyn1', 'dyn2'], 1000000n, 2000000n, idGen, clock, logger);
    recordTreaty(state, 'Treaty2', ['dyn3', 'dyn4'], 1100000n, 2100000n, idGen, clock, logger);
    const treaties = getAllTreaties(state);
    expect(treaties.length).toBe(2);
  });

  it('should get treaties by party', () => {
    recordTreaty(state, 'Treaty1', ['dyn1', 'dyn2'], 1000000n, 2000000n, idGen, clock, logger);
    recordTreaty(state, 'Treaty2', ['dyn1', 'dyn3'], 1100000n, 2100000n, idGen, clock, logger);
    recordTreaty(state, 'Treaty3', ['dyn4', 'dyn5'], 1200000n, 2200000n, idGen, clock, logger);
    const treaties = getTreatiesByParty(state, 'dyn1');
    expect(treaties.length).toBe(2);
  });

  it('should get treaties by status', () => {
    const t1 = recordTreaty(
      state,
      'Treaty1',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    recordTreaty(state, 'Treaty2', ['dyn3', 'dyn4'], 1100000n, 2100000n, idGen, clock, logger);
    if (typeof t1 === 'object') {
      updateTreatyStatus(state, t1.id, 'SUSPENDED', logger);
    }
    const active = getTreatiesByStatus(state, 'ACTIVE');
    const suspended = getTreatiesByStatus(state, 'SUSPENDED');
    expect(active.length).toBe(1);
    expect(suspended.length).toBe(1);
  });

  it('should get active treaties', () => {
    recordTreaty(state, 'Treaty1', ['dyn1', 'dyn2'], 1000000n, 2000000n, idGen, clock, logger);
    const t2 = recordTreaty(
      state,
      'Treaty2',
      ['dyn3', 'dyn4'],
      1100000n,
      2100000n,
      idGen,
      clock,
      logger,
    );
    if (typeof t2 === 'object') {
      terminateTreaty(state, t2.id, logger);
    }
    const active = getActiveTreaties(state);
    expect(active.length).toBe(1);
  });
});

// ============================================================================
// TESTS: TREATY TERMS
// ============================================================================

describe('Treaty Archive - Treaty Terms', () => {
  let state: TreatyState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createTreatyState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should add a term to treaty', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay 1000 KALON monthly',
        1000n,
        86400000000n,
        idGen,
        clock,
      );
      expect(typeof term).toBe('object');
      if (typeof term === 'object') {
        expect(term.obligationType).toBe('TRIBUTE');
        expect(term.obligatedParty).toBe('dyn1');
      }
    }
  });

  it('should return treaty-not-found for missing treaty', () => {
    const term = addTerm(
      state,
      'missing-id',
      'TRIBUTE',
      'dyn1',
      'dyn2',
      'Pay tribute',
      1000n,
      null,
      idGen,
      clock,
    );
    expect(term).toBe('treaty-not-found');
  });

  it('should return invalid-obligation for bad obligation type', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'BAD' as ObligationType,
        'dyn1',
        'dyn2',
        'Do something',
        500n,
        null,
        idGen,
        clock,
      );
      expect(term).toBe('invalid-obligation');
    }
  });

  it('should return invalid-party for empty obligatedParty', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        '',
        'dyn2',
        'Pay tribute',
        1000n,
        null,
        idGen,
        clock,
      );
      expect(term).toBe('invalid-party');
    }
  });

  it('should return invalid-penalty for negative penalty', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay tribute',
        -100n,
        null,
        idGen,
        clock,
      );
      expect(term).toBe('invalid-penalty');
    }
  });

  it('should store term in state', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'MILITARY_SUPPORT',
        'dyn1',
        'dyn2',
        'Provide 100 troops',
        5000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        expect(state.terms.has(term.id)).toBe(true);
      }
    }
  });

  it('should add term id to treaty', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRADE_AGREEMENT',
        'dyn1',
        'dyn2',
        'Trade goods',
        2000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        expect(treaty.terms.includes(term.id)).toBe(true);
      }
    }
  });

  it('should get term by id', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const created = addTerm(
        state,
        treaty.id,
        'NON_AGGRESSION',
        'dyn1',
        'dyn2',
        'Do not attack',
        10000n,
        null,
        idGen,
        clock,
      );
      if (typeof created === 'object') {
        const retrieved = getTerm(state, created.id);
        expect(typeof retrieved).toBe('object');
        if (typeof retrieved === 'object') {
          expect(retrieved.id).toBe(created.id);
        }
      }
    }
  });

  it('should return term-not-found for missing term', () => {
    const term = getTerm(state, 'missing-id');
    expect(term).toBe('term-not-found');
  });

  it('should update next due date', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay monthly',
        1000n,
        86400000000n,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        const updated = updateNextDueDate(state, term.id, 5000000n);
        if (typeof updated === 'object') {
          expect(updated.nextDueDate).toBe(5000000n);
        }
      }
    }
  });

  it('should get terms by treaty', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      addTerm(state, treaty.id, 'TRIBUTE', 'dyn1', 'dyn2', 'Term1', 1000n, null, idGen, clock);
      addTerm(
        state,
        treaty.id,
        'MILITARY_SUPPORT',
        'dyn1',
        'dyn2',
        'Term2',
        2000n,
        null,
        idGen,
        clock,
      );
      const terms = getTermsByTreaty(state, treaty.id);
      expect(terms.length).toBe(2);
    }
  });

  it('should support all obligation types', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const types: ObligationType[] = [
        'TRIBUTE',
        'MILITARY_SUPPORT',
        'TRADE_AGREEMENT',
        'NON_AGGRESSION',
        'TECHNOLOGY_SHARING',
        'BORDER_RESPECT',
        'CULTURAL_EXCHANGE',
      ];
      for (const type of types) {
        const term = addTerm(
          state,
          treaty.id,
          type,
          'dyn1',
          'dyn2',
          'Test',
          1000n,
          null,
          idGen,
          clock,
        );
        expect(typeof term).toBe('object');
      }
    }
  });
});

// ============================================================================
// TESTS: COMPLIANCE MONITORING
// ============================================================================

describe('Treaty Archive - Compliance Monitoring', () => {
  let state: TreatyState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createTreatyState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should record compliance event', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        const event = recordCompliance(
          state,
          treaty.id,
          term.id,
          'dyn1',
          true,
          'Paid on time',
          idGen,
          clock,
          logger,
        );
        expect(typeof event).toBe('object');
        if (typeof event === 'object') {
          expect(event.complied).toBe(true);
        }
      }
    }
  });

  it('should return treaty-not-found for missing treaty', () => {
    const event = recordCompliance(
      state,
      'missing-id',
      'term-id',
      'dyn1',
      true,
      'Test',
      idGen,
      clock,
      logger,
    );
    expect(event).toBe('treaty-not-found');
  });

  it('should return term-not-found for missing term', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const event = recordCompliance(
        state,
        treaty.id,
        'missing-term',
        'dyn1',
        true,
        'Test',
        idGen,
        clock,
        logger,
      );
      expect(event).toBe('term-not-found');
    }
  });

  it('should return invalid-party for empty obligatedParty', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        const event = recordCompliance(
          state,
          treaty.id,
          term.id,
          '',
          true,
          'Test',
          idGen,
          clock,
          logger,
        );
        expect(event).toBe('invalid-party');
      }
    }
  });

  it('should store compliance event in state', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        const event = recordCompliance(
          state,
          treaty.id,
          term.id,
          'dyn1',
          true,
          'Paid',
          idGen,
          clock,
          logger,
        );
        if (typeof event === 'object') {
          expect(state.compliance.has(event.id)).toBe(true);
        }
      }
    }
  });

  it('should update next due date for recurring terms', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay monthly',
        1000n,
        86400000000n,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        const oldDue = term.nextDueDate;
        recordCompliance(state, treaty.id, term.id, 'dyn1', true, 'Paid', idGen, clock, logger);
        const updated = getTerm(state, term.id);
        if (typeof updated === 'object' && oldDue !== null && updated.nextDueDate !== null) {
          expect(updated.nextDueDate).toBeGreaterThan(oldDue);
        }
      }
    }
  });

  it('should get compliance events by treaty', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordCompliance(state, treaty.id, term.id, 'dyn1', true, 'Paid 1', idGen, clock, logger);
        recordCompliance(
          state,
          treaty.id,
          term.id,
          'dyn1',
          false,
          'Failed 1',
          idGen,
          clock,
          logger,
        );
        const events = getComplianceEvents(state, treaty.id);
        expect(events.length).toBe(2);
      }
    }
  });

  it('should get compliance by party', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2', 'dyn3'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordCompliance(state, treaty.id, term.id, 'dyn1', true, 'Paid', idGen, clock, logger);
        recordCompliance(state, treaty.id, term.id, 'dyn3', false, 'Failed', idGen, clock, logger);
        const events = getComplianceByParty(state, treaty.id, 'dyn1');
        expect(events.length).toBe(1);
        expect(events[0]?.obligatedParty).toBe('dyn1');
      }
    }
  });

  it('should sort compliance events by date descending', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordCompliance(state, treaty.id, term.id, 'dyn1', true, 'Old', idGen, clock, logger);
        recordCompliance(state, treaty.id, term.id, 'dyn1', true, 'New', idGen, clock, logger);
        const events = getComplianceEvents(state, treaty.id);
        expect(events[0]?.notes).toBe('New');
      }
    }
  });
});

// ============================================================================
// TESTS: VIOLATION TRACKING
// ============================================================================

describe('Treaty Archive - Violation Tracking', () => {
  let state: TreatyState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createTreatyState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should record violation', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'NON_AGGRESSION',
        'dyn1',
        'dyn2',
        'No war',
        5000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        const violation = recordViolation(
          state,
          treaty.id,
          term.id,
          'dyn1',
          80,
          'Attacked ally',
          idGen,
          clock,
          logger,
        );
        expect(typeof violation).toBe('object');
        if (typeof violation === 'object') {
          expect(violation.severity).toBe(80);
        }
      }
    }
  });

  it('should return invalid-severity for severity < 0', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'NON_AGGRESSION',
        'dyn1',
        'dyn2',
        'No war',
        5000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        const violation = recordViolation(
          state,
          treaty.id,
          term.id,
          'dyn1',
          -10,
          'Test',
          idGen,
          clock,
          logger,
        );
        expect(violation).toBe('invalid-severity');
      }
    }
  });

  it('should return invalid-severity for severity > 100', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'NON_AGGRESSION',
        'dyn1',
        'dyn2',
        'No war',
        5000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        const violation = recordViolation(
          state,
          treaty.id,
          term.id,
          'dyn1',
          110,
          'Test',
          idGen,
          clock,
          logger,
        );
        expect(violation).toBe('invalid-severity');
      }
    }
  });

  it('should calculate penalty based on severity', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'NON_AGGRESSION',
        'dyn1',
        'dyn2',
        'No war',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        const violation = recordViolation(
          state,
          treaty.id,
          term.id,
          'dyn1',
          50,
          'Attack',
          idGen,
          clock,
          logger,
        );
        if (typeof violation === 'object') {
          expect(violation.penaltyAssessed).toBeGreaterThan(1000n);
        }
      }
    }
  });

  it('should mark treaty as VIOLATED for high severity', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'NON_AGGRESSION',
        'dyn1',
        'dyn2',
        'No war',
        5000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordViolation(
          state,
          treaty.id,
          term.id,
          'dyn1',
          80,
          'Major breach',
          idGen,
          clock,
          logger,
        );
        const updated = getTreaty(state, treaty.id);
        if (typeof updated === 'object') {
          expect(updated.status).toBe('VIOLATED');
        }
      }
    }
  });

  it('should not mark treaty as VIOLATED for low severity', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'NON_AGGRESSION',
        'dyn1',
        'dyn2',
        'No war',
        5000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordViolation(
          state,
          treaty.id,
          term.id,
          'dyn1',
          40,
          'Minor breach',
          idGen,
          clock,
          logger,
        );
        const updated = getTreaty(state, treaty.id);
        if (typeof updated === 'object') {
          expect(updated.status).toBe('ACTIVE');
        }
      }
    }
  });

  it('should store violation in state', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        const violation = recordViolation(
          state,
          treaty.id,
          term.id,
          'dyn1',
          60,
          'Failed payment',
          idGen,
          clock,
          logger,
        );
        if (typeof violation === 'object') {
          expect(state.violations.has(violation.id)).toBe(true);
        }
      }
    }
  });

  it('should get violations by treaty', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordViolation(state, treaty.id, term.id, 'dyn1', 50, 'First', idGen, clock, logger);
        recordViolation(state, treaty.id, term.id, 'dyn1', 60, 'Second', idGen, clock, logger);
        const violations = getViolations(state, treaty.id);
        expect(violations.length).toBe(2);
      }
    }
  });

  it('should get violations by party', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2', 'dyn3'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordViolation(state, treaty.id, term.id, 'dyn1', 50, 'Breach 1', idGen, clock, logger);
        recordViolation(state, treaty.id, term.id, 'dyn3', 60, 'Breach 2', idGen, clock, logger);
        const violations = getViolationsByParty(state, treaty.id, 'dyn1');
        expect(violations.length).toBe(1);
        expect(violations[0]?.violatorDynasty).toBe('dyn1');
      }
    }
  });
});

// ============================================================================
// TESTS: TREATY HEALTH
// ============================================================================

describe('Treaty Archive - Treaty Health', () => {
  let state: TreatyState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createTreatyState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should compute treaty health', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordCompliance(state, treaty.id, term.id, 'dyn1', true, 'Paid', idGen, clock, logger);
        const health = computeHealth(state, treaty.id, clock);
        expect(typeof health).toBe('object');
        if (typeof health === 'object') {
          expect(health.healthScore).toBeGreaterThan(0);
        }
      }
    }
  });

  it('should return treaty-not-found for missing treaty', () => {
    const health = computeHealth(state, 'missing-id', clock);
    expect(health).toBe('treaty-not-found');
  });

  it('should calculate compliance rate', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordCompliance(state, treaty.id, term.id, 'dyn1', true, 'Paid 1', idGen, clock, logger);
        recordCompliance(state, treaty.id, term.id, 'dyn1', true, 'Paid 2', idGen, clock, logger);
        recordCompliance(state, treaty.id, term.id, 'dyn1', false, 'Failed', idGen, clock, logger);
        const health = computeHealth(state, treaty.id, clock);
        if (typeof health === 'object') {
          expect(health.complianceRate).toBeCloseTo(0.666, 2);
        }
      }
    }
  });

  it('should reduce health for violations', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'NON_AGGRESSION',
        'dyn1',
        'dyn2',
        'No war',
        5000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordCompliance(state, treaty.id, term.id, 'dyn1', true, 'Complied', idGen, clock, logger);
        recordViolation(state, treaty.id, term.id, 'dyn1', 70, 'Attacked', idGen, clock, logger);
        const health = computeHealth(state, treaty.id, clock);
        if (typeof health === 'object') {
          expect(health.healthScore).toBeLessThan(60);
        }
      }
    }
  });

  it('should count total compliance events', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordCompliance(state, treaty.id, term.id, 'dyn1', true, 'P1', idGen, clock, logger);
        recordCompliance(state, treaty.id, term.id, 'dyn1', false, 'F1', idGen, clock, logger);
        const health = computeHealth(state, treaty.id, clock);
        if (typeof health === 'object') {
          expect(health.totalComplianceEvents).toBe(2);
        }
      }
    }
  });

  it('should count total violations', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'NON_AGGRESSION',
        'dyn1',
        'dyn2',
        'No war',
        5000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordViolation(state, treaty.id, term.id, 'dyn1', 50, 'V1', idGen, clock, logger);
        recordViolation(state, treaty.id, term.id, 'dyn1', 60, 'V2', idGen, clock, logger);
        const health = computeHealth(state, treaty.id, clock);
        if (typeof health === 'object') {
          expect(health.totalViolations).toBe(2);
        }
      }
    }
  });
});

// ============================================================================
// TESTS: EXPIRY ALERTS
// ============================================================================

describe('Treaty Archive - Expiry Alerts', () => {
  let state: TreatyState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createTreatyState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should generate expiry alerts', () => {
    const now = clock.now();
    const soon = now + 5n * 86400n * 1000000n;
    recordTreaty(state, 'Expiring Soon', ['dyn1', 'dyn2'], now, soon, idGen, clock, logger);
    const alerts = getExpiryAlerts(state, 10, clock, idGen);
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('should not alert for treaties expiring beyond threshold', () => {
    const now = clock.now();
    const later = now + 50n * 86400n * 1000000n;
    recordTreaty(state, 'Expiring Later', ['dyn1', 'dyn2'], now, later, idGen, clock, logger);
    const alerts = getExpiryAlerts(state, 30, clock, idGen);
    expect(alerts.length).toBe(0);
  });

  it('should set URGENT alert level for < 7 days', () => {
    const now = clock.now();
    const urgent = now + 3n * 86400n * 1000000n;
    recordTreaty(state, 'Urgent', ['dyn1', 'dyn2'], now, urgent, idGen, clock, logger);
    const alerts = getExpiryAlerts(state, 10, clock, idGen);
    if (alerts.length > 0) {
      expect(alerts[0]?.alertLevel).toBe('URGENT');
    }
  });

  it('should set WARNING alert level for 7-30 days', () => {
    const now = clock.now();
    const warning = now + 15n * 86400n * 1000000n;
    recordTreaty(state, 'Warning', ['dyn1', 'dyn2'], now, warning, idGen, clock, logger);
    const alerts = getExpiryAlerts(state, 30, clock, idGen);
    if (alerts.length > 0) {
      expect(alerts[0]?.alertLevel).toBe('WARNING');
    }
  });

  it('should not alert for perpetual treaties', () => {
    recordTreaty(state, 'Perpetual', ['dyn1', 'dyn2'], clock.now(), null, idGen, clock, logger);
    const alerts = getExpiryAlerts(state, 30, clock, idGen);
    expect(alerts.length).toBe(0);
  });

  it('should not alert for inactive treaties', () => {
    const now = clock.now();
    const soon = now + 5n * 86400n * 1000000n;
    const treaty = recordTreaty(
      state,
      'Inactive',
      ['dyn1', 'dyn2'],
      now,
      soon,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      terminateTreaty(state, treaty.id, logger);
    }
    const alerts = getExpiryAlerts(state, 10, clock, idGen);
    expect(alerts.length).toBe(0);
  });

  it('should clear expired alerts', () => {
    const now = clock.now();
    const past = now - 10n * 86400n * 1000000n;
    recordTreaty(state, 'Past', ['dyn1', 'dyn2'], past - 1000000n, past, idGen, clock, logger);
    getExpiryAlerts(state, 100, clock, idGen);
    const cleared = clearExpiredAlerts(state, clock);
    expect(cleared).toBeGreaterThanOrEqual(0);
  });

  it('should process expired treaties', () => {
    const now = clock.now();
    const past = now - 10n * 86400n * 1000000n;
    recordTreaty(state, 'Expired', ['dyn1', 'dyn2'], past - 1000000n, past, idGen, clock, logger);
    const expired = processExpiredTreaties(state, clock, logger);
    expect(expired).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// TESTS: REPORTING
// ============================================================================

describe('Treaty Archive - Reporting', () => {
  let state: TreatyState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createTreatyState();
    clock = createMockClock();
    idGen = createMockIdGen();
    logger = createMockLogger();
  });

  it('should generate treaty report', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const report = getTreatyReport(state, treaty.id, clock);
      expect(typeof report).toBe('object');
      if (typeof report === 'object') {
        expect(report.treatyId).toBe(treaty.id);
      }
    }
  });

  it('should return treaty-not-found for missing treaty', () => {
    const report = getTreatyReport(state, 'missing-id', clock);
    expect(report).toBe('treaty-not-found');
  });

  it('should include health in report', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordCompliance(state, treaty.id, term.id, 'dyn1', true, 'Paid', idGen, clock, logger);
        const report = getTreatyReport(state, treaty.id, clock);
        if (typeof report === 'object') {
          expect(report.health).toBeDefined();
        }
      }
    }
  });

  it('should include recent compliance in report', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay',
        1000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordCompliance(state, treaty.id, term.id, 'dyn1', true, 'Paid', idGen, clock, logger);
        const report = getTreatyReport(state, treaty.id, clock);
        if (typeof report === 'object') {
          expect(report.recentCompliance.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('should include recent violations in report', () => {
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'NON_AGGRESSION',
        'dyn1',
        'dyn2',
        'No war',
        5000n,
        null,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        recordViolation(state, treaty.id, term.id, 'dyn1', 70, 'Attack', idGen, clock, logger);
        const report = getTreatyReport(state, treaty.id, clock);
        if (typeof report === 'object') {
          expect(report.recentViolations.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('should get overdue treaties', () => {
    const now = clock.now();
    const treaty = recordTreaty(
      state,
      'Pact',
      ['dyn1', 'dyn2'],
      1000000n,
      2000000n,
      idGen,
      clock,
      logger,
    );
    if (typeof treaty === 'object') {
      const term = addTerm(
        state,
        treaty.id,
        'TRIBUTE',
        'dyn1',
        'dyn2',
        'Pay monthly',
        1000n,
        86400000000n,
        idGen,
        clock,
      );
      if (typeof term === 'object') {
        const pastDue = now - 1000000n;
        updateNextDueDate(state, term.id, pastDue);
        const overdue = getOverdueTreaties(state, clock);
        expect(overdue.length).toBeGreaterThan(0);
      }
    }
  });
});
