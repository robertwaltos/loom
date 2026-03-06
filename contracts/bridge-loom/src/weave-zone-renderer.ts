/**
 * Weave Zone Renderer Contract
 *
 * Handles the visual side of Silfen Weave transitions.
 * When a player enters a Weave Zone, two worlds must render simultaneously
 * with a blend factor controlling the transition.
 *
 * Not all rendering fabrics support this. Those that don't
 * fall back to simpler transition effects (fog, portal, fade).
 */

import type { WorldId } from './rendering-fabric.js';

export interface WeaveZoneRenderer {
  /**
   * Begin a transition between two worlds.
   * The rendering fabric starts rendering both simultaneously.
   */
  beginTransition(params: TransitionParams): Promise<void>;

  /**
   * Update the blend factor during transition.
   * 0.0 = fully in source world, 1.0 = fully in destination world.
   * Called every Loom tick during transition.
   */
  updateBlendFactor(factor: number): void;

  /**
   * Complete the transition. Source world can now be unloaded.
   */
  completeTransition(): Promise<void>;

  /**
   * Abort a transition and fully restore the source world.
   * Used when World B fails to respond or player turns back.
   */
  abortTransition(): Promise<void>;

  /** Is a transition currently active? */
  readonly isTransitioning: boolean;

  /** Current blend factor (0.0 to 1.0) */
  readonly currentBlendFactor: number;
}

export interface TransitionParams {
  readonly sourceWorldId: WorldId;
  readonly destinationWorldId: WorldId;

  /** How long the transition should take in seconds */
  readonly durationSeconds: number;

  /** Blend curve type */
  readonly blendCurve: BlendCurve;

  /** What to do if dual-render is too expensive (fps drops below threshold) */
  readonly fallbackStrategy: TransitionFallback;

  /** FPS threshold below which fallback activates */
  readonly fpsFloorThreshold: number;
}

export type BlendCurve = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'perceptual';

/**
 * Fallback strategies when hardware can't handle dual-render:
 * - volumetric-fog: Dense fog hides the swap
 * - portal: Visible portal/doorway effect
 * - fade-to-black: Cinematic fade
 * - narrative-beat: Custom effect (close eyes, blink, etc.)
 */
export type TransitionFallback = 'volumetric-fog' | 'portal' | 'fade-to-black' | 'narrative-beat';
