/**
 * Koydo Worlds — Fading Engine Persistence Adapter
 *
 * The engine works with float luminance (0.0–1.0).
 * The Supabase world_luminance table stores integer luminance (0–100).
 *
 * Thread: silk/loom-core/fading-persistence
 * Tier: 1
 */

import { resolveFadingStage } from './engine.js';
import type { WorldLuminance } from '../worlds/types.js';

// ─── DB Row Types ─────────────────────────────────────────────────

/** Shape of a row from the world_luminance Supabase table */
export interface WorldLuminanceDbRow {
  readonly id: string;
  readonly world_slug: string;
  readonly world_name: string;
  readonly realm: string;
  readonly luminance: number;           // INTEGER 0–100 in Supabase
  readonly guide_name: string;
  readonly guide_subject: string;
  readonly updated_at: string;          // ISO 8601 timestamptz
}

/** Minimal payload for a PATCH/UPDATE to world_luminance */
export interface WorldLuminanceUpdatePayload {
  readonly luminance: number;           // INTEGER 0–100
  readonly updated_at: string;          // ISO 8601
}

/** Extra runtime counters not stored in DB but tracked by the Loom */
export interface WorldLuminanceCounters {
  readonly totalKindlersContributed: number;
  readonly activeKindlerCount: number;
}

// ─── Unit Conversions ─────────────────────────────────────────────

/** Engine float (0.0–1.0) → Supabase integer (0–100) */
export function luminanceToDb(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100);
}

/** Supabase integer (0–100) → Engine float (0.0–1.0) */
export function luminanceFromDb(v: number): number {
  const clamped = Math.max(0, Math.min(100, v));
  return Math.round((clamped / 100) * 1000) / 1000;
}

// ─── Row Mappers ──────────────────────────────────────────────────

/**
 * Hydrate a WorldLuminance value-object from a Supabase row.
 *
 * `totalKindlersContributed` and `activeKindlerCount` are ephemeral
 * counters maintained in The Loom — they are not stored in the DB.
 * Pass them in from the Loom's in-memory state if available.
 */
export function worldLuminanceFromRow(
  row: WorldLuminanceDbRow,
  counters?: Partial<WorldLuminanceCounters>,
): WorldLuminance {
  const luminance = luminanceFromDb(row.luminance);
  return {
    worldId: row.world_slug,
    luminance,
    stage: resolveFadingStage(luminance),
    lastRestoredAt: new Date(row.updated_at).getTime(),
    totalKindlersContributed: counters?.totalKindlersContributed ?? 0,
    activeKindlerCount: counters?.activeKindlerCount ?? 0,
  };
}

/**
 * Produce the minimal update payload for a PATCH to world_luminance.
 * Only luminance and the update timestamp change in normal operation.
 */
export function worldLuminanceToUpdatePayload(wl: WorldLuminance): WorldLuminanceUpdatePayload {
  return {
    luminance: luminanceToDb(wl.luminance),
    updated_at: new Date(wl.lastRestoredAt).toISOString(),
  };
}
