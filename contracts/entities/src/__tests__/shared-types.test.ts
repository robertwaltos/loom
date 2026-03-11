/**
 * Shared Types — Validates geometric type contracts.
 */

import { describe, it, expect } from 'vitest';
import type { Vec3, Quat, NumericRange } from '../shared-types.js';

describe('Vec3', () => {
  it('represents a 3D position at origin', () => {
    const origin: Vec3 = { x: 0, y: 0, z: 0 };
    expect(origin.x).toBe(0);
    expect(origin.y).toBe(0);
    expect(origin.z).toBe(0);
  });

  it('represents a non-zero position', () => {
    const pos: Vec3 = { x: 100.5, y: -50.3, z: 200 };
    expect(pos.x).toBe(100.5);
    expect(pos.y).toBe(-50.3);
    expect(pos.z).toBe(200);
  });

  it('is structurally compatible with inline position shapes', () => {
    const pos: Vec3 = { x: 1, y: 2, z: 3 };
    const inline: { readonly x: number; readonly y: number; readonly z: number } = pos;
    expect(inline.x).toBe(1);
  });
});

describe('Quat', () => {
  it('represents identity rotation (no rotation)', () => {
    const identity: Quat = { x: 0, y: 0, z: 0, w: 1 };
    expect(identity.w).toBe(1);
    expect(identity.x).toBe(0);
  });

  it('represents a 90-degree Y rotation', () => {
    const rot: Quat = { x: 0, y: 0.7071, z: 0, w: 0.7071 };
    expect(rot.y).toBeCloseTo(0.7071);
    expect(rot.w).toBeCloseTo(0.7071);
  });
});

describe('NumericRange', () => {
  it('represents a pitch limit range', () => {
    const pitchLimits: NumericRange = { min: -89, max: 89 };
    expect(pitchLimits.min).toBe(-89);
    expect(pitchLimits.max).toBe(89);
    expect(pitchLimits.max).toBeGreaterThan(pitchLimits.min);
  });
});
