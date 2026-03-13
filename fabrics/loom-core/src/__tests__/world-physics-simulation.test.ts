import { describe, expect, it } from 'vitest';
import {
  createWorldPhysicsState,
  registerWorldPhysics,
  setConstraint,
  updatePhysics,
  getModifiers,
  getPhysicsReport,
} from '../world-physics.js';

describe('world-physics simulation', () => {
  it('simulates constrained world physics registration and derived gameplay modifier analysis', () => {
    let now = 1_000_000n;
    let id = 0;
    const state = createWorldPhysicsState(
      { nowMicros: () => now++ },
      { nextId: () => 'id-' + String(++id) },
      { info: () => undefined, warn: () => undefined, error: () => undefined },
    );

    setConstraint(state, 'earth', 8, 14, ['STANDARD', 'DENSE'], 20, 30);
    const base = registerWorldPhysics(state, 'earth', 9.81, 'STANDARD', 24, 1.0, 0.5, 101.325, 288);
    expect(typeof base).toBe('object');

    const updated = updatePhysics(state, 'earth', { gravity: 12.0, atmosphere: 'DENSE' });
    const modifiers = getModifiers(state, 'earth');
    const report = getPhysicsReport(state, 'earth');

    expect(typeof updated).toBe('object');
    expect(typeof modifiers).toBe('object');
    if (typeof modifiers === 'string') return;
    expect(modifiers.fallDamageMultiplier).toBeGreaterThan(0);
    expect(modifiers.travelSpeedModifier).toBeGreaterThan(0);
    expect(typeof report).toBe('object');
  });
});
