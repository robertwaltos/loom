/**
 * Player Events
 */

import type { LoomEvent } from "./event.js";

export type PlayerConnectedEvent = LoomEvent<
  "player.connected",
  {
    readonly playerId: string;
    readonly worldId: string;
    readonly sessionId: string;
    readonly platform: string;
    readonly renderingTier: string;
  }
>;

export type PlayerDisconnectedEvent = LoomEvent<
  "player.disconnected",
  {
    readonly playerId: string;
    readonly worldId: string;
    readonly sessionId: string;
    readonly reason: "voluntary" | "timeout" | "error" | "kicked";
  }
>;

export type PlayerInputReceivedEvent = LoomEvent<
  "player.input",
  {
    readonly playerId: string;
    readonly entityId: string;
    readonly worldId: string;
    readonly inputType: string;
    readonly inputData: Uint8Array;
    readonly clientTimestamp: number;
  }
>;
