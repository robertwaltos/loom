/**
 * Adventures Engine Bootstrap — Koydo Worlds
 *
 * Creates an AdventuresEngine pre-loaded with all 36 adventure configs
 * (one per entry × 9 worlds with full content).
 */

import { createAdventuresEngine } from './engine.js';
import type { AdventuresEngine } from './engine.js';
import { ADVENTURE_CONFIGS } from './configs.js';

export function createBootstrappedAdventuresEngine(): AdventuresEngine {
  return createAdventuresEngine({ configs: ADVENTURE_CONFIGS });
}
