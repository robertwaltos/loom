import { describe, expect, it } from 'vitest';
import { createContinuityEngine } from '../dynasty-continuity.js';

const US_PER_DAY = 24 * 60 * 60 * 1_000_000;

describe('dynasty continuity simulation', () => {
  it('simulates free-tier inactivity to completion and heir activation', () => {
    let now = 0;
    const engine = createContinuityEngine({
      clock: { nowMicroseconds: () => now },
    });

    engine.initializeRecord('free-dynasty', 'free');
    engine.registerHeir('free-dynasty', 'heir-a');

    now += 180 * US_PER_DAY;
    let guard = 0;
    while (engine.getRecord('free-dynasty').state !== 'redistribution' && guard < 10) {
      engine.evaluateInactivity('free-dynasty');
      guard += 1;
    }

    expect(engine.getRecord('free-dynasty').state).toBe('redistribution');

    engine.completeRedistribution('free-dynasty');
    expect(engine.getRecord('free-dynasty').state).toBe('completed');

    engine.activateHeir('free-dynasty', 'heir-a');
    expect(engine.getRecord('free-dynasty').state).toBe('heir_activated');
    expect(engine.getRecord('free-dynasty').activatingHeirId).toBe('heir-a');
  });

  it('simulates paying-tier grace and recovery login', () => {
    let now = 0;
    const engine = createContinuityEngine({
      clock: { nowMicroseconds: () => now },
    });

    engine.initializeRecord('patron-dynasty', 'patron');
    now += 61 * US_PER_DAY;
    engine.evaluateInactivity('patron-dynasty');
    engine.evaluateInactivity('patron-dynasty');
    engine.evaluateInactivity('patron-dynasty');

    expect(engine.getRecord('patron-dynasty').state).toBe('grace_window');

    const recovery = engine.recordLogin('patron-dynasty');
    expect(recovery?.to).toBe('active');
    expect(engine.getRecord('patron-dynasty').state).toBe('active');
  });
});
