/**
 * shared-types.ts — Shared geometric types used across components.
 *
 * These are structurally compatible with the bridge-loom contract's
 * Vector3 and Quaternion types, enabling zero-cost mapping between
 * game state and visual state.
 */

// ── Vectors ─────────────────────────────────────────────────────

/** 3D vector in world space (meters). */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Quaternion rotation (unit quaternion, w-last convention). */
export interface Quat {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

// ── Ranges ──────────────────────────────────────────────────────

/** Numeric range with inclusive min/max bounds. */
export interface NumericRange {
  readonly min: number;
  readonly max: number;
}
