/**
 * Pixel Streaming Proxy — Routes WebRTC pixel streaming connections
 * from web/mobile clients to UE5 render instances.
 *
 * Manages session allocation, quality adaptation, and connection
 * lifecycle for browser-based game access.
 *
 * Thread: bridge/bridge-loom-ue5/pixel-streaming
 * Tier: 2
 */

// ─── Configuration ──────────────────────────────────────────────

export interface PixelStreamConfig {
  readonly signalingPort: number;
  readonly maxConcurrentStreams: number;
  readonly targetFps: number;
  readonly maxBitrateMbps: number;
  readonly minBitrateMbps: number;
  readonly idleTimeoutMs: number;
  readonly stunServers: ReadonlyArray<string>;
}

export const DEFAULT_PIXEL_STREAM_CONFIG: PixelStreamConfig = {
  signalingPort: 8888,
  maxConcurrentStreams: 50,
  targetFps: 60,
  maxBitrateMbps: 20,
  minBitrateMbps: 2,
  idleTimeoutMs: 300_000, // 5 minutes
  stunServers: ['stun:stun.l.google.com:19302'],
};

// ─── Stream Session ─────────────────────────────────────────────

export type StreamSessionState = 'connecting' | 'streaming' | 'paused' | 'disconnected';

export interface StreamSession {
  readonly sessionId: string;
  readonly playerId: string;
  readonly renderInstanceId: string;
  readonly state: StreamSessionState;
  readonly connectedAtMs: number;
  readonly lastActivityMs: number;
  readonly currentBitrateMbps: number;
  readonly currentFps: number;
  readonly resolution: { readonly width: number; readonly height: number };
  readonly latencyMs: number;
}

// ─── Quality Adaptation ─────────────────────────────────────────

export interface QualityMetrics {
  readonly frameDropRate: number;    // 0.0 – 1.0
  readonly averageLatencyMs: number;
  readonly bandwidthMbps: number;
}

export interface QualityDecision {
  readonly bitrateMbps: number;
  readonly fps: number;
  readonly resolution: { readonly width: number; readonly height: number };
}

export function adaptQuality(
  metrics: QualityMetrics,
  config: PixelStreamConfig,
): QualityDecision {
  let bitrate = config.maxBitrateMbps;
  let fps = config.targetFps;
  let width = 1920;
  let height = 1080;

  // Reduce quality if dropping frames
  if (metrics.frameDropRate > 0.1) {
    bitrate = Math.max(config.minBitrateMbps, bitrate * 0.7);
    fps = Math.max(30, fps - 10);
  }

  // Reduce resolution if bandwidth constrained
  if (metrics.bandwidthMbps < config.minBitrateMbps * 2) {
    width = 1280;
    height = 720;
    bitrate = Math.max(config.minBitrateMbps, bitrate * 0.5);
  }

  // Further reduce for high latency
  if (metrics.averageLatencyMs > 150) {
    fps = Math.max(30, fps - 15);
  }

  if (metrics.averageLatencyMs > 300) {
    width = 854;
    height = 480;
    bitrate = config.minBitrateMbps;
  }

  return { bitrateMbps: bitrate, fps, resolution: { width, height } };
}

// ─── Render Instance Pool ───────────────────────────────────────

export interface RenderInstance {
  readonly instanceId: string;
  readonly host: string;
  readonly port: number;
  readonly currentLoad: number;    // 0-100
  readonly maxStreams: number;
  readonly activeStreams: number;
  readonly gpuUtilization: number; // 0.0-1.0
}

export interface RenderInstancePool {
  readonly allocate: (playerId: string) => RenderInstance | undefined;
  readonly release: (instanceId: string, playerId: string) => void;
  readonly addInstance: (instance: RenderInstance) => void;
  readonly removeInstance: (instanceId: string) => void;
  readonly getStats: () => PoolStats;
}

export interface PoolStats {
  readonly totalInstances: number;
  readonly totalCapacity: number;
  readonly activeStreams: number;
  readonly averageLoad: number;
}

export function createRenderInstancePool(): RenderInstancePool {
  const instances = new Map<string, RenderInstance & { assignedPlayers: Set<string> }>();

  return {
    allocate(playerId) {
      // Find instance with lowest load that has capacity
      let best: (RenderInstance & { assignedPlayers: Set<string> }) | undefined;
      for (const inst of instances.values()) {
        if (inst.assignedPlayers.size >= inst.maxStreams) continue;
        if (best === undefined || inst.currentLoad < best.currentLoad) {
          best = inst;
        }
      }
      if (best !== undefined) {
        best.assignedPlayers.add(playerId);
      }
      return best;
    },

    release(instanceId, playerId) {
      const inst = instances.get(instanceId);
      if (inst !== undefined) {
        inst.assignedPlayers.delete(playerId);
      }
    },

    addInstance(instance) {
      instances.set(instance.instanceId, { ...instance, assignedPlayers: new Set() });
    },

    removeInstance(instanceId) {
      instances.delete(instanceId);
    },

    getStats() {
      let totalCapacity = 0;
      let activeStreams = 0;
      let totalLoad = 0;
      for (const inst of instances.values()) {
        totalCapacity += inst.maxStreams;
        activeStreams += inst.assignedPlayers.size;
        totalLoad += inst.currentLoad;
      }
      return {
        totalInstances: instances.size,
        totalCapacity,
        activeStreams,
        averageLoad: instances.size > 0 ? totalLoad / instances.size : 0,
      };
    },
  };
}

// ─── Pixel Streaming Session Manager ────────────────────────────

export interface PixelStreamSessionManager {
  readonly createSession: (playerId: string) => StreamSession | undefined;
  readonly terminateSession: (sessionId: string) => void;
  readonly updateMetrics: (sessionId: string, metrics: QualityMetrics) => QualityDecision | undefined;
  readonly sweepIdle: (nowMs: number) => ReadonlyArray<string>;
  readonly getSession: (sessionId: string) => StreamSession | undefined;
  readonly getActiveSessions: () => ReadonlyArray<StreamSession>;
  readonly getStats: () => PoolStats;
}

export interface PixelStreamDeps {
  readonly pool: RenderInstancePool;
  readonly config: PixelStreamConfig;
  readonly idGenerator: { readonly next: () => string };
  readonly clock: { readonly nowMs: () => number };
}

export function createPixelStreamSessionManager(
  deps: PixelStreamDeps,
): PixelStreamSessionManager {
  const sessions = new Map<string, StreamSession & { mutableState: StreamSessionState }>();

  return {
    createSession(playerId) {
      const instance = deps.pool.allocate(playerId);
      if (instance === undefined) return undefined;

      const now = deps.clock.nowMs();
      const session: StreamSession & { mutableState: StreamSessionState } = {
        sessionId: deps.idGenerator.next(),
        playerId,
        renderInstanceId: instance.instanceId,
        get state() { return this.mutableState; },
        mutableState: 'connecting',
        connectedAtMs: now,
        lastActivityMs: now,
        currentBitrateMbps: deps.config.maxBitrateMbps,
        currentFps: deps.config.targetFps,
        resolution: { width: 1920, height: 1080 },
        latencyMs: 0,
      };
      sessions.set(session.sessionId, session);
      return session;
    },

    terminateSession(sessionId) {
      const session = sessions.get(sessionId);
      if (session === undefined) return;
      deps.pool.release(session.renderInstanceId, session.playerId);
      sessions.delete(sessionId);
    },

    updateMetrics(sessionId, metrics) {
      const session = sessions.get(sessionId);
      if (session === undefined) return undefined;

      const decision = adaptQuality(metrics, deps.config);
      // Update session with new quality decision (tracked for monitoring)
      Object.assign(session, {
        lastActivityMs: deps.clock.nowMs(),
        currentBitrateMbps: decision.bitrateMbps,
        currentFps: decision.fps,
        resolution: decision.resolution,
        latencyMs: metrics.averageLatencyMs,
        mutableState: 'streaming' as StreamSessionState,
      });
      return decision;
    },

    sweepIdle(nowMs) {
      const swept: string[] = [];
      for (const [id, session] of sessions) {
        if (nowMs - session.lastActivityMs > deps.config.idleTimeoutMs) {
          deps.pool.release(session.renderInstanceId, session.playerId);
          sessions.delete(id);
          swept.push(id);
        }
      }
      return swept;
    },

    getSession: (sessionId) => sessions.get(sessionId),
    getActiveSessions: () => Array.from(sessions.values()),
    getStats: () => deps.pool.getStats(),
  };
}
