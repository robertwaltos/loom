/**
 * World Streaming Manager — Coordinates loading/unloading of world
 * chunks based on player proximity and interest management.
 *
 * The Loom tells UE5 which chunks to load via the Bridge.
 * This module tracks chunk interest sets per player and generates
 * load/unload commands for the rendering engine.
 *
 * Thread: steel/silfen-weave/world-streaming
 * Tier: 1
 */

// ─── Chunk Coordinate ───────────────────────────────────────────

export interface ChunkCoord {
  readonly worldId: string;
  readonly cx: number;
  readonly cy: number;
  readonly cz: number;
}

function chunkKey(c: ChunkCoord): string {
  return `${c.worldId}:${c.cx},${c.cy},${c.cz}`;
}

// ─── Streaming Configuration ────────────────────────────────────

export interface StreamingConfig {
  readonly chunkSizeUnits: number;     // world units per chunk edge
  readonly loadRadiusChunks: number;   // how many chunks out to load
  readonly unloadHysteresis: number;   // extra chunks before unload
  readonly maxConcurrentLoads: number; // limit simultaneous loads
  readonly priorityDecayFactor: number;
}

export const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  chunkSizeUnits: 256,
  loadRadiusChunks: 8,
  unloadHysteresis: 2,
  maxConcurrentLoads: 4,
  priorityDecayFactor: 0.9,
};

// ─── Streaming Commands ─────────────────────────────────────────

export type StreamCommand =
  | { readonly kind: 'load'; readonly chunk: ChunkCoord; readonly priority: number }
  | { readonly kind: 'unload'; readonly chunk: ChunkCoord };

// ─── Player Tracking ────────────────────────────────────────────

interface PlayerStreamState {
  readonly playerId: string;
  worldId: string;
  posX: number;
  posY: number;
  posZ: number;
  readonly loadedChunks: Set<string>;
}

// ─── Ports ──────────────────────────────────────────────────────

export interface StreamingClockPort {
  readonly nowMicroseconds: () => bigint;
}

// ─── World Streaming Manager ────────────────────────────────────

export interface WorldStreamingManager {
  readonly updatePlayerPosition: (playerId: string, worldId: string, x: number, y: number, z: number) => void;
  readonly removePlayer: (playerId: string) => void;
  readonly computeCommands: () => ReadonlyArray<StreamCommand>;
  readonly getLoadedChunks: (playerId: string) => ReadonlyArray<ChunkCoord>;
  readonly playerCount: () => number;
  readonly totalLoadedChunks: () => number;
}

export function createWorldStreamingManager(
  config: StreamingConfig = DEFAULT_STREAMING_CONFIG,
): WorldStreamingManager {
  const players = new Map<string, PlayerStreamState>();
  const globalLoaded = new Map<string, number>(); // chunkKey -> ref count

  function toChunk(worldId: string, x: number, y: number, z: number): ChunkCoord {
    return {
      worldId,
      cx: Math.floor(x / config.chunkSizeUnits),
      cy: Math.floor(y / config.chunkSizeUnits),
      cz: Math.floor(z / config.chunkSizeUnits),
    };
  }

  function desiredChunks(state: PlayerStreamState): Set<string> {
    const desired = new Set<string>();
    const center = toChunk(state.worldId, state.posX, state.posY, state.posZ);
    const r = config.loadRadiusChunks;
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dz = -r; dz <= r; dz++) {
          if (dx * dx + dy * dy + dz * dz <= r * r) {
            desired.add(chunkKey({
              worldId: state.worldId,
              cx: center.cx + dx,
              cy: center.cy + dy,
              cz: center.cz + dz,
            }));
          }
        }
      }
    }
    return desired;
  }

  function parseChunkKey(key: string): ChunkCoord {
    const [worldId, coords] = key.split(':') as [string, string];
    const [cx, cy, cz] = coords.split(',').map(Number) as [number, number, number];
    return { worldId, cx, cy, cz };
  }

  return {
    updatePlayerPosition(playerId, worldId, x, y, z) {
      let state = players.get(playerId);
      if (state === undefined) {
        state = {
          playerId,
          worldId,
          posX: x,
          posY: y,
          posZ: z,
          loadedChunks: new Set(),
        };
        players.set(playerId, state);
      } else {
        state.worldId = worldId;
        state.posX = x;
        state.posY = y;
        state.posZ = z;
      }
    },

    removePlayer(playerId) {
      const state = players.get(playerId);
      if (state === undefined) return;
      for (const key of state.loadedChunks) {
        const count = globalLoaded.get(key) ?? 0;
        if (count <= 1) {
          globalLoaded.delete(key);
        } else {
          globalLoaded.set(key, count - 1);
        }
      }
      players.delete(playerId);
    },

    computeCommands() {
      const commands: StreamCommand[] = [];

      for (const state of players.values()) {
        const desired = desiredChunks(state);
        const unloadRadius = config.loadRadiusChunks + config.unloadHysteresis;

        // Load new chunks
        let loadCount = 0;
        for (const key of desired) {
          if (!state.loadedChunks.has(key) && loadCount < config.maxConcurrentLoads) {
            const chunk = parseChunkKey(key);
            const center = toChunk(state.worldId, state.posX, state.posY, state.posZ);
            const dist = Math.sqrt(
              (chunk.cx - center.cx) ** 2 +
              (chunk.cy - center.cy) ** 2 +
              (chunk.cz - center.cz) ** 2,
            );
            const priority = Math.max(0, 1 - dist / config.loadRadiusChunks);
            commands.push({ kind: 'load', chunk, priority });
            state.loadedChunks.add(key);
            globalLoaded.set(key, (globalLoaded.get(key) ?? 0) + 1);
            loadCount++;
          }
        }

        // Unload chunks outside hysteresis zone
        for (const key of state.loadedChunks) {
          const chunk = parseChunkKey(key);
          if (chunk.worldId !== state.worldId) {
            commands.push({ kind: 'unload', chunk });
            state.loadedChunks.delete(key);
            const count = globalLoaded.get(key) ?? 0;
            if (count <= 1) globalLoaded.delete(key);
            else globalLoaded.set(key, count - 1);
            continue;
          }
          const center = toChunk(state.worldId, state.posX, state.posY, state.posZ);
          const dist = Math.sqrt(
            (chunk.cx - center.cx) ** 2 +
            (chunk.cy - center.cy) ** 2 +
            (chunk.cz - center.cz) ** 2,
          );
          if (dist > unloadRadius) {
            commands.push({ kind: 'unload', chunk });
            state.loadedChunks.delete(key);
            const count = globalLoaded.get(key) ?? 0;
            if (count <= 1) globalLoaded.delete(key);
            else globalLoaded.set(key, count - 1);
          }
        }
      }

      // Sort loads by priority (highest first)
      commands.sort((a, b) => {
        if (a.kind === 'load' && b.kind === 'load') return b.priority - a.priority;
        if (a.kind === 'load') return -1;
        if (b.kind === 'load') return 1;
        return 0;
      });

      return commands;
    },

    getLoadedChunks(playerId) {
      const state = players.get(playerId);
      if (state === undefined) return [];
      return Array.from(state.loadedChunks).map(parseChunkKey);
    },

    playerCount: () => players.size,
    totalLoadedChunks: () => globalLoaded.size,
  };
}
