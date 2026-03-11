/**
 * World & Silfen Weave Events
 */

import type { LoomEvent } from './event.js';

export type WeaveTransitionStartedEvent = LoomEvent<
  'weave.transition.started',
  {
    readonly transitionId: string;
    readonly entityId: string;
    readonly sourceWorldId: string;
    readonly destinationWorldId: string;
    readonly estimatedDurationMs: number;
  }
>;

export type WeaveTransitionCompletedEvent = LoomEvent<
  'weave.transition.completed',
  {
    readonly transitionId: string;
    readonly entityId: string;
    readonly sourceWorldId: string;
    readonly destinationWorldId: string;
    readonly actualDurationMs: number;
  }
>;

export type WeaveTransitionAbortedEvent = LoomEvent<
  'weave.transition.aborted',
  {
    readonly transitionId: string;
    readonly entityId: string;
    readonly reason: 'destination-unavailable' | 'player-reversed' | 'timeout' | 'error';
    readonly errorMessage?: string;
  }
>;

export type WorldLoadedEvent = LoomEvent<
  'world.loaded',
  {
    readonly worldId: string;
    readonly serverId: string;
    readonly playerCapacity: number;
  }
>;

export type WorldUnloadedEvent = LoomEvent<
  'world.unloaded',
  {
    readonly worldId: string;
    readonly reason: 'empty' | 'shutdown' | 'error';
  }
>;
