/**
 * Koydo Worlds — Achievements Domain Types
 *
 * Achievement definitions (title/description) live in the game config.
 * This module owns the unlock record — who earned what and when.
 */

// ─── Domain Types ──────────────────────────────────────────────────

export interface Achievement {
  readonly achievementId: string;   // matches a known achievement definition ID
  readonly playerId: string;        // kindler UUID
  readonly unlockedAt: number;      // epoch ms
  readonly progress: number;        // 0-100; 100 = fully unlocked
  readonly metadata: Record<string, unknown> | null;
}
