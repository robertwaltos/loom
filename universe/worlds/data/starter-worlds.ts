/**
 * Koydo Worlds — Starter World Set
 *
 * The 10 worlds surfaced to a new player during onboarding.
 * Always includes The Great Archive (hub/tutorial) and covers
 * all four realms so every child finds something familiar.
 *
 * Import source: universe/worlds/registry.ts (canonical definitions).
 */

import { getWorld } from '../registry.js';
import type { WorldDefinition } from '../types.js';

// ─── Starter World IDs ─────────────────────────────────────────────
//
// Selection criteria:
//   1. great-archive  — hub world, every new player starts here
//   2. everywhere     — navigation tutorial, second stop
//   3. cloud-kingdom  — Discovery entry point (weather / Earth Science)
//   4. number-garden  — Discovery (Mathematics / Patterns) — high engagement
//   5. code-canyon    — Discovery (Coding / Logic) — modern relevance
//   6. story-tree     — Expression entry point (Storytelling / Narrative)
//   7. letter-forge   — Expression (Phonics) — younger players
//   8. market-square  — Exchange entry point (Money Basics)
//   9. budget-kitchen — Exchange (Budgeting) — practical life skill
//  10. thinking-grove — Crossroads (Ethics / Critical Thinking)

export const STARTER_WORLD_IDS = [
  'great-archive',
  'everywhere',
  'cloud-kingdom',
  'number-garden',
  'code-canyon',
  'story-tree',
  'letter-forge',
  'market-square',
  'budget-kitchen',
  'thinking-grove',
] as const;

export type StarterWorldId = typeof STARTER_WORLD_IDS[number];

// ─── Starter World Definitions ─────────────────────────────────────

export const STARTER_WORLDS: readonly WorldDefinition[] =
  STARTER_WORLD_IDS.map(getWorld);

// ─── Lookup helpers ────────────────────────────────────────────────

const STARTER_MAP: ReadonlyMap<string, WorldDefinition> = new Map(
  STARTER_WORLDS.map((w) => [w.id, w]),
);

export function getStarterWorld(id: string): WorldDefinition | undefined {
  return STARTER_MAP.get(id);
}

export function isStarterWorld(id: string): id is StarterWorldId {
  return STARTER_MAP.has(id);
}

/** Returns starter worlds filtered to a single realm, preserving order. */
export function getStarterWorldsByRealm(
  realm: WorldDefinition['realm'],
): readonly WorldDefinition[] {
  return STARTER_WORLDS.filter((w) => w.realm === realm);
}
