/**
 * Koydo Universe — Adventure Type Definitions
 *
 * Seven adventure types, each mapping to a distinct UI/UX pattern.
 * Every RealWorldEntry specifies exactly one adventure type.
 */

import type { AdventureType, DifficultyTier } from '../content/types.js';
import type { WorldId } from '../worlds/types.js';

// ─── Adventure Configuration ───────────────────────────────────────

export interface AdventureConfig {
  readonly type: AdventureType;
  readonly entryId: string;
  readonly worldId: WorldId;
  readonly guideId: string;
  readonly difficultyTier: DifficultyTier;
  readonly estimatedMinutes: number;
  readonly interactionMode: InteractionMode;
}

export type InteractionMode =
  | 'passive_observation'     // Remembrance Wall — view + reflect
  | 'guided_walk'             // Guided Expedition — follow guide, interact
  | 'search_collect'          // Artifact Hunt — find scattered items
  | 'interactive_replay'      // Reenactment — participate in historical moment
  | '3d_exploration'          // Field Trip — free-roam rendered environment
  | 'window_view'             // Time Window — observe through a portal
  | 'nature_walk';            // Natural Exploration — observe natural phenomena

// ─── Adventure Type Details ────────────────────────────────────────

/**
 * 1. Remembrance Wall
 *    Static display honoring a person/event. Interactive elements for
 *    deeper exploration. Passive learning, emotional connection.
 *
 * 2. Guided Expedition
 *    Guide character leads child through a learning journey.
 *    Most common type. Conversational, paced by the child.
 *
 * 3. Artifact Hunt
 *    Scattered items across the world that tell a story when assembled.
 *    Encourages exploration and spatial reasoning.
 *
 * 4. Reenactment
 *    Child participates in a simplified version of a historical event.
 *    Most interactive type — learning through doing.
 *
 * 5. Field Trip
 *    Free-roam exploration of a rendered real-world location.
 *    (Ghibli/NatGeo style) with guide providing context.
 *
 * 6. Time Window
 *    Portal into a specific historical moment. Child observes, then
 *    discusses with guide. Emphasizes perspective and context.
 *
 * 7. Natural Exploration
 *    Observation of natural phenomena (aurora, trench, canyon).
 *    Science-focused, sensory, awe-inducing.
 */

// ─── Adventure State ───────────────────────────────────────────────

export type AdventureState =
  | 'locked'          // Prerequisites not met
  | 'available'       // Ready to start
  | 'in_progress'     // Currently active
  | 'completed'       // Finished
  | 'mastered';       // Completed with high engagement

export interface AdventureProgress {
  readonly kindlerId: string;
  readonly entryId: string;
  readonly state: AdventureState;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
  readonly interactionCount: number;
  readonly luminanceContributed: number;
}
